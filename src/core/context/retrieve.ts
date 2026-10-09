import type { Bible, Chapter, GlossaryEntry } from '../model/types'

/**
 * 轻量关键词检索：从章节场景文本与出场人物名中提取查询，
 * 命中名词表中「词条名出现在场景文本里」或「出场人物名」的条目。
 * 当前圣经体量下用关键词即可，后续可替换为向量检索。
 */
export function retrieveGlossary(chapter: Chapter, bible: Bible): GlossaryEntry[] {
  const haystack = [
    chapter.goal,
    chapter.summary,
    ...chapter.scenes.flatMap((s) => [s.goal, s.conflict, s.turningPoint, s.summary])
  ].join(' ')

  const names = new Set(
    chapter.scenes
      .flatMap((s) => s.characterIds)
      .map((id) => bible.characters.find((c) => c.id === id)?.name)
      .filter((n): n is string => !!n)
  )

  return bible.glossary.filter((g) => haystack.includes(g.term) || names.has(g.term))
}
