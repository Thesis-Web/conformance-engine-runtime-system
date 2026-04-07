/**
 * Texas buildings effective-pack resolution — ext-spec §27.3
 * Canonical split from effective-pack-resolution.integration.test.ts
 *
 * Proves:
 *  - new_case resolution for trackFamilyId 'buildings', jurisdictionId 'US-TX'
 *  - store record is written and replayValidated=true after fresh compose
 *  - reuse path (reused_precomputed) fires on second identical call
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

function makeInput(
  overrides?: Partial<EffectivePackResolutionInput>,
): EffectivePackResolutionInput {
  return {
    mode: 'new_case',
    caseId: 'case-tx-bldg-001',
    runId: 'run-tx-bldg-001',
    packId: brandPackId('pack-us-tx-buildings-v1'),
    trackFamilyId: brandTrackFamilyId('buildings'),
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
  storeRoot = mkdtempSync(join(tmpdir(), 'cers-tx-bldg-store-'));
  artifactRoot = mkdtempSync(join(tmpdir(), 'cers-tx-bldg-art-'));
});

describe('Texas buildings — new_case resolution', () => {
  it('resolves fresh effective pack and returns composed_fresh', async () => {
    const result = await resolveEffectivePack({
      input: makeInput(),
      family: TEXAS_FAMILY,
      allModules: [makeBuildingsModule()],
      allOverlays: [] as TierOverlay[],
      basePackManifest: BASE_PACK,
      storeRoot,
      artifactRoot,
    });

    expect(result.resolved).toBe(true);
    expect(result.resolutionMethod).toBe('composed_fresh');
    expect(result.effectivePackId).toBeDefined();
    expect((result.effectivePackId as string).startsWith('epack-')).toBe(true);
    expect(result.manifest?.trackFamilyId).toBe('buildings');
    expect(result.manifest?.jurisdictionId).toBe('US-TX');
  });

  it('store record is written with replayValidated true after fresh compose', async () => {
    const result = await resolveEffectivePack({
      input: makeInput(),
      family: TEXAS_FAMILY,
      allModules: [makeBuildingsModule()],
      allOverlays: [] as TierOverlay[],
      basePackManifest: BASE_PACK,
      storeRoot,
      artifactRoot,
    });

    expect(result.resolved).toBe(true);
    const stored = lookupEffectivePackById(result.effectivePackId!);
    expect(stored).toBeDefined();
    expect(stored!.replayValidated).toBe(true);
    expect(stored!.trackFamilyId).toBe('buildings');
    expect(stored!.jurisdictionId).toBe('US-TX');
  });

  it('second identical call returns reused_precomputed', async () => {
    const opts = {
      input: makeInput(),
      family: TEXAS_FAMILY,
      allModules: [makeBuildingsModule()],
      allOverlays: [] as TierOverlay[],
      basePackManifest: BASE_PACK,
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
