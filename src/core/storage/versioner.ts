import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

export interface CommitEntry {
  hash: string
  message: string
  date: string
}

/**
 * 用项目目录内的 git 仓库做版本化：每次变更自动 commit，可追溯、可回滚。
 * 依赖系统 git（已在环境中确认可用）。
 */
export class Versioner {
  constructor(private readonly root: string) {}

  private async git(args: string[]): Promise<string> {
    const { stdout } = await execFileAsync('git', ['-C', this.root, ...args])
    return stdout
  }

  async init(): Promise<void> {
    await this.git(['init'])
    // 设置仓库本地身份，避免依赖全局 git config 导致 commit 失败
    await this.git(['config', 'user.name', 'Mytha']).catch(() => {})
    await this.git(['config', 'user.email', 'mytha@local']).catch(() => {})
  }

  async commit(message: string): Promise<void> {
    await this.git(['add', '-A'])
    try {
      await this.git(['commit', '-m', message])
    } catch {
      // 无变更（nothing to commit）不算错误
    }
  }

  async log(): Promise<CommitEntry[]> {
    try {
      const out = await this.git(['log', '--pretty=format:%H%x1f%s%x1f%ci'])
      if (!out.trim()) return []
      return out
        .trim()
        .split('\n')
        .map((line) => {
          const [hash, message, date] = line.split('\x1f')
          return { hash, message, date }
        })
    } catch {
      return []
    }
  }
}
