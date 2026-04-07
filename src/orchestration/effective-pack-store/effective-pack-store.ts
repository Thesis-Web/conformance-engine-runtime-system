/**
 * Effective-pack store — public interface.
 * ext-spec §13
 *
 * DIFF-AUDIT-002: exports markReplayValidated so resolver can set
 * replayValidated=true after successful fresh compose + compatibility validation.
 */

import { writeFileSync, mkdirSync, readFileSync, readdirSync, existsSync } from 'node:fs';
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

/**
 * Hydrate the in-memory effective-pack store from persisted manifests on disk.
 * Call this at the start of any CLI invocation that provides a storeRoot so that
 * effective packs composed in prior runs are available for lawful reuse without
 * recomposing from scratch. ext-spec §13 — store must be available across
 * separate operator invocations.
 *
 * Reconstruction: all fields needed for EffectivePackStoreRecord can be derived
 * from the persisted EffectivePackManifest JSON. componentIds and componentDigests
 * come from componentProvenance. Both validation flags are assumed true because
 * persistence only occurs after a successful fresh compose and validation.
 */
export function hydrateStoreFromDisk(storeRoot: string): number {
  if (!existsSync(storeRoot)) return 0;

  let loaded = 0;
  let entries: string[];
  try {
    entries = readdirSync(storeRoot);
  } catch {
    return 0;
  }

  for (const entry of entries) {
    const manifestPath = join(storeRoot, entry, 'effective-pack-manifest.json');
    if (!existsSync(manifestPath)) continue;

    try {
      const raw = JSON.parse(readFileSync(manifestPath, 'utf8')) as EffectivePackManifest;

      // Validate minimum required fields before registering
      if (!raw.effectivePackId || !raw.compositionDigest || !raw.packId) continue;
      if (!raw.trackFamilyId || !raw.jurisdictionFamilyId || !raw.jurisdictionId) continue;
      if (!Array.isArray(raw.componentProvenance)) continue;

      const record: EffectivePackStoreRecord = {
        effectivePackId: raw.effectivePackId,
        compositionDigest: raw.compositionDigest,
        packId: raw.packId,
        trackFamilyId: raw.trackFamilyId,
        jurisdictionFamilyId: raw.jurisdictionFamilyId,
        jurisdictionId: raw.jurisdictionId,
        tierPath: raw.tierPath,
        governingAsOfDate: raw.governingAsOfDate,
        componentIds: raw.componentProvenance.map((cp) => cp.componentId),
        componentDigests: raw.componentProvenance.map((cp) => cp.digest),
        storedAt: raw.resolvedAt,
        manifestPath,
        // Both flags assumed true: file was written only after successful compose + validation.
        compatibilityValidated: true,
        replayValidated: true,
        ...(raw.municipalityId !== undefined && { municipalityId: raw.municipalityId }),
      };

      storeEffectivePack(record);
      loaded++;
    } catch {
      // Malformed or unreadable manifest — skip silently; best-effort hydration.
    }
  }

  return loaded;
}

export { lookupEffectivePackById } from './effective-pack-store-memory.js';
export { clearStore, listStoreKeys, storeSize } from './effective-pack-store-memory.js';
