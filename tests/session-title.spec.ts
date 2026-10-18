import { describe, expect, it } from 'vitest'
import { sessionTitlePrefix, stageSessionTitle } from '../src/client/session-title.ts'

const base = { key: 'REQ-0001', version: '0.1.0', title: '订单退款' }

describe('stage session titles', () => {
  it('uses the artifact coordinates without a product prefix', () => {
    expect(stageSessionTitle(base)).toBe('REQ-0001 v0.1.0 订单退款')
    expect(stageSessionTitle(base)).not.toContain('SDD')
  })

  it('marks only change revisions, and keeps the marker short', () => {
    expect(stageSessionTitle({ ...base, revision: { kind: 'upstream' } as never })).toBe('[变更·上游] REQ-0001 v0.1.0 订单退款')
    expect(stageSessionTitle({ ...base, revision: { kind: 'user-intent' } as never })).toBe('[变更·主动] REQ-0001 v0.1.0 订单退款')
    expect(stageSessionTitle({ ...base, key: 'DEV-0001', revision: { kind: 'user-intent' } as never })).toBe('[变更·主动] DEV-0001 v0.1.0 订单退款')
  })

  it('keeps the stage readable from the key prefix in every title', () => {
    for (const [key, stage] of [['REQ-0001', '需求'], ['UX-0001', '原型'], ['ARCH-0001', '系统设计'], ['SPEC-0001', '规格'], ['DEV-0001', '开发测试']] as const) {
      const title = stageSessionTitle({ key, version: '0.1.0', title: stage })
      expect(title.startsWith(key)).toBe(true)
    }
  })

  it('maps the two revision kinds and the plain case', () => {
    expect(sessionTitlePrefix(undefined)).toBe('')
    expect(sessionTitlePrefix('upstream')).toBe('[变更·上游]')
    expect(sessionTitlePrefix('user-intent')).toBe('[变更·主动]')
  })
})
