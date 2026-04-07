/**
 * Resolve effective pack — main resolver orchestration.
 * ext-spec §8 (new-case §8.1, existing-case §8.2, replay §8.3)
 * ext-spec §14, §15, §16, §17
 *
 * This is the single entry point for effective-pack resolution.
 * It routes to the correct path based on input.mode:
 *   "new_case"      → compose fresh or reuse precomputed (steps 14/15)
 *   "existing_case" → reuse pinned context or fork (step 14)
 *   "replay"        → validate and replay pinned context (step 16)
 *
 * On failure: emits a structured OperatorPrompt (step 17) and returns
 * resolved: false with rejectionCode/rejectionReason.
 *
 * Resolution must complete before created->ingesting state transition.
 * ext-spec §11.3 — ERR_EFFECTIVE_PACK_NOT_RESOLVED if fields absent.
 */

import { randomUUID } from 'node:crypto';
import { writeFileSync, mkdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

import type {
  BaseStandardsModule,
  EffectivePackManifest,
  EffectivePackResolutionInput,
  EffectivePackResolutionResult,
  JurisdictionFamilyConfig,
  TierOverlay,
} from '../../types/effective-pack.js';
import type { PackManifest } from '../../types/pack-manifest.js';
import type { Sha256Hex } from '../../types/primitives.js';

import { ResolverError, buildTierPath } from './tier-path-builder.js';
import { validateResolutionInput } from './resolver-validation.js';
import { selectComponents } from './component-selection.js';
import { validatePinnedRunAgainstStore, type ReplayPinnedFields } from './replay-resolution.js';
import { composeEffectivePack } from '../../packs/effective/effective-pack-composer.js';
import { deriveEffectivePackId } from '../../packs/effective/effective-pack-id.js';
import { validateEffectivePackCompatibility } from '../../packs/effective/effective-pack-compatibility.js';
import {
  persistEffectivePack,
  findReusableEffectivePack,
  lookupEffectivePackById,
  markReplayValidated,
} from '../effective-pack-store/effective-pack-store.js';

// ---------------------------------------------------------------------------
// Failure handling — step 17
// ---------------------------------------------------------------------------

function emitFailurePrompt(
  error: ResolverError | Error,
  input: EffectivePackResolutionInput,
  artifactRoot: string,
): void {
  try {
    mkdirSync(artifactRoot, { recursive: true });
    const prompt = {
      promptId: randomUUID(),
      runId: input.runId,
      step: 'effective-pack-resolution',
      reason: `Resolution failed: [${(error as ResolverError).code ?? 'ERROR'}] ${error.message}`,
      requiredInputShape: {
        packId: 'governed PackId string',
        trackFamilyId: 'governed TrackFamilyId string',
        jurisdictionFamilyId: 'jurisdiction family config id (e.g. us_state_local_v1)',
        jurisdictionId: 'jurisdiction id (e.g. US-TX)',
        governingAsOfDate: 'YYYY-MM-DD — must not be future-dated',
        municipalityId: 'optional municipality id (required by some tracks)',
      },
      blocking: true,
    };
    writeFileSync(join(artifactRoot, '12-operator-prompt.json'), JSON.stringify(prompt, null, 2));
  } catch {
    // best-effort
  }
}

// ---------------------------------------------------------------------------
// CONTRA-AUDIT-002+003: Load persisted manifest from disk.
// Both existing-case and replay must load the exact manifest that was written
// at composition time — not reconstruct a hollow placeholder.
// ext-spec §8.2, §8.3, §12.1–§12.4
// ---------------------------------------------------------------------------

function loadPersistedManifest(
  manifestPath: string,
  effectivePackId: string,
): EffectivePackManifest {
  if (!existsSync(manifestPath)) {
    throw new ResolverError(
      'ERR_PINNED_EFFECTIVE_PACK_MISSING',
      `Persisted manifest not found at '${manifestPath}' for effectivePackId '${effectivePackId}'`,
    );
  }
  try {
    const raw = readFileSync(manifestPath, 'utf8');
    return JSON.parse(raw) as EffectivePackManifest;
  } catch (err) {
    throw new ResolverError(
      'ERR_PINNED_EFFECTIVE_PACK_MISSING',
      `Failed to load persisted manifest at '${manifestPath}': ${String(err)}`,
    );
  }
}

// ---------------------------------------------------------------------------
// New-case resolution path — ext-spec §8.1
// ---------------------------------------------------------------------------

async function resolveNewCase(
  input: EffectivePackResolutionInput,
  family: JurisdictionFamilyConfig,
  allModules: BaseStandardsModule[],
  allOverlays: TierOverlay[],
  basePackManifest: PackManifest,
  storeRoot: string,
): Promise<{ manifest: EffectivePackManifest; componentDigests: Sha256Hex[] }> {
  const tierPath =
    input.tierPathOverride ??
    buildTierPath(family, input.trackFamilyId, input.jurisdictionId, input.municipalityId);

  const { baseModules, overlays } = selectComponents(
    family,
    tierPath,
    input,
    allModules,
    allOverlays,
  );

  const {
    manifest: partial,
    componentDigests,
    compositionDigest,
  } = composeEffectivePack({
    baseModules,
    overlays,
    tierPath,
    resolutionInput: input,
    basePackManifest,
    resolvedBy: input.operatorId,
    resolutionMethod: 'composed_fresh',
  });

  const effectivePackId = deriveEffectivePackId(
    input.packId,
    input.jurisdictionId,
    input.governingAsOfDate,
    compositionDigest,
  );

  const existing = findReusableEffectivePack(effectivePackId, input, compositionDigest);
  if (existing) {
    // CONTRA-AUDIT-002: load real manifest from disk, not placeholder.
    const manifest = loadPersistedManifest(existing.manifestPath, effectivePackId as string);
    const reuseManifest: EffectivePackManifest = {
      ...manifest,
      resolutionMethod: 'reused_precomputed',
      replayPinned: false,
    };
    validateEffectivePackCompatibility(reuseManifest);
    return { manifest: reuseManifest, componentDigests: existing.componentDigests };
  }

  const freshManifest: EffectivePackManifest = { ...partial, effectivePackId };
  validateEffectivePackCompatibility(freshManifest);

  // DIFF-AUDIT-002: persist and then immediately mark replay-validated.
  // The fresh compose path produces a fully governed manifest so it is
  // both compatibility-validated and replay-valid at persist time.
  const stored = persistEffectivePack(freshManifest, storeRoot, componentDigests);
  markReplayValidated(stored.effectivePackId);

  return { manifest: freshManifest, componentDigests };
}

// ---------------------------------------------------------------------------
// Existing-case resolution path — ext-spec §8.2
// CONTRA-AUDIT-002: load real persisted manifest instead of placeholder.
// ---------------------------------------------------------------------------

async function resolveExistingCase(
  input: EffectivePackResolutionInput,
  pinnedFields: ReplayPinnedFields,
): Promise<{ manifest: EffectivePackManifest; componentDigests: Sha256Hex[] }> {
  const stored = lookupEffectivePackById(pinnedFields.resolvedEffectivePackId);
  if (!stored) {
    throw new ResolverError(
      'ERR_PINNED_EFFECTIVE_PACK_MISSING',
      `Pinned effective pack '${pinnedFields.resolvedEffectivePackId}' not found in store`,
    );
  }

  validatePinnedRunAgainstStore(pinnedFields, stored);

  // Load the exact persisted manifest — no placeholder reconstruction.
  const manifest = loadPersistedManifest(stored.manifestPath, stored.effectivePackId as string);

  // Validate the loaded manifest is still compatible.
  validateEffectivePackCompatibility(manifest);

  // Return with updated resolution metadata for this run.
  const returnManifest: EffectivePackManifest = {
    ...manifest,
    resolvedAt: new Date().toISOString(),
    resolvedBy: input.operatorId,
    resolutionMethod: 'reused_precomputed',
    replayPinned: false,
  };

  return { manifest: returnManifest, componentDigests: stored.componentDigests };
}

// ---------------------------------------------------------------------------
// Replay path — ext-spec §8.3
// CONTRA-AUDIT-003: load real persisted manifest instead of placeholder.
// ---------------------------------------------------------------------------

async function resolveReplay(
  input: EffectivePackResolutionInput,
  pinnedFields: ReplayPinnedFields,
): Promise<{ manifest: EffectivePackManifest; componentDigests: Sha256Hex[] }> {
  if (!input.replaySourceRunId) {
    throw new ResolverError(
      'ERR_REPLAY_SOURCE_MISSING',
      'replaySourceRunId is required in replay mode',
    );
  }

  const stored = lookupEffectivePackById(pinnedFields.resolvedEffectivePackId);
  if (!stored) {
    throw new ResolverError(
      'ERR_PINNED_EFFECTIVE_PACK_MISSING',
      `Pinned effective pack '${pinnedFields.resolvedEffectivePackId}' not found in store for replay`,
    );
  }

  // §28 — three-field exact equality required.
  validatePinnedRunAgainstStore(pinnedFields, stored);

  // Load the exact persisted manifest — no placeholder reconstruction.
  const manifest = loadPersistedManifest(stored.manifestPath, stored.effectivePackId as string);

  // Validate compatibility on the loaded manifest.
  validateEffectivePackCompatibility(manifest);

  // Return with replay-specific metadata.
  const returnManifest: EffectivePackManifest = {
    ...manifest,
    resolvedAt: new Date().toISOString(),
    resolvedBy: input.operatorId,
    resolutionMethod: 'replayed_pinned',
    replayPinned: true,
    ...(input.replaySourceRunId !== undefined && { replaySourceRunId: input.replaySourceRunId }),
  };

  return { manifest: returnManifest, componentDigests: stored.componentDigests };
}

// ---------------------------------------------------------------------------
// Public entry point
// ---------------------------------------------------------------------------

export interface ResolveEffectivePackOptions {
  input: EffectivePackResolutionInput;
  family: JurisdictionFamilyConfig;
  allModules: BaseStandardsModule[];
  allOverlays: TierOverlay[];
  basePackManifest: PackManifest;
  storeRoot: string;
  artifactRoot: string;
  /** Required only for existing_case and replay modes */
  pinnedFields?: ReplayPinnedFields;
}

export async function resolveEffectivePack(options: ResolveEffectivePackOptions): Promise<
  EffectivePackResolutionResult & {
    manifest?: EffectivePackManifest;
    componentDigests?: Sha256Hex[];
  }
> {
  const {
    input,
    family,
    allModules,
    allOverlays,
    basePackManifest,
    storeRoot,
    artifactRoot,
    pinnedFields,
  } = options;

  try {
    validateResolutionInput(input);

    let manifest: EffectivePackManifest;
    let componentDigests: Sha256Hex[];

    if (input.mode === 'new_case') {
      ({ manifest, componentDigests } = await resolveNewCase(
        input,
        family,
        allModules,
        allOverlays,
        basePackManifest,
        storeRoot,
      ));
    } else if (input.mode === 'existing_case') {
      if (!pinnedFields) {
        throw new ResolverError(
          'ERR_PINNED_FIELDS_REQUIRED',
          'pinnedFields required for existing_case mode',
        );
      }
      ({ manifest, componentDigests } = await resolveExistingCase(input, pinnedFields));
    } else {
      // replay
      if (!pinnedFields) {
        throw new ResolverError(
          'ERR_PINNED_FIELDS_REQUIRED',
          'pinnedFields required for replay mode',
        );
      }
      ({ manifest, componentDigests } = await resolveReplay(input, pinnedFields));
    }

    const stored = lookupEffectivePackById(manifest.effectivePackId);
    const manifestPath =
      stored?.manifestPath ??
      join(storeRoot, manifest.effectivePackId as string, 'effective-pack-manifest.json');

    return {
      resolved: true,
      effectivePackId: manifest.effectivePackId,
      manifestPath,
      resolutionMethod: manifest.resolutionMethod,
      manifest,
      componentDigests,
    };
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    emitFailurePrompt(error, input, artifactRoot);
    const code = (err as ResolverError).code ?? 'ERR_RESOLUTION_FAILED';
    return {
      resolved: false,
      rejectionCode: code,
      rejectionReason: error.message,
      emittedOperatorPrompt: true,
    };
  }
}
