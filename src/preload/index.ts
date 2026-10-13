import { contextBridge, ipcRenderer } from 'electron'
import { IPC } from '../shared/ipc'
import type { Api } from '../shared/ipc'

const api: Api = {
  createProject: (input) => ipcRenderer.invoke(IPC.createProject, input),
  listProjects: () => ipcRenderer.invoke(IPC.listProjects),
  loadProject: (slug) => ipcRenderer.invoke(IPC.loadProject, slug),
  saveProject: (project) => ipcRenderer.invoke(IPC.saveProject, project),
  runWorld: (slug) => ipcRenderer.invoke(IPC.runWorld, slug),
  runFramework: (slug) => ipcRenderer.invoke(IPC.runFramework, slug),
  runOutline: (slug) => ipcRenderer.invoke(IPC.runOutline, slug),
  runChapter: (slug, chapterId) => ipcRenderer.invoke(IPC.runChapter, slug, chapterId),
  runChapters: (slug, chapterIds) => ipcRenderer.invoke(IPC.runChapters, slug, chapterIds),
  loadChapter: (slug, chapterId) => ipcRenderer.invoke(IPC.loadChapter, slug, chapterId),
  saveBible: (slug, bible) => ipcRenderer.invoke(IPC.saveBible, slug, bible),
  saveFramework: (slug, framework) => ipcRenderer.invoke(IPC.saveFramework, slug, framework),
  analyzeImpact: (slug, oldBible, newBible) =>
    ipcRenderer.invoke(IPC.analyzeImpact, slug, oldBible, newBible),
  history: (slug) => ipcRenderer.invoke(IPC.history, slug)
}

contextBridge.exposeInMainWorld('api', api)
