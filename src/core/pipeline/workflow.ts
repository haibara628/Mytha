import {
  BibleSchema,
  ChapterGenerationSchema,
  FrameworkSchema,
  OutlineSchema
} from '../model/schemas'
import type { Bible, ChapterManuscript, Finding, Framework, Outline, Project } from '../model/types'
import type { LLMProvider } from '../llm/provider'
import type { ProjectStore } from '../storage/projectStore'
import { applyChapterStateChanges } from '../state/applyChanges'
import { assembleChapterContext } from '../context/assembler'
import { checkChapterConsistency } from '../review/consistency'

export type StageId = 'world' | 'framework' | 'outline' | 'manuscript'

/**
 * 创作编排：seed → world（设定深化）→ framework（框架搭建）。
 * 每个阶段：调用 provider → 校验 → 落盘 → git commit → 返回结果，
 * 供 UI 在「人工确认点」展示与编辑。后续阶段（outline/manuscript/review）在此扩展。
 */
export class Workflow {
  constructor(
    private readonly store: ProjectStore,
    private readonly provider: LLMProvider
  ) {}

  /** 阶段0：设定深化 */
  async runWorld(project: Project): Promise<Bible> {
    const bible = BibleSchema.parse(await this.provider.bibleFromSeed(project.seed))
    await this.store.writeBible(project, bible)
    return bible
  }

  /** 阶段1：框架搭建 */
  async runFramework(project: Project): Promise<Framework> {
    const bible = await this.store.loadBible(project)
    if (!bible) throw new Error('尚未生成故事圣经，请先运行「生成设定」。')
    const framework = FrameworkSchema.parse(await this.provider.frameworkFromBible(bible))
    await this.store.writeFramework(project, framework)
    return framework
  }

  /** 阶段2：提纲生成 */
  async runOutline(project: Project): Promise<Outline> {
    const bible = await this.store.loadBible(project)
    const framework = await this.store.loadFramework(project)
    if (!bible || !framework) throw new Error('请先生成故事圣经与框架。')
    const outline = OutlineSchema.parse(await this.provider.outlineFromFramework(bible, framework))
    await this.store.writeOutline(project, outline)
    return outline
  }

  /**
   * 阶段3：生成单章正文。
   * 流程：组装上下文 → 生成 → 一致性校验 → 状态快照回写圣经 → 写正文（含校验结果）
   *       → 更新章节摘要与全书摘要。
   */
  async runChapter(
    project: Project,
    chapterId: string
  ): Promise<{ manuscript: ChapterManuscript; bible: Bible; findings: Finding[] }> {
    const outline = await this.store.loadOutline(project)
    const bible = await this.store.loadBible(project)
    if (!outline || !bible) throw new Error('请先生成提纲。')
    const chapter = outline.chapters.find((c) => c.id === chapterId)
    if (!chapter) throw new Error(`找不到章节 ${chapterId}。`)

    // 上下文组装
    const summaries = await this.store.loadChapterSummaries(project)
    const bookSummary = await this.store.loadBookSummary(project)
    const prevChapter = outline.chapters.find((c) => c.index === chapter.index - 1)
    const previousChapterSummary =
      (prevChapter && summaries.find((s) => s.chapterId === prevChapter.id)?.summary) || null
    const context = assembleChapterContext({
      chapter,
      bible,
      previousChapterSummary,
      bookSummary: bookSummary?.summary ?? ''
    })

    const gen = ChapterGenerationSchema.parse(await this.provider.generateChapter(context))

    // 一致性校验（回写前，产出矛盾清单）：结构化规则 + 语义级 LLM-as-judge
    const structural = checkChapterConsistency({ chapter, generation: gen, bibleBefore: bible })
    const semantic = await this.provider.reviewChapter({
      bible,
      chapter,
      generation: gen,
      previousChapterSummary,
      bookSummary: bookSummary?.summary ?? ''
    })
    const findings = [...structural, ...semantic]

    // 状态快照回写（人物 dynamic + 关系 + 伏笔 status）
    const nextBible = applyChapterStateChanges(bible, gen.stateChanges)
    await this.store.writeBible(project, nextBible)

    const manuscript: ChapterManuscript = {
      chapterId,
      scenes: gen.scenes,
      stateChanges: gen.stateChanges,
      findings
    }
    await this.store.writeChapter(project, manuscript)

    // 更新分层摘要链
    const entry = { chapterId, title: chapter.title, summary: gen.chapterSummary }
    const idx = summaries.findIndex((s) => s.chapterId === chapterId)
    if (idx >= 0) summaries[idx] = entry
    else summaries.push(entry)
    await this.store.writeChapterSummaries(project, summaries)
    await this.rebuildBookSummary(project, outline)

    return { manuscript, bible: nextBible, findings }
  }

  private async rebuildBookSummary(project: Project, outline: Outline): Promise<void> {
    const summaries = await this.store.loadChapterSummaries(project)
    const total = outline.chapters.length
    const done = summaries.length
    const titles = summaries.map((s) => s.title).join('、')
    const summary = `全书进度 ${done}/${total} 章。已完成：${titles || '（无）'}。主线：${project.seed.synopsis}`
    await this.store.writeBookSummary(project, { summary })
  }
}
