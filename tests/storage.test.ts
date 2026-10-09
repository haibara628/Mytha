import { describe, it, expect, afterAll } from 'vitest'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { ProjectStore } from '../src/core/storage/projectStore'
import type { Seed } from '../src/core/model/types'

const seed: Seed = { premise: 'x', synopsis: 'y', characterSeeds: [{ name: '甲' }] }

const dirs: string[] = []

async function makeStore(): Promise<ProjectStore> {
  const dir = await mkdtemp(path.join(tmpdir(), 'mytha-store-'))
  dirs.push(dir)
  return new ProjectStore(dir)
}

afterAll(async () => {
  await Promise.all(dirs.map((d) => rm(d, { recursive: true, force: true })))
})

describe('ProjectStore', () => {
  it('创建 → 列出 → 加载 → 保存，且生成 git 版本', async () => {
    const store = await makeStore()

    const p = await store.createProject('我的小说', seed)
    expect(p.slug).toBeTruthy()

    const list = await store.listProjects()
    expect(list.length).toBe(1)
    expect(list[0].name).toBe('我的小说')

    const loaded = await store.loadProject(p.slug)
    expect(loaded.seed.synopsis).toBe('y')

    // 修改并保存
    loaded.seed.synopsis = 'y2'
    await store.saveProject(loaded)
    const reloaded = await store.loadProject(p.slug)
    expect(reloaded.seed.synopsis).toBe('y2')

    // 版本历史：init + save 至少两次提交
    const hist = await store.history(p)
    expect(hist.length).toBeGreaterThanOrEqual(2)
  })

  it('圣经/框架 落盘后可复读', async () => {
    const store = await makeStore()
    const p = await store.createProject('t', seed)

    expect(await store.loadBible(p)).toBeNull()
    expect(await store.loadFramework(p)).toBeNull()
  })
})
