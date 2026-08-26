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
})
