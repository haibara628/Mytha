import { useEffect, useState } from 'react'
import type {
  Act,
  ArcEntry,
  Bible,
  Chapter,
  ChapterManuscript,
  Character,
  Framework,
  GlossaryEntry,
  Outline,
  PlotThread,
  Seed,
  StyleCard,
  World
} from '../../../core/model/types'
import type { CommitEntry, LoadedProject } from '../../../shared/ipc'
import { ListField, TextArea, TextField } from './fields'

export type Selection =
  | { kind: 'seed' }
  | { kind: 'world' }
  | { kind: 'character'; id: string }
  | { kind: 'plotThreads' }
  | { kind: 'glossary' }
  | { kind: 'style' }
  | { kind: 'acts' }
  | { kind: 'arcs' }
  | { kind: 'outline' }
  | { kind: 'chapter'; id: string }
  | { kind: 'history' }

interface Props {
  current: LoadedProject | null
  selection: Selection
  revision: number
  onSaveBible(b: Bible): void
  onSaveFramework(f: Framework): void
  onSaveSeed(s: Seed): void
}

export function EditorPane({
  current,
  selection,
  revision,
  onSaveBible,
  onSaveFramework,
  onSaveSeed
}: Props) {
  if (!current) {
    return <div className="empty">选择左侧项目，或点击「新建项目」开始。</div>
  }
  const { project, bible, framework, outline } = current

  switch (selection.kind) {
    case 'seed':
      return <SeedEditor seed={project.seed} onSave={onSaveSeed} />
    case 'world':
      return bible ? (
        <WorldEditor world={bible.world} onSave={(w) => onSaveBible({ ...bible, world: w })} />
      ) : (
        <EmptyHint />
      )
    case 'character': {
      const c = bible?.characters.find((x) => x.id === selection.id)
      return c && bible ? (
        <CharacterEditor
          character={c}
          allCharacters={bible.characters}
          onSave={(nc) =>
            onSaveBible({ ...bible, characters: bible.characters.map((x) => (x.id === nc.id ? nc : x)) })
          }
        />
      ) : (
        <EmptyHint />
      )
    }
    case 'plotThreads':
      return bible ? <PlotThreadsView threads={bible.plotThreads} /> : <EmptyHint />
    case 'glossary':
      return bible ? <GlossaryView entries={bible.glossary} /> : <EmptyHint />
    case 'style':
      return bible ? (
        <StyleEditor style={bible.style} onSave={(s) => onSaveBible({ ...bible, style: s })} />
      ) : (
        <EmptyHint />
      )
    case 'acts':
      return framework ? <ActsView acts={framework.acts} /> : <EmptyHint />
    case 'arcs':
      return framework ? <ArcsView arcs={framework.arcs} /> : <EmptyHint />
    case 'outline':
      return outline ? <OutlineView outline={outline} bible={bible} /> : <EmptyHint />
    case 'chapter':
      return outline ? (
        <ChapterView
          slug={project.slug}
          chapterId={selection.id}
          outline={outline}
          bible={bible}
          revision={revision}
        />
      ) : (
        <EmptyHint />
      )
    case 'history':
      return <HistoryView slug={project.slug} />
    default:
      return null
  }
}

function EmptyHint() {
  return <div className="empty">尚未生成，请在右侧向导运行对应阶段。</div>
}

// ---- 项目信息 ----
function SeedEditor({ seed, onSave }: { seed: Seed; onSave(s: Seed): void }) {
  const [draft, setDraft] = useState(seed)
  useEffect(() => setDraft(seed), [seed])
  return (
    <div className="editor">
      <h2>项目信息</h2>
      <TextArea label="背景" value={draft.premise} onChange={(v) => setDraft({ ...draft, premise: v })} />
      <TextArea label="梗概" value={draft.synopsis} onChange={(v) => setDraft({ ...draft, synopsis: v })} />
      <button className="primary" onClick={() => onSave(draft)}>
        保存
      </button>
    </div>
  )
}

