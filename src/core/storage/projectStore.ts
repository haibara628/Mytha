import { mkdir, writeFile, readFile, readdir, stat } from 'node:fs/promises'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import { Versioner } from './versioner'
import {
  BibleSchema,
  BookSummarySchema,
  ChapterManuscriptSchema,
  ChapterSummarySchema,
  FrameworkSchema,
  OutlineSchema,
  ProjectSchema
} from '../model/schemas'
import type {
  Bible,
  BookSummary,
  ChapterManuscript,
  ChapterSummary,
  Framework,
  Outline,
  Project,
  Seed
} from '../model/types'

export interface ProjectSummary {
  slug: string
  name: string
  updatedAt: string
}

function slugify(name: string): string {
  const s = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9一-龥]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return s || 'project'
}

/**
 * 文件系统优先的项目存储：每个项目一个目录，人可读、可 diff。
 * 圣经/框架按实体拆分为独立 JSON 文件，配合 git 版本化实现追溯。
 */
export class ProjectStore {
  constructor(private readonly rootDir: string) {}

  private projectDir(slug: string): string {
    return path.join(this.rootDir, slug)
  }

  private versionerFor(slug: string): Versioner {
    return new Versioner(this.projectDir(slug))
  }

  async ensureRoot(): Promise<void> {
    await mkdir(this.rootDir, { recursive: true })
  }

  private async exists(slug: string): Promise<boolean> {
    try {
      await stat(this.projectDir(slug))
      return true
    } catch {
      return false
    }
  }

  async createProject(name: string, seed: Seed): Promise<Project> {
    await this.ensureRoot()

    // 生成唯一 slug
    let slug = slugify(name)
    const base = slug
    let n = 2
    while (await this.exists(slug)) slug = `${base}-${n++}`

    const dir = this.projectDir(slug)
    await mkdir(path.join(dir, 'bible', 'characters'), { recursive: true })
    await mkdir(path.join(dir, 'framework'), { recursive: true })

    const now = new Date().toISOString()
    const project: Project = {
      id: randomUUID(),
      name,
      slug,
      path: dir,
      seed,
      createdAt: now,
      updatedAt: now
    }

    await writeFile(path.join(dir, 'project.json'), JSON.stringify(project, null, 2))
    const v = this.versionerFor(slug)
    await v.init()
    await v.commit('init: 创建项目')
    return project
  }

  async listProjects(): Promise<ProjectSummary[]> {
    await this.ensureRoot()
    const entries = await readdir(this.rootDir, { withFileTypes: true })
    const out: ProjectSummary[] = []
    for (const e of entries) {
      if (!e.isDirectory()) continue
      try {
        const raw = await readFile(path.join(this.rootDir, e.name, 'project.json'), 'utf-8')
        const proj = ProjectSchema.parse(JSON.parse(raw))
        out.push({ slug: proj.slug, name: proj.name, updatedAt: proj.updatedAt })
      } catch {
        // 跳过无效目录
      }
    }
    return out.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  }

  async loadProject(slug: string): Promise<Project> {
    const raw = await readFile(path.join(this.projectDir(slug), 'project.json'), 'utf-8')
    return ProjectSchema.parse(JSON.parse(raw))
  }

  async saveProject(project: Project): Promise<Project> {
    project.updatedAt = new Date().toISOString()
    await writeFile(path.join(project.path, 'project.json'), JSON.stringify(project, null, 2))
    await this.versionerFor(project.slug).commit('save: 项目信息')
    return project
  }

  async writeBible(project: Project, bible: Bible): Promise<void> {
    const dir = path.join(project.path, 'bible')
    await writeFile(path.join(dir, 'world.json'), JSON.stringify(bible.world, null, 2))
    for (const c of bible.characters) {
      await writeFile(path.join(dir, 'characters', `${c.id}.json`), JSON.stringify(c, null, 2))
    }
    await writeFile(path.join(dir, 'plot_threads.json'), JSON.stringify(bible.plotThreads, null, 2))
    await writeFile(path.join(dir, 'glossary.json'), JSON.stringify(bible.glossary, null, 2))
    await writeFile(path.join(dir, 'style.json'), JSON.stringify(bible.style, null, 2))
    await writeFile(
      path.join(dir, 'extras.json'),
      JSON.stringify(
        {
          locations: bible.locations,
          factions: bible.factions,
          items: bible.items,
          timeline: bible.timeline
        },
        null,
        2
      )
    )
    await this.versionerFor(project.slug).commit('stage:world 更新故事圣经')
  }

