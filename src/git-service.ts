import { spawn } from 'node:child_process'
import { access, mkdir, readFile, writeFile } from 'node:fs/promises'
import { isAbsolute, join, relative, resolve } from 'node:path'
import { parse, stringify } from 'yaml'
import type { ArtifactSummary, DevelopmentRepositoryConfig, DevelopmentRepositoryState, DevelopmentWorkspace, ProjectConfig } from './protocol.ts'

const ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const MAX_OUTPUT = 1024 * 1024

interface CommandResult { stdout: string; stderr: string; exitCode: number }

async function run(argv: readonly string[], cwd: string, timeoutMs = 120_000, allowFailure = false): Promise<CommandResult> {
  if (argv.length === 0) throw new Error('command argv must not be empty')
  const signal = AbortSignal.timeout(timeoutMs)
  return await new Promise((resolveResult, reject) => {
    const child = spawn(argv[0]!, argv.slice(1), { cwd, shell: false, env: process.env, stdio: ['ignore', 'pipe', 'pipe'], signal })
    const stdout: Buffer[] = []; const stderr: Buffer[] = []
    let size = 0
    const collect = (target: Buffer[]) => (chunk: Buffer) => {
      size += chunk.length
      if (size > MAX_OUTPUT) child.kill()
      else target.push(chunk)
    }
    child.stdout.on('data', collect(stdout)); child.stderr.on('data', collect(stderr))
    child.once('error', reject)
    child.once('close', code => {
      if (size > MAX_OUTPUT) return reject(new Error(`command output exceeded ${MAX_OUTPUT} bytes`))
      const result = { stdout: Buffer.concat(stdout).toString('utf8'), stderr: Buffer.concat(stderr).toString('utf8'), exitCode: code ?? -1 }
      if (!allowFailure && result.exitCode !== 0) return reject(new Error(`${argv[0]} exited with ${result.exitCode}: ${result.stderr.trim()}`))
      resolveResult(result)
    })
  })
}

async function exists(path: string): Promise<boolean> { try { await access(path); return true } catch { return false } }

function developmentFile(projectPath: string, artifactUid: string): string {
  return join(projectPath, '.sdd', 'development', `${artifactUid}.yaml`)
}

async function repositoryState(state: DevelopmentRepositoryState): Promise<DevelopmentRepositoryState> {
  const status = await run(['git', 'status', '--porcelain=v1'], state.path)
  const head = (await run(['git', 'rev-parse', 'HEAD'], state.path)).stdout.trim()
  const counts = (await run(['git', 'rev-list', '--left-right', '--count', `${state.baseCommit}...HEAD`], state.path)).stdout.trim().split(/\s+/).map(Number)
  return { ...state, headCommit: head, behind: counts[0] ?? 0, ahead: counts[1] ?? 0, changedFiles: status.stdout.split(/\r?\n/).filter(Boolean).length }
}

export async function readDevelopmentWorkspace(projectPath: string, artifactUid: string): Promise<DevelopmentWorkspace | undefined> {
  const file = developmentFile(projectPath, artifactUid)
  if (!(await exists(file))) return undefined
  return parse(await readFile(file, 'utf8')) as DevelopmentWorkspace
}

export async function listDevelopmentWorkspaces(projectPath: string, artifacts: readonly ArtifactSummary[]): Promise<DevelopmentWorkspace[]> {
  const result: DevelopmentWorkspace[] = []
  for (const artifact of artifacts.filter(item => item.stage === 'development')) {
    const workspace = await readDevelopmentWorkspace(projectPath, artifact.uid)
    if (workspace === undefined) continue
    const repositories: DevelopmentRepositoryState[] = []
    for (const repository of workspace.repositories) {
      try { repositories.push(await repositoryState(repository)) }
      catch { repositories.push(repository) }
    }
    result.push({ ...workspace, repositories })
  }
  return result
}

function repositoryConfig(project: ProjectConfig, id: string): DevelopmentRepositoryConfig {
  const config = project.development.repositories.find(item => item.id === id)
  if (config === undefined) throw new Error(`development repository is not configured: ${id}`)
  if (!ID.test(config.id)) throw new Error(`invalid development repository id: ${config.id}`)
  return config
}

export class GitDevelopmentService {
  async validateSource(projectPath: string, source: string, baseBranch: string): Promise<'local' | 'remote'> {
    const localSource = isAbsolute(source) ? source : resolve(projectPath, source)
    if (await exists(localSource)) {
      const repository = await run(['git', 'rev-parse', '--is-inside-work-tree'], localSource, 30_000, true)
      if (repository.exitCode !== 0 || repository.stdout.trim() !== 'true') throw new Error(`local source is not a Git repository: ${source}`)
      await run(['git', 'rev-parse', '--verify', `${baseBranch}^{commit}`], localSource, 30_000)
      return 'local'
    }
    await run(['git', 'ls-remote', '--exit-code', '--heads', source, `refs/heads/${baseBranch}`], projectPath, 60_000)
    return 'remote'
  }

