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
    const project = { development: { workspaceRoot: '.sdd-workspaces', branchPattern: 'sdd/{artifactKey}/{repositoryId}', mergeStrategy: 'manual', repositories: [{ id: 'app', source, baseBranch: 'main', testCommands: [{ id: 'unit', label: 'Unit', argv: [process.execPath, '-e', 'process.exit(0)'] }] }] } } as unknown as ProjectConfig
    const artifact = { uid: 'artifact-1', key: 'DEV-1', stage: 'development', basedOn: [] } as unknown as ArtifactSummary
    const service = new GitDevelopmentService(); let workspace = await service.create(projectPath, project, artifact, 'app')
    await writeFile(join(workspace.repositories[0]!.path, 'app.txt'), 'after\n')
    workspace = await service.test(projectPath, project, artifact.uid, 'app', 'unit'); expect(workspace.repositories[0]!.lastTest?.passed).toBe(true)
    workspace = await service.commit(projectPath, artifact.uid, 'app', 'DEV-1 implementation'); expect(workspace.repositories[0]!.ahead).toBe(1); expect(workspace.repositories[0]!.changedFiles).toBe(0)
    expect(await readFile(join(workspace.repositories[0]!.path, 'app.txt'), 'utf8')).toBe('after\n')
  })
})
