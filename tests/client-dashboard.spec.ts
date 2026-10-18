// @vitest-environment jsdom
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, beforeAll, describe, expect, it, onTestFinished, vi } from 'vitest'
import * as React from 'react'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'

/**
 * Render the dashboard through the real client bundle in jsdom.
 *
 * The plugin's panels paint through `innerHTML`, so a DOM renderer is required to see what a user
 * actually gets. This test drives one snapshot end to end: the action inbox, the compact metrics
 * and the work-item table with its next step.
 */

const BUNDLE = join(process.cwd(), 'lib/client.js')
let bundleCode: string

beforeAll(() => {
  bundleCode = readFileSync(BUNDLE, 'utf8')
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  document.body.innerHTML = ''
})

interface Registration {
  options: { name: string; id?: string; key?: string; label?: string; order?: number }
  component: React.FunctionComponent<Record<string, unknown>>
}

function loadDashboardPlugin(): { dashboard: Registration; selected: string[] } {
  const registrations: Registration[] = []
  const selected: string[] = []
  const services = {
    slots: {
      register(options: Registration['options'], component: Registration['component']): () => void {
        registrations.push({ options, component })
        return () => {}
      },
      inject(_ownerKey: string, callback: () => void): () => void { callback(); return () => {} },
    },
    layout: { selectPanel: (panelId: string | null) => { selected.push(String(panelId)) } },
    workspaces: {
      list: {
        getSnapshot: () => ({ items: [{ workspaceId: 'w1', path: '/tmp/demo', title: 'Demo', sessionIds: [] }], archivedSessionIds: [] }),
        subscribe: () => () => {},
      },
    },
    sessions: { list: { getSnapshot: () => ({ ids: [], byId: {} }), subscribe: () => () => {} }, binding: () => undefined },
    uiWorkspace: { connectWorkspace: async () => 's1', openSession() {} },
  }
  let registration: { id: string; factory: (require: (specifier: string) => unknown) => { apply: (ctx: unknown) => () => void } } | undefined
  vi.stubGlobal('__ModuleLoader__', { load: (value: typeof registration) => { registration = value } })
  new Function('window', 'module', 'exports', 'require', bundleCode)(globalThis, { exports: {} }, {}, (specifier: string) => { throw new Error(`unexpected require ${specifier}`) })
  const plugin = registration!.factory((specifier) => {
    if (specifier === 'react') return React
    throw new Error(`unexpected module ${specifier}`)
  })
  const disposer = plugin.apply({ get: (name: string) => (services as Record<string, unknown>)[name] })
  onTestFinished(() => { disposer() })
  const dashboard = registrations.find(entry => entry.options.name === 'main' && entry.options.key === 'dashboard')
  if (dashboard === undefined) throw new Error('the dashboard panel was not registered')
  return { dashboard, selected }
}

