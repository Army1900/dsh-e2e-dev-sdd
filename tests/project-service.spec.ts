import { mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { ApiProxy } from '@deepseek-ai/dsh-host-apiproxy'
import { describe, expect, it } from 'vitest'
import { SddProjectService } from '../src/project-service.ts'
import type { SddSourceRegistry } from '../src/extensions.ts'
import type { StageSessionController } from '../src/session-controller.ts'

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
    await service.execute({ kind: 'create-draft', workspaceId: 'w1', stage: 'requirements', title: '支付需求', basedOn: [] })
    let snapshot = await service.snapshot('w1')
    expect(snapshot.initialized).toBe(true)
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
  })

  it('pins only accepted upstream artifacts', async () => {
    const root = await mkdtemp(join(tmpdir(), 'dsh-sdd-'))
    const service = new SddProjectService(api(root))
    await service.execute({ kind: 'create-draft', workspaceId: 'w1', stage: 'requirements', title: '需求', basedOn: [] })
    const input = (await service.snapshot('w1')).artifacts[0]!
    await expect(service.execute({ kind: 'create-draft', workspaceId: 'w1', stage: 'prototype', title: '原型', basedOn: [input.uid] }))
      .rejects.toThrow('not accepted')
  })

  it('imports provider output and traces it into a draft', async () => {
    const root = await mkdtemp(join(tmpdir(), 'dsh-sdd-'))
    const sources = {
      names: () => ['memory'],
      fetch: async (_name: string, request: { kind: string; key: string }) => ({
        schema: 'dsh-sdd/source@1' as const, uid: 'source-1', provider: 'memory', kind: request.kind,
        externalKey: request.key, title: 'Imported requirement', fetchedAt: new Date(0).toISOString(),
        content: { description: 'Pay safely.' },
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
