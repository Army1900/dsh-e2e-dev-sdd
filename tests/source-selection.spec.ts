import { describe, expect, it } from 'vitest'
import { preferredSourceSelection } from '../src/client/source-selection.ts'

describe('preferredSourceSelection', () => {
  it('selects a custom registered provider before built-in manual intake', () => {
    expect(preferredSourceSelection(['manual', 'company-alm'], [], { provider: 'manual' })).toEqual({ provider: 'company-alm' })
  })

  it('selects a project Connector before a plugin Connector', () => {
    expect(preferredSourceSelection(['command', 'manual'], [
      { id: 'installed-alm', scope: 'plugin', overridden: false },
      { id: 'project-alm', scope: 'project', overridden: false },
    ], { provider: 'manual' })).toEqual({ provider: 'command', connector: 'project-alm' })
  })

  it('keeps an explicitly configured enterprise provider and Connector', () => {
    expect(preferredSourceSelection(['command', 'manual'], [
      { id: 'installed-alm', scope: 'plugin', overridden: false },
      { id: 'project-alm', scope: 'project', overridden: false },
    ], { provider: 'command', connector: 'installed-alm' })).toEqual({ provider: 'command', connector: 'installed-alm' })
  })
})
