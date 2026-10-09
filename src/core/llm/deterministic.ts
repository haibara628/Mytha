import type {
  Bible,
  Framework,
  Character,
  PlotThread,
  GlossaryEntry,
  World,
  StyleCard,
  Act,
  ArcEntry,
  Seed,
  Outline,
  Chapter,
  SceneCard,
  SceneDraft,
  CharacterStateChange,
  PlotThreadAdvance,
  ChapterGeneration,
  PlotThreadStatus
} from '../model/types'
import type { ChapterContext } from '../context/assembler'

/**
 * 确定性参考实现：把「seed → 圣经」「圣经 → 框架」的转换写成纯函数。
 * 作用：
 *  1) 无 API key 时也能跑通全流程；
 *  2) 同一输入必然得到同一输出，作为一致性测试的 oracle；
 *  3) 后续接入真实模型时，作为对比基准 / fallback。
 */

export function buildBibleFromSeed(seed: Seed): Bible {
  const characters: Character[] = seed.characterSeeds.map((cs, i) => {
    const id = `c${String(i + 1).padStart(3, '0')}`
    return {
      id,
      name: cs.name || `角色${i + 1}`,
      aliases: [],
      static: {
        role: cs.role || (i === 0 ? '主角' : '配角'),
        traits: [],
        background: cs.description || '（待深化）',
        goal: '（待深化）',
        flaw: '（待深化）'
      },
      dynamic: {
        location: '（未定）',
        inventory: [],
        relationships: [],
        knowledge: [],
        emotionalState: '平静'
      },
      arc: { stage: '起点', nextBeat: '（待定）' },
      voice: '（待定）'
    }
  })

  const plotThreads: PlotThread[] = [
    {
      id: 'pt001',
      title: '主线',
      description: seed.synopsis || seed.premise,
      status: 'planted',
      relatedCharacterIds: characters.map((c) => c.id)
    },
    ...characters.map((c, i) => ({
      id: `pt${String(i + 2).padStart(3, '0')}`,
      title: `${c.name}的弧线`,
      description: `围绕 ${c.name}（目标：${c.static.goal}）展开的情节线`,
      status: 'planted' as const,
      relatedCharacterIds: [c.id]
    }))
  ]

  const glossary: GlossaryEntry[] = characters.map((c) => ({
    term: c.name,
    definition: `${c.static.role}${c.static.background !== '（待深化）' ? '：' + c.static.background : ''}`,
    category: '人物'
  }))

  const world: World = {
    era: '（待设定时代）',
    rules: [],
    powerSystem: '（待设定力量体系）',
    geography: '（待设定地理）',
    tone: '正剧',
    background: seed.premise
  }

  const style: StyleCard = {
    pov: '第三人称',
    tense: '过去式',
    tone: '正剧',
    sentenceStyle: '中等长度，节奏平稳',
    dialogueStyle: '自然口语',
    prohibitions: ['避免网络流行语']
  }

  return {
    world,
    characters,
    plotThreads,
    glossary,
    style,
    locations: [],
    factions: [],
    items: [],
    timeline: []
  }
}

export function buildFrameworkFromBible(bible: Bible): Framework {
  const acts: Act[] = [
    {
      id: 'act1',
      index: 1,
      title: '开端 · 建置',
      goal: '建立世界观、引入主要人物与核心冲突',
      conflict: '主角面对最初的阻力',
      turningPoint: '主角被迫离开舒适区 / 接受召唤',
      summary: '铺垫背景与人物关系，抛出主线。'
    },
    {
      id: 'act2',
      index: 2,
      title: '发展 · 对抗',
      goal: '深化冲突、推进主线、埋设与回收伏笔',
      conflict: '矛盾升级，主角遭遇重大挫折',
      turningPoint: '中点转折：主角掌握关键信息 / 力量',
      summary: '情节层层推进，人物弧线发生转变。'
    },
    {
      id: 'act3',
      index: 3,
      title: '高潮 · 收束',
      goal: '冲突集中爆发并收束主线',
      conflict: '终极对决',
      turningPoint: '高潮决战，主角完成成长',
      summary: '主线收束，伏笔回收，人物弧线完成。'
    }
  ]

  const arcs: ArcEntry[] = bible.characters.map((c) => ({
    characterId: c.id,
    characterName: c.name,
    arc: [`起点：${c.arc.stage}`, '发展：遭遇转折', '成长：完成弧线']
  }))

  return { acts, arcs }
}

const NEXT_STATUS: Record<PlotThreadStatus, PlotThreadStatus> = {
  planted: 'advanced',
  advanced: 'revealed',
  revealed: 'resolved',
  resolved: 'resolved'
}

/**
 * 阶段2：框架 → 提纲。每幕固定拆 2 章、每章 2 场（确定性，无随机）。
 * 场景卡轮流出场人物与伏笔，并声明各自推进的伏笔。
 */
