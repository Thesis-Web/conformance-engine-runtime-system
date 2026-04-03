import type { RunStatus } from '../types/index.js';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

export const VALID_TRANSITIONS: Readonly<Partial<Record<RunStatus, ReadonlyArray<RunStatus>>>> = {
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
// Artifact presence check is injected as a callback.
// For intermediate stages (ingesting→ingested, ingested→classified, etc.) the
// no-op is CORRECT: artifacts are emitted in one shot at buildArtifacts(), so
// no files exist on disk until artifacts_built is reached.
// The meaningful runtime check is artifacts_built → validated, where required
// artifact files must be present before the validation transition fires.
export type ArtifactChecker = (stage: RunStatus) => boolean;

const DEFAULT_ARTIFACT_CHECKER: ArtifactChecker = (_stage) => true;

// CONTRA-STATE-001 fix: factory for a real checker that verifies required artifact
// files exist on disk before the artifacts_built → validated transition.
// This is the only transition where files are guaranteed to exist; all others
// correctly use the no-op because nothing has been written yet.
export function makeArtifactPresenceChecker(
  artifactRoot: string,
  requiredArtifacts: ReadonlyArray<string>,
): ArtifactChecker {
  return (stage: RunStatus): boolean => {
    if (stage !== 'artifacts_built') return true; // no-op correct for all other stages
    return requiredArtifacts.every((name) => existsSync(join(artifactRoot, name)));
  };
}

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
