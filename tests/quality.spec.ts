import { describe, expect, it } from 'vitest'
import { evaluateQuality } from '../src/quality.ts'
import type { ArtifactSummary, ProjectConfig } from '../src/protocol.ts'

const project = {
  dependencies: { requirements: {}, prototype: { requirements: 'required' }, architecture: {}, specification: {}, development: {} },
} as unknown as ProjectConfig

function artifact(): ArtifactSummary {
  return {
    schema: 'dsh-sdd/artifact@1', uid: 'a1', key: 'REQ-1', title: '支付', stage: 'requirements', type: 'requirement-spec', version: '0.1.0',
    status: 'draft', entry: 'deliverable.md', createdAt: new Date(0).toISOString(), updatedAt: new Date(0).toISOString(), basedOn: [], derivedFrom: [], externalRefs: [],
    checklist: Object.fromEntries(Array.from({ length: 5 }, (_value, index) => [`item-${index + 1}`, true])), files: [], relativeDirectory: '.sdd/artifacts/requirements/a1', validationErrors: [],
  }
}

describe('stage quality', () => {
  it('requires every stage section and explicit completion checklist', () => {
    const content = ['# REQ-1 支付', '背景与目标', '范围', '用户与场景', '功能需求', '非功能需求', '验收条件', '待决问题']
      .map((value, index) => index === 0 ? value : `## ${value}\n已确认内容。`).join('\n\n')
    expect(evaluateQuality(artifact(), content, project, { artifacts: [], developmentWorkspaces: [] })).toMatchObject({ ready: true, score: 100 })
    expect(evaluateQuality(artifact(), content.replace('已确认内容。', '待补充。'), project, { artifacts: [], developmentWorkspaces: [] }).ready).toBe(false)
  })

  it('does not treat template comments and subsection headings as completed content', () => {
    const content = ['# REQ-1 支付', '背景与目标', '范围', '用户与场景', '功能需求', '非功能需求', '验收条件', '待决问题']
      .map((value, index) => index === 0 ? value : `## ${value}\n<!-- 填写要求 -->\n### 示例小节\n<!-- 按需填写 -->`).join('\n\n')
    expect(evaluateQuality(artifact(), content, project, { artifacts: [], developmentWorkspaces: [] }).ready).toBe(false)
  })
})
