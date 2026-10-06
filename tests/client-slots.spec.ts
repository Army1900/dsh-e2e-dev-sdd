// @vitest-environment jsdom
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import * as React from 'react'
import { act, create, type ReactTestRenderer } from 'react-test-renderer'

/** One registered slot component and the options it was registered with. */
interface Registration {
  options: { name: string; id?: string; key?: string; order?: number; label?: string }
  component: (props: Readonly<Record<string, unknown>>) => unknown
}

/** The bundle returns untyped React elements; the test only needs a renderable component. */
type Component = React.FunctionComponent<Record<string, unknown>>

/** Vitest runs from the package root; the built client bundle is the artifact under test. */
const BUNDLE = join(process.cwd(), 'lib/client.js')
let bundleCode: string

beforeAll(() => {
  bundleCode = readFileSync(BUNDLE, 'utf8')
  // react-test-renderer requires the act environment marker to silence its warning.
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
})

afterEach(() => {
  document.documentElement.removeAttribute('data-dsh-sdd-group-collapsed')
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

/**
 * Run the built client bundle the way DSH 0.2's module system does, then drive its `apply`
 * through the documented client services. Rendering uses the real React runtime so the group
 * header's effects and click handler run for real.
 */
function loadPlugin(): { sidebar: Registration[]; main: Registration[]; disposer: () => void; selected: string[]; selectPanel: (panelId: string | null) => void } {
  const registrations: Registration[] = []
  const selected: string[] = []
  // The shell's central-panel selection store; the plugin follows it to fold the group.
  let activePanelId: string | null = null
  const panelListeners = new Set<() => void>()
  const panelInfo = {
    getSnapshot: () => ({ activePanelId }),
    subscribe: (listener: () => void) => { panelListeners.add(listener); return () => { panelListeners.delete(listener) } },
  }
  const selectPanel = (panelId: string | null): void => {
    selected.push(String(panelId))
    activePanelId = panelId
    for (const listener of panelListeners) listener()
  }
  const services = {
    slots: {
      register(options: Registration['options'], component: Component): () => void {
        registrations.push({ options, component })
        return () => {}
      },
      inject(_ownerKey: string, callback: () => void): () => void { callback(); return () => {} },
    },
    layout: { selectPanel, panelInfo },
    workspaces: { list: { getSnapshot: () => ({ items: [], archivedSessionIds: [] }), subscribe: () => () => {} } },
    sessions: { list: { getSnapshot: () => ({ ids: [], byId: {} }), subscribe: () => () => {} }, binding: () => undefined },
    uiWorkspace: { connectWorkspace: async () => 's1', openSession() {} },
  }
  let registration: { id: string; factory: (require: (specifier: string) => unknown) => { apply: (ctx: unknown) => () => void } } | undefined
  const loader = { load: (value: typeof registration) => { registration = value } }
  vi.stubGlobal('__ModuleLoader__', loader)
  new Function('window', 'module', 'exports', 'require', bundleCode)(globalThis, { exports: {} }, {}, (specifier: string) => { throw new Error(`unexpected top-level require ${specifier}`) })
  expect(registration?.id).toBe('dsh-e2e-dev-sdd')
  const plugin = registration!.factory((specifier) => {
    if (specifier === 'react') return React
    throw new Error(`the client bundle requested a non-platform module: ${specifier}`)
  })
  expect(plugin.apply({ get: (name: string) => (services as Record<string, unknown>)[name] })).toBeTypeOf('function')
  return {
    sidebar: registrations.filter(entry => entry.options.name === 'sidebar.panellist'),
    main: registrations.filter(entry => entry.options.name === 'main'),
    disposer: plugin.apply({ get: (name: string) => (services as Record<string, unknown>)[name] }),
    selected,
    selectPanel,
  }
}

/** Mount one registered component and return its renderer so effects and clicks can be driven. */
function mount(component: Component): ReactTestRenderer {
  let renderer: ReactTestRenderer | undefined
  act(() => { renderer = create(React.createElement(component, {})) })
  return renderer!
}

describe('SDD client slot wiring', () => {
  it('registers the 项目开发 header and its seven children in one list', () => {
    const plugin = loadPlugin()
    expect(plugin.sidebar.map(entry => entry.options.id)).toEqual(['e2e-dev-sdd-group', 'dashboard', 'requirements', 'prototype', 'architecture', 'specification', 'development', 'settings'])
    expect(plugin.sidebar[0]!.options.label).toBe('项目开发')
    // The shell sorts the list by order ascending, so the header must sort below its children
    // (and below the shipped panels, which register from 100 upward) to render at the top.
    expect(plugin.sidebar[0]!.options.order).toBe(0)
    for (const child of plugin.sidebar.slice(1)) expect(child.options.order!).toBeGreaterThan(0)
    expect(plugin.main.map(entry => entry.options.key)).toEqual(['dashboard', 'requirements', 'prototype', 'architecture', 'specification', 'development', 'settings'])
  })

  it('mounts the stylesheet and publishes the fold marker once the header glyph renders', () => {
    const plugin = loadPlugin()
    expect(document.querySelector('style[data-dsh-sdd-style]')).toBeNull()
    const renderer = mount(plugin.sidebar[0]!.component as Component)
    const style = document.querySelector('style[data-dsh-sdd-style]') as HTMLStyleElement | null
    expect(style).not.toBeNull()
    expect(style!.textContent).toContain('data-dsh-sdd-group-collapsed')
    expect(style!.textContent).toContain('[data-dsh-sdd-child]')
    expect(document.documentElement.hasAttribute('data-dsh-sdd-group-collapsed')).toBe(false)
    // The row button, its label and tooltip belong to the shell; the plugin contributes the glyph
    // only — no chevron and no expand/collapse copy.
    expect(renderer.root.findAllByType('svg')).toHaveLength(1)
    const markup = JSON.stringify(renderer.toJSON())
    expect(markup).not.toContain('收起')
    expect(markup).not.toContain('展开')
    renderer.unmount()
  })

  it('renders the main panel container for a stage', () => {
    const plugin = loadPlugin()
    const renderer = mount(plugin.main[1]!.component as Component)
    expect(renderer.toJSON()).toMatchObject({ props: { className: 'dsh-sdd-panel' } })
    renderer.unmount()
  })

  it('sorts above other plugins in the shell panel list', () => {
    const plugin = loadPlugin()
    // Other global-panel plugins register from 100 upward; the shell sorts ascending by order.
    const panels = [
      ...plugin.sidebar.map(entry => ({ id: String(entry.options.id), order: entry.options.order ?? 0 })),
      { id: 'news-wall', order: 100 },
      { id: 'plugin-manager', order: 200 },
    ].sort((left, right) => left.order - right.order)
    expect(panels.map(panel => panel.id)).toEqual([
      'e2e-dev-sdd-group', 'dashboard', 'requirements', 'prototype', 'architecture',
      'specification', 'development', 'settings', 'news-wall', 'plugin-manager',
    ])
  })

  it('tags the header and only its own panel rows, leaving other plugins alone', () => {
    // The shell's panel list also holds rows registered by unrelated global-panel plugins.
    const nav = document.createElement('nav')
    const labels = ['项目看板', '需求讨论', '原型输出', '系统设计', '规格设计', '开发测试', '项目设置']
    for (const label of ['项目开发', ...labels, '时事大屏', '插件管理']) {
      const button = document.createElement('button')
      button.setAttribute('aria-label', label)
      nav.appendChild(button)
    }
    document.body.appendChild(nav)
    const rowOf = (label: string) => nav.querySelector<HTMLElement>(`button[aria-label="${label}"]`)!

    const plugin = loadPlugin()
    const renderer = mount(plugin.sidebar[0]!.component as Component)

    expect(nav.classList.contains('dsh-sdd-panel-list')).toBe(true)
    expect(rowOf('项目开发').hasAttribute('data-dsh-sdd-group-header')).toBe(true)
    expect(rowOf('项目开发').getAttribute('aria-expanded')).toBe('true')
    for (const label of labels) expect(rowOf(label).hasAttribute('data-dsh-sdd-child')).toBe(true)
    // Rows this plugin does not own must stay untagged, so the fold CSS cannot hide them.
    expect(rowOf('时事大屏').hasAttribute('data-dsh-sdd-child')).toBe(false)
    expect(rowOf('插件管理').hasAttribute('data-dsh-sdd-child')).toBe(false)

    // The fold is driven by the header row's own click, which must not select a panel.
    rowOf('项目开发').dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(document.documentElement.hasAttribute('data-dsh-sdd-group-collapsed')).toBe(true)
    expect(plugin.selected).toEqual([])

    // Folding is user-driven only: switching panels — this plugin's or another's — leaves the
    // group exactly as the user left it.
    rowOf('项目开发').dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(document.documentElement.hasAttribute('data-dsh-sdd-group-collapsed')).toBe(false)
    act(() => { plugin.selectPanel('requirements') })
    expect(document.documentElement.hasAttribute('data-dsh-sdd-group-collapsed')).toBe(false)
    act(() => { plugin.selectPanel('news-wall') })
    expect(document.documentElement.hasAttribute('data-dsh-sdd-group-collapsed')).toBe(false)
    // Only the header row folds it.
    rowOf('项目开发').dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(document.documentElement.hasAttribute('data-dsh-sdd-group-collapsed')).toBe(true)

    const style = (document.querySelector('style[data-dsh-sdd-style]') as HTMLStyleElement).textContent ?? ''
    expect(style).toContain('[data-dsh-sdd-child]{display:none}')
    expect(style).not.toContain('.dsh-sdd-panel-list>*{display:none}')

    renderer.unmount()
    nav.remove()
  })
})