  async loadBible(project: Project): Promise<Bible | null> {
    const dir = path.join(project.path, 'bible')
    try {
      const world = JSON.parse(await readFile(path.join(dir, 'world.json'), 'utf-8'))
      const charFiles = (await readdir(path.join(dir, 'characters'))).sort()
      const characters = []
      for (const f of charFiles) {
        if (!f.endsWith('.json')) continue
        characters.push(JSON.parse(await readFile(path.join(dir, 'characters', f), 'utf-8')))
      }
      const plotThreads = JSON.parse(await readFile(path.join(dir, 'plot_threads.json'), 'utf-8'))
      const glossary = JSON.parse(await readFile(path.join(dir, 'glossary.json'), 'utf-8'))
      const style = JSON.parse(await readFile(path.join(dir, 'style.json'), 'utf-8'))
      let extras: Record<string, unknown[]> = { locations: [], factions: [], items: [], timeline: [] }
      try {
        extras = JSON.parse(await readFile(path.join(dir, 'extras.json'), 'utf-8'))
      } catch {
        // extras 可选
      }
      return BibleSchema.parse({ world, characters, plotThreads, glossary, style, ...extras })
    } catch {
      return null
    }
  }

  async writeFramework(project: Project, framework: Framework): Promise<void> {
    const dir = path.join(project.path, 'framework')
    await writeFile(path.join(dir, 'acts.json'), JSON.stringify(framework.acts, null, 2))
    await writeFile(path.join(dir, 'arcs.json'), JSON.stringify(framework.arcs, null, 2))
    await this.versionerFor(project.slug).commit('stage:framework 更新框架')
  }

  async loadFramework(project: Project): Promise<Framework | null> {
    const dir = path.join(project.path, 'framework')
    try {
      const acts = JSON.parse(await readFile(path.join(dir, 'acts.json'), 'utf-8'))
      const arcs = JSON.parse(await readFile(path.join(dir, 'arcs.json'), 'utf-8'))
      return FrameworkSchema.parse({ acts, arcs })
    } catch {
      return null
    }
  }

  async history(project: Project) {
    return this.versionerFor(project.slug).log()
  }

  // ---- 提纲 ----
  async writeOutline(project: Project, outline: Outline): Promise<void> {
    const dir = path.join(project.path, 'outline')
    await mkdir(dir, { recursive: true })
    await writeFile(path.join(dir, 'outline.json'), JSON.stringify(outline, null, 2))
    await this.versionerFor(project.slug).commit('stage:outline 更新提纲')
  }

  async loadOutline(project: Project): Promise<Outline | null> {
    try {
      const raw = await readFile(path.join(project.path, 'outline', 'outline.json'), 'utf-8')
      return OutlineSchema.parse(JSON.parse(raw))
    } catch {
      return null
    }
  }

  // ---- 正文 ----
  async writeChapter(project: Project, manuscript: ChapterManuscript): Promise<void> {
    const dir = path.join(project.path, 'manuscript')
    await mkdir(dir, { recursive: true })
    await writeFile(path.join(dir, `${manuscript.chapterId}.json`), JSON.stringify(manuscript, null, 2))
    await this.versionerFor(project.slug).commit(`stage:manuscript 生成章节 ${manuscript.chapterId}`)
  }

  async loadChapter(project: Project, chapterId: string): Promise<ChapterManuscript | null> {
    try {
      const raw = await readFile(path.join(project.path, 'manuscript', `${chapterId}.json`), 'utf-8')
      return ChapterManuscriptSchema.parse(JSON.parse(raw))
    } catch {
      return null
    }
  }

  async loadManuscripts(project: Project): Promise<ChapterManuscript[]> {
    const dir = path.join(project.path, 'manuscript')
    try {
      const files = (await readdir(dir)).filter((f) => f.endsWith('.json')).sort()
      const out: ChapterManuscript[] = []
      for (const f of files) {
        try {
          const raw = await readFile(path.join(dir, f), 'utf-8')
          out.push(ChapterManuscriptSchema.parse(JSON.parse(raw)))
        } catch {
          // 跳过解析失败的正文
        }
      }
      return out
    } catch {
      return []
    }
  }

  // ---- 摘要（分层摘要链） ----
  async writeChapterSummaries(project: Project, summaries: ChapterSummary[]): Promise<void> {
    const dir = path.join(project.path, 'summaries')
    await mkdir(dir, { recursive: true })
    await writeFile(path.join(dir, 'chapters.json'), JSON.stringify(summaries, null, 2))
    await this.versionerFor(project.slug).commit('summaries: 更新章节摘要')
  }

  async loadChapterSummaries(project: Project): Promise<ChapterSummary[]> {
    try {
      const raw = await readFile(path.join(project.path, 'summaries', 'chapters.json'), 'utf-8')
      return ChapterSummarySchema.array().parse(JSON.parse(raw))
    } catch {
      return []
    }
  }

  async writeBookSummary(project: Project, bookSummary: BookSummary): Promise<void> {
    const dir = path.join(project.path, 'summaries')
    await mkdir(dir, { recursive: true })
    await writeFile(path.join(dir, 'book.json'), JSON.stringify(bookSummary, null, 2))
    await this.versionerFor(project.slug).commit('summaries: 更新全书摘要')
  }

  async loadBookSummary(project: Project): Promise<BookSummary | null> {
    try {
      const raw = await readFile(path.join(project.path, 'summaries', 'book.json'), 'utf-8')
      return BookSummarySchema.parse(JSON.parse(raw))
    } catch {
      return null
    }
  }
}
