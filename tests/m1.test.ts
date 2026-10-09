import { describe, it, expect } from 'vitest'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import {
  buildBibleFromSeed,
  buildChapterGeneration,
  buildFrameworkFromBible,
  buildOutlineFromFramework
} from '../src/core/llm/deterministic'
import { applyChapterStateChanges } from '../src/core/state/applyChanges'
import { assembleChapterContext } from '../src/core/context/assembler'
import { ProjectStore } from '../src/core/storage/projectStore'
import { getProvider } from '../src/core/llm'
import { Workflow } from '../src/core/pipeline/workflow'
import type { ChapterStateChanges, Seed } from '../src/core/model/types'

const seed: Seed = {
  premise: '近未来的沿海废土，机械与旧神并存。',
  synopsis: '少女林晚在兄长失踪后，被迫踏上追查真相的旅程。',
  characterSeeds: [
    { name: '林晚', role: '主角', description: '冷静而嘴硬心软' },
    { name: '顾沉', role: '对手', description: '神秘的赏金猎人' }
  ]
}

describe('M1：提纲与状态回写', () => {
  it('框架 → 提纲：3 幕 → 6 章，确定性', () => {
    const bible = buildBibleFromSeed(seed)
    const fw = buildFrameworkFromBible(bible)
    const a = buildOutlineFromFramework(bible, fw)
    const b = buildOutlineFromFramework(bible, fw)
    expect(a).toEqual(b)
    expect(a.chapters.length).toBe(6)
    expect(a.chapters[0].id).toBe('ch001')
    expect(a.chapters[0].scenes.length).toBe(2)
    expect(a.chapters[0].scenes[0].characterIds.length).toBeGreaterThan(0)
    expect(a.chapters[0].scenes[0].plotThreadIds.length).toBeGreaterThan(0)
  })

  it('章节生成：产出场景正文 + 状态变更，伏笔推进一格', () => {
    const bible = buildBibleFromSeed(seed)
    const fw = buildFrameworkFromBible(bible)
    const outline = buildOutlineFromFramework(bible, fw)
    const ch = outline.chapters[0]
    const ctx = assembleChapterContext({
      chapter: ch,
      bible,
      previousChapterSummary: null,
      bookSummary: ''
    })
    const gen = buildChapterGeneration(ctx)

    expect(gen.scenes.length).toBe(2)
    expect(gen.stateChanges.characters.length).toBeGreaterThan(0)
    expect(gen.stateChanges.plotThreads.length).toBeGreaterThan(0)

    const tid = ch.scenes[0].plotThreadIds[0]
    const before = bible.plotThreads.find((t) => t.id === tid)!.status
    const adv = gen.stateChanges.plotThreads.find((p) => p.plotThreadId === tid)!
    expect(adv.status).not.toBe(before)
  })

  it('applyChapterStateChanges：回写人物动态与伏笔状态，不修改原对象', () => {
    const bible = buildBibleFromSeed(seed)
    const changes: ChapterStateChanges = {
      characters: [{ characterId: 'c001', emotionalState: '坚定', knowledgeGained: ['秘密X'] }],
      plotThreads: [{ plotThreadId: 'pt001', status: 'advanced' }]
    }
    const next = applyChapterStateChanges(bible, changes)

    expect(next.characters[0].dynamic.emotionalState).toBe('坚定')
    expect(next.characters[0].dynamic.knowledge).toContain('秘密X')
    expect(next.plotThreads[0].status).toBe('advanced')
    expect(bible.characters[0].dynamic.emotionalState).toBe('平静') // 原对象不变
  })

  it('workflow：runOutline → runChapter 落盘，圣经状态被回写', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'mytha-m1-'))
    try {
      const store = new ProjectStore(dir)
      const wf = new Workflow(store, getProvider())
      const p = await store.createProject('m1', seed)
      await wf.runWorld(p)
      await wf.runFramework(p)

      const outline = await wf.runOutline(p)
      expect(outline.chapters.length).toBe(6)

      const first = outline.chapters[0]
      const before = await store.loadBible(p)
      const prevEmotion = before?.characters.find((c) => c.id === 'c001')?.dynamic.emotionalState

      await wf.runChapter(p, first.id)

      const ms = await store.loadChapter(p, first.id)
      expect(ms?.scenes.length).toBe(2)
      expect((await store.loadChapterSummaries(p)).length).toBe(1)
      expect((await store.loadBookSummary(p))?.summary).toContain('1/6')

      const after = await store.loadBible(p)
      const involved = first.scenes[0].characterIds.includes('c001')
      if (involved) {
        const afterEmotion = after?.characters.find((c) => c.id === 'c001')?.dynamic.emotionalState
        expect(afterEmotion).not.toBe(prevEmotion)
      }
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })
})
