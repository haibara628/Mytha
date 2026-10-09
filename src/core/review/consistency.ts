import type { Bible, Chapter, ChapterGeneration, Finding, PlotThreadStatus } from '../model/types'

const ORDER: Record<PlotThreadStatus, number> = {
  planted: 0,
  advanced: 1,
  revealed: 2,
  resolved: 3
}

/**
 * 一致性校验（结构化规则，确定性、便宜）。生成后、回写前调用：
 *  1) 场景卡引用完整性（人物/伏笔必须存在）
 *  2) 状态变更引用完整性
 *  3) 伏笔状态机合法性（只能前进，不能回退）
 * 语义级矛盾（人物状态冲突、设定违反）在真实模型接入后由 LLM-as-judge 补充。
 */
export function checkChapterConsistency(input: {
  chapter: Chapter
  generation: ChapterGeneration
  bibleBefore: Bible
}): Finding[] {
  const { chapter, generation, bibleBefore } = input
  const findings: Finding[] = []
  const charIds = new Set(bibleBefore.characters.map((c) => c.id))
  const threadById = new Map(bibleBefore.plotThreads.map((t) => [t.id, t]))

  // 规则1：场景卡引用完整性
  for (const sc of chapter.scenes) {
    for (const cid of sc.characterIds) {
      if (!charIds.has(cid)) {
        findings.push({
          severity: 'error',
          rule: '引用完整性',
          message: `场景 ${sc.id} 引用了不存在的人物 ${cid}`,
          chapterId: chapter.id,
          sceneId: sc.id,
          characterId: cid
        })
      }
    }
    for (const tid of sc.plotThreadIds) {
      if (!threadById.has(tid)) {
        findings.push({
          severity: 'error',
          rule: '引用完整性',
          message: `场景 ${sc.id} 引用了不存在的伏笔 ${tid}`,
          chapterId: chapter.id,
          sceneId: sc.id,
          plotThreadId: tid
        })
      }
    }
  }

  // 规则2：状态变更引用完整性
  for (const ch of generation.stateChanges.characters) {
    if (!charIds.has(ch.characterId)) {
      findings.push({
        severity: 'error',
        rule: '状态变更引用',
        message: `状态变更引用了不存在的人物 ${ch.characterId}`,
        chapterId: chapter.id,
        characterId: ch.characterId
      })
    }
  }

  // 规则3：伏笔状态机合法性
  for (const adv of generation.stateChanges.plotThreads) {
    const before = threadById.get(adv.plotThreadId)
    if (!before) {
      findings.push({
        severity: 'error',
        rule: '伏笔状态机',
        message: `推进了不存在的伏笔 ${adv.plotThreadId}`,
        chapterId: chapter.id,
        plotThreadId: adv.plotThreadId
      })
      continue
    }
    if (ORDER[adv.status] < ORDER[before.status]) {
      findings.push({
        severity: 'error',
        rule: '伏笔状态机',
        message: `伏笔「${before.title}」状态回退：${before.status} → ${adv.status}`,
        chapterId: chapter.id,
        plotThreadId: adv.plotThreadId
      })
    }
  }

  return findings
}