// ---- 世界观 ----
function WorldEditor({ world, onSave }: { world: World; onSave(w: World): void }) {
  const [draft, setDraft] = useState(world)
  useEffect(() => setDraft(world), [world])
  const set = (k: keyof World, v: unknown) => setDraft({ ...draft, [k]: v })
  return (
    <div className="editor">
      <h2>世界观</h2>
      <TextArea label="背景" value={draft.background ?? ''} onChange={(v) => set('background', v)} />
      <TextField label="时代" value={draft.era} onChange={(v) => set('era', v)} />
      <TextField label="力量体系" value={draft.powerSystem} onChange={(v) => set('powerSystem', v)} />
      <TextField label="地理" value={draft.geography} onChange={(v) => set('geography', v)} />
      <TextField label="基调" value={draft.tone} onChange={(v) => set('tone', v)} />
      <ListField label="规则" value={draft.rules} onChange={(v) => set('rules', v)} />
      <button className="primary" onClick={() => onSave(draft)}>
        保存世界观
      </button>
    </div>
  )
}

// ---- 人物卡 ----
function CharacterEditor({
  character,
  allCharacters,
  onSave
}: {
  character: Character
  allCharacters: Character[]
  onSave(c: Character): void
}) {
  const [draft, setDraft] = useState(character)
  useEffect(() => setDraft(character), [character])
  const setStatic = (k: keyof Character['static'], v: unknown) =>
    setDraft({ ...draft, static: { ...draft.static, [k]: v } })
  const setDynamic = (k: keyof Character['dynamic'], v: unknown) =>
    setDraft({ ...draft, dynamic: { ...draft.dynamic, [k]: v } })
  const setArc = (k: keyof Character['arc'], v: string) =>
    setDraft({ ...draft, arc: { ...draft.arc, [k]: v } })

  return (
    <div className="editor">
      <h2>人物卡 · {draft.name}</h2>
      <TextField label="姓名" value={draft.name} onChange={(v) => setDraft({ ...draft, name: v })} />
      <ListField
        label="别名"
        value={draft.aliases}
        onChange={(v) => setDraft({ ...draft, aliases: v })}
      />

      <h3>静态设定</h3>
      <TextField label="定位" value={draft.static.role} onChange={(v) => setStatic('role', v)} />
      <ListField label="性格特质" value={draft.static.traits} onChange={(v) => setStatic('traits', v)} />
      <TextArea label="背景" value={draft.static.background} onChange={(v) => setStatic('background', v)} />
      <TextField label="目标" value={draft.static.goal} onChange={(v) => setStatic('goal', v)} />
      <TextField label="缺陷" value={draft.static.flaw} onChange={(v) => setStatic('flaw', v)} />

      <h3>动态状态</h3>
      <TextField
        label="当前位置"
        value={draft.dynamic.location}
        onChange={(v) => setDynamic('location', v)}
      />
      <ListField
        label="持有物品"
        value={draft.dynamic.inventory}
        onChange={(v) => setDynamic('inventory', v)}
      />
      <ListField
        label="已知信息"
        value={draft.dynamic.knowledge}
        onChange={(v) => setDynamic('knowledge', v)}
      />
      <TextField
        label="情绪状态"
        value={draft.dynamic.emotionalState}
        onChange={(v) => setDynamic('emotionalState', v)}
      />

      <h3>关系</h3>
      {draft.dynamic.relationships.length === 0 ? (
        <div className="muted">暂无关系（随正文生成回写）。</div>
      ) : (
        draft.dynamic.relationships.map((r, i) => (
          <div key={i} className="muted">
            → {allCharacters.find((c) => c.id === r.targetId)?.name ?? r.targetId}（{r.type}，强度{' '}
            {r.intensity}）
          </div>
        ))
      )}

      <h3>弧线</h3>
      <TextField label="当前阶段" value={draft.arc.stage} onChange={(v) => setArc('stage', v)} />
      <TextField label="下一节点" value={draft.arc.nextBeat} onChange={(v) => setArc('nextBeat', v)} />

      <h3>语声</h3>
      <TextField label="人物语言风格" value={draft.voice} onChange={(v) => setDraft({ ...draft, voice: v })} />

      <button className="primary" onClick={() => onSave(draft)}>
        保存人物卡
      </button>
    </div>
  )
}

