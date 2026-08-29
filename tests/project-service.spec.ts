import { execFileSync } from 'node:child_process'
import { chmod, mkdir, mkdtemp, readFile, readdir, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { ApiProxy } from '@deepseek-ai/dsh-host-apiproxy'
import { describe, expect, it } from 'vitest'
import { parse, stringify } from 'yaml'
import { SddProjectService } from '../src/project-service.ts'
import type { SddSourceRegistry } from '../src/extensions.ts'
import type { StageSessionController } from '../src/session-controller.ts'
import type { SourceBundle } from '../src/protocol.ts'
import { ManualSourceProvider } from '../src/providers/manual-source.ts'

function api(path: string, opened: string[] = []): ApiProxy {
  return {
    workspace: {
      list: async (request: any) => ({ rpcId: request.rpcId, result: { ok: true, value: { archivedSessionIds: [], items: [{ workspaceId: 'w1', path, title: 'Demo', sessionIds: [], createdAt: new Date(0).toISOString(), updatedAt: new Date(0).toISOString() }] } } }),
    },
    host: {
      openPath: async (request: any) => { opened.push(request.payload.path); return { rpcId: request.rpcId, result: { ok: true, value: { opened: true } } } },
    },
  } as unknown as ApiProxy
}

describe('SddProjectService', () => {
  it('initializes missing OpenSpec files inside the isolated development branch', async () => {
    const root = await mkdtemp(join(tmpdir(), 'dsh-sdd-'))
    const originalPath = process.env.PATH
    const bin = join(root, 'bin'); await mkdir(bin)
    await writeFile(join(bin, 'openspec.cjs'), `const fs=require('node:fs');const path=require('node:path');
const args=process.argv.slice(2);const root=process.cwd();
if(args.includes('--version')){console.log('1.8.0');process.exit(0)}
if(args.includes('init')){fs.mkdirSync(path.join(root,'openspec','specs'),{recursive:true});fs.mkdirSync(path.join(root,'openspec','changes','archive'),{recursive:true});fs.writeFileSync(path.join(root,'openspec','config.yaml'),'schema: spec-driven\\n');fs.mkdirSync(path.join(root,'.agents','skills','openspec-propose'),{recursive:true});fs.writeFileSync(path.join(root,'.agents','skills','openspec-propose','SKILL.md'),'# OpenSpec propose\\n');process.exit(0)}
if(args[0]==='templates'){console.log(JSON.stringify({proposal:'/package/proposal.md',specs:'/package/specs.md',design:'/package/design.md',tasks:'/package/tasks.md'}));process.exit(0)}
if(args[0]==='schema'&&args[1]==='fork'){const name=args[3];const dir=path.join(root,'openspec','schemas',name,'templates');fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(path.join(root,'openspec','schemas',name,'schema.yaml'),'name: '+name+'\\n');fs.writeFileSync(path.join(dir,'proposal.md'),'# Proposal\\n');process.exit(0)}
if(args[0]==='schema'&&args[1]==='validate'){process.exit(0)}
if(args[0]==='new'&&args[1]==='change'){fs.mkdirSync(path.join(root,'openspec','changes',args[2]),{recursive:true});fs.writeFileSync(path.join(root,'openspec','changes',args[2],'.openspec.yaml'),'schema: '+args[args.indexOf('--schema')+1]+'\\n');console.log('{}');process.exit(0)}
process.exit(1)\n`)
    if (process.platform === 'win32') await writeFile(join(bin, 'openspec.cmd'), '@node "%~dp0\\openspec.cjs" %*\r\n')
    else { await writeFile(join(bin, 'openspec'), '#!/usr/bin/env node\nrequire("./openspec.cjs")\n'); await chmod(join(bin, 'openspec'), 0o755) }
    process.env.PATH = `${bin}${process.platform === 'win32' ? ';' : ':'}${process.env.PATH ?? ''}`
    const provider = new ManualSourceProvider()
    const sources = { names: () => ['manual'], fetch: async (_name: string, request: any) => provider.get({ ...request, signal: request.signal ?? AbortSignal.timeout(1000) }) } as unknown as SddSourceRegistry
    const service = new SddProjectService(api(root), sources)
    await service.execute({ kind: 'import-source', workspaceId: 'w1', provider: 'manual', sourceKind: 'requirement', key: 'REQ-OPEN-SPEC', input: { title: 'OpenSpec 初始化' } })
    let snapshot = await service.snapshot('w1')
    const workItem = snapshot.workItems[0]!
    const repository = join(root, 'app')
    await mkdir(repository)
    execFileSync('git', ['init', '-b', 'main'], { cwd: repository })
    execFileSync('git', ['config', 'user.email', 'sdd@example.test'], { cwd: repository })
    execFileSync('git', ['config', 'user.name', 'SDD Test'], { cwd: repository })
    await writeFile(join(repository, 'README.md'), '# App\n')
    execFileSync('git', ['add', 'README.md'], { cwd: repository })
    execFileSync('git', ['commit', '-m', 'initial'], { cwd: repository })
    await service.execute({ kind: 'add-project-repository', workspaceId: 'w1', id: 'app', source: './app', baseBranch: 'main' })
    await service.execute({ kind: 'update-work-item-settings', workspaceId: 'w1', workItemUid: workItem.uid, repositoryScope: ['app'], developmentTargets: ['app'], developmentTargetDetails: { app: '实现当前需求并补充测试' }, openSpec: { enabled: true, repositoryId: 'app', path: 'openspec', schema: 'spec-driven' } })
    const projectPath = join(root, '.sdd', 'project.yaml')
    const project = parse(await readFile(projectPath, 'utf8'))
    project.dependencies.development = {}
    await writeFile(projectPath, stringify(project), 'utf8')
    await service.execute({ kind: 'create-draft', workspaceId: 'w1', stage: 'development', title: workItem.title, basedOn: [], sourceUids: [workItem.sourceUid!], workItemUid: workItem.uid })
    snapshot = await service.snapshot('w1')
    const artifact = snapshot.artifacts.find(item => item.stage === 'development')!
    await service.execute({ kind: 'development-create', workspaceId: 'w1', artifactUid: artifact.uid, repositoryId: 'app' })
    snapshot = await service.snapshot('w1')
    expect(snapshot.openSpecValidation[workItem.uid]).toMatchObject({ status: 'invalid', code: 'missing-directory', cliInstalled: true, canInitialize: true })
    await expect(service.execute({ kind: 'context', workspaceId: 'w1', stage: 'development', artifactUid: artifact.uid, artifactUids: [], sourceUids: artifact.derivedFrom.map(item => item.uid) }))
      .resolves.toMatchObject({ prompt: expect.stringContaining('OpenSpec') })
    await service.execute({ kind: 'development-initialize-openspec', workspaceId: 'w1', artifactUid: artifact.uid, tools: 'agents' })
    snapshot = await service.snapshot('w1')
    expect(snapshot.openSpecValidation[workItem.uid]).toMatchObject({ status: 'valid', schema: 'spec-driven' })
    await expect(service.execute({ kind: 'development-inspect-openspec-templates', workspaceId: 'w1', artifactUid: artifact.uid, schema: 'spec-driven' }))
      .resolves.toMatchObject({ openSpecTemplates: { schema: 'spec-driven', paths: expect.arrayContaining(['/package/proposal.md', '/package/tasks.md']) } })
    await service.execute({ kind: 'development-fork-openspec-schema', workspaceId: 'w1', artifactUid: artifact.uid, schema: 'company-sdd' })
    await service.execute({ kind: 'development-create-openspec-change', workspaceId: 'w1', artifactUid: artifact.uid, changeId: 'req-open-spec', schema: 'company-sdd' })
    snapshot = await service.snapshot('w1')
    expect(snapshot.openSpecValidation[workItem.uid]).toMatchObject({ status: 'valid', schema: 'company-sdd', changeId: 'req-open-spec', changeExists: true })
    const isolated = snapshot.developmentWorkspaces[0]!.repositories[0]!.path
    expect(await readFile(join(isolated, 'openspec', 'config.yaml'), 'utf8')).toBe('schema: spec-driven\n')
    expect(await readdir(join(isolated, 'openspec', 'specs'))).toEqual([])
    expect(await readdir(join(isolated, 'openspec', 'changes', 'archive'))).toEqual([])
    expect(await readFile(join(isolated, '.agents', 'skills', 'openspec-propose', 'SKILL.md'), 'utf8')).toContain('OpenSpec propose')
    expect(await readFile(join(isolated, 'openspec', 'schemas', 'company-sdd', 'templates', 'proposal.md'), 'utf8')).toContain('Proposal')
    expect(await readFile(join(isolated, 'openspec', 'changes', 'req-open-spec', '.openspec.yaml'), 'utf8')).toContain('company-sdd')
    expect(execFileSync('git', ['status', '--short'], { cwd: repository, encoding: 'utf8' })).toBe('')
    process.env.PATH = originalPath
  })

  it('works out of the box with the built-in manual source', async () => {
    const root = await mkdtemp(join(tmpdir(), 'dsh-sdd-'))
    const provider = new ManualSourceProvider()
    const sources = { names: () => ['manual'], fetch: async (_name: string, request: any) => provider.get({ ...request, signal: request.signal ?? AbortSignal.timeout(1000) }) } as unknown as SddSourceRegistry
    const service = new SddProjectService(api(root), sources)
    const preview = await service.execute({ kind: 'preview-source-import', workspaceId: 'w1', provider: 'manual', sourceKind: 'requirement', key: 'MANUAL-1', input: { title: '订单部分退款', description: '规则待讨论' } })
    if (!('schema' in preview)) throw new Error('expected import preview')
    await service.execute({ kind: 'apply-source-import', workspaceId: 'w1', previewUid: preview.uid, identities: preview.items.map(item => item.identity) })
    const snapshot = await service.snapshot('w1')
    expect(snapshot.workItems).toEqual([expect.objectContaining({ key: 'MANUAL-1', title: '订单部分退款', provider: 'manual' })])
    expect(snapshot.sources).toEqual([expect.objectContaining({ content: expect.objectContaining({ description: '规则待讨论' }) })])
  })

  it('attaches imported defects to an existing requirement without creating another delivery flow', async () => {
    const root = await mkdtemp(join(tmpdir(), 'dsh-sdd-attached-defect-'))
    const provider = new ManualSourceProvider()
    const sources = { names: () => ['manual'], fetch: async (_name: string, request: any) => provider.get({ ...request, signal: request.signal ?? AbortSignal.timeout(1000) }) } as unknown as SddSourceRegistry
    const service = new SddProjectService(api(root), sources)
    await service.execute({ kind: 'import-source', workspaceId: 'w1', provider: 'manual', sourceKind: 'requirement', key: 'REQ-1', input: { title: '支付升级', description: '支持新的支付流程' } })
    let snapshot = await service.snapshot('w1')
    const requirement = snapshot.workItems[0]!
    const preview = await service.execute({ kind: 'preview-source-import', workspaceId: 'w1', provider: 'manual', sourceKind: 'defect', key: 'BUG-1', input: { title: '重复回调', description: '支付回调被重复消费，需要在本需求内修复。' }, attachToWorkItemUid: requirement.uid })
    if (!('schema' in preview)) throw new Error('expected import preview')
    expect(preview).toMatchObject({ executionMode: 'attached', parentWorkItemUid: requirement.uid, parentWorkItemKey: 'REQ-1' })
    const detail = await service.execute({ kind: 'read-source-import-detail', workspaceId: 'w1', previewUid: preview.uid, identity: preview.items[0]!.identity })
    expect(detail).toMatchObject({ source: { externalKey: 'BUG-1', content: { description: expect.stringContaining('重复消费') } } })
    await service.execute({ kind: 'apply-source-import', workspaceId: 'w1', previewUid: preview.uid, identities: preview.items.map(item => item.identity) })
    snapshot = await service.snapshot('w1')
    const defect = snapshot.workItems.find(item => item.key === 'BUG-1')!
    expect(defect).toMatchObject({ kind: 'defect', executionMode: 'attached', parentWorkItemUid: requirement.uid })
    expect(snapshot.workItems.find(item => item.uid === requirement.uid)).toMatchObject({ status: 'change-pending', change: { reviewRequiredStages: ['development'] } })
    expect(snapshot.dashboard.deliveryMatrix.map(item => item.key)).toEqual(['REQ-1'])
    await service.execute({ kind: 'create-draft', workspaceId: 'w1', stage: 'development', title: '支付升级开发', basedOn: [], sourceUids: [requirement.sourceUid!, defect.sourceUid!], workItemUid: requirement.uid })
    expect((await service.snapshot('w1')).artifacts[0]?.derivedFrom.map(item => item.externalKey)).toEqual(['REQ-1', 'BUG-1'])
  })

  it('treats legacy work items without execution ownership as standalone', async () => {
    const root = await mkdtemp(join(tmpdir(), 'dsh-sdd-legacy-work-item-'))
    const provider = new ManualSourceProvider()
    const sources = { names: () => ['manual'], fetch: async (_name: string, request: any) => provider.get({ ...request, signal: request.signal ?? AbortSignal.timeout(1000) }) } as unknown as SddSourceRegistry
    const service = new SddProjectService(api(root), sources)
    await service.execute({ kind: 'import-source', workspaceId: 'w1', provider: 'manual', sourceKind: 'defect', key: 'OLD-BUG-1', input: { title: '历史独立缺陷' } })
    let snapshot = await service.snapshot('w1')
    const workItem = snapshot.workItems[0]!
    const path = join(root, '.sdd', 'work-items', workItem.uid, 'work-item.yaml')
    const legacy = parse(await readFile(path, 'utf8'))
    delete legacy.executionMode
    delete legacy.parentWorkItemUid
    await writeFile(path, stringify(legacy), 'utf8')
    snapshot = await service.snapshot('w1')
    expect(snapshot.workItems[0]).toMatchObject({ key: 'OLD-BUG-1', executionMode: 'standalone' })
    expect(snapshot.dashboard.deliveryMatrix.map(item => item.key)).toEqual(['OLD-BUG-1'])
  })

  it('detects duplicate display keys by UID lineage and safely renumbers an unbound draft', async () => {
    const root = await mkdtemp(join(tmpdir(), 'dsh-sdd-key-conflict-'))
    const provider = new ManualSourceProvider()
    const sources = { names: () => ['manual'], fetch: async (_name: string, request: any) => provider.get({ ...request, signal: request.signal ?? AbortSignal.timeout(1000) }) } as unknown as SddSourceRegistry
    const service = new SddProjectService(api(root), sources)
    await service.execute({ kind: 'import-source', workspaceId: 'w1', provider: 'manual', sourceKind: 'requirement', key: 'ITEM-1', input: { title: '需求一' } })
    await service.execute({ kind: 'import-source', workspaceId: 'w1', provider: 'manual', sourceKind: 'requirement', key: 'ITEM-2', input: { title: '需求二' } })
    let snapshot = await service.snapshot('w1')
    for (const item of snapshot.workItems) await service.execute({ kind: 'create-draft', workspaceId: 'w1', stage: 'requirements', title: item.title, basedOn: [], sourceUids: [item.sourceUid!], workItemUid: item.uid })
    snapshot = await service.snapshot('w1')
    const [first, second] = snapshot.artifacts.sort((left, right) => left.key.localeCompare(right.key))
    const manifestPath = join(root, second!.relativeDirectory, 'manifest.yaml'); const manifest = parse(await readFile(manifestPath, 'utf8')); manifest.key = first!.key; await writeFile(manifestPath, stringify(manifest), 'utf8')
    snapshot = await service.snapshot('w1')
    expect(snapshot.projectRepository?.keyConflicts).toEqual([expect.objectContaining({ key: first!.key, lineageUids: expect.arrayContaining([first!.uid, second!.uid]), renamableArtifactUids: expect.arrayContaining([first!.uid, second!.uid]) })])
    await service.execute({ kind: 'resolve-artifact-key-conflict', workspaceId: 'w1', artifactUid: second!.uid })
    snapshot = await service.snapshot('w1')
    expect(snapshot.projectRepository?.keyConflicts).toEqual([])
    expect(snapshot.artifacts.find(item => item.uid === second!.uid)?.key).toMatch(new RegExp(`^${first!.key}-[A-Z0-9]{4}$`))
  })

  it('allows flexible stage selection and records stages that are not applicable', async () => {
    const root = await mkdtemp(join(tmpdir(), 'dsh-sdd-'))
    const provider = new ManualSourceProvider()
    const sources = { names: () => ['manual'], fetch: async (_name: string, request: any) => provider.get({ ...request, signal: request.signal ?? AbortSignal.timeout(1000) }) } as unknown as SddSourceRegistry
    const service = new SddProjectService(api(root), sources)
    await service.execute({ kind: 'import-source', workspaceId: 'w1', provider: 'manual', sourceKind: 'requirement', key: 'SIMPLE-1', input: { title: '简单后端修复' } })
    let snapshot = await service.snapshot('w1')
    const workItem = snapshot.workItems[0]!
    expect(snapshot.project?.workflow?.mode).toBe('flexible')
    await service.execute({ kind: 'update-stage-applicability', workspaceId: 'w1', workItemUid: workItem.uid, stage: 'prototype', status: 'not-applicable', reason: '无界面变化' })
    await service.execute({ kind: 'create-draft', workspaceId: 'w1', stage: 'development', title: workItem.title, basedOn: [], sourceUids: [workItem.sourceUid!], workItemUid: workItem.uid })
    snapshot = await service.snapshot('w1')
    expect(snapshot.dashboard.deliveryMatrix[0]?.cells.find(cell => cell.stage === 'prototype')).toMatchObject({ status: 'not-applicable' })
    expect(snapshot.artifacts.find(item => item.stage === 'development')?.derivedFrom).toEqual([expect.objectContaining({ uid: workItem.sourceUid })])
    await service.execute({ kind: 'update-stage-applicability', workspaceId: 'w1', workItemUid: workItem.uid, stage: 'prototype', status: 'applicable' })
    expect((await service.snapshot('w1')).dashboard.deliveryMatrix[0]?.cells.find(cell => cell.stage === 'prototype')).toMatchObject({ status: 'not-started' })
  })

  it('initializes a project and creates an accepted artifact', async () => {
    const root = await mkdtemp(join(tmpdir(), 'dsh-sdd-'))
    const service = new SddProjectService(api(root))
    await service.initialize('w1')
    await writeFile(join(root, '.sdd/business/connectors/demo-system.yaml'), 'command: [node, adapter.mjs]\n')
    await service.execute({ kind: 'create-draft', workspaceId: 'w1', stage: 'requirements', title: '支付需求', basedOn: [] })
    let snapshot = await service.snapshot('w1')
    expect(snapshot.initialized).toBe(true)
    expect(snapshot.connectors).toEqual([{ id: 'demo-system', scope: 'project', overridden: false }])
    expect(snapshot.artifacts[0]?.key).toBe('REQ-0001')
    const draft = await readFile(join(root, snapshot.artifacts[0]!.relativeDirectory, 'deliverable.md'), 'utf8')
    expect(draft).toContain('> 文档类型：需求规格说明')
    expect(draft).toContain('<!-- 填写要求：')
    await writeFile(join(root, snapshot.artifacts[0]!.relativeDirectory, 'deliverable.md'), `# REQ-0001 支付需求

## 背景与目标
支持安全支付。
## 范围
包含支付，不包含退款。
## 用户与场景
用户在结算页支付。
## 功能需求
系统完成支付并返回结果。
## 非功能需求
接口需要幂等。
## 验收条件
支付成功时生成订单记录。
## 待决问题
无。
`)
    await writeFile(join(root, snapshot.artifacts[0]!.relativeDirectory, 'notes.txt'), '评审附件。\n')
    await service.execute({
      kind: 'accept', workspaceId: 'w1', artifactUid: snapshot.artifacts[0]!.uid,
      checklist: Object.fromEntries(Array.from({ length: 5 }, (_value, index) => [`item-${index + 1}`, true])),
    })
    snapshot = await service.snapshot('w1')
    expect(snapshot.artifacts[0]?.status).toBe('accepted')
    expect(snapshot.artifacts[0]?.contentHash).toMatch(/^sha256:/)
    expect(snapshot.artifacts[0]?.files.map(file => file.path)).toEqual(['.template/deliverable.md', '.template/template.yaml', 'deliverable.md', 'notes.txt'])
    const preview = await service.execute({ kind: 'read-artifact-file', workspaceId: 'w1', artifactUid: snapshot.artifacts[0]!.uid, path: 'notes.txt' })
    expect(preview).toMatchObject({ artifactFile: { content: '评审附件。\n' } })
    const revisionPreview = await service.execute({ kind: 'preview-revision', workspaceId: 'w1', artifactUid: snapshot.artifacts[0]!.uid })
    expect(revisionPreview).toMatchObject({ revisionPreview: { changes: [], canCreateFromUpstream: false, nextVersion: '0.2.0' } })
    await expect(service.execute({ kind: 'create-revision', workspaceId: 'w1', artifactUid: snapshot.artifacts[0]!.uid, revisionKind: 'upstream' })).rejects.toThrow('unchanged')
    await service.execute({ kind: 'create-revision', workspaceId: 'w1', artifactUid: snapshot.artifacts[0]!.uid, revisionKind: 'user-intent', reason: '调整支付业务规则', affectedAreas: ['功能需求'] })
    snapshot = await service.snapshot('w1')
    let revision = snapshot.artifacts.find(item => item.status === 'draft')!
    expect(revision).toMatchObject({ key: 'REQ-0001', version: '0.2.0', supersedes: { uid: snapshot.artifacts.find(item => item.status === 'accepted')!.uid }, revision: { kind: 'user-intent', reason: '调整支付业务规则', affectedAreas: ['功能需求'], changes: [] } })
    await expect(service.execute({ kind: 'accept', workspaceId: 'w1', artifactUid: revision.uid, checklist: Object.fromEntries(Array.from({ length: 5 }, (_value, index) => [`item-${index + 1}`, true])) })).rejects.toThrow('content is unchanged')
    await service.execute({ kind: 'discard-draft', workspaceId: 'w1', artifactUid: revision.uid })
    snapshot = await service.snapshot('w1')
    expect(snapshot.artifacts).toHaveLength(1)
    expect(await readdir(join(root, '.sdd/trash/artifacts'))).toHaveLength(1)
    await service.execute({ kind: 'create-revision', workspaceId: 'w1', artifactUid: snapshot.artifacts[0]!.uid, revisionKind: 'user-intent', reason: '再次调整支付规则' })
    snapshot = await service.snapshot('w1'); revision = snapshot.artifacts.find(item => item.status === 'draft')!
    await writeFile(join(root, revision.relativeDirectory, 'deliverable.md'), `${await readFile(join(root, revision.relativeDirectory, 'deliverable.md'), 'utf8')}\n本修订将支付重试次数调整为三次。\n`)
    await service.execute({ kind: 'accept', workspaceId: 'w1', artifactUid: revision.uid, checklist: Object.fromEntries(Array.from({ length: 5 }, (_value, index) => [`item-${index + 1}`, true])) })
    snapshot = await service.snapshot('w1')
    expect(snapshot.artifacts.find(item => item.version === '0.1.0')?.status).toBe('superseded')
    expect(snapshot.artifacts.find(item => item.version === '0.2.0')?.status).toBe('accepted')
    expect(await readFile(join(root, '.sdd/project.yaml'), 'utf8')).toContain('dsh-sdd/project@1')
    expect(await readFile(join(root, '.sdd/business/README.md'), 'utf8')).toContain('仅供当前 SDD 项目使用')
  })

  it('detects accepted upstream hash changes before creating a downstream revision', async () => {
    const root = await mkdtemp(join(tmpdir(), 'dsh-sdd-revision-')); const service = new SddProjectService(api(root))
    const complete = async (uid: string, note: string) => {
      const artifact = (await service.snapshot('w1')).artifacts.find(item => item.uid === uid)!
      const path = join(root, artifact.relativeDirectory, 'deliverable.md')
      await writeFile(path, (await readFile(path, 'utf8')).replaceAll('待补充。', `已确认：${note}。`))
      await service.execute({ kind: 'accept', workspaceId: 'w1', artifactUid: uid, checklist: Object.fromEntries(Array.from({ length: 12 }, (_value, index) => [`item-${index + 1}`, true])) })
    }
    await service.execute({ kind: 'create-draft', workspaceId: 'w1', stage: 'requirements', title: '支付需求', basedOn: [] })
    let snapshot = await service.snapshot('w1'); const requirementV1 = snapshot.artifacts[0]!; await complete(requirementV1.uid, '初始支付规则')
    snapshot = await service.snapshot('w1'); const acceptedRequirementV1 = snapshot.artifacts.find(item => item.uid === requirementV1.uid)!
    await service.execute({ kind: 'create-draft', workspaceId: 'w1', stage: 'prototype', title: '支付原型', basedOn: [acceptedRequirementV1.uid] })
    snapshot = await service.snapshot('w1'); const prototypeV1 = snapshot.artifacts.find(item => item.stage === 'prototype')!; await complete(prototypeV1.uid, '初始支付原型')
    await service.execute({ kind: 'create-revision', workspaceId: 'w1', artifactUid: acceptedRequirementV1.uid, revisionKind: 'user-intent', reason: '增加支付确认步骤' })
    snapshot = await service.snapshot('w1'); const requirementV2 = snapshot.artifacts.find(item => item.stage === 'requirements' && item.status === 'draft')!
    await writeFile(join(root, requirementV2.relativeDirectory, 'deliverable.md'), `${await readFile(join(root, requirementV2.relativeDirectory, 'deliverable.md'), 'utf8')}\n新增支付确认步骤。\n`)
    await service.execute({ kind: 'accept', workspaceId: 'w1', artifactUid: requirementV2.uid, checklist: Object.fromEntries(Array.from({ length: 12 }, (_value, index) => [`item-${index + 1}`, true])) })
    snapshot = await service.snapshot('w1')
    expect(snapshot.dashboard.stages.find(item => item.stage === 'prototype')).toBeDefined()
    expect(snapshot.dashboard.blockers).toEqual(expect.arrayContaining([expect.stringContaining('需要创建变更修订')]))
    const preview = await service.execute({ kind: 'preview-revision', workspaceId: 'w1', artifactUid: prototypeV1.uid })
    if (!('revisionPreview' in preview)) throw new Error('expected revision preview')
    expect(preview.revisionPreview.canCreateFromUpstream).toBe(true)
    expect(preview.revisionPreview.changes[0]).toMatchObject({ kind: 'artifact', label: expect.stringContaining('需求讨论') })
    expect(preview.revisionPreview.changes[0]?.previous?.uid).toBe(acceptedRequirementV1.uid)
    expect(preview.revisionPreview.changes[0]?.current?.uid).toBe(requirementV2.uid)
    await service.execute({ kind: 'create-revision', workspaceId: 'w1', artifactUid: prototypeV1.uid, revisionKind: 'upstream' })
    snapshot = await service.snapshot('w1'); const prototypeV2 = snapshot.artifacts.find(item => item.stage === 'prototype' && item.status === 'draft')!
    expect(prototypeV2).toMatchObject({ basedOn: [{ uid: requirementV2.uid }], revision: { kind: 'upstream', changes: [expect.objectContaining({ kind: 'artifact' })] } })
  })

  it('uses editable project templates, snapshots them, and safely opens package paths', async () => {
    const root = await mkdtemp(join(tmpdir(), 'dsh-sdd-')); const opened: string[] = []
    const service = new SddProjectService(api(root, opened))
    await service.initialize('w1')
    const configPath = join(root, '.sdd/templates/requirements/template.yaml')
    const contentPath = join(root, '.sdd/templates/requirements/deliverable.md')
    const config = parse(await readFile(configPath, 'utf8')) as { requiredSections: string[]; version: string }
    config.version = '1.1.0'; config.requiredSections.push('企业扩展')
    await writeFile(configPath, stringify(config), 'utf8')
    await writeFile(contentPath, `${await readFile(contentPath, 'utf8')}\n## 企业扩展\n\n待补充。\n`, 'utf8')
    await service.execute({ kind: 'create-draft', workspaceId: 'w1', stage: 'requirements', title: '定制模板需求', basedOn: [] })
    const snapshot = await service.snapshot('w1'); const artifact = snapshot.artifacts[0]!
    expect(artifact.template).toMatchObject({ version: '1.1.0', requiredSections: expect.arrayContaining(['企业扩展']), snapshotPath: '.template/deliverable.md' })
    expect(await readFile(join(root, artifact.relativeDirectory, 'deliverable.md'), 'utf8')).toContain('## 企业扩展')
    await service.execute({ kind: 'open-artifact-path', workspaceId: 'w1', artifactUid: artifact.uid, path: 'deliverable.md' })
    await service.execute({ kind: 'open-stage-template', workspaceId: 'w1', stage: 'requirements', target: 'directory' })
    expect(opened).toEqual([join(snapshot.workspace.path, artifact.relativeDirectory, 'deliverable.md'), join(snapshot.workspace.path, '.sdd/templates/requirements')])
    await expect(service.execute({ kind: 'open-artifact-path', workspaceId: 'w1', artifactUid: artifact.uid, path: '../../project.yaml' })).rejects.toThrow('escapes')
  })

  it('pins only accepted upstream artifacts', async () => {
    const root = await mkdtemp(join(tmpdir(), 'dsh-sdd-'))
    const service = new SddProjectService(api(root))
    await service.execute({ kind: 'create-draft', workspaceId: 'w1', stage: 'requirements', title: '需求', basedOn: [] })
    const input = (await service.snapshot('w1')).artifacts[0]!
    await expect(service.execute({ kind: 'create-draft', workspaceId: 'w1', stage: 'prototype', title: '原型', basedOn: [input.uid] }))
      .rejects.toThrow('not accepted')
  })

  it('always allocates the plugin stage prefix independently of enterprise identifiers', async () => {
    const root = await mkdtemp(join(tmpdir(), 'dsh-sdd-'))
    const service = new SddProjectService(api(root))
    await service.execute({ kind: 'create-draft', workspaceId: 'w1', stage: 'requirements', title: '需求', basedOn: [] })
    await service.execute({ kind: 'create-draft', workspaceId: 'w1', stage: 'requirements', title: '另一需求', basedOn: [] })
    const snapshot = await service.snapshot('w1')
    expect(snapshot.artifacts.map(item => item.key)).toEqual(['REQ-0001', 'REQ-0002'])
    expect(snapshot.project?.identifiers.namespaces.architecture).toEqual({ strategy: 'template', template: 'ARCH-{sequence:04}', sequenceScope: 'project' })
  })

  it('reports invalid project configuration and preserves a backup when reinitializing', async () => {
    const root = await mkdtemp(join(tmpdir(), 'dsh-sdd-'))
    const service = new SddProjectService(api(root))
    await service.initialize('w1')
    await writeFile(join(root, '.sdd/project.yaml'), 'schema: wrong\nproject: []\n')
    let snapshot = await service.snapshot('w1')
    expect(snapshot.configuration.status).toBe('invalid')
    expect(snapshot.configuration.errors).toEqual(expect.arrayContaining([expect.stringContaining('schema')]))
    await service.execute({ kind: 'reinitialize', workspaceId: 'w1' })
    snapshot = await service.snapshot('w1')
    expect(snapshot.configuration.status).toBe('valid')
    const files = await import('node:fs/promises').then(fs => fs.readdir(join(root, '.sdd')))
    expect(files.some(file => file.startsWith('project.invalid-'))).toBe(true)
  })

  it('imports provider output and traces it into a draft', async () => {
    const root = await mkdtemp(join(tmpdir(), 'dsh-sdd-'))
    const sources = {
      names: () => ['memory'],
      fetch: async (_name: string, request: { kind: string; key: string }) => ({
        schema: 'dsh-sdd/source-bundle@1' as const, uid: 'bundle-1', provider: 'memory', kind: request.kind,
        externalKey: request.key, title: 'Imported requirement', fetchedAt: new Date(0).toISOString(), relations: [],
        items: [{ schema: 'dsh-sdd/source@1' as const, uid: 'source-1', provider: 'memory', kind: request.kind, externalKey: request.key, title: 'Imported requirement', fetchedAt: new Date(0).toISOString(), content: { description: 'Pay safely.' } }],
      }),
    } as unknown as SddSourceRegistry
    const service = new SddProjectService(api(root), sources)
    await service.execute({ kind: 'import-source', workspaceId: 'w1', provider: 'memory', sourceKind: 'requirement', key: 'EXT-7' })
    let snapshot = await service.snapshot('w1')
    expect(snapshot.sources[0]).toMatchObject({ uid: 'source-1', externalKey: 'EXT-7', validationErrors: [] })
    await service.execute({
      kind: 'create-draft', workspaceId: 'w1', stage: 'requirements', title: 'Imported', basedOn: [], sourceUids: ['source-1'],
    })
    snapshot = await service.snapshot('w1')
    expect(snapshot.artifacts[0]?.derivedFrom).toEqual([expect.objectContaining({ uid: 'source-1', provider: 'memory' })])
  })

  it('previews a requirement bundle and detects additions, changes and removals on synchronization', async () => {
    const root = await mkdtemp(join(tmpdir(), 'dsh-sdd-'))
    const envelope = (key: string, title: string, description: string) => ({
      schema: 'dsh-sdd/source@1' as const, uid: `memory:requirement:${key}`, provider: 'memory', kind: 'requirement',
      externalKey: key, title, fetchedAt: new Date(0).toISOString(), content: { description },
    })
    let bundle: SourceBundle = {
      schema: 'dsh-sdd/source-bundle@1', uid: 'bundle-1', provider: 'memory', kind: 'requirement', externalKey: 'EPIC-1',
      title: '支付升级', fetchedAt: new Date(0).toISOString(), root: envelope('EPIC-1', '支付升级', '主需求'),
      items: [envelope('REQ-1', '微信支付', '第一版'), envelope('REQ-2', '支付宝', '第一版')],
      relations: [{ from: 'REQ-1', to: 'EPIC-1', type: 'child-of' }, { from: 'REQ-2', to: 'EPIC-1', type: 'child-of' }],
    }
    const sources = { names: () => ['memory'], fetch: async () => bundle } as unknown as SddSourceRegistry
    const service = new SddProjectService(api(root), sources)
    const firstResult = await service.execute({ kind: 'preview-source-import', workspaceId: 'w1', provider: 'memory', sourceKind: 'requirement', key: 'EPIC-1' })
    if (!('schema' in firstResult)) throw new Error('expected preview')
    expect(firstResult.items.map(item => item.change)).toEqual(['added', 'added'])
    await service.execute({ kind: 'apply-source-import', workspaceId: 'w1', previewUid: firstResult.uid, identities: firstResult.items.map(item => item.identity) })
    let snapshot = await service.snapshot('w1')
    expect(snapshot.workItems).toHaveLength(2)
    expect(snapshot.workItems.every(item => item.status === 'active')).toBe(true)
    expect(snapshot.dashboard.deliveryMatrix).toHaveLength(2)
    expect(snapshot.dashboard.stageFlow.find(item => item.stage === 'requirements')).toMatchObject({ notStarted: 2, completed: 0 })
    expect(snapshot.dashboard.burnup.at(-1)).toMatchObject({ total: 2, completed: 0 })
    const req1 = snapshot.workItems.find(item => item.key === 'REQ-1')!
    const repository = join(root, 'web'); await mkdir(repository)
    execFileSync('git', ['init', '-b', 'main'], { cwd: repository }); execFileSync('git', ['config', 'user.email', 'sdd@example.test'], { cwd: repository }); execFileSync('git', ['config', 'user.name', 'SDD Test'], { cwd: repository })
    await writeFile(join(repository, 'README.md'), '# Web\n'); execFileSync('git', ['add', 'README.md'], { cwd: repository }); execFileSync('git', ['commit', '-m', 'initial'], { cwd: repository })
    execFileSync('git', ['branch', 'release'], { cwd: repository })
    const inspection = await service.execute({ kind: 'inspect-project-repository', workspaceId: 'w1', source: './web' })
    expect(inspection).toMatchObject({ sourceKind: 'local', branches: ['main', 'release'], defaultBranch: 'main' })
    await service.execute({ kind: 'add-project-repository', workspaceId: 'w1', id: 'web', source: './web', baseBranch: 'main' })
    await service.execute({ kind: 'update-project-repository-branch', workspaceId: 'w1', id: 'web', baseBranch: 'release' })
    expect((await service.snapshot('w1')).project?.development.repositories[0]?.baseBranch).toBe('release')
    await service.execute({ kind: 'update-work-item-settings', workspaceId: 'w1', workItemUid: req1.uid, repositoryScope: ['web'], developmentTargets: ['web'], openSpec: { enabled: true, repositoryId: 'web', path: 'openspec' } })
    await service.execute({ kind: 'create-draft', workspaceId: 'w1', stage: 'requirements', title: req1.title, basedOn: [], sourceUids: [req1.sourceUid!, req1.bundleSourceUid!], workItemUid: req1.uid })
    snapshot = await service.snapshot('w1')
    expect(snapshot.artifacts[0]?.relativeDirectory).toContain(`.sdd/work-items/${req1.uid}/artifacts/requirements`)

    bundle = {
      ...bundle, fetchedAt: new Date(1_000).toISOString(),
      items: [envelope('REQ-1', '微信支付', '第二版，增加退款'), envelope('REQ-3', '支付通知', '新增')],
      relations: [{ from: 'REQ-1', to: 'EPIC-1', type: 'child-of' }, { from: 'REQ-3', to: 'EPIC-1', type: 'child-of' }],
    }
    const secondResult = await service.execute({ kind: 'preview-source-import', workspaceId: 'w1', provider: 'memory', sourceKind: 'requirement', key: 'EPIC-1' })
    if (!('schema' in secondResult)) throw new Error('expected preview')
    expect(Object.fromEntries(secondResult.items.map(item => [item.externalKey, item.change]))).toEqual({ 'REQ-1': 'modified', 'REQ-3': 'added', 'REQ-2': 'removed' })
    await service.execute({ kind: 'apply-source-import', workspaceId: 'w1', previewUid: secondResult.uid, identities: secondResult.items.map(item => item.identity) })
    snapshot = await service.snapshot('w1')
    expect(snapshot.workItems.find(item => item.key === 'REQ-1')).toMatchObject({ status: 'change-pending', change: { kind: 'modified', reviewRequiredStages: ['requirements'] } })
    expect(snapshot.workItems.find(item => item.key === 'REQ-1')).toMatchObject({ repositoryScope: ['web'], developmentTargets: ['web'], openSpec: { enabled: true, repositoryId: 'web', path: 'openspec' } })
    expect(snapshot.openSpecValidation[req1.uid]).toMatchObject({ status: 'pending', message: expect.stringContaining('创建开发空间后检查目录'), cliInstalled: expect.any(Boolean) })
    expect(snapshot.workItems.find(item => item.key === 'REQ-2')).toMatchObject({ status: 'removed-pending', change: { kind: 'removed' } })
    expect(snapshot.workItems.find(item => item.key === 'REQ-3')).toMatchObject({ status: 'active' })
    await service.execute({ kind: 'remove-project-repository', workspaceId: 'w1', id: 'web' })
    const withoutRepository = await service.snapshot('w1')
    expect(withoutRepository.project?.development.repositories).toEqual([])
    expect(withoutRepository.workItems.find(item => item.key === 'REQ-1')).toMatchObject({ repositoryScope: [], developmentTargets: [], openSpec: { enabled: false } })
    const removedReq2 = snapshot.workItems.find(item => item.key === 'REQ-2')!
    await service.execute({ kind: 'resolve-work-item-removal', workspaceId: 'w1', workItemUid: removedReq2.uid, decision: 'keep' })
    const retainedReq2 = (await service.snapshot('w1')).workItems.find(item => item.key === 'REQ-2')!
    expect(retainedReq2.status).toBe('active')
    expect(retainedReq2.change).toBeUndefined()
    const staleArtifact = snapshot.artifacts[0]!
    await expect(service.execute({ kind: 'context', workspaceId: 'w1', stage: 'requirements', artifactUid: staleArtifact.uid, artifactUids: [], sourceUids: staleArtifact.derivedFrom.map(item => item.uid) }))
      .rejects.toThrow('current change evidence')
    const changedReq1 = snapshot.workItems.find(item => item.key === 'REQ-1')!
    await service.execute({ kind: 'create-draft', workspaceId: 'w1', stage: 'requirements', title: '微信支付变更', basedOn: [], sourceUids: [changedReq1.sourceUid!, changedReq1.bundleSourceUid!], workItemUid: changedReq1.uid })
    snapshot = await service.snapshot('w1')
    const currentArtifact = snapshot.artifacts.find(item => item.title === '微信支付变更')!
    const context = await service.execute({ kind: 'context', workspaceId: 'w1', stage: 'requirements', artifactUid: currentArtifact.uid, artifactUids: [], sourceUids: currentArtifact.derivedFrom.map(item => item.uid) })
    expect(context).toMatchObject({ prompt: expect.stringContaining('@.sdd/sources/') })
    expect((context as { prompt: string }).prompt).not.toContain('第二版，增加退款')
  })

  it('persists one session binding for one target artifact and resumes it', async () => {
    const root = await mkdtemp(join(tmpdir(), 'dsh-sdd-')); const bindings: unknown[] = []
    const sessions = { bind: (binding: unknown) => { bindings.push(binding) }, unbind: () => {} } as unknown as StageSessionController
    const service = new SddProjectService(api(root), undefined, sessions)
    await service.execute({ kind: 'create-draft', workspaceId: 'w1', stage: 'requirements', title: '绑定需求', basedOn: [] })
    const artifact = (await service.snapshot('w1')).artifacts[0]!
    const started = await service.execute({ kind: 'bind-session', workspaceId: 'w1', stage: 'requirements', artifactUid: artifact.uid, sessionId: 'session-1', artifactUids: [] })
    expect(started).toMatchObject({ run: { artifactUid: artifact.uid, sessionId: 'session-1' } })
    expect((started as { run: { codeReferences?: unknown[] } }).run.codeReferences).toBeUndefined()
    const run = (await service.snapshot('w1')).runs[0]!
    const resumed = await service.execute({ kind: 'bind-session', workspaceId: 'w1', runUid: run.uid, stage: 'requirements', artifactUid: artifact.uid, sessionId: 'session-2', artifactUids: [] })
    expect(resumed).toMatchObject({ run: { uid: run.uid, sessionId: 'session-2' } })
    expect(bindings).toEqual(expect.arrayContaining([expect.objectContaining({ sessionId: 'session-1' }), expect.objectContaining({ sessionId: 'session-2' })]))
    expect(bindings).toEqual(expect.arrayContaining([expect.objectContaining({ artifactTemplateReference: expect.stringContaining('@.sdd/'), requiredSections: expect.any(Array) })]))
    expect(bindings.map(binding => JSON.stringify(binding)).join('\n')).not.toContain('{{artifactKey}}')
    const path = join(root, artifact.relativeDirectory, 'deliverable.md')
    await writeFile(path, (await readFile(path, 'utf8')).replaceAll('待补充。', '已确认。'))
    await service.execute({ kind: 'accept', workspaceId: 'w1', artifactUid: artifact.uid, checklist: Object.fromEntries(Array.from({ length: 12 }, (_value, index) => [`item-${index + 1}`, true])) })
    await service.execute({ kind: 'complete-run', workspaceId: 'w1', runUid: run.uid })
    await service.execute({ kind: 'create-revision', workspaceId: 'w1', artifactUid: artifact.uid, revisionKind: 'user-intent', reason: '调整用户场景' })
    const revision = (await service.snapshot('w1')).artifacts.find(item => item.status === 'draft')!
    expect(revision.revision?.previousRunUid).toBe(run.uid)
    const changed = await service.execute({ kind: 'bind-session', workspaceId: 'w1', stage: 'requirements', artifactUid: revision.uid, sessionId: 'session-3', artifactUids: [] })
    expect(changed).toMatchObject({ run: { previousRunUid: run.uid }, prompt: expect.stringContaining(`历史阶段运行：${run.uid}`) })
  })

  it('automatically binds every configured repository as read-only code context for non-development stages', async () => {
    const root = await mkdtemp(join(tmpdir(), 'dsh-sdd-stage-code-')); const source = join(root, 'source'); const bindings: any[] = []
    await mkdir(source); execFileSync('git', ['init', '-b', 'main'], { cwd: source }); execFileSync('git', ['config', 'user.email', 'sdd@example.test'], { cwd: source }); execFileSync('git', ['config', 'user.name', 'SDD Test'], { cwd: source })
    await writeFile(join(source, 'README.md'), '# Existing system\n'); execFileSync('git', ['add', 'README.md'], { cwd: source }); execFileSync('git', ['commit', '-m', 'initial'], { cwd: source })
    const sessions = { bind: (binding: unknown) => { bindings.push(binding) }, unbind: () => {} } as unknown as StageSessionController
    const service = new SddProjectService(api(root), undefined, sessions)
    await service.initialize('w1')
    await service.execute({ kind: 'add-project-repository', workspaceId: 'w1', id: 'existing-system', source, baseBranch: 'main' })
    await service.execute({ kind: 'create-draft', workspaceId: 'w1', stage: 'architecture', title: '存量系统设计', basedOn: [] })
    const artifact = (await service.snapshot('w1')).artifacts[0]!
    const started = await service.execute({ kind: 'bind-session', workspaceId: 'w1', stage: 'architecture', artifactUid: artifact.uid, sessionId: 'session-code', artifactUids: [] })
    expect(started).toMatchObject({
      prompt: expect.stringContaining('项目代码仓库只读参考'),
      run: { codeReferences: [{ repositoryId: 'existing-system', sourceKind: 'local', available: true, path: source }] },
    })
    expect(bindings.at(-1)).toMatchObject({ codeReferences: [{ repositoryId: 'existing-system', available: true, path: source }] })
  })
})
