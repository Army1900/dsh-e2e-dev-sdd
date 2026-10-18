import type { ArtifactSummary } from '../protocol.ts';
/**
 * Session titles name the work, not the product.
 *
 * The artifact key already carries the stage and type (`REQ`, `UX`, `ARCH`, `SPEC`, `DEV`), so a
 * plain run needs no marker; only a change revision is marked, and the marker is kept short so
 * session lists stay scannable.
 */
export declare function sessionTitlePrefix(kind: 'upstream' | 'user-intent' | undefined): string;
/** `<KEY> v<VERSION> <TITLE>`, prefixed only when the artifact is a change revision. */
export declare function stageSessionTitle(artifact: Pick<ArtifactSummary, 'key' | 'version' | 'title' | 'revision'>): string;
