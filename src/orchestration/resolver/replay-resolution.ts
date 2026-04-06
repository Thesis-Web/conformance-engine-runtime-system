/**
 * Replay resolution path — ext-spec §8.3, §28
 *
 * Replay is valid only when:
 *   stored.effectivePackId == pinned.resolvedEffectivePackId
 *   AND stored.compositionDigest == pinned.compositionDigest
 *   AND stored.componentDigests == pinned.componentDigests (ordered equality)
 *
 * Any mismatch throws ERR_REPLAY_DIGEST_MISMATCH.
 */

import type { EffectivePackStoreRecord } from '../../types/effective-pack.js';
import type { Sha256Hex } from '../../types/primitives.js';
import type { EffectivePackId } from '../../types/identifiers.js';
import { ResolverError } from './tier-path-builder.js';

/**
 * Pinned fields persisted on RunRecordExtension at time of original resolution.
 * These are the ground truth for replay validation.
 */
export interface ReplayPinnedFields {
  resolvedEffectivePackId: EffectivePackId;
  compositionDigest: Sha256Hex;
  componentDigests: Sha256Hex[];
}

function arraysEqual(a: Sha256Hex[], b: Sha256Hex[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

/**
 * Validate a stored effective-pack record against pinned run fields.
 * Throws ERR_REPLAY_DIGEST_MISMATCH on any discrepancy.
 * ext-spec §28
 */
export function validatePinnedRunAgainstStore(
  pinned: ReplayPinnedFields,
  stored: EffectivePackStoreRecord,
): void {
  if (stored.effectivePackId !== pinned.resolvedEffectivePackId) {
    throw new ResolverError(
      'ERR_REPLAY_DIGEST_MISMATCH',
      `EffectivePackId mismatch: stored '${stored.effectivePackId}' vs pinned '${pinned.resolvedEffectivePackId}'`,
    );
  }

  if (stored.compositionDigest !== pinned.compositionDigest) {
    throw new ResolverError(
      'ERR_REPLAY_DIGEST_MISMATCH',
      `Composition digest mismatch: stored '${stored.compositionDigest}' vs pinned '${pinned.compositionDigest}'`,
    );
  }

  if (!arraysEqual(stored.componentDigests, pinned.componentDigests)) {
    throw new ResolverError(
      'ERR_REPLAY_DIGEST_MISMATCH',
      `Component digests mismatch — lengths: stored ${stored.componentDigests.length}, pinned ${pinned.componentDigests.length}`,
    );
  }
}