  async create(projectPath: string, project: ProjectConfig, artifact: ArtifactSummary, repositoryId: string): Promise<DevelopmentWorkspace> {
    if (artifact.stage !== 'development') throw new Error('isolated code workspaces are only available in development stage')
    const config = repositoryConfig(project, repositoryId)
    const existing = await readDevelopmentWorkspace(projectPath, artifact.uid)
    if (existing?.repositories.some(item => item.id === repositoryId)) return existing
    const root = resolve(projectPath, project.development.workspaceRoot)
    const target = resolve(root, artifact.key, repositoryId)
    if (relative(root, target).startsWith('..')) throw new Error('development workspace path escapes configured root')
    await mkdir(resolve(root, artifact.key), { recursive: true })
    if (await exists(target)) throw new Error(`development target already exists but is not registered: ${target}`)
    const branch = project.development.branchPattern.replaceAll('{artifactKey}', artifact.key).replaceAll('{repositoryId}', repositoryId)
    await run(['git', 'check-ref-format', '--branch', branch], projectPath)
    const localSource = isAbsolute(config.source) ? config.source : resolve(projectPath, config.source)
    let baseCommit: string
    if (await exists(localSource)) {
      baseCommit = (await run(['git', 'rev-parse', config.baseBranch], localSource)).stdout.trim()
      await run(['git', 'worktree', 'add', '-b', branch, target, baseCommit], localSource)
    } else {
      await run(['git', 'clone', '--branch', config.baseBranch, '--single-branch', config.source, target], projectPath, 300_000)
      baseCommit = (await run(['git', 'rev-parse', 'HEAD'], target)).stdout.trim()
      await run(['git', 'switch', '-c', branch], target)
    }
    const now = new Date().toISOString()
    const state: DevelopmentRepositoryState = {
      id: config.id, source: config.source, baseBranch: config.baseBranch, baseCommit, workingBranch: branch,
      path: target, headCommit: baseCommit, changedFiles: 0, ahead: 0, behind: 0,
    }
    const workspace: DevelopmentWorkspace = existing ?? {
      schema: 'dsh-sdd/development-workspace@1', uid: crypto.randomUUID(), key: artifact.key, artifactUid: artifact.uid,
      inputs: artifact.basedOn.map(input => ({ artifactUid: input.uid, version: input.version })), repositories: [], createdAt: now, updatedAt: now,
    }
    workspace.repositories.push(state); workspace.updatedAt = now
    await this.write(projectPath, workspace)
    return workspace
  }

  async status(projectPath: string, artifactUid: string): Promise<DevelopmentWorkspace> {
    const workspace = await readDevelopmentWorkspace(projectPath, artifactUid)
    if (workspace === undefined) throw new Error('development workspace has not been created')
    workspace.repositories = await Promise.all(workspace.repositories.map(repositoryState))
    workspace.updatedAt = new Date().toISOString()
    await this.write(projectPath, workspace)
    return workspace
  }

  async test(projectPath: string, project: ProjectConfig, artifactUid: string, repositoryId: string, testId: string): Promise<DevelopmentWorkspace> {
    const workspace = await readDevelopmentWorkspace(projectPath, artifactUid)
    if (workspace === undefined) throw new Error('development workspace has not been created')
    const state = workspace.repositories.find(item => item.id === repositoryId)
    if (state === undefined) throw new Error(`development repository has not been created: ${repositoryId}`)
    const command = repositoryConfig(project, repositoryId).testCommands.find(item => item.id === testId)
    if (command === undefined) throw new Error(`test command is not configured: ${testId}`)
    const result = await run(command.argv, state.path, 600_000, true)
    state.lastTest = {
      id: command.id, passed: result.exitCode === 0, exitCode: result.exitCode, ranAt: new Date().toISOString(),
      output: `${result.stdout}${result.stderr}`.slice(-64 * 1024),
    }
    Object.assign(state, await repositoryState(state)); workspace.updatedAt = new Date().toISOString()
    await this.write(projectPath, workspace)
    return workspace
  }

  async commit(projectPath: string, artifactUid: string, repositoryId: string, message: string): Promise<DevelopmentWorkspace> {
    const workspace = await readDevelopmentWorkspace(projectPath, artifactUid)
    if (workspace === undefined) throw new Error('development workspace has not been created')
    const state = workspace.repositories.find(item => item.id === repositoryId)
    if (state === undefined) throw new Error(`development repository has not been created: ${repositoryId}`)
    if (message.trim() === '') throw new Error('commit message must not be empty')
    await run(['git', 'add', '-A'], state.path)
    const staged = await run(['git', 'diff', '--cached', '--quiet'], state.path, 120_000, true)
    if (staged.exitCode === 0) throw new Error('there are no changes to commit')
    if (staged.exitCode !== 1) throw new Error(`git diff --cached failed with ${staged.exitCode}`)
    await run(['git', 'commit', '-m', message.trim()], state.path)
    Object.assign(state, await repositoryState(state)); workspace.updatedAt = new Date().toISOString()
    await this.write(projectPath, workspace)
    return workspace
  }

  private async write(projectPath: string, workspace: DevelopmentWorkspace): Promise<void> {
    const root = join(projectPath, '.sdd', 'development')
    await mkdir(root, { recursive: true })
    await writeFile(developmentFile(projectPath, workspace.artifactUid), stringify(workspace), 'utf8')
  }
}
