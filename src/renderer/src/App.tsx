import { useCallback, useEffect, useState } from 'react'
import type { Bible, Framework, Project, Seed } from '../../core/model/types'
import type { ImpactResult, LoadedProject, ProjectSummary } from '../../shared/ipc'
import { Sidebar } from './components/Sidebar'
import { Wizard } from './components/Wizard'
import { EditorPane, type Selection } from './components/EditorPane'

export default function App() {
  const [projects, setProjects] = useState<ProjectSummary[]>([])
  const [current, setCurrent] = useState<LoadedProject | null>(null)
  const [selection, setSelection] = useState<Selection>({ kind: 'seed' })
  const [busy, setBusy] = useState(false)
  const [log, setLog] = useState<string[]>([])
  const [revision, setRevision] = useState(0)
  const [impact, setImpact] = useState<ImpactResult | null>(null)

  const refreshProjects = useCallback(async () => {
    setProjects(await window.api.listProjects())
  }, [])

  useEffect(() => {
    refreshProjects()
  }, [refreshProjects])

  const openProject = useCallback(async (slug: string) => {
    const loaded = await window.api.loadProject(slug)
    setCurrent(loaded)
    setSelection({ kind: 'seed' })
    setLog([])
  }, [])

  const createProject = useCallback(
    async (name: string, seed: Seed) => {
      const p = await window.api.createProject({ name, seed })
      await refreshProjects()
      await openProject(p.slug)
    },
    [refreshProjects, openProject]
  )

  const runWorld = useCallback(async () => {
    if (!current) return
    setBusy(true)
    setLog((l) => [...l, '① 生成故事圣经中…'])
    try {
      const bible = await window.api.runWorld(current.project.slug)
      setCurrent((c) => (c ? { ...c, bible } : c))
      setSelection({ kind: 'world' })
      setLog((l) => [...l, '故事圣经已生成并落盘。'])
    } catch (err) {
      setLog((l) => [...l, '错误：' + (err as Error).message])
    } finally {
      setBusy(false)
    }
  }, [current])

  const runFramework = useCallback(async () => {
    if (!current) return
    setBusy(true)
    setLog((l) => [...l, '② 生成框架中…'])
    try {
      const framework = await window.api.runFramework(current.project.slug)
      setCurrent((c) => (c ? { ...c, framework } : c))
      setSelection({ kind: 'acts' })
      setLog((l) => [...l, '框架已生成并落盘。'])
    } catch (err) {
      setLog((l) => [...l, '错误：' + (err as Error).message])
    } finally {
      setBusy(false)
    }
  }, [current])

  const runOutline = useCallback(async () => {
    if (!current) return
    setBusy(true)
    setLog((l) => [...l, '③ 生成提纲中…'])
    try {
      const outline = await window.api.runOutline(current.project.slug)
      setCurrent((c) => (c ? { ...c, outline } : c))
      setSelection({ kind: 'outline' })
      setLog((l) => [...l, `提纲已生成（${outline.chapters.length} 章）并落盘。`])
    } catch (err) {
      setLog((l) => [...l, '错误：' + (err as Error).message])
    } finally {
      setBusy(false)
    }
  }, [current])

  const runChapter = useCallback(
    async (chapterId: string) => {
      if (!current) return
      setBusy(true)
      setLog((l) => [...l, `④ 生成章节 ${chapterId} 正文中…`])
      try {
        const res = await window.api.runChapter(current.project.slug, chapterId)
        setCurrent((c) => (c ? { ...c, bible: res.bible } : c))
        setRevision((r) => r + 1)
        setSelection({ kind: 'chapter', id: chapterId })
        setLog((l) => [...l, `章节 ${chapterId} 已生成，状态快照已回写圣经。`])
      } catch (err) {
        setLog((l) => [...l, '错误：' + (err as Error).message])
      } finally {
        setBusy(false)
      }
    },
    [current]
  )

  const saveBible = useCallback(
    async (bible: Bible) => {
      if (!current) return
      const prev = current.bible
      await window.api.saveBible(current.project.slug, bible)
      const nextImpact = prev
        ? await window.api.analyzeImpact(current.project.slug, prev, bible)
        : null
      setImpact(nextImpact)
      setCurrent({ ...current, bible })
    },
    [current]
  )

  const rewriteChapters = useCallback(
    async (chapterIds: string[]) => {
      if (!current || chapterIds.length === 0) return
      setBusy(true)
      setLog((l) => [...l, `重写 ${chapterIds.length} 章正文中…`])
      try {
        const res = await window.api.runChapters(current.project.slug, chapterIds)
        setCurrent((c) => (c ? { ...c, bible: res.bible } : c))
        setRevision((r) => r + 1)
        setImpact(null)
        setLog((l) => [...l, '受影响章节已重写。'])
      } catch (err) {
        setLog((l) => [...l, '错误：' + (err as Error).message])
      } finally {
        setBusy(false)
      }
    },
    [current]
  )

  const saveFramework = useCallback(
    async (framework: Framework) => {
      if (!current) return
      await window.api.saveFramework(current.project.slug, framework)
      setCurrent({ ...current, framework })
    },
    [current]
  )

  const saveSeed = useCallback(
    async (seed: Seed) => {
      if (!current) return
      const project: Project = { ...current.project, seed }
      const saved = await window.api.saveProject(project)
      setCurrent({ ...current, project: saved })
    },
    [current]
  )

  return (
    <div className="app">
      <Sidebar
        projects={projects}
        current={current}
        selection={selection}
        onNew={() => {
          setCurrent(null)
          setLog([])
        }}
        onOpen={openProject}
        onSelect={setSelection}
      />
      <main className="center">
        <EditorPane
          current={current}
          selection={selection}
          revision={revision}
          impact={impact}
          onSaveBible={saveBible}
          onSaveFramework={saveFramework}
          onSaveSeed={saveSeed}
          onRewrite={rewriteChapters}
        />
      </main>
      <aside className="right">
        <Wizard
          current={current}
          busy={busy}
          log={log}
          onCreate={createProject}
          onRunWorld={runWorld}
          onRunFramework={runFramework}
          onRunOutline={runOutline}
          onRunChapter={runChapter}
          onSaveSeed={saveSeed}
        />
      </aside>
    </div>
  )
}
