/**
 * Effective-pack-id derivation — ext-spec §9.6
 *
 * EffectivePackId canonical structure:
 *   epack-{packId-sans-prefix}-{jurisdictionId-hash8}-{asOfDate}-{digest12}
 *
 * Where:
 *   packId-sans-prefix = packId without leading "pack-"
 *   jurisdictionId-hash8 = first 8 chars of SHA-256(jurisdictionId)
 *   asOfDate = governingAsOfDate (YYYY-MM-DD)
 *   digest12 = first 12 chars of compositionDigest
 *
 * Same governed inputs must produce the same EffectivePackId.
 * This is derived — never operator-authored.
 */

import { createHash } from 'node:crypto';
import type { EffectivePackId, PackId } from '../../types/identifiers.js';
import { brandEffectivePackId } from '../../types/identifiers.js';
import type { IsoDate } from '../../types/effective-pack.js';
import type { Sha256Hex } from '../../types/primitives.js';

const PACK_PREFIX = 'pack-';

/**
 * Strip "pack-" prefix from a PackId to get the body slug.
 * Legacy and open identifiers both begin with "pack-".
 */
function stripPackPrefix(packId: PackId): string {
  const raw = packId as string;
  if (raw.startsWith(PACK_PREFIX)) {
    return raw.slice(PACK_PREFIX.length);
  }
  return raw;
}

/**
 * First 8 hex chars of SHA-256 of the jurisdictionId string.
 * Deterministic for same input — used to keep EffectivePackId stable.
 */
function hashJurisdictionId(jurisdictionId: string): string {
  return createHash('sha256').update(jurisdictionId, 'utf8').digest('hex').slice(0, 8);
}

/**
 * Derive the canonical EffectivePackId from governed inputs.
 * ext-spec §9.6 — same inputs → same id.
 */
export function deriveEffectivePackId(
  packId: PackId,
  jurisdictionId: string,
  governingAsOfDate: IsoDate,
  compositionDigest: Sha256Hex,
): EffectivePackId {
  const body = stripPackPrefix(packId);
  const jHash = hashJurisdictionId(jurisdictionId);
  const digest12 = compositionDigest.slice(0, 12);
  const raw = `epack-${body}-${jHash}-${governingAsOfDate}-${digest12}`;
  return brandEffectivePackId(raw);
}

/**
 * Parse a raw string into an EffectivePackId with light structural check.
 * Does not re-derive — only validates the prefix and character set.
 */
export function parseEffectivePackId(raw: string): EffectivePackId {
  if (!raw.startsWith('epack-')) {
    throw new Error(`Invalid EffectivePackId — must begin with 'epack-': ${raw}`);
  }
  return brandEffectivePackId(raw);
}
