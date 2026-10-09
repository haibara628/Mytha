import { useEffect, useState } from 'react'
import type { LoadedProject } from '../../../shared/ipc'
import type { CharacterSeed, Seed } from '../../../core/model/types'
import { TextField, TextArea } from './fields'

interface Props {
  current: LoadedProject | null
  busy: boolean
  log: string[]
  onCreate(name: string, seed: Seed): void
  onRunWorld(): void
  onRunFramework(): void
  onRunOutline(): void
  onRunChapter(chapterId: string): void
  onSaveSeed(seed: Seed): void
}

export function Wizard(props: Props) {
  return (
    <div className="wizard">
      <h2>{props.current ? 'AI 创作向导' : '新建项目'}</h2>
      {props.current ? (
        <ProjectWizard
          current={props.current}
          busy={props.busy}
          log={props.log}
          onRunWorld={props.onRunWorld}
          onRunFramework={props.onRunFramework}
          onRunOutline={props.onRunOutline}
          onRunChapter={props.onRunChapter}
          onSaveSeed={props.onSaveSeed}
        />
      ) : (
        <CreateForm onCreate={props.onCreate} />
      )}
    </div>
  )
}

function CreateForm({ onCreate }: { onCreate(name: string, seed: Seed): void }) {
  const [name, setName] = useState('')
  const [premise, setPremise] = useState('')
  const [synopsis, setSynopsis] = useState('')
  const [seeds, setSeeds] = useState<CharacterSeed[]>([{ name: '', role: '主角', description: '' }])

  const submit = () => {
    const seed: Seed = { premise, synopsis, characterSeeds: seeds.filter((s) => s.name.trim()) }
    onCreate(name.trim() || '未命名小说', seed)
  }

  return (
    <div className="create-form">
      <TextField label="项目名称" value={name} onChange={setName} />
      <TextArea label="背景（世界 / 时代 / 设定）" value={premise} onChange={setPremise} />
      <TextArea label="梗概（一句话主线）" value={synopsis} onChange={setSynopsis} />
      <CharacterSeedsEditor value={seeds} onChange={setSeeds} />
      <button className="primary" onClick={submit} disabled={!synopsis.trim()}>
        创建并进入项目
      </button>
    </div>
  )
}

interface ProjectWizardProps {
  current: LoadedProject
  busy: boolean
  log: string[]
  onRunWorld(): void
  onRunFramework(): void
  onRunOutline(): void
  onRunChapter(chapterId: string): void
  onSaveSeed(seed: Seed): void
}

function ProjectWizard({
  current,
  busy,
  log,
  onRunWorld,
  onRunFramework,
  onRunOutline,
  onRunChapter,
  onSaveSeed
}: ProjectWizardProps) {
  const [seed, setSeed] = useState<Seed>(current.project.seed)
  const [chapterId, setChapterId] = useState('')
  useEffect(() => setSeed(current.project.seed), [current.project.seed])
  useEffect(() => {
    if (current.outline && !current.outline.chapters.some((c) => c.id === chapterId)) {
      setChapterId(current.outline.chapters[0]?.id ?? '')
    }
  }, [current.outline, chapterId])

  return (
    <div className="project-wizard">
      <div className="step-note">阶段 0 → 1：先完善种子，再逐级生成（可重跑覆盖）。</div>

      <TextArea
        label="背景"
        value={seed.premise}
        rows={2}
        onChange={(v) => setSeed({ ...seed, premise: v })}
      />
      <TextArea
        label="梗概"
        value={seed.synopsis}
        rows={2}
        onChange={(v) => setSeed({ ...seed, synopsis: v })}
      />
      <CharacterSeedsEditor
        value={seed.characterSeeds}
        onChange={(v) => setSeed({ ...seed, characterSeeds: v })}
      />

      <button onClick={() => onSaveSeed(seed)} disabled={busy}>
        保存种子
      </button>
      <hr />
      <button className="primary" onClick={onRunWorld} disabled={busy}>
        ① 生成故事圣经{current.bible ? '（重跑覆盖）' : ''}
      </button>
      <button className="primary" onClick={onRunFramework} disabled={busy || !current.bible}>
        ② 生成框架
      </button>
      <button className="primary" onClick={onRunOutline} disabled={busy || !current.framework}>
        ③ 生成提纲{current.outline ? '（重跑覆盖）' : ''}
      </button>

      {current.outline && (
        <>
          <div className="field">
            <span className="field-label">生成章节正文</span>
            <select value={chapterId} onChange={(e) => setChapterId(e.target.value)}>
              {current.outline.chapters.map((ch) => (
                <option key={ch.id} value={ch.id}>
                  {ch.title}
                </option>
              ))}
            </select>
          </div>
          <button className="primary" onClick={() => onRunChapter(chapterId)} disabled={busy || !chapterId}>
            ④ 生成该章正文
          </button>
        </>
      )}

      {busy && <div className="busy">生成中…</div>}
      {log.length > 0 && (
        <div className="log">
          {log.map((l, i) => (
            <div key={i}>{l}</div>
          ))}
        </div>
      )}
    </div>
  )
}

function CharacterSeedsEditor({
  value,
  onChange
}: {
  value: CharacterSeed[]
  onChange(v: CharacterSeed[]): void
}) {
  const update = (i: number, patch: Partial<CharacterSeed>) =>
    onChange(value.map((c, idx) => (idx === i ? { ...c, ...patch } : c)))
  const add = () => onChange([...value, { name: '', role: '', description: '' }])
  const remove = (i: number) => onChange(value.filter((_, idx) => idx !== i))

  return (
    <div className="seeds">
      <div className="seeds-header">
        <span>主要人物</span>
        <button type="button" onClick={add}>
          ＋ 添加
        </button>
      </div>
      {value.map((c, i) => (
        <div key={i} className="seed-card">
          <input
            placeholder="姓名"
            value={c.name}
            onChange={(e) => update(i, { name: e.target.value })}
          />
          <input
            placeholder="定位（主角 / 对手 / 导师…）"
            value={c.role ?? ''}
            onChange={(e) => update(i, { role: e.target.value })}
          />
          <input
            placeholder="一句话描述"
            value={c.description ?? ''}
            onChange={(e) => update(i, { description: e.target.value })}
          />
          <button type="button" onClick={() => remove(i)}>
            删除
          </button>
        </div>
      ))}
    </div>
  )
}
