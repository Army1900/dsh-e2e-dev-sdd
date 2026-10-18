import type { ArtifactSummary } from '../protocol.ts'

/**
 * Session titles name the work, not the product.
 *
 * The artifact key already carries the stage and type (`REQ`, `UX`, `ARCH`, `SPEC`, `DEV`), so a
 * plain run needs no marker; only a change revision is marked, and the marker is kept short so
 * session lists stay scannable.
 */
export function sessionTitlePrefix(kind: 'upstream' | 'user-intent' | undefined): string {
  if (kind === 'upstream') return '[变更·上游]'
  if (kind === 'user-intent') return '[变更·主动]'
  return ''
}

/** `<KEY> v<VERSION> <TITLE>`, prefixed only when the artifact is a change revision. */
export function stageSessionTitle(artifact: Pick<ArtifactSummary, 'key' | 'version' | 'title' | 'revision'>): string {
  const name = `${artifact.key} v${artifact.version} ${artifact.title}`
  const prefix = sessionTitlePrefix(artifact.revision?.kind)
  return prefix === '' ? name : `${prefix} ${name}`
}
