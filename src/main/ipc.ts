import { app, ipcMain } from 'electron'
import path from 'node:path'
import { ProjectStore } from '../core/storage/projectStore'
import { getProvider } from '../core/llm'
import { Workflow } from '../core/pipeline/workflow'
import { findAffectedScenes } from '../core/reference/impact'
import { IPC } from '../shared/ipc'
import type { CreateProjectInput, LoadedProject } from '../shared/ipc'
import type { Bible, Framework, Project } from '../core/model/types'

export function registerIpc(): void {
  const rootDir = process.env.MYTHA_PROJECTS_DIR || path.join(app.getPath('documents'), 'Mytha')
  const store = new ProjectStore(rootDir)
  const provider = getProvider()
  const workflow = new Workflow(store, provider)

  ipcMain.handle(IPC.createProject, async (_e, input: CreateProjectInput): Promise<Project> => {
    return store.createProject(input.name, input.seed)
  })

  ipcMain.handle(IPC.listProjects, async () => store.listProjects())

  ipcMain.handle(IPC.loadProject, async (_e, slug: string): Promise<LoadedProject> => {
    const project = await store.loadProject(slug)
    const bible = await store.loadBible(project)
    const framework = await store.loadFramework(project)
    const outline = await store.loadOutline(project)
    return { project, bible, framework, outline }
  })

  ipcMain.handle(IPC.saveProject, async (_e, project: Project): Promise<Project> => {
    return store.saveProject(project)
  })

  ipcMain.handle(IPC.runWorld, async (_e, slug: string) => {
    const project = await store.loadProject(slug)
    return workflow.runWorld(project)
  })

  ipcMain.handle(IPC.runFramework, async (_e, slug: string) => {
    const project = await store.loadProject(slug)
    return workflow.runFramework(project)
  })

  ipcMain.handle(IPC.runOutline, async (_e, slug: string) => {
    const project = await store.loadProject(slug)
    return workflow.runOutline(project)
  })

  ipcMain.handle(IPC.runChapter, async (_e, slug: string, chapterId: string) => {
    const project = await store.loadProject(slug)
    return workflow.runChapter(project, chapterId)
  })

  ipcMain.handle(IPC.runChapters, async (_e, slug: string, chapterIds: string[]) => {
    const project = await store.loadProject(slug)
    const results = []
    let bible: Bible | null = null
    for (const id of chapterIds) {
      const r = await workflow.runChapter(project, id)
      results.push(r)
      bible = r.bible
    }
    return { results, bible }
  })

  ipcMain.handle(IPC.analyzeImpact, async (_e, slug: string, oldBible: Bible, newBible: Bible) => {
    const project = await store.loadProject(slug)
    const outline = await store.loadOutline(project)
    if (!outline) return { affectedScenes: [] }
    const manuscripts = await store.loadManuscripts(project)
    return { affectedScenes: findAffectedScenes({ oldBible, newBible, outline, manuscripts }) }
  })

  ipcMain.handle(IPC.loadChapter, async (_e, slug: string, chapterId: string) => {
    const project = await store.loadProject(slug)
    return store.loadChapter(project, chapterId)
  })

  ipcMain.handle(IPC.saveBible, async (_e, slug: string, bible: Bible): Promise<void> => {
    const project = await store.loadProject(slug)
    await store.writeBible(project, bible)
  })

  ipcMain.handle(IPC.saveFramework, async (_e, slug: string, framework: Framework): Promise<void> => {
    const project = await store.loadProject(slug)
    await store.writeFramework(project, framework)
  })

  ipcMain.handle(IPC.history, async (_e, slug: string) => {
    const project = await store.loadProject(slug)
    return store.history(project)
  })
}
