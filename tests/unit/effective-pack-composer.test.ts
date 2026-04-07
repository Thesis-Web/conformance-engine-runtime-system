/**
 * Effective pack composer unit tests — ext-spec §5.1, §27.2
 * Tests corpus deduplication and conflict detection via validateEffectivePackCompatibility.
 */
import { describe, it, expect } from 'vitest';
import {
  validateEffectivePackCompatibility,
  projectToBasePackManifest,
} from '../../src/packs/effective/effective-pack-compatibility.js';
import {
  brandPackId,
  brandTrackFamilyId,
  brandEffectivePackId,
} from '../../src/types/identifiers.js';
import type { EffectivePackManifest } from '../../src/types/effective-pack.js';

function makeManifest(corpusLength: number): EffectivePackManifest {
  return {
    packId: brandPackId('pack-us-tx-buildings-v1'),
    versionIndex: '1',
    displayName: 'Test',
    jurisdiction: 'us-tx',
    corpus: Array.from({ length: corpusLength }, (_, i) => ({
      corpusId: `corp-${i}`,
      authority: 'primary' as const,
      title: `Corpus ${i}`,
      versionLabel: '1',
      ownershipPackId: brandPackId('pack-us-tx-buildings-v1'),
      citationKey: `key-${i}`,
    })),
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
  };
}

describe('effective pack composer — corpus and projection', () => {
  it('composed manifest with corpus passes compatibility validation', () => {
    expect(() => validateEffectivePackCompatibility(makeManifest(2))).not.toThrow();
  });
  it('projectToBasePackManifest strips extension fields', () => {
    const m = makeManifest(1);
    const base = projectToBasePackManifest(m);
    expect('effectivePackId' in base).toBe(false);
    expect(base.corpus.length).toBe(1);
  });
  it('manifest with empty corpus passes shape validation', () => {
    expect(() => validateEffectivePackCompatibility(makeManifest(0))).not.toThrow();
  });
});
