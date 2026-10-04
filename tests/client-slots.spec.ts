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
function loadPlugin(): { sidebar: Registration[]; main: Registration[]; group: Registration[]; disposer: () => void; selected: string[] } {
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
    group: registrations.filter(entry => entry.options.name === 'sidebar.footer.action'),
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
  it('registers the 项目开发 header plus the seven SDD panels', () => {
    const plugin = loadPlugin()
    expect(plugin.group.map(entry => entry.options.name)).toEqual(['sidebar.footer.action'])
    expect(plugin.group[0]!.options.label).toBe('项目开发')
    expect(plugin.sidebar.map(entry => entry.options.id)).toEqual(['dashboard', 'requirements', 'prototype', 'architecture', 'specification', 'development', 'settings'])
    expect(plugin.main.map(entry => entry.options.key)).toEqual(['dashboard', 'requirements', 'prototype', 'architecture', 'specification', 'development', 'settings'])
  })

  it('mounts the stylesheet and publishes the fold marker once the header renders', () => {
    const plugin = loadPlugin()
    expect(document.querySelector('style[data-dsh-sdd-style]')).toBeNull()
    const header = plugin.group[0]!
    const renderer = mount(header.component as Component)
    const style = document.querySelector('style[data-dsh-sdd-style]') as HTMLStyleElement | null
    expect(style).not.toBeNull()
    expect(style!.textContent).toContain('.dsh-sdd-group-header')
    expect(style!.textContent).toContain('data-dsh-sdd-group-collapsed')
    // Expanded is the default: the marker is absent and the chevron is rotated by CSS.
    expect(document.documentElement.hasAttribute('data-dsh-sdd-group-collapsed')).toBe(false)
    const button = renderer.root.findByType('button')
    expect(button.props['aria-expanded']).toBe('true')
    expect(String(button.props.title)).toBe('项目开发')
    renderer.unmount()
  })

  it('folds and unfolds the group from the header click', () => {
    const plugin = loadPlugin()
    const renderer = mount(plugin.group[0]!.component as Component)
    const button = renderer.root.findByType('button')
    act(() => { button.props.onClick() })
    expect(document.documentElement.hasAttribute('data-dsh-sdd-group-collapsed')).toBe(true)
    expect(renderer.root.findByType('button').props['aria-expanded']).toBe('false')
    act(() => { renderer.root.findByType('button').props.onClick() })
    expect(document.documentElement.hasAttribute('data-dsh-sdd-group-collapsed')).toBe(false)
    expect(renderer.root.findByType('button').props['aria-expanded']).toBe('true')
    renderer.unmount()
  })

  it('renders the main panel container for a stage', () => {
    const plugin = loadPlugin()
    const renderer = mount(plugin.main[1]!.component as Component)
    expect(renderer.toJSON()).toMatchObject({ props: { className: 'dsh-sdd-panel' } })
    renderer.unmount()
  })
})
