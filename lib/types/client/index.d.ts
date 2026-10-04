import type { Context } from '@deepseek-ai/cordis';
export declare const name = "dsh-e2e-dev-sdd-client";
/** DSH 0.2 client services. `workspaces`/`sessions` carry the project and session data,
 * `uiWorkspace` opens a session in the main panel, and `slots`/`layout` render the UI. */
export declare const inject: string[];
/**
 * DSH 0.2 client entry: the `项目开发` group header in `sidebar.footer.action` — a list seat, so
 * it never competes with the workspace browser occupying the single `sidebar.workspaces` seat —
 * plus seven `sidebar.panellist` rows, each addressing the matching key in the layout's
 * root-scoped `main` keyed slot. One workbench instance is shared by the panel components so
 * project state survives switching between stages.
 */
export declare function apply(ctx: Context): () => void;