// ---- 文风 ----
function StyleEditor({ style, onSave }: { style: StyleCard; onSave(s: StyleCard): void }) {
  const [draft, setDraft] = useState(style)
  useEffect(() => setDraft(style), [style])
  const set = (k: keyof StyleCard, v: unknown) => setDraft({ ...draft, [k]: v })
  return (
    <div className="editor">
      <h2>文风卡</h2>
      <TextField label="视角/人称" value={draft.pov} onChange={(v) => set('pov', v)} />
      <TextField label="时态" value={draft.tense} onChange={(v) => set('tense', v)} />
      <TextField label="基调" value={draft.tone} onChange={(v) => set('tone', v)} />
      <TextField label="句式风格" value={draft.sentenceStyle} onChange={(v) => set('sentenceStyle', v)} />
      <TextField label="对话风格" value={draft.dialogueStyle} onChange={(v) => set('dialogueStyle', v)} />
      <ListField
        label="禁止事项"
        value={draft.prohibitions}
        onChange={(v) => set('prohibitions', v)}
      />
      <button className="primary" onClick={() => onSave(draft)}>
        保存文风卡
      </button>
    </div>
  )
}

// ---- 伏笔 ----
function PlotThreadsView({ threads }: { threads: PlotThread[] }) {
  const label: Record<string, string> = {
    planted: '埋下',
    advanced: '推进中',
    revealed: '揭晓',
    resolved: '回收'
  }
  const counts = { planted: 0, advanced: 0, revealed: 0, resolved: 0 }
  threads.forEach((t) => counts[t.status]++)
  return (
    <div className="editor">
      <h2>伏笔 / 情节线</h2>
      <div className="muted" style={{ marginBottom: 10 }}>
        埋下 {counts.planted} · 推进中 {counts.advanced} · 揭晓 {counts.revealed} · 回收 {counts.resolved}
        {counts.planted > counts.resolved && '　⚠ 存在「埋了未挖」的伏笔'}
      </div>
      <div className="card-list">
        {threads.map((t) => (
          <div key={t.id} className="card">
            <h3>
              {t.title} <span className="muted">[{label[t.status] ?? t.status}]</span>
            </h3>
            <div>{t.description}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ---- 名词表 ----
function GlossaryView({ entries }: { entries: GlossaryEntry[] }) {
  return (
    <div className="editor">
      <h2>专有名词表</h2>
      <div className="card-list">
        {entries.map((g, i) => (
          <div key={i} className="card">
            <h3>
              {g.term} <span className="muted">[{g.category}]</span>
            </h3>
            <div>{g.definition}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ---- 三幕 ----
function ActsView({ acts }: { acts: Act[] }) {
  return (
    <div className="editor">
      <h2>三幕结构</h2>
      <div className="card-list">
        {acts.map((a) => (
          <div key={a.id} className="card">
            <h3>
              第{a.index}幕 · {a.title}
            </h3>
            <div>
              <b>目标：</b>
              {a.goal}
            </div>
            <div>
              <b>冲突：</b>
              {a.conflict}
            </div>
            <div>
              <b>转折：</b>
              {a.turningPoint}
            </div>
            <div>
              <b>摘要：</b>
              {a.summary}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ---- 人物弧线 ----
function ArcsView({ arcs }: { arcs: ArcEntry[] }) {
  return (
    <div className="editor">
      <h2>人物弧线</h2>
      <div className="card-list">
        {arcs.map((a) => (
          <div key={a.characterId} className="card">
            <h3>{a.characterName}</h3>
            <ol>
              {a.arc.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ol>
          </div>
        ))}
      </div>
    </div>
  )
}

// ---- 版本历史 ----
function HistoryView({ slug }: { slug: string }) {
  const [commits, setCommits] = useState<CommitEntry[]>([])
  useEffect(() => {
    window.api.history(slug).then(setCommits).catch(() => setCommits([]))
  }, [slug])
  return (
    <div className="editor">
      <h2>版本历史</h2>
      {commits.length === 0 ? (
        <div className="muted">暂无提交。</div>
      ) : (
        <div className="card-list">
          {commits.map((c) => (
            <div key={c.hash} className="card">
              <h3>{c.message}</h3>
              <div className="muted">
                {c.date} · {c.hash.slice(0, 8)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ---- 提纲 ----
function OutlineView({ outline, bible }: { outline: Outline; bible: Bible | null }) {
  const charName = (id: string) => bible?.characters.find((c) => c.id === id)?.name ?? id
  const threadTitle = (id: string) => bible?.plotThreads.find((t) => t.id === id)?.title ?? id
  return (
    <div className="editor">
      <h2>提纲（{outline.chapters.length} 章）</h2>
      <div className="card-list">
        {outline.chapters.map((ch) => (
          <div key={ch.id} className="card">
            <h3>{ch.title}</h3>
            <div className="muted">{ch.goal}</div>
            <div>{ch.summary}</div>
            {ch.scenes.map((sc) => (
              <div key={sc.id} className="scene-item">
                <div>
                  <b>场 {sc.index}</b> · {sc.goal}
                </div>
                <div className="muted">冲突：{sc.conflict}｜转折：{sc.turningPoint}</div>
                <div className="muted">
                  出场：{sc.characterIds.map(charName).join('、') || '无'} ｜ 伏笔：
                  {sc.plotThreadIds.map(threadTitle).join('、') || '无'}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

// ---- 章节正文 ----
function ChapterView({
  slug,
  chapterId,
  outline,
  bible,
  revision
}: {
  slug: string
  chapterId: string
  outline: Outline
  bible: Bible | null
  revision: number
}) {
  const chapter = outline.chapters.find((c) => c.id === chapterId)
  const [ms, setMs] = useState<ChapterManuscript | null>(null)
  useEffect(() => {
    window.api.loadChapter(slug, chapterId).then(setMs).catch(() => setMs(null))
  }, [slug, chapterId, revision])

  if (!chapter) return <div className="empty">找不到该章节。</div>

  const sceneIndex = (id: string) => chapter.scenes.find((c) => c.id === id)?.index ?? '?'
  const charName = (id: string) => bible?.characters.find((c) => c.id === id)?.name ?? id
  const threadTitle = (id: string) => bible?.plotThreads.find((t) => t.id === id)?.title ?? id

  return (
    <div className="editor">
      <h2>{chapter.title}</h2>
      <div className="muted">目标：{chapter.goal}</div>

      {ms ? (
        <>
          <div className="card-list" style={{ marginTop: 12 }}>
            {ms.scenes.map((sc) => (
              <div key={sc.sceneId} className="card">
                <h3>场 {sceneIndex(sc.sceneId)}</h3>
                <pre className="prose">{sc.content}</pre>
                <div className="muted">摘要：{sc.summary}</div>
              </div>
            ))}
          </div>

          <div className="card" style={{ marginTop: 12 }}>
            <h3>状态回写（已写入圣经）</h3>
            {ms.stateChanges.characters.length === 0 && ms.stateChanges.plotThreads.length === 0 ? (
              <div className="muted">无状态变更。</div>
            ) : (
              <>
                <div>
                  <b>人物：</b>
                  {ms.stateChanges.characters
                    .map((c) => `${charName(c.characterId)} → ${c.emotionalState ?? '（不变）'}`)
                    .join('；')}
                </div>
                <div>
                  <b>伏笔：</b>
                  {ms.stateChanges.plotThreads
                    .map((p) => `${threadTitle(p.plotThreadId)} → ${p.status}`)
                    .join('；')}
                </div>
              </>
            )}
          </div>

          <div className="card" style={{ marginTop: 12 }}>
            <h3>一致性校验</h3>
            {ms.findings.length === 0 ? (
              <div className="muted">未发现矛盾。</div>
            ) : (
              ms.findings.map((f, i) => (
                <div key={i} className={f.severity === 'error' ? 'finding-error' : 'finding-warn'}>
                  [{f.severity}] {f.rule}：{f.message}
                </div>
              ))
            )}
          </div>
        </>
      ) : (
        <div className="empty">本章正文尚未生成，请在右侧向导选择本章并点「生成该章正文」。</div>
      )}
    </div>
  )
}