export function buildOutlineFromFramework(bible: Bible, framework: Framework): Outline {
  const charIds = bible.characters.map((c) => c.id)
  const threadIds = bible.plotThreads.map((t) => t.id)
  const chapters: Chapter[] = []
  let chapterIdx = 0

  for (const act of framework.acts) {
    for (let ci = 0; ci < 2; ci++) {
      chapterIdx++
      const scenes: SceneCard[] = []
      for (let si = 0; si < 2; si++) {
        const globalSceneIdx = (chapterIdx - 1) * 2 + si
        const characterIds = charIds.length ? [charIds[globalSceneIdx % charIds.length]] : []
        // 每章第 2 场让两名角色同场，触发关系回写
        if (charIds.length >= 2 && si === 1) {
          characterIds.push(charIds[(globalSceneIdx + 1) % charIds.length])
        }
        const plotThreadIds = threadIds.length ? [threadIds[globalSceneIdx % threadIds.length]] : []
        const leadName = bible.characters.find((c) => c.id === characterIds[0])?.name ?? '主角'
        scenes.push({
          id: `s${String(globalSceneIdx + 1).padStart(3, '0')}`,
          index: si + 1,
          goal: `推进第${act.index}幕目标：${act.goal}`,
          conflict: `围绕「${leadName}」的局部冲突`,
          turningPoint: '场景末尾的小转折',
          characterIds,
          plotThreadIds,
          summary: `第${chapterIdx}章第${si + 1}场：${act.title}的情节推进。`
        })
      }
      chapters.push({
        id: `ch${String(chapterIdx).padStart(3, '0')}`,
        index: chapterIdx,
        title: `第${chapterIdx}章`,
        goal: act.goal,
        summary: `承接第${act.index}幕，推进主线。`,
        scenes
      })
    }
  }
  return { chapters }
}

/**
 * 阶段3：章节上下文（组装器产出）→ 场景正文 + 摘要 + 状态变更（确定性）。
 * 正文是结构化标记而非真实文笔（mock 只证明流水线），
 * 但会体现上下文注入：首场承接上一章摘要，出场人名/伏笔来自组装后的上下文。
 * 状态变更：出场人物推进情绪/获得信息，≥2 人同场时回写人物关系，声明伏笔推进一格。
 */
export function buildChapterGeneration(context: ChapterContext): ChapterGeneration {
  const { chapter, characters, plotThreads, previousChapterSummary } = context
  const charById = new Map(characters.map((c) => [c.id, c]))
  const threadById = new Map(plotThreads.map((t) => [t.id, t]))
  const scenes: SceneDraft[] = []
  const charMap = new Map<string, CharacterStateChange>()
  const threadMap = new Map<string, PlotThreadAdvance>()

  chapter.scenes.forEach((sc, si) => {
    const names = sc.characterIds.map((id) => charById.get(id)?.name ?? '某人')
    const continuity = si === 0 && previousChapterSummary ? `\n承接上章：${previousChapterSummary}` : ''
    const content = [
      `【第${chapter.index}章 · 第${sc.index}场】`,
      `目标：${sc.goal}`,
      `冲突：${sc.conflict}`,
      `出场：${names.join('、') || '（无）'}`,
      `转折：${sc.turningPoint}`,
      continuity
    ]
      .filter(Boolean)
      .join('\n')
    const summary = `${sc.summary}（${names.join('、') || '无出场'}）`
    scenes.push({ sceneId: sc.id, content, summary })

    sc.characterIds.forEach((cid, k) => {
      const gained = `第${chapter.index}章第${sc.index}场的信息`
      const existing = charMap.get(cid)
      if (existing) {
        existing.knowledgeGained = [...(existing.knowledgeGained ?? []), gained]
        existing.emotionalState = ['紧张', '坚定', '释然'][(si + k) % 3]
      } else {
        charMap.set(cid, {
          characterId: cid,
          emotionalState: ['紧张', '坚定', '释然'][(si + k) % 3],
          knowledgeGained: [gained]
        })
      }
    })

    // 关系回写：同场 ≥2 人时，为第一人建立对第二人的关系
    if (sc.characterIds.length >= 2) {
      const [a, b] = sc.characterIds
      const existing = charMap.get(a) ?? { characterId: a }
      existing.relationshipUpserts = [
        ...(existing.relationshipUpserts ?? []),
        { targetId: b, type: '关联', intensity: 0.5 }
      ]
      charMap.set(a, existing)
    }

    sc.plotThreadIds.forEach((tid) => {
      const t = threadById.get(tid)
      if (t && !threadMap.has(tid)) {
        threadMap.set(tid, { plotThreadId: tid, status: NEXT_STATUS[t.status] })
      }
    })
  })

  return {
    scenes,
    stateChanges: {
      characters: [...charMap.values()],
      plotThreads: [...threadMap.values()]
    },
    chapterSummary: `第${chapter.index}章完成：${chapter.summary}`
  }
}
