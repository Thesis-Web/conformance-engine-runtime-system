/**
 * Extension unit tests — ext-spec §27.2
 *
 * Required coverage:
 *  - PackId validator accepts legacy and open values
 *  - invalid PackId rejects
 *  - TrackFamilyId validator rejects unknown values
 *  - governingAsOfDate format rejects invalid/future dates
 *  - tierPath order is deterministic
 *  - overlap detector rejects illegal windows
 *  - duplicate corpus handling obeys override law
 *  - digest derivation is stable
 *  - EffectivePackId derivation is stable
 *  - compatibility projection returns valid PackManifest
 *  - reuse only happens on exact input identity
 *  - effective-date boundary selection (from/to edge cases)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  validatePackId,
  validateTrackFamilyId,
  brandPackId,
  brandTrackFamilyId,
} from '../../src/types/identifiers.js';
import {
  validateGoverningAsOfDate,
  isActiveOn,
} from '../../src/orchestration/resolver/component-effective-date-selector.js';
import {
  buildTierPath,
  ResolverError,
} from '../../src/orchestration/resolver/tier-path-builder.js';
import { detectIllegalOverlap } from '../../src/orchestration/resolver/overlap-conflict-detector.js';
import { deriveEffectivePackId } from '../../src/packs/effective/effective-pack-id.js';
import {
  projectToBasePackManifest,
  validateEffectivePackCompatibility,
} from '../../src/packs/effective/effective-pack-compatibility.js';
import { isLawfullyReusable } from '../../src/orchestration/effective-pack-store/effective-pack-reuse.js';
import type {
  JurisdictionFamilyConfig,
  BaseStandardsModule,
  TierOverlay,
  EffectivePackManifest,
} from '../../src/types/effective-pack.js';
import type { EffectivePackResolutionInput } from '../../src/types/effective-pack.js';
import type { Sha256Hex } from '../../src/types/primitives.js';

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------

const TEXAS_FAMILY: JurisdictionFamilyConfig = {
  jurisdictionFamilyId: 'us_state_local_v1',
  displayName: 'US State and Local v1',
  supportedTrackFamilies: [brandTrackFamilyId('buildings')],
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
  referencedBaseStandardsModulesByTrack: {},
  referencedTierOverlaysByTrack: {},
  versionIndex: '1',
  effectiveFrom: '2024-01-01',
};

function makeBaseModule(overrides?: Partial<BaseStandardsModule>): BaseStandardsModule {
  return {
    baseModuleId: 'bsm-test-v1',
    displayName: 'Test Module',
    supportedTrackFamilies: [brandTrackFamilyId('buildings')],
    corpus: [],
    hierarchyFragments: [],
    contradictionPatternFragments: [],
    versionIndex: '1',
    effectiveFrom: '2024-01-01',
    ownershipPackId: brandPackId('pack-us-tx-buildings-v1'),
    provenance: { sourceOwner: 'test', sourceAuthority: 'primary', lineageRef: 'test' },
    ...overrides,
  };
}

function makeOverlay(overrides?: Partial<TierOverlay>): TierOverlay {
  return {
    tierOverlayId: 'to-test-v1',
    tierType: 'state_or_member_state',
    tierId: 'US-TX',
    jurisdictionFamilyId: 'us_state_local_v1',
    jurisdictionId: 'US-TX',
    supportedTrackFamilies: [brandTrackFamilyId('buildings')],
    corpusFragments: [],
    hierarchyFragments: [],
    contradictionPatternFragments: [],
    versionIndex: '1',
    effectiveFrom: '2024-01-01',
    governanceLifecycle: 'active',
    provenance: { sourceOwner: 'test', approvalPath: 'internal', lineageRef: 'test' },
    ...overrides,
  };
}

function makeResolutionInput(
  overrides?: Partial<EffectivePackResolutionInput>,
): EffectivePackResolutionInput {
  return {
    mode: 'new_case',
    caseId: 'case-001',
    runId: 'run-001',
    packId: brandPackId('pack-us-tx-buildings-v1'),
    trackFamilyId: brandTrackFamilyId('buildings'),
    jurisdictionFamilyId: 'us_state_local_v1',
    jurisdictionId: 'US-TX',
    governingAsOfDate: '2025-01-01',
    operatorId: 'operator-test',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// PackId validation
// ---------------------------------------------------------------------------

describe('PackId validation', () => {
  it('accepts all three legacy California pack ids', () => {
    expect(validatePackId('pack-california-highrise-v1').valid).toBe(true);
    expect(validatePackId('pack-california-appliance-refrig-v2').valid).toBe(true);
    expect(validatePackId('pack-california-datacenter-v3').valid).toBe(true);
  });

  it('sets isLegacyBypass true for legacy ids', () => {
    const result = validatePackId('pack-california-highrise-v1');
    expect(result.isLegacyBypass).toBe(true);
  });

  it('accepts a valid open pack id for Texas buildings', () => {
    const result = validatePackId('pack-us-tx-buildings-v1');
    expect(result.valid).toBe(true);
    expect(result.isLegacyBypass).toBe(false);
    expect(result.trackFamilySlug).toBe('buildings');
  });

  it('rejects empty string', () => {
    expect(validatePackId('').valid).toBe(false);
  });

  it('rejects pack id without version segment', () => {
    expect(validatePackId('pack-us-tx-buildings').valid).toBe(false);
  });

  it('rejects pack id with unknown jurisdiction scope', () => {
    const result = validatePackId('pack-xx-zz-buildings-v1');
    expect(result.valid).toBe(false);
  });

  it('rejects pack id with unknown track family slug', () => {
    const result = validatePackId('pack-us-tx-unknowntrack-v1');
    expect(result.valid).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// TrackFamilyId validation
// ---------------------------------------------------------------------------

describe('TrackFamilyId validation', () => {
  it('accepts governed values', () => {
    expect(validateTrackFamilyId('buildings')).toBe(true);
    expect(validateTrackFamilyId('appliance_refrigeration')).toBe(true);
    expect(validateTrackFamilyId('datacenter')).toBe(true);
  });

  it('rejects unknown values', () => {
    expect(validateTrackFamilyId('plumbing')).toBe(false);
    expect(validateTrackFamilyId('')).toBe(false);
    expect(validateTrackFamilyId('BUILDINGS')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// governingAsOfDate validation
// ---------------------------------------------------------------------------

describe('governingAsOfDate validation', () => {
  it('rejects invalid format', () => {
    expect(() => validateGoverningAsOfDate('01-01-2025', '2025-01-15')).toThrow();
    expect(() => validateGoverningAsOfDate('not-a-date', '2025-01-15')).toThrow();
    expect(() => validateGoverningAsOfDate('2025/01/01', '2025-01-15')).toThrow();
  });

  it('rejects future dates', () => {
    expect(() => validateGoverningAsOfDate('2099-01-01', '2025-01-15')).toThrow();
  });

  it('accepts today and past dates', () => {
    expect(() => validateGoverningAsOfDate('2025-01-01', '2025-01-15')).not.toThrow();
    expect(() => validateGoverningAsOfDate('2024-06-15', '2025-01-15')).not.toThrow();
    // same day as today is allowed
    expect(() => validateGoverningAsOfDate('2025-01-15', '2025-01-15')).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// tierPath determinism
// ---------------------------------------------------------------------------

describe('tierPath building', () => {
  it('produces deterministic national -> state order', () => {
    const path = buildTierPath(TEXAS_FAMILY, brandTrackFamilyId('buildings'), 'US-TX');
    expect(path[0]?.tierType).toBe('national');
    expect(path[0]?.tierId).toBe('US');
    expect(path[1]?.tierType).toBe('state_or_member_state');
    expect(path[1]?.tierId).toBe('US-TX');
  });

  it('same inputs always produce same path', () => {
    const a = buildTierPath(TEXAS_FAMILY, brandTrackFamilyId('buildings'), 'US-TX');
    const b = buildTierPath(TEXAS_FAMILY, brandTrackFamilyId('buildings'), 'US-TX');
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it('throws ERR_MUNICIPALITY_REQUIRED when required and absent', () => {
    const familyRequiringMuni: JurisdictionFamilyConfig = {
      ...TEXAS_FAMILY,
      requiresMunicipalityByTrack: { [brandTrackFamilyId('buildings')]: true },
      tierOrder: ['national', 'state_or_member_state', 'municipal'],
    };
    let caught: unknown;
    try {
      buildTierPath(familyRequiringMuni, brandTrackFamilyId('buildings'), 'US-TX');
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(ResolverError);
    expect((caught as ResolverError).code).toBe('ERR_MUNICIPALITY_REQUIRED');
  });
});

// ---------------------------------------------------------------------------
// Overlap detection
// ---------------------------------------------------------------------------

describe('overlap detection', () => {
  it('rejects two base modules with same key active on same date', () => {
    const mod1 = makeBaseModule({ baseModuleId: 'bsm-a', effectiveFrom: '2024-01-01' });
    const mod2 = makeBaseModule({ baseModuleId: 'bsm-a', effectiveFrom: '2024-06-01' });
    let caught: unknown;
    try {
      detectIllegalOverlap([mod1, mod2], [], '2025-01-01');
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(ResolverError);
    expect((caught as ResolverError).code).toBe('ERR_EFFECTIVE_DATE_OVERLAP');
  });

  it('allows two modules with different ids (no overlap key match)', () => {
    const mod1 = makeBaseModule({ baseModuleId: 'bsm-a', effectiveFrom: '2024-01-01' });
    const mod2 = makeBaseModule({ baseModuleId: 'bsm-b', effectiveFrom: '2024-01-01' });
    expect(() => detectIllegalOverlap([mod1, mod2], [], '2025-01-01')).not.toThrow();
  });

  it('ignores inactive components (effectiveTo before governingAsOfDate)', () => {
    const mod1 = makeBaseModule({
      baseModuleId: 'bsm-a',
      effectiveFrom: '2023-01-01',
      effectiveTo: '2023-12-31',
    });
    const mod2 = makeBaseModule({ baseModuleId: 'bsm-a', effectiveFrom: '2024-01-01' });
    // On 2025-01-01: mod1 is inactive, mod2 is active → no overlap
    expect(() => detectIllegalOverlap([mod1, mod2], [], '2025-01-01')).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// Effective-date boundary selection (ext-spec §27.2 boundary cases)
// ---------------------------------------------------------------------------

describe('isActiveOn boundary conditions', () => {
  it('effectiveFrom === governingAsOfDate is active', () => {
    expect(isActiveOn({ effectiveFrom: '2025-01-01' }, '2025-01-01')).toBe(true);
  });

  it('effectiveTo === governingAsOfDate is active', () => {
    expect(
      isActiveOn({ effectiveFrom: '2024-01-01', effectiveTo: '2025-01-01' }, '2025-01-01'),
    ).toBe(true);
  });

  it('effectiveTo one day before governingAsOfDate is inactive', () => {
    expect(
      isActiveOn({ effectiveFrom: '2024-01-01', effectiveTo: '2024-12-31' }, '2025-01-01'),
    ).toBe(false);
  });

  it('component before effectiveFrom is inactive', () => {
    expect(isActiveOn({ effectiveFrom: '2026-01-01' }, '2025-01-01')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// EffectivePackId derivation stability
// ---------------------------------------------------------------------------

describe('EffectivePackId derivation', () => {
  it('same inputs always produce same id', () => {
    const digest = 'abcdef1234567890abcdef1234567890abcdef1234' as Sha256Hex;
    const id1 = deriveEffectivePackId(
      brandPackId('pack-us-tx-buildings-v1'),
      'US-TX',
      '2025-01-01',
      digest,
    );
    const id2 = deriveEffectivePackId(
      brandPackId('pack-us-tx-buildings-v1'),
      'US-TX',
      '2025-01-01',
      digest,
    );
    expect(id1).toBe(id2);
  });

  it('different jurisdictionId produces different id', () => {
    const digest = 'abcdef1234567890abcdef1234567890abcdef1234' as Sha256Hex;
    const id1 = deriveEffectivePackId(
      brandPackId('pack-us-tx-buildings-v1'),
      'US-TX',
      '2025-01-01',
      digest,
    );
    const id2 = deriveEffectivePackId(
      brandPackId('pack-us-tx-buildings-v1'),
      'US-CA',
      '2025-01-01',
      digest,
    );
    expect(id1).not.toBe(id2);
  });

  it('different compositionDigest produces different id', () => {
    const digest1 = 'aaaa1111bbbb2222cccc3333dddd4444eeee5555ff' as Sha256Hex;
    const digest2 = 'bbbb2222cccc3333dddd4444eeee5555ffff6666aa' as Sha256Hex;
    const id1 = deriveEffectivePackId(
      brandPackId('pack-us-tx-buildings-v1'),
      'US-TX',
      '2025-01-01',
      digest1,
    );
    const id2 = deriveEffectivePackId(
      brandPackId('pack-us-tx-buildings-v1'),
      'US-TX',
      '2025-01-01',
      digest2,
    );
    expect(id1).not.toBe(id2);
  });

  it('id starts with epack-', () => {
    const digest = 'abcdef1234567890abcdef1234567890abcdef1234' as Sha256Hex;
    const id = deriveEffectivePackId(
      brandPackId('pack-us-tx-buildings-v1'),
      'US-TX',
      '2025-01-01',
      digest,
    );
    expect((id as string).startsWith('epack-')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Compatibility projection
// ---------------------------------------------------------------------------

describe('effective pack compatibility', () => {
  function makeMinimalEffectivePack(): EffectivePackManifest {
    return {
      packId: brandPackId('pack-us-tx-buildings-v1'),
      versionIndex: '1',
      displayName: 'US-TX buildings effective pack',
      jurisdiction: 'US-TX',
      corpus: [],
      classMap: [],
      hierarchyConfig: [],
      contradictionPatterns: [],
      optionalExtractors: [],
      standardVersionPolicy: { entries: [] },
      supportedDocumentClasses: [],
      effectivePackId: 'epack-us-tx-buildings-v1-aabbccdd-2025-01-01-aabbccdd1234' as any,
      effectivePackVersion: 'v1',
      trackFamilyId: brandTrackFamilyId('buildings'),
      jurisdictionFamilyId: 'us_state_local_v1',
      jurisdictionId: 'US-TX',
      tierPath: [],
      governingAsOfDate: '2025-01-01',
      componentProvenance: [],
      compositionDigest: 'abc' as Sha256Hex,
      resolvedAt: '2025-01-01T00:00:00Z',
      resolvedBy: 'test-operator',
      resolutionMethod: 'composed_fresh',
      replayPinned: false,
      releaseState: 'draft',
    };
  }

  it('projectToBasePackManifest returns only base fields', () => {
    const effective = makeMinimalEffectivePack();
    const base = projectToBasePackManifest(effective);
    expect((base as any).effectivePackId).toBeUndefined();
    expect((base as any).trackFamilyId).toBeUndefined();
    expect(base.packId).toBeDefined();
    expect(base.corpus).toBeDefined();
  });

  it('validateEffectivePackCompatibility passes for valid manifest', () => {
    expect(() => validateEffectivePackCompatibility(makeMinimalEffectivePack())).not.toThrow();
  });

  it('validateEffectivePackCompatibility throws when required field missing', () => {
    const bad = makeMinimalEffectivePack();
    (bad as any).corpus = undefined;
    expect(() => validateEffectivePackCompatibility(bad)).toThrow();
  });
});

// ---------------------------------------------------------------------------
// Lawful reuse — exact input identity required
// ---------------------------------------------------------------------------

describe('lawful reuse', () => {
  const digest = 'abcdef1234567890abcdef1234567890abcdef123456' as Sha256Hex;
  const input = makeResolutionInput();

  const storedRecord = {
    effectivePackId: 'epack-test' as any,
    compositionDigest: digest,
    packId: brandPackId('pack-us-tx-buildings-v1'),
    trackFamilyId: brandTrackFamilyId('buildings'),
    jurisdictionFamilyId: 'us_state_local_v1',
    jurisdictionId: 'US-TX',
    tierPath: [],
    governingAsOfDate: '2025-01-01',
    componentIds: [],
    componentDigests: [],
    storedAt: '2025-01-01T00:00:00Z',
    manifestPath: 'test',
    compatibilityValidated: true,
    replayValidated: false,
  };

  it('returns true when all identity fields match', () => {
    expect(isLawfullyReusable(storedRecord, input, digest)).toBe(true);
  });

  it('returns false when governingAsOfDate differs', () => {
    const differentInput = makeResolutionInput({ governingAsOfDate: '2024-01-01' });
    expect(isLawfullyReusable(storedRecord, differentInput, digest)).toBe(false);
  });

  it('returns false when jurisdictionId differs', () => {
    const differentInput = makeResolutionInput({ jurisdictionId: 'US-CA' });
    expect(isLawfullyReusable(storedRecord, differentInput, digest)).toBe(false);
  });

  it('returns false when compositionDigest differs', () => {
    const otherDigest = 'ffffeeee1234567890abcdef1234567890abcd1234' as Sha256Hex;
    expect(isLawfullyReusable(storedRecord, input, otherDigest)).toBe(false);
  });
});
