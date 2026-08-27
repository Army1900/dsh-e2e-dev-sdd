import { describe, expect, it } from 'vitest'
import { STAGES, artifactTemplate, parseAction } from '../src/protocol.ts'
import { runtimeDefinition } from '../src/stage-definitions.ts'

describe('artifact templates', () => {
  it('cover every required section for every stage', () => {
    for (const stage of STAGES) {
      const content = artifactTemplate(stage.id, 'TEST-0001', '示例交付件')
      expect(content).toContain('# TEST-0001 示例交付件')
      expect(content).toContain('待补充。')
      for (const section of runtimeDefinition(stage.id).requiredSections) expect(content).toContain(`## ${section}`)
    }
  })
})

describe('parseAction', () => {
  it('accepts typed stage actions', () => {
    expect(parseAction({ kind: 'create-draft', workspaceId: 'w1', stage: 'requirements', title: '支付需求', basedOn: [] }))
      .toEqual({ kind: 'create-draft', workspaceId: 'w1', stage: 'requirements', title: '支付需求', basedOn: [] })
    expect(parseAction({ kind: 'reinitialize', workspaceId: 'w1' })).toEqual({ kind: 'reinitialize', workspaceId: 'w1' })
    expect(parseAction({ kind: 'read-artifact-file', workspaceId: 'w1', artifactUid: 'a1', path: 'deliverable.md' })).toMatchObject({ kind: 'read-artifact-file' })
    expect(parseAction({ kind: 'open-artifact-path', workspaceId: 'w1', artifactUid: 'a1', path: '' })).toMatchObject({ kind: 'open-artifact-path' })
    expect(parseAction({ kind: 'read-stage-template', workspaceId: 'w1', stage: 'requirements' })).toMatchObject({ kind: 'read-stage-template' })
    expect(parseAction({ kind: 'open-stage-template', workspaceId: 'w1', stage: 'requirements', target: 'directory' })).toMatchObject({ target: 'directory' })
    expect(parseAction({ kind: 'update-work-item-settings', workspaceId: 'w1', workItemUid: 'i1', repositoryScope: ['web'], developmentTargets: ['web'], openSpec: { enabled: true, repositoryId: 'web', path: 'openspec' } })).toMatchObject({ kind: 'update-work-item-settings' })
    expect(parseAction({ kind: 'add-project-repository', workspaceId: 'w1', id: 'web', source: '../web', baseBranch: 'main' })).toMatchObject({ kind: 'add-project-repository' })
    expect(parseAction({ kind: 'inspect-project-repository', workspaceId: 'w1', source: '../web' })).toMatchObject({ kind: 'inspect-project-repository' })
    expect(parseAction({ kind: 'update-project-repository-branch', workspaceId: 'w1', id: 'web', baseBranch: 'release' })).toMatchObject({ kind: 'update-project-repository-branch' })
    expect(parseAction({ kind: 'remove-project-repository', workspaceId: 'w1', id: 'web' })).toMatchObject({ kind: 'remove-project-repository' })
    expect(parseAction({ kind: 'discard-draft', workspaceId: 'w1', artifactUid: 'a1' })).toMatchObject({ kind: 'discard-draft' })
    expect(parseAction({ kind: 'preview-source-import', workspaceId: 'w1', provider: 'manual', sourceKind: 'requirement', key: 'M-1', input: { title: '手工需求' } })).toMatchObject({ provider: 'manual', input: { title: '手工需求' } })
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
