import type {
  Bible,
  Chapter,
  Character,
  GlossaryEntry,
  PlotThread,
  StyleCard,
  World
} from '../model/types'
import { retrieveGlossary } from './retrieve'

/**
 * 每次生成正文前注入给模型的「当下需要的上下文」：
 * 场景卡（chapter 自带）+ 出场人物状态快照 + 相关伏笔 + 检索命中的名词
 * + 世界观/文风卡 + 上一章摘要（连续性）+ 全书主线摘要（方向）。
 */
export interface ChapterContext {
  chapter: Chapter
  characters: Character[] // 出场人物（含 dynamic 状态快照）
  plotThreads: PlotThread[] // 相关伏笔
  glossary: GlossaryEntry[] // 检索命中的专有名词
  world: World
  style: StyleCard
  previousChapterSummary: string | null
  bookSummary: string
}

export function assembleChapterContext(input: {
  chapter: Chapter
  bible: Bible
  previousChapterSummary: string | null
  bookSummary: string
}): ChapterContext {
  const { chapter, bible, previousChapterSummary, bookSummary } = input

  const charIds = new Set(chapter.scenes.flatMap((s) => s.characterIds))
  const threadIds = new Set(chapter.scenes.flatMap((s) => s.plotThreadIds))

  return {
    chapter,
    characters: bible.characters.filter((c) => charIds.has(c.id)),
    plotThreads: bible.plotThreads.filter((t) => threadIds.has(t.id)),
    glossary: retrieveGlossary(chapter, bible),
    world: bible.world,
    style: bible.style,
    previousChapterSummary,
    bookSummary
  }
}
