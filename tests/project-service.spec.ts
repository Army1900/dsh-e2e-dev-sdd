import { mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { ApiProxy } from '@deepseek-ai/dsh-host-apiproxy'
import { describe, expect, it } from 'vitest'
import { SddProjectService } from '../src/project-service.ts'
import type { SddSourceRegistry } from '../src/extensions.ts'
import type { StageSessionController } from '../src/session-controller.ts'
import type { SourceBundle } from '../src/protocol.ts'

function api(path: string): ApiProxy {
  return {
    workspace: {
      list: async (request: any) => ({ rpcId: request.rpcId, result: { ok: true, value: { archivedSessionIds: [], items: [{ workspaceId: 'w1', path, title: 'Demo', sessionIds: [], createdAt: new Date(0).toISOString(), updatedAt: new Date(0).toISOString() }] } } }),
    },
  } as unknown as ApiProxy
}

describe('SddProjectService', () => {
  it('initializes a project and creates an accepted artifact', async () => {
    const root = await mkdtemp(join(tmpdir(), 'dsh-sdd-'))
    const service = new SddProjectService(api(root))
    await service.initialize('w1')
    await writeFile(join(root, '.sdd/business/connectors/demo-system.yaml'), 'command: [node, adapter.mjs]\n')
    await service.execute({ kind: 'create-draft', workspaceId: 'w1', stage: 'requirements', title: '支付需求', basedOn: [] })
    let snapshot = await service.snapshot('w1')
    expect(snapshot.initialized).toBe(true)
    expect(snapshot.connectors).toEqual(['demo-system'])
    expect(snapshot.artifacts[0]?.key).toBe('REQ-0001')
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
    await service.execute({
      kind: 'accept', workspaceId: 'w1', artifactUid: snapshot.artifacts[0]!.uid,
      checklist: Object.fromEntries(Array.from({ length: 5 }, (_value, index) => [`item-${index + 1}`, true])),
    })
    snapshot = await service.snapshot('w1')
    expect(snapshot.artifacts[0]?.status).toBe('accepted')
    expect(snapshot.artifacts[0]?.contentHash).toMatch(/^sha256:/)
    expect(await readFile(join(root, '.sdd/project.yaml'), 'utf8')).toContain('dsh-sdd/project@1')
    expect(await readFile(join(root, '.sdd/business/README.md'), 'utf8')).toContain('唯一的项目级业务自定义目录')
  })

  it('pins only accepted upstream artifacts', async () => {
    const root = await mkdtemp(join(tmpdir(), 'dsh-sdd-'))
    const service = new SddProjectService(api(root))
    await service.execute({ kind: 'create-draft', workspaceId: 'w1', stage: 'requirements', title: '需求', basedOn: [] })
    const input = (await service.snapshot('w1')).artifacts[0]!
    await expect(service.execute({ kind: 'create-draft', workspaceId: 'w1', stage: 'prototype', title: '原型', basedOn: [input.uid] }))
      .rejects.toThrow('not accepted')
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
    const req1 = snapshot.workItems.find(item => item.key === 'REQ-1')!
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
    expect(snapshot.workItems.find(item => item.key === 'REQ-2')).toMatchObject({ status: 'removed-pending', change: { kind: 'removed' } })
    expect(snapshot.workItems.find(item => item.key === 'REQ-3')).toMatchObject({ status: 'active' })
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
    await expect(service.execute({ kind: 'context', workspaceId: 'w1', stage: 'requirements', artifactUid: currentArtifact.uid, artifactUids: [], sourceUids: currentArtifact.derivedFrom.map(item => item.uid) }))
      .resolves.toMatchObject({ prompt: expect.stringContaining('第二版，增加退款') })
  })

  it('persists one session binding for one target artifact and resumes it', async () => {
    const root = await mkdtemp(join(tmpdir(), 'dsh-sdd-')); const bindings: unknown[] = []
    const sessions = { bind: (binding: unknown) => { bindings.push(binding) }, unbind: () => {} } as unknown as StageSessionController
    const service = new SddProjectService(api(root), undefined, undefined, sessions)
    await service.execute({ kind: 'create-draft', workspaceId: 'w1', stage: 'requirements', title: '绑定需求', basedOn: [] })
    const artifact = (await service.snapshot('w1')).artifacts[0]!
    const started = await service.execute({ kind: 'bind-session', workspaceId: 'w1', stage: 'requirements', artifactUid: artifact.uid, sessionId: 'session-1', artifactUids: [] })
    expect(started).toMatchObject({ run: { artifactUid: artifact.uid, sessionId: 'session-1' } })
    const run = (await service.snapshot('w1')).runs[0]!
    const resumed = await service.execute({ kind: 'bind-session', workspaceId: 'w1', runUid: run.uid, stage: 'requirements', artifactUid: artifact.uid, sessionId: 'session-2', artifactUids: [] })
    expect(resumed).toMatchObject({ run: { uid: run.uid, sessionId: 'session-2' } })
    expect(bindings).toEqual(expect.arrayContaining([expect.objectContaining({ sessionId: 'session-1' }), expect.objectContaining({ sessionId: 'session-2' })]))
  })
})
