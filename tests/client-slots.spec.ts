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
function loadPlugin(): { sidebar: Registration[]; main: Registration[]; disposer: () => void; selected: string[] } {
  const registrations: Registration[] = []
  const selected: string[] = []
  const services = {
    slots: {
      register(options: Registration['options'], component: Component): () => void {
        registrations.push({ options, component })
        return () => {}
      },
      inject(_ownerKey: string, callback: () => void): () => void { callback(); return () => {} },
    },
    layout: { selectPanel: (panelId: string | null) => { selected.push(String(panelId)) } },
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
    // The header shares the panel list with its children, ordered after them so it renders above.
    expect(plugin.sidebar.map(entry => entry.options.id)).toEqual(['e2e-dev-sdd-group', 'dashboard', 'requirements', 'prototype', 'architecture', 'specification', 'development', 'settings'])
    expect(plugin.sidebar[0]!.options.label).toBe('项目开发')
    expect(plugin.sidebar[0]!.options.order).toBeGreaterThan(plugin.sidebar[1]!.options.order!)
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
    // The row button and its label belong to the shell; the plugin contributes the glyph.
    expect(renderer.root.findAllByType('svg')).toHaveLength(2)
    renderer.unmount()
  })

  it('renders the main panel container for a stage', () => {
    const plugin = loadPlugin()
    const renderer = mount(plugin.main[1]!.component as Component)
    expect(renderer.toJSON()).toMatchObject({ props: { className: 'dsh-sdd-panel' } })
    renderer.unmount()
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

    const style = (document.querySelector('style[data-dsh-sdd-style]') as HTMLStyleElement).textContent ?? ''
    expect(style).toContain('[data-dsh-sdd-child]{display:none}')
    expect(style).not.toContain('.dsh-sdd-panel-list>*{display:none}')

    renderer.unmount()
    nav.remove()
  })
})