/** A snapshot in the shape the host returns, with one draft waiting for acceptance. */
function snapshotFixture(): Record<string, unknown> {
  const stages = ['requirements', 'prototype', 'architecture', 'specification', 'development'] as const
  const cells = stages.map(stage => ({ stage, status: stage === 'requirements' ? 'ready-for-review' : 'not-started' }))
  return {
    workspace: { workspaceId: 'w1', title: 'Demo', path: '/tmp/demo' },
    initialized: true,
    configuration: { status: 'valid', path: '.sdd/project.yaml', errors: [] },
    project: {
      schema: 'dsh-sdd/project@1',
      project: { key: 'demo', name: 'Demo' },
      development: { repositories: [], workspaceRoot: '.sdd-workspaces', branchPattern: 'sdd/{key}', mergeStrategy: 'merge' },
      sources: {},
      dependencies: {},
    },
    artifacts: [{
      uid: 'a1', key: 'REQ-0001', title: '导航改版', stage: 'requirements', type: 'requirement-spec', version: '0.1.0',
      status: 'draft', entry: 'deliverable.md', createdAt: '2026-10-01T00:00:00.000Z', updatedAt: '2026-10-02T00:00:00.000Z',
      basedOn: [], derivedFrom: [], externalRefs: [], files: [], validationErrors: [], relativeDirectory: '.sdd/work-items/w1/artifacts/requirements/REQ-0001/v0.1.0',
    }],
    sources: [],
    sourceProviders: ['manual'],
    connectors: [],
    workItems: [{
      schema: 'dsh-sdd/work-item@1', uid: 'wi1', key: 'NAV-1', title: '导航改版', kind: 'requirement', provider: 'manual',
      bundleKey: 'NAV', executionMode: 'standalone', relations: [], status: 'active',
      createdAt: '2026-10-01T00:00:00.000Z', updatedAt: '2026-10-01T00:00:00.000Z',
    }],
    runs: [],
    quality: { a1: { artifactUid: 'a1', stage: 'requirements', checkedAt: '2026-10-02T00:00:00.000Z', ready: false, score: 92, checks: [{ code: 'section:a', label: '章节：背景', status: 'passed', message: '' }] } },
    developmentWorkspaces: [],
    openSpecValidation: {},
    dashboard: {
      overallCompletion: 20,
      stages: stages.map(stage => ({ stage, status: stage === 'requirements' ? 'in-progress' : 'not-started', completion: stage === 'requirements' ? 40 : 0, drafts: stage === 'requirements' ? 1 : 0, accepted: 0, failedChecks: 0 })),
      workItems: { total: 1, requirements: 1, standaloneDefects: 0, custom: 0, pendingChanges: 0, completed: 0 },
      requirements: { packages: 1, total: 1, traced: 1, completed: 0 },
      defects: { total: 0, standalone: 0, attached: 0, open: 0, resolved: 0, deliveryPending: 0, deliveryCovered: 0 },
      artifacts: { total: 1, drafts: 1, accepted: 0 },
      development: { workspaces: 0, changedFiles: 0, passingTests: 0, failingTests: 0, commits: 0 },
      workload: [],
      stageFlow: stages.map(stage => ({ stage, notStarted: stage === 'requirements' ? 0 : 1, inProgress: stage === 'requirements' ? 1 : 0, readyForReview: 0, completed: 0, blocked: 0, notApplicable: 0 })),
      deliveryMatrix: [{
        workItemUid: 'wi1', key: 'NAV-1', title: '导航改版', kind: 'requirement', workItemStatus: 'active',
        attachedDefects: { total: 0, pending: 0, covered: 0 }, cells, completed: false,
        nextStep: { label: '验收需求讨论', stage: 'requirements' },
      }, {
        workItemUid: 'wi2', key: 'OLD-1', title: '历史需求', kind: 'requirement', workItemStatus: 'active',
        attachedDefects: { total: 0, pending: 0, covered: 0 },
        cells: stages.map(stage => ({ stage, status: 'completed' })), completed: true,
        nextStep: { label: '已完成' },
      }],
      burnup: [],
      traceability: 100,
      blockers: [],
      actions: [{
        id: 'accept:a1', kind: 'accept', severity: 'attention',
        title: '需求讨论 REQ-0001 v0.1.0 等待验收', detail: 'NAV-1 · 导航改版',
        workItemUid: 'wi1', workItemKey: 'NAV-1', stage: 'requirements', artifactUid: 'a1',
      }],
      recentEvents: [],
    },
    projectRepository: {
      isRepository: true, exactWorkspaceRoot: true, branch: 'main', detached: false, remote: 'origin', baseBranch: 'main',
      changedFiles: 0, stagedFiles: 0, untrackedFiles: 0, conflictFiles: [], ahead: 0, behind: 0, divergence: 'none', keyConflicts: [],
    },
    productKnowledge: { features: [], deliveries: [], catalogPath: 'product/feature-catalog.md', specificationPath: 'product/product-specification.md' },
  }
}

async function renderDashboard(): Promise<{ container: HTMLElement; root: Root; selected: string[] }> {
  vi.stubGlobal('fetch', vi.fn(async () => ({
    json: async () => ({ ok: true, snapshot: snapshotFixture() }),
  })))
  const { dashboard, selected } = loadDashboardPlugin()
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  // One act window covers mount, the snapshot request and the paint that follows it.
  await act(async () => {
    root.render(React.createElement(dashboard.component))
    await new Promise(resolve => setTimeout(resolve, 20))
  })
  return { container, root, selected }
}

