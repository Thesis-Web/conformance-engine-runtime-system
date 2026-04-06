/**
 * Extension integration tests — ext-spec §27.3, §22, §23
 *
 * Required:
 *  - Texas buildings resolution
 *  - Texas appliance resolution
 *  - Texas datacenter resolution
 *  - replay uses pinned effective pack
 *  - California legacy regression through resolver
 *  - no-match rejection
 *  - municipality-required rejection
 *  - overlap conflict rejection
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

// ---------------------------------------------------------------------------
// Shared test fixtures
// ---------------------------------------------------------------------------

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
    {
      trackFamilyId: brandTrackFamilyId('appliance_refrigeration'),
      requiredTiers: ['national', 'state_or_member_state'],
      maximumTier: 'state_or_member_state',
      allowResolutionAtIntermediateTier: true,
    },
    {
      trackFamilyId: brandTrackFamilyId('datacenter'),
      requiredTiers: ['national', 'state_or_member_state'],
      maximumTier: 'state_or_member_state',
      allowResolutionAtIntermediateTier: true,
    },
  ],
  allowedTierReferencesByTrack: [],
  referencedBaseStandardsModulesByTrack: {
    [brandTrackFamilyId('buildings')]: ['bsm-tx-bldg-v1'],
    [brandTrackFamilyId('appliance_refrigeration')]: ['bsm-tx-appl-v1'],
    [brandTrackFamilyId('datacenter')]: ['bsm-tx-dc-v1'],
  },
  referencedTierOverlaysByTrack: {},
  versionIndex: '1',
  effectiveFrom: '2024-01-01',
};

function makeModule(id: string, track: string): BaseStandardsModule {
  return {
    baseModuleId: id,
    displayName: `Test module ${id}`,
    supportedTrackFamilies: [brandTrackFamilyId(track)],
    corpus: [
      {
        corpusId: `${id}-corpus-1`,
        authority: 'primary',
        title: `Test corpus for ${id}`,
        versionLabel: 'v1',
        ownershipPackId: brandPackId(`pack-us-tx-${track}-v1`),
        citationKey: `${id.toUpperCase()}-KEY`,
      },
    ],
    hierarchyFragments: [],
    contradictionPatternFragments: [
      {
        patternId: `${id}-pattern-1`,
        description: 'Test pattern',
        docClasses: ['SPEC_SHEET', 'TEST_REPORT'],
        parameterKeys: ['equipment_model'],
        severityDefault: 'high',
      },
    ],
    versionIndex: '1',
    effectiveFrom: '2024-01-01',
    ownershipPackId: brandPackId(`pack-us-tx-${track}-v1`),
    provenance: { sourceOwner: 'test', sourceAuthority: 'primary', lineageRef: 'test' },
  };
}

const BASE_PACK_MANIFEST: PackManifest = {
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

function makeInput(
  track: string,
  overrides?: Partial<EffectivePackResolutionInput>,
): EffectivePackResolutionInput {
  return {
    mode: 'new_case',
    caseId: `case-${track}`,
    runId: `run-${track}`,
    packId: brandPackId(`pack-us-tx-${track}-v1`),
    trackFamilyId: brandTrackFamilyId(track),
    jurisdictionFamilyId: 'us_state_local_v1',
    jurisdictionId: 'US-TX',
    governingAsOfDate: '2025-01-01',
    operatorId: 'test-operator',
    ...overrides,
  };
}

let storeRoot: string;
let artifactRoot: string;

beforeEach(() => {
  clearStore();
  storeRoot = mkdtempSync(join(tmpdir(), 'cers-test-store-'));
  artifactRoot = mkdtempSync(join(tmpdir(), 'cers-test-artifacts-'));
});

// ---------------------------------------------------------------------------
// Texas buildings resolution — ext-spec §27.3
// ---------------------------------------------------------------------------

describe('Texas buildings resolution', () => {
  it('resolves a fresh effective pack for Texas buildings', async () => {
    const result = await resolveEffectivePack({
      input: makeInput('buildings'),
      family: TEXAS_FAMILY,
      allModules: [makeModule('bsm-tx-bldg-v1', 'buildings')],
      allOverlays: [],
      basePackManifest: BASE_PACK_MANIFEST,
      storeRoot,
      artifactRoot,
    });

    expect(result.resolved).toBe(true);
    expect(result.effectivePackId).toBeDefined();
    expect((result.effectivePackId as string).startsWith('epack-')).toBe(true);
    expect(result.resolutionMethod).toBe('composed_fresh');
    expect(result.manifest?.trackFamilyId).toBe('buildings');
  });

  it('second resolution with same inputs reuses precomputed pack', async () => {
    const opts = {
      input: makeInput('buildings'),
      family: TEXAS_FAMILY,
      allModules: [makeModule('bsm-tx-bldg-v1', 'buildings')],
      allOverlays: [] as TierOverlay[],
      basePackManifest: BASE_PACK_MANIFEST,
      storeRoot,
      artifactRoot,
    };

    const first = await resolveEffectivePack(opts);
    const second = await resolveEffectivePack(opts);

    expect(first.resolved).toBe(true);
    expect(second.resolved).toBe(true);
    expect(first.effectivePackId).toBe(second.effectivePackId);
    expect(second.resolutionMethod).toBe('reused_precomputed');
  });
});

// ---------------------------------------------------------------------------
// Texas appliance resolution
// ---------------------------------------------------------------------------

describe('Texas appliance resolution', () => {
  it('resolves a fresh effective pack for Texas appliance_refrigeration', async () => {
    const result = await resolveEffectivePack({
      input: makeInput('appliance_refrigeration'),
      family: TEXAS_FAMILY,
      allModules: [makeModule('bsm-tx-appl-v1', 'appliance_refrigeration')],
      allOverlays: [],
      basePackManifest: {
        ...BASE_PACK_MANIFEST,
        packId: brandPackId('pack-us-tx-appliance_refrigeration-v1'),
      },
      storeRoot,
      artifactRoot,
    });

    expect(result.resolved).toBe(true);
    expect(result.manifest?.trackFamilyId).toBe('appliance_refrigeration');
  });
});

// ---------------------------------------------------------------------------
// Texas datacenter resolution
// ---------------------------------------------------------------------------

describe('Texas datacenter resolution', () => {
  it('resolves a fresh effective pack for Texas datacenter', async () => {
    const result = await resolveEffectivePack({
      input: makeInput('datacenter'),
      family: TEXAS_FAMILY,
      allModules: [makeModule('bsm-tx-dc-v1', 'datacenter')],
      allOverlays: [],
      basePackManifest: { ...BASE_PACK_MANIFEST, packId: brandPackId('pack-us-tx-datacenter-v1') },
      storeRoot,
      artifactRoot,
    });

    expect(result.resolved).toBe(true);
    expect(result.manifest?.trackFamilyId).toBe('datacenter');
  });
});

// ---------------------------------------------------------------------------
// Replay pinning — ext-spec §22
// ---------------------------------------------------------------------------

describe('Replay uses pinned effective pack', () => {
  it('replay path validates digest equality and returns resolved: true', async () => {
    // First: compose fresh to populate the store
    const newCaseResult = await resolveEffectivePack({
      input: makeInput('buildings'),
      family: TEXAS_FAMILY,
      allModules: [makeModule('bsm-tx-bldg-v1', 'buildings')],
      allOverlays: [],
      basePackManifest: BASE_PACK_MANIFEST,
      storeRoot,
      artifactRoot,
    });

    expect(newCaseResult.resolved).toBe(true);
    const effectivePackId = newCaseResult.effectivePackId!;

    // Retrieve what was stored
    const stored = lookupEffectivePackById(effectivePackId);
    expect(stored).toBeDefined();

    // Now replay
    const replayResult = await resolveEffectivePack({
      input: makeInput('buildings', {
        mode: 'replay',
        runId: 'run-replay-001',
        replaySourceRunId: 'run-buildings',
      }),
      family: TEXAS_FAMILY,
      allModules: [makeModule('bsm-tx-bldg-v1', 'buildings')],
      allOverlays: [],
      basePackManifest: BASE_PACK_MANIFEST,
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

  it('replay fails when compositionDigest mismatches', async () => {
    // Compose to get a real stored record
    const newCaseResult = await resolveEffectivePack({
      input: makeInput('buildings', { runId: 'run-mismatch' }),
      family: TEXAS_FAMILY,
      allModules: [makeModule('bsm-tx-bldg-v1', 'buildings')],
      allOverlays: [],
      basePackManifest: BASE_PACK_MANIFEST,
      storeRoot,
      artifactRoot,
    });

    expect(newCaseResult.resolved).toBe(true);
    const effectivePackId = newCaseResult.effectivePackId!;
    const stored = lookupEffectivePackById(effectivePackId)!;

    const replayResult = await resolveEffectivePack({
      input: makeInput('buildings', {
        mode: 'replay',
        runId: 'run-replay-bad',
        replaySourceRunId: 'run-mismatch',
      }),
      family: TEXAS_FAMILY,
      allModules: [],
      allOverlays: [],
      basePackManifest: BASE_PACK_MANIFEST,
      storeRoot,
      artifactRoot,
      pinnedFields: {
        resolvedEffectivePackId: effectivePackId,
        compositionDigest: 'badbadbadbadbadbadbadbadbadbadbadbadbadbadba' as any,
        componentDigests: stored.componentDigests,
      },
    });

    expect(replayResult.resolved).toBe(false);
    expect(replayResult.rejectionCode).toBe('ERR_REPLAY_DIGEST_MISMATCH');
  });
});

// ---------------------------------------------------------------------------
// California legacy regression through resolver — ext-spec §23
// ---------------------------------------------------------------------------

describe('California legacy regression through resolver', () => {
  const CA_FAMILY: JurisdictionFamilyConfig = {
    ...TEXAS_FAMILY,
    jurisdictionFamilyId: 'us_ca_local_v1',
    displayName: 'California Local v1',
    referencedBaseStandardsModulesByTrack: {
      [brandTrackFamilyId('buildings')]: ['bsm-ca-bldg-v1'],
    },
  };

  it('resolves legacy California pack id through the resolver', async () => {
    const result = await resolveEffectivePack({
      input: {
        mode: 'new_case',
        caseId: 'case-ca-001',
        runId: 'run-ca-001',
        packId: brandPackId('pack-california-highrise-v1'),
        trackFamilyId: brandTrackFamilyId('buildings'),
        jurisdictionFamilyId: 'us_ca_local_v1',
        jurisdictionId: 'US-CA',
        governingAsOfDate: '2025-01-01',
        operatorId: 'test-operator',
      },
      family: CA_FAMILY,
      allModules: [makeModule('bsm-ca-bldg-v1', 'buildings')],
      allOverlays: [],
      basePackManifest: {
        ...BASE_PACK_MANIFEST,
        packId: brandPackId('pack-california-highrise-v1'),
        jurisdiction: 'US-CA',
      },
      storeRoot,
      artifactRoot,
    });

    expect(result.resolved).toBe(true);
    expect(result.manifest?.packId).toBe('pack-california-highrise-v1');
    expect((result.effectivePackId as string).startsWith('epack-')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// No-match rejection
// ---------------------------------------------------------------------------

describe('No-match rejection', () => {
  it('returns resolved false when no base modules found for track', async () => {
    const result = await resolveEffectivePack({
      input: makeInput('buildings'),
      family: TEXAS_FAMILY,
      allModules: [], // empty — no base modules available
      allOverlays: [],
      basePackManifest: BASE_PACK_MANIFEST,
      storeRoot,
      artifactRoot,
    });

    expect(result.resolved).toBe(false);
    expect(result.rejectionCode).toBe('ERR_NO_BASE_MODULES');
    expect(result.emittedOperatorPrompt).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Municipality-required rejection
// ---------------------------------------------------------------------------

describe('Municipality-required rejection', () => {
  it('rejects when municipality is required but not supplied', async () => {
    const familyRequiringMuni: JurisdictionFamilyConfig = {
      ...TEXAS_FAMILY,
      requiresMunicipalityByTrack: { [brandTrackFamilyId('buildings')]: true },
      tierOrder: ['national', 'state_or_member_state', 'municipal'],
    };

    const result = await resolveEffectivePack({
      input: makeInput('buildings'),
      family: familyRequiringMuni,
      allModules: [makeModule('bsm-tx-bldg-v1', 'buildings')],
      allOverlays: [],
      basePackManifest: BASE_PACK_MANIFEST,
      storeRoot,
      artifactRoot,
    });

    expect(result.resolved).toBe(false);
    expect(result.rejectionCode).toBe('ERR_MUNICIPALITY_REQUIRED');
  });
});

// ---------------------------------------------------------------------------
// Overlap conflict rejection
// ---------------------------------------------------------------------------

describe('Overlap conflict rejection', () => {
  it('rejects when two base modules have illegal active overlap', async () => {
    // Two modules with same coexistence key both active on 2025-01-01
    const mod1 = makeModule('bsm-tx-bldg-v1', 'buildings');
    const mod2: BaseStandardsModule = {
      ...mod1,
      baseModuleId: 'bsm-tx-bldg-v1',
      effectiveFrom: '2024-06-01',
    };

    const result = await resolveEffectivePack({
      input: makeInput('buildings'),
      family: TEXAS_FAMILY,
      allModules: [mod1, mod2],
      allOverlays: [],
      basePackManifest: BASE_PACK_MANIFEST,
      storeRoot,
      artifactRoot,
    });

    expect(result.resolved).toBe(false);
    expect(result.rejectionCode).toBe('ERR_EFFECTIVE_DATE_OVERLAP');
  });
});
