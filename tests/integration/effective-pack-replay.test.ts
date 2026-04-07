/**
 * Effective-pack replay path — ext-spec §8.3
 * Canonical split from effective-pack-resolution.integration.test.ts
 *
 * Proves:
 *  - resolve once, capture pinnedFields, resolve again with mode: 'replay'
 *  - three-field digest equality check passes when digests match
 *  - ERR_REPLAY_DIGEST_MISMATCH fires on tampered compositionDigest
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { resolveEffectivePack } from '../../src/orchestration/resolver/resolve-effective-pack.js';
import {
  clearStore,
  lookupEffectivePackById,
} from '../../src/orchestration/effective-pack-store/effective-pack-store.js';
import { brandPackId, brandTrackFamilyId } from '../../src/types/identifiers.js';
import type {
  BaseStandardsModule,
  EffectivePackResolutionInput,
  JurisdictionFamilyConfig,
  TierOverlay,
} from '../../src/types/effective-pack.js';
import type { PackManifest } from '../../src/types/pack-manifest.js';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const TEXAS_FAMILY: JurisdictionFamilyConfig = {
  jurisdictionFamilyId: 'us_state_local_v1',
  displayName: 'US State and Local v1',
  supportedTrackFamilies: [
    brandTrackFamilyId('buildings'),
    brandTrackFamilyId('appliance_refrigeration'),
    brandTrackFamilyId('datacenter'),
  ],
  tierOrder: ['national', 'state_or_member_state'],
  requiresMunicipalityByTrack: {},
  requiredTierHandlingByTrack: [
    {
      trackFamilyId: brandTrackFamilyId('buildings'),
      requiredTiers: ['national', 'state_or_member_state'],
      maximumTier: 'state_or_member_state',
      allowResolutionAtIntermediateTier: true,
    },
  ],
  allowedTierReferencesByTrack: [],
  referencedBaseStandardsModulesByTrack: {
    [brandTrackFamilyId('buildings')]: ['bsm-tx-bldg-v1'],
  },
  referencedTierOverlaysByTrack: {},
  versionIndex: '1',
  effectiveFrom: '2024-01-01',
};

function makeBuildingsModule(): BaseStandardsModule {
  return {
    baseModuleId: 'bsm-tx-bldg-v1',
    displayName: 'Texas Buildings Base Module v1',
    supportedTrackFamilies: [brandTrackFamilyId('buildings')],
    corpus: [
      {
        corpusId: 'bsm-tx-bldg-corpus-1',
        authority: 'primary',
        title: 'Texas Buildings Standards',
        versionLabel: 'v1',
        ownershipPackId: brandPackId('pack-us-tx-buildings-v1'),
        citationKey: 'TX-BLDG-2021',
      },
    ],
    hierarchyFragments: [],
    contradictionPatternFragments: [
      {
        patternId: 'tx-bldg-pattern-1',
        description: 'Design plans vs test report',
        docClasses: ['DESIGN_PLANS', 'TEST_REPORT'],
        parameterKeys: ['fire_rating'],
        severityDefault: 'high',
      },
    ],
    versionIndex: '1',
    effectiveFrom: '2024-01-01',
    ownershipPackId: brandPackId('pack-us-tx-buildings-v1'),
    provenance: { sourceOwner: 'test', sourceAuthority: 'primary', lineageRef: 'test' },
  };
}

const BASE_PACK: PackManifest = {
  packId: brandPackId('pack-us-tx-buildings-v1'),
  versionIndex: '1',
  displayName: 'Texas Buildings Pack',
  jurisdiction: 'US-TX',
  corpus: [],
  classMap: [],
  hierarchyConfig: [],
  contradictionPatterns: [],
  optionalExtractors: [],
  standardVersionPolicy: { entries: [] },
  supportedDocumentClasses: ['DESIGN_PLANS', 'TEST_REPORT', 'ENG_LETTER'],
};

function makeNewCaseInput(): EffectivePackResolutionInput {
  return {
    mode: 'new_case',
    caseId: 'case-replay-001',
    runId: 'run-replay-source',
    packId: brandPackId('pack-us-tx-buildings-v1'),
    trackFamilyId: brandTrackFamilyId('buildings'),
    jurisdictionFamilyId: 'us_state_local_v1',
    jurisdictionId: 'US-TX',
    governingAsOfDate: '2025-01-01',
    operatorId: 'test-operator',
  };
}

let storeRoot: string;
let artifactRoot: string;

beforeEach(() => {
  clearStore();
  storeRoot = mkdtempSync(join(tmpdir(), 'cers-replay-store-'));
  artifactRoot = mkdtempSync(join(tmpdir(), 'cers-replay-art-'));
});

describe('Effective-pack replay path — ext-spec §8.3', () => {
  it('replay with correct pinnedFields returns replayed_pinned and replayPinned=true', async () => {
    // Step 1: compose fresh to populate the store
    const freshResult = await resolveEffectivePack({
      input: makeNewCaseInput(),
      family: TEXAS_FAMILY,
      allModules: [makeBuildingsModule()],
      allOverlays: [] as TierOverlay[],
      basePackManifest: BASE_PACK,
      storeRoot,
      artifactRoot,
    });

    expect(freshResult.resolved).toBe(true);
    const effectivePackId = freshResult.effectivePackId!;

    // Step 2: retrieve stored record to get real digests (pinnedFields)
    const stored = lookupEffectivePackById(effectivePackId);
    expect(stored).toBeDefined();
    expect(stored!.compositionDigest).toBeTruthy();

    // Step 3: replay with exact pinnedFields
    const replayResult = await resolveEffectivePack({
      input: {
        mode: 'replay',
        caseId: 'case-replay-001',
        runId: 'run-replay-new',
        packId: brandPackId('pack-us-tx-buildings-v1'),
        trackFamilyId: brandTrackFamilyId('buildings'),
        jurisdictionFamilyId: 'us_state_local_v1',
        jurisdictionId: 'US-TX',
        governingAsOfDate: '2025-01-01',
        operatorId: 'test-operator',
        replaySourceRunId: 'run-replay-source',
      },
      family: TEXAS_FAMILY,
      allModules: [makeBuildingsModule()],
      allOverlays: [] as TierOverlay[],
      basePackManifest: BASE_PACK,
      storeRoot,
      artifactRoot,
      pinnedFields: {
        resolvedEffectivePackId: effectivePackId,
        compositionDigest: stored!.compositionDigest,
        componentDigests: stored!.componentDigests,
      },
    });

    expect(replayResult.resolved).toBe(true);
    expect(replayResult.resolutionMethod).toBe('replayed_pinned');
    expect(replayResult.manifest?.replayPinned).toBe(true);
  });

  it('replay fires ERR_REPLAY_DIGEST_MISMATCH when compositionDigest is tampered', async () => {
    // Compose fresh
    const freshResult = await resolveEffectivePack({
      input: makeNewCaseInput(),
      family: TEXAS_FAMILY,
      allModules: [makeBuildingsModule()],
      allOverlays: [] as TierOverlay[],
      basePackManifest: BASE_PACK,
      storeRoot,
      artifactRoot,
    });

    expect(freshResult.resolved).toBe(true);
    const effectivePackId = freshResult.effectivePackId!;
    const stored = lookupEffectivePackById(effectivePackId)!;

    // Replay with tampered compositionDigest
    const badReplay = await resolveEffectivePack({
      input: {
        mode: 'replay',
        caseId: 'case-replay-001',
        runId: 'run-replay-bad',
        packId: brandPackId('pack-us-tx-buildings-v1'),
        trackFamilyId: brandTrackFamilyId('buildings'),
        jurisdictionFamilyId: 'us_state_local_v1',
        jurisdictionId: 'US-TX',
        governingAsOfDate: '2025-01-01',
        operatorId: 'test-operator',
        replaySourceRunId: 'run-replay-source',
      },
      family: TEXAS_FAMILY,
      allModules: [],
      allOverlays: [] as TierOverlay[],
      basePackManifest: BASE_PACK,
      storeRoot,
      artifactRoot,
      pinnedFields: {
        resolvedEffectivePackId: effectivePackId,
        compositionDigest:
          'deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef' as typeof stored.compositionDigest,
        componentDigests: stored.componentDigests,
      },
    });

    expect(badReplay.resolved).toBe(false);
    expect(badReplay.rejectionCode).toBe('ERR_REPLAY_DIGEST_MISMATCH');
  });
});
