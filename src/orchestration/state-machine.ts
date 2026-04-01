import type { RunStatus } from '../types/index.js';

export const VALID_TRANSITIONS: Readonly<
  Partial<Record<RunStatus, ReadonlyArray<RunStatus>>>
> = {
  created: ['ingesting'],
  ingesting: ['ingested', 'failed'],
  ingested: ['classified', 'failed'],
  classified: ['compare_pairs_built', 'failed'],
  compare_pairs_built: ['pass1_complete', 'failed'],
  pass1_complete: ['pass2_complete', 'failed'],
  pass2_complete: ['rules_complete', 'failed'],
  rules_complete: ['artifacts_built', 'failed'],
  artifacts_built: ['validated', 'failed'],
  validated: ['complete', 'failed'],
} as const;

// Per spec §28.2: each transition requires prior-stage artifacts to exist.
// Artifact presence check is injected as a callback; defaults to no-op stub
// until artifact storage is wired in §36.13.
export type ArtifactChecker = (stage: RunStatus) => boolean;

const DEFAULT_ARTIFACT_CHECKER: ArtifactChecker = (_stage) => true;

export function transition(
  current: RunStatus,
  next: RunStatus,
  artifactChecker: ArtifactChecker = DEFAULT_ARTIFACT_CHECKER,
): void {
  const allowed = VALID_TRANSITIONS[current];
  if (allowed === undefined || !allowed.includes(next)) {
    throw new Error(`invalid transition: ${current} -> ${next}`);
  }
  if (!artifactChecker(current)) {
    throw new Error(`prior stage artifact missing: ${current}`);
  }
}

export function isTerminal(status: RunStatus): boolean {
  return status === 'complete' || status === 'failed';
}
