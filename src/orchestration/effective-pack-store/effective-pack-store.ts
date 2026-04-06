/**
 * Effective-pack store — public interface.
 * ext-spec §13
 *
 * Wraps the memory store and reuse checker into a single public API
 * consumed by the resolver paths.
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
import { storeEffectivePack, lookupEffectivePackById } from './effective-pack-store-memory.js';
import { isLawfullyReusable } from './effective-pack-reuse.js';

/**
 * Persist an effective pack manifest to disk and register its store record.
 * Returns the store record.
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
    replayValidated: false,
    ...(manifest.municipalityId !== undefined && { municipalityId: manifest.municipalityId }),
  };

  storeEffectivePack(record);
  return record;
}

/**
 * Look up an effective pack by id and validate reuse is lawful.
 * Returns the record if reusable, undefined otherwise.
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
