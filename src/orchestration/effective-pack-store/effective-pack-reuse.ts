/**
 * Effective-pack lawful reuse — ext-spec §13
 *
 * A stored effective pack may be reused ONLY when exact input identity matches:
 *   - packId
 *   - jurisdictionId
 *   - governingAsOfDate
 *   - compositionDigest
 *
 * Any field mismatch requires fresh composition.
 * versionIndex and resolvedAt are NOT part of the reuse identity key.
 */

import { createHash } from 'node:crypto';
import type { EffectivePackResolutionInput } from '../../types/effective-pack.js';
import type { EffectivePackStoreRecord } from '../../types/effective-pack.js';
import type { Sha256Hex } from '../../types/primitives.js';

/**
 * Derive a deterministic reuse key from the resolution input fields that
 * govern identity. Used to locate a candidate store record before digest check.
 */
export function deriveReuseKey(input: EffectivePackResolutionInput): string {
  const payload = JSON.stringify({
    packId: input.packId,
    trackFamilyId: input.trackFamilyId,
    jurisdictionFamilyId: input.jurisdictionFamilyId,
    jurisdictionId: input.jurisdictionId,
    governingAsOfDate: input.governingAsOfDate,
    municipalityId: input.municipalityId ?? null,
  });
  return createHash('sha256').update(payload, 'utf8').digest('hex') as Sha256Hex;
}

/**
 * Validate that a stored record is lawfully reusable for the current resolution input.
 * Returns true only if all identity fields match AND compositionDigest matches.
 * ext-spec §13: "reuse only happens on exact input identity"
 */
export function isLawfullyReusable(
  record: EffectivePackStoreRecord,
  input: EffectivePackResolutionInput,
  compositionDigest: Sha256Hex,
): boolean {
  return (
    record.packId === input.packId &&
    record.trackFamilyId === input.trackFamilyId &&
    record.jurisdictionFamilyId === input.jurisdictionFamilyId &&
    record.jurisdictionId === input.jurisdictionId &&
    record.governingAsOfDate === input.governingAsOfDate &&
    (record.municipalityId ?? null) === (input.municipalityId ?? null) &&
    record.compositionDigest === compositionDigest
  );
}
