/**
 * Effective pack compatibility unit tests — ext-spec §5.1, §27.2
 */
import { describe, it, expect } from 'vitest';
import {
  projectToBasePackManifest,
  validateEffectivePackCompatibility,
} from '../../src/packs/effective/effective-pack-compatibility.js';
import {
  brandPackId,
  brandTrackFamilyId,
  brandEffectivePackId,
} from '../../src/types/identifiers.js';
import type { EffectivePackManifest } from '../../src/types/effective-pack.js';

function makeManifest(overrides: Partial<EffectivePackManifest> = {}): EffectivePackManifest {
  return {
    packId: brandPackId('pack-us-tx-buildings-v1'),
    versionIndex: '1',
    displayName: 'Test',
    jurisdiction: 'us-tx',
    corpus: [],
    classMap: [],
    hierarchyConfig: [],
    contradictionPatterns: [],
    optionalExtractors: [],
    standardVersionPolicy: { entries: [] },
    supportedDocumentClasses: ['DESIGN_PLANS'],
    effectivePackId: brandEffectivePackId('epack-test-abc-2025-01-01-def456789012'),
    effectivePackVersion: '1',
    trackFamilyId: brandTrackFamilyId('buildings'),
    jurisdictionFamilyId: 'us_state_local_v1',
    jurisdictionId: 'us-tx',
    tierPath: [],
    governingAsOfDate: '2025-01-01',
    componentProvenance: [],
    compositionDigest: 'abc123' as EffectivePackManifest['compositionDigest'],
    resolvedAt: '2025-01-01T00:00:00.000Z',
    resolvedBy: 'test',
    resolutionMethod: 'composed_fresh',
    replayPinned: false,
    releaseState: 'draft',
    ...overrides,
  };
}

describe('effective pack compatibility', () => {
  it('projectToBasePackManifest returns only base fields', () => {
    const m = makeManifest();
    const base = projectToBasePackManifest(m);
    expect('effectivePackId' in base).toBe(false);
    expect(base.packId).toBe(m.packId);
    expect(base.corpus).toBeDefined();
  });
  it('validateEffectivePackCompatibility passes for valid manifest', () => {
    expect(() => validateEffectivePackCompatibility(makeManifest())).not.toThrow();
  });
  it('throws when required field missing', () => {
    const m = makeManifest({ corpus: undefined as unknown as [] });
    expect(() => validateEffectivePackCompatibility(m)).toThrow();
  });
});
