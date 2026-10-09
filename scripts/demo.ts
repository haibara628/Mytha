import { mkdirSync } from 'node:fs'
import { ProjectStore } from '../src/core/storage/projectStore'
import { getProvider } from '../src/core/llm'
import { Workflow } from '../src/core/pipeline/workflow'

const root = '/tmp/mytha-demo'
mkdirSync(root, { recursive: true })
const store = new ProjectStore(root)
const workflow = new Workflow(store, getProvider())

const seed = {
  premise: '近未来的沿海废土，机械与旧神并存。',
  synopsis: '少女林晚在兄长失踪后，被迫踏上追查真相的旅程。',
  characterSeeds: [
    { name: '林晚', role: '主角', description: '冷静而嘴硬心软' },
    { name: '顾沉', role: '对手', description: '神秘的赏金猎人' }
  ]
}

async function main() {
  const p = await store.createProject('废土回声', seed)
  const bible = await workflow.runWorld(p)
  const framework = await workflow.runFramework(p)
  const outline = await workflow.runOutline(p)

  console.log('项目目录：', p.path)
  console.log('人物：', bible.characters.map((c) => c.name).join('、'))
  console.log('幕数：', framework.acts.length, '| 章数：', outline.chapters.length)

  // 生成前两章正文，验证状态回写、关系回写、上下文注入、一致性校验
  const first = outline.chapters[0]
  const second = outline.chapters[1]
  const before = bible.characters.find((c) => c.id === 'c001')
  console.log('\n生成前：林晚 情绪 =', before?.dynamic.emotionalState, '| 主线伏笔 =', bible.plotThreads[0].status)

  const r1 = await workflow.runChapter(p, first.id)
  const r2 = await workflow.runChapter(p, second.id)

  const after = r2.bible.characters.find((c) => c.id === 'c001')
  console.log('生成后：林晚 情绪 =', after?.dynamic.emotionalState)
  console.log('各人物关系（回写）：')
  r2.bible.characters.forEach((c) =>
    console.log(`  ${c.name} →`, JSON.stringify(c.dynamic.relationships))
  )
  console.log('主线伏笔 =', r2.bible.plotThreads[0].status)
  console.log('一致性校验（ch1）:', r1.findings.length === 0 ? '无矛盾' : r1.findings.map((f) => `[${f.rule}]${f.message}`).join('；'))

  // 第 2 章第 1 场正文应体现「承接上章」的上下文注入
  const secondMs = await store.loadChapter(p, second.id)
  console.log('\n第 2 章第 1 场正文（含上下文注入）：')
  console.log(secondMs?.scenes[0].content)

  const book = await store.loadBookSummary(p)
  console.log('\n全书摘要：', book?.summary)

  const hist = await store.history(p)
  console.log('\n版本历史（git，共', hist.length, '次提交）：')
  for (const h of hist) {
    console.log(`  ${h.hash.slice(0, 8)}  ${h.message}`)
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
