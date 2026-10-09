import { describe, it, expect } from 'vitest'
import {
  buildBibleFromSeed,
  buildFrameworkFromBible,
  buildOutlineFromFramework
} from '../src/core/llm/deterministic'
import { assembleChapterContext } from '../src/core/context/assembler'
import { retrieveGlossary } from '../src/core/context/retrieve'
import { checkChapterConsistency } from '../src/core/review/consistency'
import { applyChapterStateChanges } from '../src/core/state/applyChanges'
import type { ChapterGeneration, ChapterStateChanges, Seed } from '../src/core/model/types'

const seed: Seed = {
  premise: '近未来的沿海废土，机械与旧神并存。',
  synopsis: '少女林晚在兄长失踪后，被迫踏上追查真相的旅程。',
  characterSeeds: [
    { name: '林晚', role: '主角', description: '冷静而嘴硬心软' },
    { name: '顾沉', role: '对手', description: '神秘的赏金猎人' }
  ]
}

describe('M2：上下文组装与一致性校验', () => {
  it('assembleChapterContext 组装出场人物/伏笔/名词/文风/摘要', () => {
    const bible = buildBibleFromSeed(seed)
    const fw = buildFrameworkFromBible(bible)
    const ch = buildOutlineFromFramework(bible, fw).chapters[0]

    const ctx = assembleChapterContext({
      chapter: ch,
      bible,
      previousChapterSummary: '上一章摘要',
      bookSummary: '全书摘要'
    })

    expect(ctx.characters.length).toBeGreaterThan(0)
    expect(ctx.plotThreads.length).toBeGreaterThan(0)
    expect(ctx.previousChapterSummary).toBe('上一章摘要')
    expect(ctx.bookSummary).toBe('全书摘要')
    expect(ctx.style.pov).toBe('第三人称')
    expect(ctx.glossary.length).toBeGreaterThan(0) // 出场人物名命中名词表
  })

  it('retrieveGlossary 命中出场人物名', () => {
    const bible = buildBibleFromSeed(seed)
    const fw = buildFrameworkFromBible(bible)
    const ch = buildOutlineFromFramework(bible, fw).chapters[0]
    const terms = retrieveGlossary(ch, bible).map((g) => g.term)
    expect(terms).toContain('林晚')
  })

  it('checkChapterConsistency：合法生成无矛盾', () => {
    const bible = buildBibleFromSeed(seed)
    const fw = buildFrameworkFromBible(bible)
    const ch = buildOutlineFromFramework(bible, fw).chapters[0]
    const gen: ChapterGeneration = {
      scenes: [],
      stateChanges: {
        characters: [{ characterId: 'c001', emotionalState: '坚定' }],
        plotThreads: [{ plotThreadId: 'pt001', status: 'advanced' }]
      },
      chapterSummary: 'x'
    }
    expect(checkChapterConsistency({ chapter: ch, generation: gen, bibleBefore: bible })).toEqual([])
  })

  it('checkChapterConsistency：伏笔状态回退被检出', () => {
    const bible = buildBibleFromSeed(seed)
    bible.plotThreads[0].status = 'advanced' // 手动推进到 advanced
    const fw = buildFrameworkFromBible(bible)
    const ch = buildOutlineFromFramework(bible, fw).chapters[0]
    const gen: ChapterGeneration = {
      scenes: [],
      stateChanges: {
        characters: [],
        plotThreads: [{ plotThreadId: 'pt001', status: 'planted' }] // 回退
      },
      chapterSummary: 'x'
    }
    const findings = checkChapterConsistency({ chapter: ch, generation: gen, bibleBefore: bible })
    expect(findings.some((f) => f.rule === '伏笔状态机')).toBe(true)
  })

  it('applyChapterStateChanges：关系 upsert 回写', () => {
    const bible = buildBibleFromSeed(seed)
    const changes: ChapterStateChanges = {
      characters: [
        { characterId: 'c001', relationshipUpserts: [{ targetId: 'c002', type: '盟友', intensity: 0.8 }] }
      ],
      plotThreads: []
    }
    const next = applyChapterStateChanges(bible, changes)
    expect(next.characters[0].dynamic.relationships).toHaveLength(1)
    expect(next.characters[0].dynamic.relationships[0].targetId).toBe('c002')
    expect(next.characters[0].dynamic.relationships[0].type).toBe('盟友')
  })
})