describe('project dashboard', () => {
  it('leads with actionable items, then metrics and the work-item next step', async () => {
    const { container, root, selected } = await renderDashboard()
    const text = container.textContent ?? ''
    expect(text).toContain('需要我处理')
    expect(text).toContain('等待验收')
    expect(text).toContain('去处理')
    expect(text).toContain('阶段完成度')
    expect(text).toContain('进行中工作单元')
    expect(text).toContain('NAV-1 · 导航改版')
    expect(text).toContain('验收需求讨论')
    // Secondary reporting is folded away, not deleted.
    const more = container.querySelector('details.dsh-sdd-more')
    expect(more).not.toBeNull()
    expect(more!.hasAttribute('open')).toBe(false)
    expect(more!.textContent).toContain('五阶段流转')

    // Acting on the inbox row jumps to the owning stage panel.
    const action = container.querySelector<HTMLButtonElement>('[data-sdd-action]')!
    await act(async () => { action.click() })
    expect(selected).toContain('requirements')
    await act(async () => { root.unmount() })
  })

  it('opens the manual intake editor with a real editing surface', async () => {
    const { container, root } = await renderDashboard()
    const importButton = container.querySelector<HTMLButtonElement>('[data-action="import-requirement"]')!
    await act(async () => { importButton.click(); await new Promise(resolve => setTimeout(resolve, 0)) })
    // Step one is only the source setup; the long-form fields are gone.
    const setup = document.querySelector<HTMLFormElement>('.dsh-sdd-modal')
    expect(setup).not.toBeNull()
    expect(setup!.textContent).not.toContain('初始描述')
    await act(async () => { setup!.requestSubmit(); await new Promise(resolve => setTimeout(resolve, 20)) })

    // Step two is the editor: item list, Markdown toolbar, templates, paste-split and preview.
    const editor = document.querySelector<HTMLFormElement>('.dsh-sdd-manual-modal')
    expect(editor).not.toBeNull()
    const text = editor!.textContent ?? ''
    expect(text).toContain('手工录入需求')
    expect(text).toContain('插入结构模板')
    expect(text).toContain('粘贴 Markdown 拆分')
    expect(text).toContain('⌘/Ctrl + Enter')
    const description = editor!.querySelector<HTMLTextAreaElement>('[data-manual-description]')!
    expect(description.placeholder).toContain('背景')

    // Sub-items live beside the editor and can be added.
    await act(async () => { editor!.querySelector<HTMLButtonElement>('[data-add-entry]')!.click() })
    expect(editor!.querySelectorAll('.dsh-sdd-manual-entry')).toHaveLength(2)

    // Validation keeps the user in place instead of failing silently.
    await act(async () => { editor!.querySelector<HTMLButtonElement>('[type="submit"]')!.click(); await new Promise(resolve => setTimeout(resolve, 0)) })
    expect(editor!.querySelector('[data-manual-error]')!.textContent).toContain('主需求标题不能为空')

    // Markdown tools act on the description.
    editor!.querySelector<HTMLInputElement>('[data-manual-title]')!.value = '结算页改版'
    editor!.querySelector<HTMLInputElement>('[data-manual-title]')!.dispatchEvent(new Event('input', { bubbles: true }))
    await act(async () => { editor!.querySelector<HTMLButtonElement>('[data-md="h2"]')!.click() })
    expect(description.value).toBe('## ')
    expect(editor!.querySelector('.dsh-sdd-manual-entry-main strong')!.textContent).toContain('结算页改版')

    await act(async () => { editor!.querySelector<HTMLButtonElement>('[data-cancel]')!.click(); await act(async () => { root.unmount() }) })
  })

  it('filters completed work items out by default and toggles them back', async () => {
    const { container, root } = await renderDashboard()
    // The finished row is counted but hidden; the board keeps only actionable work.
    expect(container.textContent).not.toContain('OLD-1 · 历史需求')
    const toggle = container.querySelector<HTMLButtonElement>('[data-action="toggle-dashboard-completed"]')!
    expect(toggle.textContent).toContain('显示已完成（1）')
    await act(async () => { toggle.click() })
    expect(container.textContent).toContain('OLD-1 · 历史需求')
    const after = container.querySelector<HTMLButtonElement>('[data-action="toggle-dashboard-completed"]')!
    expect(after.textContent).toContain('隐藏已完成')
    await act(async () => { after.click() })
    expect(container.textContent).not.toContain('OLD-1 · 历史需求')
    await act(async () => { root.unmount() })
  })
})
