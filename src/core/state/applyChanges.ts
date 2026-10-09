import type { Bible, ChapterStateChanges } from '../model/types'

function dedupe(arr: string[]): string[] {
  return [...new Set(arr)]
}

/**
 * 把「章节状态变更」回写到故事圣经（状态快照回写，M1 的核心机制）：
 *  - 人物 dynamic 状态：位置 / 持有物增减 / 已知信息 / 情绪
 *  - 伏笔 status：按声明推进一格
 * 返回新的 Bible（不修改入参），由调用方落盘。
 */
export function applyChapterStateChanges(bible: Bible, changes: ChapterStateChanges): Bible {
  const characters = bible.characters.map((c) => {
    const ch = changes.characters.find((x) => x.characterId === c.id)
    if (!ch) return c

    let relationships = c.dynamic.relationships
    for (const up of ch.relationshipUpserts ?? []) {
      const idx = relationships.findIndex((r) => r.targetId === up.targetId)
      if (idx >= 0) relationships[idx] = up
      else relationships = [...relationships, up]
    }

    return {
      ...c,
      dynamic: {
        ...c.dynamic,
        location: ch.location ?? c.dynamic.location,
        inventory: dedupe([
          ...c.dynamic.inventory.filter((i) => !(ch.inventoryLost ?? []).includes(i)),
          ...(ch.inventoryGained ?? [])
        ]),
        knowledge: dedupe([...c.dynamic.knowledge, ...(ch.knowledgeGained ?? [])]),
        emotionalState: ch.emotionalState ?? c.dynamic.emotionalState,
        relationships
      }
    }
  })

  const plotThreads = bible.plotThreads.map((t) => {
    const adv = changes.plotThreads.find((x) => x.plotThreadId === t.id)
    return adv ? { ...t, status: adv.status } : t
  })

  return { ...bible, characters, plotThreads }
}
