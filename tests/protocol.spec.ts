import { describe, expect, it } from 'vitest'
import { parseAction } from '../src/protocol.ts'

describe('parseAction', () => {
  it('accepts typed stage actions', () => {
    expect(parseAction({ kind: 'create-draft', workspaceId: 'w1', stage: 'requirements', title: '支付需求', basedOn: [] }))
      .toEqual({ kind: 'create-draft', workspaceId: 'w1', stage: 'requirements', title: '支付需求', basedOn: [] })
    expect(parseAction({ kind: 'reinitialize', workspaceId: 'w1' })).toEqual({ kind: 'reinitialize', workspaceId: 'w1' })
  })

  it('rejects unknown stages and malformed arrays', () => {
    expect(parseAction({ kind: 'context', workspaceId: 'w1', stage: 'unknown', artifactUid: 'a1', artifactUids: [] })).toBeUndefined()
    expect(parseAction({ kind: 'context', workspaceId: 'w1', stage: 'requirements', artifactUid: 'a1', artifactUids: [1] })).toBeUndefined()
  })

  it('accepts session binding and development actions', () => {
    expect(parseAction({ kind: 'bind-session', workspaceId: 'w1', stage: 'requirements', artifactUid: 'a1', sessionId: 's1', artifactUids: [] }))
      .toMatchObject({ kind: 'bind-session', sessionId: 's1' })
    expect(parseAction({ kind: 'development-test', workspaceId: 'w1', artifactUid: 'a1', repositoryId: 'app', testId: 'unit' }))
      .toMatchObject({ kind: 'development-test', testId: 'unit' })
  })

  it('accepts requirement bundle preview and apply actions', () => {
    expect(parseAction({ kind: 'preview-source-import', workspaceId: 'w1', provider: 'command', sourceKind: 'requirement', key: 'EPIC-1', connector: 'company-alm' }))
      .toMatchObject({ kind: 'preview-source-import', key: 'EPIC-1' })
    expect(parseAction({ kind: 'apply-source-import', workspaceId: 'w1', previewUid: 'preview-1', identities: ['company:requirement:REQ-1'] }))
      .toMatchObject({ kind: 'apply-source-import', identities: ['company:requirement:REQ-1'] })
    expect(parseAction({ kind: 'apply-source-import', workspaceId: 'w1', previewUid: 'preview-1', identities: [1] })).toBeUndefined()
    expect(parseAction({ kind: 'resolve-work-item-removal', workspaceId: 'w1', workItemUid: 'item-1', decision: 'archive' })).toMatchObject({ decision: 'archive' })
  })
})
