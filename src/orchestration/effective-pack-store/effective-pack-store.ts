/**
 * Effective-pack store — public interface.
 * ext-spec §13
 *
 * DIFF-AUDIT-002: exports markReplayValidated so resolver can set
 * replayValidated=true after successful fresh compose + compatibility validation.
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import type { EffectivePackId } from '../../types/identifiers.js';
import type {
  EffectivePackManifest,
  EffectivePackStoreRecord,
  EffectivePackResolutionInput,
} from '../../types/effective-pack.js';
import type { Sha256Hex } from '../../types/primitives.js';
import {
  storeEffectivePack,
  lookupEffectivePackById,
  markReplayValidated as markReplayValidatedInMemory,
} from './effective-pack-store-memory.js';
import { isLawfullyReusable } from './effective-pack-reuse.js';

/**
 * Persist an effective pack manifest to disk and register its store record.
 * Sets compatibilityValidated=true (caller has already validated).
 * replayValidated starts false — caller must call markReplayValidated() after
 * confirming the fresh manifest is replay-valid.
 */
export function persistEffectivePack(
  manifest: EffectivePackManifest,
  storeRoot: string,
  componentDigests: Sha256Hex[],
): EffectivePackStoreRecord {
  const dirPath = join(storeRoot, manifest.effectivePackId as string);
  mkdirSync(dirPath, { recursive: true });

  const manifestPath = join(dirPath, 'effective-pack-manifest.json');
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

  const record: EffectivePackStoreRecord = {
    effectivePackId: manifest.effectivePackId,
    compositionDigest: manifest.compositionDigest,
    packId: manifest.packId,
    trackFamilyId: manifest.trackFamilyId,
    jurisdictionFamilyId: manifest.jurisdictionFamilyId,
    jurisdictionId: manifest.jurisdictionId,
    tierPath: manifest.tierPath,
    governingAsOfDate: manifest.governingAsOfDate,
    componentIds: manifest.componentProvenance.map((cp) => cp.componentId),
    componentDigests,
    storedAt: new Date().toISOString(),
    manifestPath,
    compatibilityValidated: true,
    replayValidated: false, // set to true by markReplayValidated() after full validation
    ...(manifest.municipalityId !== undefined && { municipalityId: manifest.municipalityId }),
  };

  storeEffectivePack(record);
  return record;
}

/**
 * Mark a stored effective pack as replay-validated.
 * Called by the resolver immediately after a successful fresh compose.
 * ext-spec §19.1, §19.4 — replayValidated must be true for lawful reuse.
 */
export function markReplayValidated(effectivePackId: EffectivePackId): void {
  markReplayValidatedInMemory(effectivePackId);
}

/**
 * Look up an effective pack by id and validate reuse is lawful.
 * Returns the record if reusable (all §19.1 preconditions met), undefined otherwise.
 */
export function findReusableEffectivePack(
  effectivePackId: EffectivePackId,
  input: EffectivePackResolutionInput,
  compositionDigest: Sha256Hex,
): EffectivePackStoreRecord | undefined {
  const record = lookupEffectivePackById(effectivePackId);
  if (!record) return undefined;
  if (!isLawfullyReusable(record, input, compositionDigest)) return undefined;
  return record;
}

export { lookupEffectivePackById } from './effective-pack-store-memory.js';
export { clearStore, listStoreKeys, storeSize } from './effective-pack-store-memory.js';
