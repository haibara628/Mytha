import type {
  Bible,
  ChapterManuscript,
  Finding,
  Framework,
  Outline,
  Project,
  Seed
} from '../core/model/types'
import type { ProjectSummary } from '../core/storage/projectStore'
import type { CommitEntry } from '../core/storage/versioner'
import type { AffectedScene, BibleChange, ImpactResult } from '../core/reference/impact'

export type { ProjectSummary, CommitEntry }
export type { AffectedScene, BibleChange, ImpactResult }

export const IPC = {
  createProject: 'project:create',
  listProjects: 'project:list',
  loadProject: 'project:load',
  saveProject: 'project:save',
  runWorld: 'pipeline:runWorld',
  runFramework: 'pipeline:runFramework',
  runOutline: 'pipeline:runOutline',
  runChapter: 'pipeline:runChapter',
  runChapters: 'pipeline:runChapters',
  loadChapter: 'chapter:load',
  saveBible: 'bible:save',
  saveFramework: 'framework:save',
  analyzeImpact: 'impact:analyze',
  history: 'project:history'
} as const

export interface CreateProjectInput {
  name: string
  seed: Seed
}

export interface LoadedProject {
  project: Project
  bible: Bible | null
  framework: Framework | null
  outline: Outline | null
}

export interface ChapterRunResult {
  manuscript: ChapterManuscript
  bible: Bible
  findings: Finding[]
}

/** preload 暴露给渲染进程的白名单 API。 */
export interface Api {
  createProject(input: CreateProjectInput): Promise<Project>
  listProjects(): Promise<ProjectSummary[]>
  loadProject(slug: string): Promise<LoadedProject>
  saveProject(project: Project): Promise<Project>
  runWorld(slug: string): Promise<Bible>
  runFramework(slug: string): Promise<Framework>
  runOutline(slug: string): Promise<Outline>
  runChapter(slug: string, chapterId: string): Promise<ChapterRunResult>
  runChapters(slug: string, chapterIds: string[]): Promise<{ results: ChapterRunResult[]; bible: Bible }>
  loadChapter(slug: string, chapterId: string): Promise<ChapterManuscript | null>
  saveBible(slug: string, bible: Bible): Promise<void>
  saveFramework(slug: string, framework: Framework): Promise<void>
  analyzeImpact(slug: string, oldBible: Bible, newBible: Bible): Promise<ImpactResult>
  history(slug: string): Promise<CommitEntry[]>
}
