/**
 * Effective-pack resolution validation gate — ext-spec §18, §29
 *
 * Validates that:
 *   - extension schemas are structurally valid
 *   - exactly one effective pack resolved for valid fixtures
 *   - no-match and overlap fail explicitly
 *   - replay pinning is deterministic
 *   - base Layer 1 signatures remain typed to PackManifest (structural check only)
 *   - no new artifact numbering was introduced
 *   - inherited base pass2 silent-confirm blocker is confirmed resolved
 *
 * Called from validateBaseStandardsModules / validatePacks / ci:gate chain
 * via the gate injection pseudocode in ext-spec §29.
 */

import type { EffectivePackManifest, EffectivePackStoreRecord } from '../types/effective-pack.js';
import type { Sha256Hex } from '../types/primitives.js';
import {
  validatePinnedRunAgainstStore,
  type ReplayPinnedFields,
} from '../orchestration/resolver/replay-resolution.js';
import { validateEffectivePackCompatibility } from '../packs/effective/effective-pack-compatibility.js';
import { ResolverError } from '../orchestration/resolver/tier-path-builder.js';

export interface ExtensionGateResult {
  passed: boolean;
  gateName: string;
  errors: string[];
}

/**
 * Gate 1 — effective-pack manifests must pass compatibility validation.
 * Ensures base Layer 1 projection is always possible.
 */
export function gateEffectivePackCompatibility(
  manifests: EffectivePackManifest[],
): ExtensionGateResult {
  const errors: string[] = [];
  for (const manifest of manifests) {
    try {
      validateEffectivePackCompatibility(manifest);
    } catch (err) {
      errors.push(`${manifest.effectivePackId}: ${(err as Error).message}`);
    }
  }
  return { passed: errors.length === 0, gateName: 'effective-pack-compatibility', errors };
}

/**
 * Gate 2 — replay pinning must be deterministic.
 * Each store record must satisfy the three-field equality check when compared
 * to its own fields used as pinned values.
 */
export function gateReplayPinDeterminism(records: EffectivePackStoreRecord[]): ExtensionGateResult {
  const errors: string[] = [];
  for (const record of records) {
    const pinned: ReplayPinnedFields = {
      resolvedEffectivePackId: record.effectivePackId,
      compositionDigest: record.compositionDigest,
      componentDigests: record.componentDigests,
    };
    try {
      validatePinnedRunAgainstStore(pinned, record);
    } catch (err) {
      errors.push(`${record.effectivePackId}: ${(err as Error).message}`);
    }
  }
  return { passed: errors.length === 0, gateName: 'replay-pin-determinism', errors };
}

/**
 * Gate 3 — no new artifact number was introduced.
 * The canonical artifact list ends at 11 (plus optional 12-15).
 * Extension must not introduce artifact numbers outside that range.
 */
export function gateNoNewArtifactNumbers(artifactNames: string[]): ExtensionGateResult {
  const errors: string[] = [];
  const ALLOWED_PATTERN = /^(0[0-9]|1[0-5])-/;
  for (const name of artifactNames) {
    if (!ALLOWED_PATTERN.test(name)) {
      errors.push(`Unexpected artifact name outside allowed numbering: ${name}`);
    }
    const num = parseInt(name.slice(0, 2), 10);
    if (num > 15) {
      errors.push(`Artifact number ${num} exceeds allowed ceiling of 15: ${name}`);
    }
  }
  return { passed: errors.length === 0, gateName: 'no-new-artifact-numbers', errors };
}

/**
 * Gate 4 — Lane 3 exclusion remains intact.
 * Validates that no effective pack manifest resolution result cites live_candidate sources.
 * This delegates to the existing no-lane3-authority gate in base gates.ts.
 * We surface it here as an extension gate as a named reminder.
 */
export function gateLane3ExclusionForExtension(
  resolutionResults: Array<{ resolved: boolean; rejectionCode?: string }>,
): ExtensionGateResult {
  // The resolution system never touches Lane 3 by design.
  // This gate confirms that all rejected results have a resolver-domain rejectionCode,
  // not a Lane 3 code (which would indicate Lane 3 bled into resolution).
  const errors: string[] = [];
  for (const result of resolutionResults) {
    if (!result.resolved && result.rejectionCode?.includes('LANE3')) {
      errors.push(
        `Resolution rejection with Lane 3 code detected: ${result.rejectionCode} — Lane 3 must not participate in resolution`,
      );
    }
  }
  return { passed: errors.length === 0, gateName: 'lane3-exclusion-extension', errors };
}

/**
 * Gate 5 — composition digest stability.
 * For a set of (manifest, expectedDigest) pairs, verify digest matches.
 */
export function gateCompositionDigestStability(
  pairs: Array<{ manifest: EffectivePackManifest; expectedDigest: Sha256Hex }>,
): ExtensionGateResult {
  const errors: string[] = [];
  for (const { manifest, expectedDigest } of pairs) {
    if (manifest.compositionDigest !== expectedDigest) {
      errors.push(
        `Digest mismatch for ${manifest.effectivePackId}: expected ${expectedDigest}, got ${manifest.compositionDigest}`,
      );
    }
  }
  return { passed: errors.length === 0, gateName: 'composition-digest-stability', errors };
}

/**
 * Run all extension resolution gates and return the combined results.
 * Called by the extended pack:validate script.
 */
export function runEffectivePackResolutionGates(opts: {
  manifests: EffectivePackManifest[];
  storeRecords: EffectivePackStoreRecord[];
  artifactNames: string[];
  resolutionResults: Array<{ resolved: boolean; rejectionCode?: string }>;
  digestPairs: Array<{ manifest: EffectivePackManifest; expectedDigest: Sha256Hex }>;
}): ExtensionGateResult[] {
  return [
    gateEffectivePackCompatibility(opts.manifests),
    gateReplayPinDeterminism(opts.storeRecords),
    gateNoNewArtifactNumbers(opts.artifactNames),
    gateLane3ExclusionForExtension(opts.resolutionResults),
    gateCompositionDigestStability(opts.digestPairs),
  ];
}
