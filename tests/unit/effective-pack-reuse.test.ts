/**
 * Effective pack reuse unit tests — ext-spec §5.1, §19.1, §27.2
 * DIFF-AUDIT-001: tests for full §19.1 precondition set including tierPath,
 * compatibilityValidated, and replayValidated.
 */
import { describe, it, expect } from 'vitest';
import { isLawfullyReusable } from '../../src/orchestration/effective-pack-store/effective-pack-reuse.js';
import {
  brandPackId,
  brandTrackFamilyId,
  brandEffectivePackId,
} from '../../src/types/identifiers.js';
import type {
  EffectivePackStoreRecord,
  EffectivePackResolutionInput,
} from '../../src/types/effective-pack.js';
import type { Sha256Hex } from '../../src/types/primitives.js';

const DIGEST = 'aaaa1234567890abcdef1234567890abcdef1234567890abcdef1234567890ab' as Sha256Hex;

function makeRecord(overrides: Partial<EffectivePackStoreRecord> = {}): EffectivePackStoreRecord {
  return {
    effectivePackId: brandEffectivePackId('epack-test-abc-2025-01-01-aaa123456789'),
    compositionDigest: DIGEST,
    packId: brandPackId('pack-us-tx-buildings-v1'),
    trackFamilyId: brandTrackFamilyId('buildings'),
    jurisdictionFamilyId: 'us_state_local_v1',
    jurisdictionId: 'us-tx',
    tierPath: [
      { tierType: 'national', tierId: 'us' },
      { tierType: 'state_or_member_state', tierId: 'us-tx' },
    ],
    governingAsOfDate: '2025-01-01',
    componentIds: [],
    componentDigests: [],
    storedAt: '2025-01-01T00:00:00.000Z',
    manifestPath: '/tmp/test/manifest.json',
    compatibilityValidated: true,
    replayValidated: true,
    ...overrides,
  };
}

function makeInput(
  overrides: Partial<EffectivePackResolutionInput> = {},
): EffectivePackResolutionInput {
  return {
    mode: 'new_case',
    caseId: 'case-001' as EffectivePackResolutionInput['caseId'],
    runId: 'run-001' as EffectivePackResolutionInput['runId'],
    packId: brandPackId('pack-us-tx-buildings-v1'),
    trackFamilyId: brandTrackFamilyId('buildings'),
    jurisdictionFamilyId: 'us_state_local_v1',
    jurisdictionId: 'us-tx',
    governingAsOfDate: '2025-01-01',
    operatorId: 'test',
    ...overrides,
  };
}

describe('lawful reuse — §19.1 full precondition set', () => {
  it('returns true when all identity fields match and flags are true', () => {
    expect(isLawfullyReusable(makeRecord(), makeInput(), DIGEST)).toBe(true);
  });
  it('returns false when governingAsOfDate differs', () => {
    expect(
      isLawfullyReusable(makeRecord(), makeInput({ governingAsOfDate: '2025-06-01' }), DIGEST),
    ).toBe(false);
  });
  it('returns false when jurisdictionId differs', () => {
    expect(isLawfullyReusable(makeRecord(), makeInput({ jurisdictionId: 'us-ca' }), DIGEST)).toBe(
      false,
    );
  });
  it('returns false when compositionDigest differs', () => {
    const d2 = 'bbbb1234567890abcdef1234567890abcdef1234567890abcdef1234567890ab' as Sha256Hex;
    expect(isLawfullyReusable(makeRecord(), makeInput(), d2)).toBe(false);
  });
  it('returns false when compatibilityValidated is false — DIFF-AUDIT-001', () => {
    expect(
      isLawfullyReusable(makeRecord({ compatibilityValidated: false }), makeInput(), DIGEST),
    ).toBe(false);
  });
  it('returns false when replayValidated is false — DIFF-AUDIT-001', () => {
    expect(isLawfullyReusable(makeRecord({ replayValidated: false }), makeInput(), DIGEST)).toBe(
      false,
    );
  });
  it('returns false when tierPath order differs — DIFF-AUDIT-001', () => {
    const input = makeInput({
      tierPathOverride: [
        { tierType: 'state_or_member_state', tierId: 'us-tx' }, // reversed order
        { tierType: 'national', tierId: 'us' },
      ],
    });
    expect(isLawfullyReusable(makeRecord(), input, DIGEST)).toBe(false);
  });
  it('returns false when trackFamilyId differs', () => {
    expect(
      isLawfullyReusable(
        makeRecord(),
        makeInput({ trackFamilyId: brandTrackFamilyId('datacenter') }),
        DIGEST,
      ),
    ).toBe(false);
  });
});
