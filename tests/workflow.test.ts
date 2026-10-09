import { describe, it, expect, afterAll } from 'vitest'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { ProjectStore } from '../src/core/storage/projectStore'
import { getProvider } from '../src/core/llm'
import { Workflow } from '../src/core/pipeline/workflow'
import type { Seed } from '../src/core/model/types'

const seed: Seed = {
  premise: '近未来的沿海废土，机械与旧神并存。',
  synopsis: '少女林晚在兄长失踪后，被迫踏上追查真相的旅程。',
  characterSeeds: [
    { name: '林晚', role: '主角', description: '冷静而嘴硬心软' },
    { name: '顾沉', role: '对手', description: '神秘的赏金猎人' }
  ]
}

const dirs: string[] = []

afterAll(async () => {
  await Promise.all(dirs.map((d) => rm(d, { recursive: true, force: true })))
})

describe('Workflow 全链路（mock）', () => {
  it('seed → world → framework 落盘并可复读，结果确定', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'mytha-wf-'))
    dirs.push(dir)
    const store = new ProjectStore(dir)
    const workflow = new Workflow(store, getProvider())

    const project = await store.createProject('测试小说', seed)

    const bible = await workflow.runWorld(project)
    expect(bible.characters.length).toBe(2)
    expect(bible.characters[0].name).toBe('林晚')

    const framework = await workflow.runFramework(project)
    expect(framework.acts.length).toBe(3)
    expect(framework.arcs.length).toBe(2)

    // 复读
    const reloadedBible = await store.loadBible(project)
    expect(reloadedBible?.characters.length).toBe(2)
    const reloadedFw = await store.loadFramework(project)
    expect(reloadedFw?.acts.length).toBe(3)

    // 确定性：同一 seed 用另一 provider 实例生成结果一致
    const again = await getProvider().bibleFromSeed(seed)
    expect(again).toEqual(bible)
  })

  it('未生成圣经时直接跑框架会报错', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'mytha-wf-'))
    dirs.push(dir)
    const store = new ProjectStore(dir)
    const workflow = new Workflow(store, getProvider())
    const project = await store.createProject('空', { premise: '', synopsis: '', characterSeeds: [] })

    await expect(workflow.runFramework(project)).rejects.toThrow()
  })
})
