import { describe, it, expect } from 'vitest'
import { buildBibleFromSeed, buildFrameworkFromBible } from '../src/core/llm/deterministic'
import type { Seed } from '../src/core/model/types'

const seed: Seed = {
  premise: '近未来的沿海废土，机械与旧神并存。',
  synopsis: '少女林晚在兄长失踪后，被迫踏上追查真相的旅程。',
  characterSeeds: [
    { name: '林晚', role: '主角', description: '冷静而嘴硬心软' },
    { name: '顾沉', role: '对手', description: '神秘的赏金猎人' }
  ]
}

describe('确定性生成器', () => {
  it('seed → 圣经：产出人物卡与伏笔，且可复现', () => {
    const a = buildBibleFromSeed(seed)
    const b = buildBibleFromSeed(seed)
    expect(a).toEqual(b) // 确定性

    expect(a.characters.length).toBe(2)
    expect(a.characters[0].name).toBe('林晚')
    expect(a.characters[0].static.role).toBe('主角')
    expect(a.plotThreads.length).toBe(3) // 主线 + 两条人物弧线
    expect(a.glossary.length).toBe(2)
    expect(a.world.background).toBe(seed.premise)
  })

  it('圣经 → 框架：三幕 + 逐人物弧线', () => {
    const bible = buildBibleFromSeed(seed)
    const fw = buildFrameworkFromBible(bible)
    expect(fw.acts.length).toBe(3)
    expect(fw.acts.map((a) => a.index)).toEqual([1, 2, 3])
    expect(fw.arcs.length).toBe(2)
    expect(fw.arcs[0].characterName).toBe('林晚')
  })
})
