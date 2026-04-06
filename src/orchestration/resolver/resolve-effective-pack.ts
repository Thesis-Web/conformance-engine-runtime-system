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
import { writeFileSync, mkdirSync } from 'node:fs';
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
} from '../effective-pack-store/effective-pack-store.js';

// ---------------------------------------------------------------------------
// Failure handling — step 17
// Emits operator_prompt.json and returns resolved: false.
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
  // Steps 3-4: build tier path
  const tierPath =
    input.tierPathOverride ??
    buildTierPath(family, input.trackFamilyId, input.jurisdictionId, input.municipalityId);

  // Steps 5-8: select and validate components (includes overlap detection)
  const { baseModules, overlays } = selectComponents(
    family,
    tierPath,
    input,
    allModules,
    allOverlays,
  );

  // Step 9: compose effective pack manifest (without effectivePackId yet)
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

  // Step 11: derive stable effectivePackId
  const effectivePackId = deriveEffectivePackId(
    input.packId,
    input.jurisdictionId,
    input.governingAsOfDate,
    compositionDigest,
  );

  // Check for lawful reuse of a precomputed identical effective pack
  const existing = findReusableEffectivePack(effectivePackId, input, compositionDigest);
  if (existing) {
    // Reuse path — build a manifest from the stored record
    const reuseManifest: EffectivePackManifest = {
      ...partial,
      effectivePackId,
      resolutionMethod: 'reused_precomputed',
      replayPinned: false,
    };
    validateEffectivePackCompatibility(reuseManifest);
    return { manifest: reuseManifest, componentDigests: existing.componentDigests };
  }

  // Step 10: validate engine compatibility
  const freshManifest: EffectivePackManifest = { ...partial, effectivePackId };
  validateEffectivePackCompatibility(freshManifest);

  // Steps 12-13: persist and pin
  persistEffectivePack(freshManifest, storeRoot, componentDigests);

  return { manifest: freshManifest, componentDigests };
}

// ---------------------------------------------------------------------------
// Existing-case resolution path — ext-spec §8.2
// ---------------------------------------------------------------------------

async function resolveExistingCase(
  input: EffectivePackResolutionInput,
  pinnedFields: ReplayPinnedFields,
): Promise<{ manifest: EffectivePackManifest; componentDigests: Sha256Hex[] }> {
  // Load pinned effective pack from store
  const stored = lookupEffectivePackById(pinnedFields.resolvedEffectivePackId);
  if (!stored) {
    throw new ResolverError(
      'ERR_PINNED_EFFECTIVE_PACK_MISSING',
      `Pinned effective pack '${pinnedFields.resolvedEffectivePackId}' not found in store`,
    );
  }

  // Validate digest equality
  validatePinnedRunAgainstStore(pinnedFields, stored);

  // Reconstruct a minimal manifest from store record for return
  // Full manifest is on disk at stored.manifestPath; here we return a reference manifest.
  // The caller uses the manifestPath to load the full content if needed.
  const placeholder: EffectivePackManifest = {
    effectivePackId: stored.effectivePackId,
    effectivePackVersion: randomUUID(),
    packId: stored.packId,
    versionIndex: '1',
    displayName: `${stored.jurisdictionId} ${stored.trackFamilyId} effective pack`,
    jurisdiction: stored.jurisdictionId,
    corpus: [],
    classMap: [],
    hierarchyConfig: [],
    contradictionPatterns: [],
    optionalExtractors: [],
    standardVersionPolicy: { entries: [] },
    supportedDocumentClasses: [],
    trackFamilyId: stored.trackFamilyId,
    jurisdictionFamilyId: stored.jurisdictionFamilyId,
    jurisdictionId: stored.jurisdictionId,
    tierPath: stored.tierPath,
    governingAsOfDate: stored.governingAsOfDate,
    componentProvenance: [],
    compositionDigest: stored.compositionDigest,
    resolvedAt: new Date().toISOString(),
    resolvedBy: input.operatorId,
    resolutionMethod: 'reused_precomputed',
    replayPinned: false,
    releaseState: 'draft',
    ...(stored.municipalityId !== undefined && { municipalityId: stored.municipalityId }),
  };

  return { manifest: placeholder, componentDigests: stored.componentDigests };
}

// ---------------------------------------------------------------------------
// Replay path — ext-spec §8.3
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

  // §28 — three-field exact equality required
  validatePinnedRunAgainstStore(pinnedFields, stored);

  const placeholder: EffectivePackManifest = {
    effectivePackId: stored.effectivePackId,
    effectivePackVersion: randomUUID(),
    packId: stored.packId,
    versionIndex: '1',
    displayName: `${stored.jurisdictionId} ${stored.trackFamilyId} effective pack`,
    jurisdiction: stored.jurisdictionId,
    corpus: [],
    classMap: [],
    hierarchyConfig: [],
    contradictionPatterns: [],
    optionalExtractors: [],
    standardVersionPolicy: { entries: [] },
    supportedDocumentClasses: [],
    trackFamilyId: stored.trackFamilyId,
    jurisdictionFamilyId: stored.jurisdictionFamilyId,
    jurisdictionId: stored.jurisdictionId,
    tierPath: stored.tierPath,
    governingAsOfDate: stored.governingAsOfDate,
    componentProvenance: [],
    compositionDigest: stored.compositionDigest,
    resolvedAt: new Date().toISOString(),
    resolvedBy: input.operatorId,
    resolutionMethod: 'replayed_pinned',
    replayPinned: true,
    releaseState: 'draft',
    ...(stored.municipalityId !== undefined && { municipalityId: stored.municipalityId }),
    ...(input.replaySourceRunId !== undefined && { replaySourceRunId: input.replaySourceRunId }),
  };

  return { manifest: placeholder, componentDigests: stored.componentDigests };
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

/**
 * Resolve exactly one governed effective pack context for a case/run.
 * Routes to new_case, existing_case, or replay path based on input.mode.
 * On success: returns resolved: true with effectivePackId and manifestPath.
 * On failure: emits operator prompt artifact, returns resolved: false.
 */
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
    // Validate all inputs before any path runs
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
