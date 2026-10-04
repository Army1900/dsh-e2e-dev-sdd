/**
 * Typings for the DSH Host services this plugin consumes.
 *
 * DSH 0.2 ships its runtime without published `.d.ts` files, and the services are
 * plain Cordis services resolved by name at runtime. This module declares the
 * narrow surface the plugin actually uses so `pnpm typecheck` stays meaningful
 * against the desktop runtime that hosts it.
 *
 * The shapes mirror the 0.2.0-rc.2 implementation:
 * - `@deepseek-ai/dsh-workspace` → `WorkspaceRegistry` (`ctx.workspaceRegistry`).
 * - `@deepseek-ai/dsh-api-session-controller` → `SessionController`
 *   (`ctx.sessionController`), which owns the native "open this path" action that
 *   `dsh-host-apiproxy`'s `host.openPath` used to provide before 0.2.
 *
 * The services are read through `ctx.get(name)` rather than a module augmentation:
 * Cordis 4 resolves services by name, and augmenting the package's re-exported
 * `Context` would replace the interface members the runtime mixins already provide.
 */

export interface WorkspaceEntity {
  /** Stable workspace identifier used by every workspace-scoped action. */
  readonly id: string
  /** Absolute, canonicalized directory owned by this workspace. */
  readonly path: string
  /** User-visible workspace title. */
  readonly title: string
  readonly createdAt: string
  readonly updatedAt: string
  readonly sessionIds: readonly string[]
}

/** The durable workspace registry (`ctx.workspaceRegistry`). */
export interface WorkspaceRegistryService {
  get(id: string): WorkspaceEntity | undefined
  list(): WorkspaceEntity[]
}

/** The host session controller (`ctx.sessionController`). */
export interface SessionControllerService {
  /** Open a path in the OS-associated application; desktop-only capability. */
  openPath(path: string, signal?: AbortSignal): Promise<void>
}
