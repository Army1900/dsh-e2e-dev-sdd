import { execFileSync } from 'node:child_process'
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { GitDevelopmentService } from '../src/git-service.ts'
import type { ArtifactSummary, ProjectConfig } from '../src/protocol.ts'

function git(cwd: string, ...args: string[]): string { return execFileSync('git', args, { cwd, encoding: 'utf8' }).trim() }

describe('GitDevelopmentService', () => {
  it('creates an isolated worktree, runs configured tests and commits changes', async () => {
    const root = await mkdtemp(join(tmpdir(), 'dsh-sdd-git-')); const source = join(root, 'source'); const projectPath = join(root, 'project')
    await mkdir(source); await mkdir(projectPath); git(source, 'init', '-b', 'main'); git(source, 'config', 'user.email', 'sdd@example.test'); git(source, 'config', 'user.name', 'SDD Test')
    await writeFile(join(source, 'app.txt'), 'before\n'); git(source, 'add', 'app.txt'); git(source, 'commit', '-m', 'initial')
    git(source, 'branch', 'release')
    const project = { development: { workspaceRoot: '.sdd-workspaces', branchPattern: 'sdd/{artifactKey}/{repositoryId}', mergeStrategy: 'manual', repositories: [{ id: 'app', source, baseBranch: 'main', testCommands: [{ id: 'unit', label: 'Unit', argv: [process.execPath, '-e', 'process.exit(0)'] }] }] } } as unknown as ProjectConfig
    const artifact = { uid: 'artifact-1', key: 'DEV-1', stage: 'development', basedOn: [] } as unknown as ArtifactSummary
    const service = new GitDevelopmentService()
    await expect(service.inspectSource(projectPath, source)).resolves.toEqual({ source, sourceKind: 'local', branches: ['main', 'release'], defaultBranch: 'main', empty: false })
    let workspace = await service.create(projectPath, project, artifact, 'app')
    await expect(service.validateSource(projectPath, source, 'main')).resolves.toBe('local')
    await expect(service.validateSource(projectPath, source, 'missing')).rejects.toThrow('base branch does not exist')
    expect(workspace.repositories[0]).toMatchObject({ baseBranch: 'main', workingBranch: 'sdd/DEV-1/app' })
    await writeFile(join(workspace.repositories[0]!.path, 'app.txt'), 'after\n')
    workspace = await service.test(projectPath, project, artifact.uid, 'app', 'unit'); expect(workspace.repositories[0]!.lastTest?.passed).toBe(true)
    workspace = await service.commit(projectPath, artifact.uid, 'app', 'DEV-1 implementation'); expect(workspace.repositories[0]!.ahead).toBe(1); expect(workspace.repositories[0]!.changedFiles).toBe(0)
    expect(await readFile(join(workspace.repositories[0]!.path, 'app.txt'), 'utf8')).toBe('after\n')
  })

  it('inspects remote branches and their default without cloning', async () => {
    const root = await mkdtemp(join(tmpdir(), 'dsh-sdd-remote-')); const source = join(root, 'source'); const projectPath = join(root, 'project'); const bare = join(root, 'remote.git')
    await mkdir(source); await mkdir(projectPath); git(source, 'init', '-b', 'develop'); git(source, 'config', 'user.email', 'sdd@example.test'); git(source, 'config', 'user.name', 'SDD Test')
    await writeFile(join(source, 'app.txt'), 'remote\n'); git(source, 'add', 'app.txt'); git(source, 'commit', '-m', 'initial'); git(source, 'branch', 'release')
    git(root, 'clone', '--bare', source, bare)
    const inspection = await new GitDevelopmentService().inspectSource(projectPath, `file://${bare}`)
    expect(inspection).toEqual({ source: `file://${bare}`, sourceKind: 'remote', branches: ['develop', 'release'], defaultBranch: 'develop', empty: false })
  })

  it('creates a safe empty initial commit without adding untracked files', async () => {
    const root = await mkdtemp(join(tmpdir(), 'dsh-sdd-empty-')); const source = join(root, 'source'); const projectPath = join(root, 'project')
    await mkdir(source); await mkdir(projectPath); git(source, 'init', '-b', 'main'); await writeFile(join(source, 'draft.txt'), 'not committed\n')
    const service = new GitDevelopmentService()
    await expect(service.inspectSource(projectPath, source)).resolves.toMatchObject({ sourceKind: 'local', branches: [], defaultBranch: 'main', empty: true })
    const initialized = await service.initializeLocalSource(projectPath, source, 'main')
    expect(initialized).toMatchObject({ branches: ['main'], defaultBranch: 'main', empty: false })
    expect(git(source, 'show', '--pretty=', '--name-only', 'HEAD')).toBe('')
    expect(await readFile(join(source, 'draft.txt'), 'utf8')).toBe('not committed\n')
    expect(git(source, 'status', '--porcelain')).toContain('?? draft.txt')
  })

  it('refuses to include already staged files in an automatic initial commit', async () => {
    const root = await mkdtemp(join(tmpdir(), 'dsh-sdd-staged-')); const source = join(root, 'source'); const projectPath = join(root, 'project')
    await mkdir(source); await mkdir(projectPath); git(source, 'init', '-b', 'main'); await writeFile(join(source, 'staged.txt'), 'staged\n'); git(source, 'add', 'staged.txt')
    await expect(new GitDevelopmentService().initializeLocalSource(projectPath, source, 'main')).rejects.toThrow('staged files')
    expect(git(source, 'status', '--porcelain')).toContain('A  staged.txt')
  })
})
