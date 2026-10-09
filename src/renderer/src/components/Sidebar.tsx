import type { LoadedProject, ProjectSummary } from '../../../shared/ipc'
import type { Selection } from './EditorPane'

interface Props {
  projects: ProjectSummary[]
  current: LoadedProject | null
  selection: Selection
  onNew(): void
  onOpen(slug: string): void
  onSelect(s: Selection): void
}

export function Sidebar({ projects, current, selection, onNew, onOpen, onSelect }: Props) {
  return (
    <div className="sidebar">
      <button className="new-btn" onClick={onNew}>
        ＋ 新建项目
      </button>

      <div className="section-title">项目</div>
      <ul className="proj-list">
        {projects.map((p) => (
          <li
            key={p.slug}
            className={current?.project.slug === p.slug ? 'active' : ''}
            onClick={() => onOpen(p.slug)}
          >
            {p.name}
          </li>
        ))}
      </ul>

      {current && <Tree current={current} selection={selection} onSelect={onSelect} />}
    </div>
  )
}

function Tree({
  current,
  selection,
  onSelect
}: {
  current: LoadedProject
  selection: Selection
  onSelect(s: Selection): void
}) {
  const { bible, framework, outline } = current
  return (
    <ul className="tree">
      <li
        className={selection.kind === 'seed' ? 'active' : ''}
        onClick={() => onSelect({ kind: 'seed' })}
      >
        项目信息
      </li>

      {bible && (
        <>
          <li className="group">故事圣经</li>
          <li
            className={selection.kind === 'world' ? 'active' : ''}
            onClick={() => onSelect({ kind: 'world' })}
          >
            世界观
          </li>
          {bible.characters.map((c) => (
            <li
              key={c.id}
              className={selection.kind === 'character' && selection.id === c.id ? 'active' : ''}
              onClick={() => onSelect({ kind: 'character', id: c.id })}
            >
              · {c.name}
            </li>
          ))}
          <li
            className={selection.kind === 'plotThreads' ? 'active' : ''}
            onClick={() => onSelect({ kind: 'plotThreads' })}
          >
            伏笔
          </li>
          <li
            className={selection.kind === 'glossary' ? 'active' : ''}
            onClick={() => onSelect({ kind: 'glossary' })}
          >
            名词表
          </li>
          <li
            className={selection.kind === 'style' ? 'active' : ''}
            onClick={() => onSelect({ kind: 'style' })}
          >
            文风
          </li>
        </>
      )}

      {framework && (
        <>
          <li className="group">框架</li>
          <li
            className={selection.kind === 'acts' ? 'active' : ''}
            onClick={() => onSelect({ kind: 'acts' })}
          >
            三幕结构
          </li>
          <li
            className={selection.kind === 'arcs' ? 'active' : ''}
            onClick={() => onSelect({ kind: 'arcs' })}
          >
            人物弧线
          </li>
        </>
      )}

      {outline && (
        <>
          <li className="group">提纲</li>
          <li
            className={selection.kind === 'outline' ? 'active' : ''}
            onClick={() => onSelect({ kind: 'outline' })}
          >
            章节列表
          </li>
          <li className="group">正文</li>
          {outline.chapters.map((ch) => (
            <li
              key={ch.id}
              className={selection.kind === 'chapter' && selection.id === ch.id ? 'active' : ''}
              onClick={() => onSelect({ kind: 'chapter', id: ch.id })}
            >
              · {ch.title}
            </li>
          ))}
        </>
      )}

      <li
        className={selection.kind === 'history' ? 'active' : ''}
        onClick={() => onSelect({ kind: 'history' })}
      >
        版本历史
      </li>
    </ul>
  )
}
