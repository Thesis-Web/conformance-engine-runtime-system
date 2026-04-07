/**
 * Component selection unit tests — ext-spec §5.1, §27.2
 */
import { describe, it, expect } from 'vitest';
import { selectComponents } from '../../src/orchestration/resolver/component-selection.js';
import { brandPackId, brandTrackFamilyId } from '../../src/types/identifiers.js';
import type {
  BaseStandardsModule,
  JurisdictionFamilyConfig,
  EffectivePackResolutionInput,
} from '../../src/types/effective-pack.js';
import type { TierPathEntry } from '../../src/types/jurisdiction.js';

const TRACK = brandTrackFamilyId('buildings');

const FAMILY: JurisdictionFamilyConfig = {
  jurisdictionFamilyId: 'us_state_local_v1',
  displayName: 'Test',
  supportedTrackFamilies: [TRACK],
  tierOrder: ['national', 'state_or_member_state'],
  requiresMunicipalityByTrack: {},
  requiredTierHandlingByTrack: [
    {
      trackFamilyId: TRACK,
      requiredTiers: ['national', 'state_or_member_state'],
      maximumTier: 'state_or_member_state',
      allowResolutionAtIntermediateTier: true,
    },
  ],
  allowedTierReferencesByTrack: [],
  referencedBaseStandardsModulesByTrack: { [TRACK]: ['bsm-test-v1'] },
  referencedTierOverlaysByTrack: {},
  versionIndex: '1',
  effectiveFrom: '2024-01-01',
};

const TIER_PATH: TierPathEntry[] = [
  { tierType: 'national', tierId: 'us' },
  { tierType: 'state_or_member_state', tierId: 'us-tx' },
];

const INPUT: EffectivePackResolutionInput = {
  mode: 'new_case',
  caseId: 'case-001' as EffectivePackResolutionInput['caseId'],
  runId: 'run-001' as EffectivePackResolutionInput['runId'],
  packId: brandPackId('pack-us-tx-buildings-v1'),
  trackFamilyId: TRACK,
  jurisdictionFamilyId: 'us_state_local_v1',
  jurisdictionId: 'us-tx',
  governingAsOfDate: '2025-01-01',
  operatorId: 'test',
};

function makeModule(): BaseStandardsModule {
  return {
    baseModuleId: 'bsm-test-v1',
    displayName: 'Test Module',
    supportedTrackFamilies: [TRACK],
    corpus: [],
    hierarchyFragments: [],
    contradictionPatternFragments: [],
    versionIndex: '1',
    effectiveFrom: '2024-01-01',
    ownershipPackId: brandPackId('pack-us-tx-buildings-v1'),
    provenance: { sourceOwner: 'test', sourceAuthority: 'primary', lineageRef: 'test' },
  };
}

describe('component selection', () => {
  it('selects referenced module active on governing date', () => {
    const { baseModules } = selectComponents(FAMILY, TIER_PATH, INPUT, [makeModule()], []);
    expect(baseModules.length).toBe(1);
  });
  it('throws ERR_NO_BASE_MODULES when no modules match', () => {
    expect(() => selectComponents(FAMILY, TIER_PATH, INPUT, [], [])).toThrow(
      expect.objectContaining({ code: 'ERR_NO_BASE_MODULES' }),
    );
  });
  it('excludes module not referenced in family config', () => {
    const m = { ...makeModule(), baseModuleId: 'bsm-unreferenced-v1' };
    expect(() => selectComponents(FAMILY, TIER_PATH, INPUT, [m], [])).toThrow();
  });
});
