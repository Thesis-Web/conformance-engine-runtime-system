/**
 * Texas datacenter effective-pack resolution — ext-spec §27.3
 * Canonical split from effective-pack-resolution.integration.test.ts
 *
 * Proves:
 *  - new_case resolution for trackFamilyId 'datacenter', jurisdictionId 'US-TX'
 *  - store record written, reuse fires on second call
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { resolveEffectivePack } from '../../src/orchestration/resolver/resolve-effective-pack.js';
import { clearStore } from '../../src/orchestration/effective-pack-store/effective-pack-store.js';
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
      trackFamilyId: brandTrackFamilyId('datacenter'),
      requiredTiers: ['national', 'state_or_member_state'],
      maximumTier: 'state_or_member_state',
      allowResolutionAtIntermediateTier: true,
    },
  ],
  allowedTierReferencesByTrack: [],
  referencedBaseStandardsModulesByTrack: {
    [brandTrackFamilyId('datacenter')]: ['bsm-tx-dc-v1'],
  },
  referencedTierOverlaysByTrack: {},
  versionIndex: '1',
  effectiveFrom: '2024-01-01',
};

function makeDatacenterModule(): BaseStandardsModule {
  return {
    baseModuleId: 'bsm-tx-dc-v1',
    displayName: 'Texas Datacenter Base Module v1',
    supportedTrackFamilies: [brandTrackFamilyId('datacenter')],
    corpus: [
      {
        corpusId: 'bsm-tx-dc-corpus-1',
        authority: 'primary',
        title: 'Texas Datacenter Standards',
        versionLabel: 'v1',
        ownershipPackId: brandPackId('pack-us-tx-datacenter-v1'),
        citationKey: 'TX-DC-2022',
      },
    ],
    hierarchyFragments: [],
    contradictionPatternFragments: [
      {
        patternId: 'tx-dc-pattern-1',
        description: 'Design plans vs spec sheet (cooling load)',
        docClasses: ['DESIGN_PLANS', 'SPEC_SHEET'],
        parameterKeys: ['cooling_class'],
        severityDefault: 'high',
      },
    ],
    versionIndex: '1',
    effectiveFrom: '2024-01-01',
    ownershipPackId: brandPackId('pack-us-tx-datacenter-v1'),
    provenance: { sourceOwner: 'test', sourceAuthority: 'primary', lineageRef: 'test' },
  };
}

const BASE_PACK: PackManifest = {
  packId: brandPackId('pack-us-tx-datacenter-v1'),
  versionIndex: '1',
  displayName: 'Texas Datacenter Pack',
  jurisdiction: 'US-TX',
  corpus: [],
  classMap: [],
  hierarchyConfig: [],
  contradictionPatterns: [],
  optionalExtractors: [],
  standardVersionPolicy: { entries: [] },
  supportedDocumentClasses: ['DESIGN_PLANS', 'SPEC_SHEET', 'TEST_REPORT', 'STD_REFERENCE'],
};

function makeInput(
  overrides?: Partial<EffectivePackResolutionInput>,
): EffectivePackResolutionInput {
  return {
    mode: 'new_case',
    caseId: 'case-tx-dc-001',
    runId: 'run-tx-dc-001',
    packId: brandPackId('pack-us-tx-datacenter-v1'),
    trackFamilyId: brandTrackFamilyId('datacenter'),
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
  storeRoot = mkdtempSync(join(tmpdir(), 'cers-tx-dc-store-'));
  artifactRoot = mkdtempSync(join(tmpdir(), 'cers-tx-dc-art-'));
});

describe('Texas datacenter — new_case resolution', () => {
  it('resolves fresh effective pack for datacenter track', async () => {
    const result = await resolveEffectivePack({
      input: makeInput(),
      family: TEXAS_FAMILY,
      allModules: [makeDatacenterModule()],
      allOverlays: [] as TierOverlay[],
      basePackManifest: BASE_PACK,
      storeRoot,
      artifactRoot,
    });

    expect(result.resolved).toBe(true);
    expect(result.resolutionMethod).toBe('composed_fresh');
    expect((result.effectivePackId as string).startsWith('epack-')).toBe(true);
    expect(result.manifest?.trackFamilyId).toBe('datacenter');
    expect(result.manifest?.jurisdictionId).toBe('US-TX');
  });

  it('second identical call returns reused_precomputed', async () => {
    const opts = {
      input: makeInput(),
      family: TEXAS_FAMILY,
      allModules: [makeDatacenterModule()],
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
