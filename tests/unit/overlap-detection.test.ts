/**
 * Overlap detection unit tests — ext-spec §5.1, §27.2
 */
import { describe, it, expect } from 'vitest';
import { detectIllegalOverlap } from '../../src/orchestration/resolver/overlap-conflict-detector.js';
import { brandPackId, brandTrackFamilyId } from '../../src/types/identifiers.js';
import type { BaseStandardsModule } from '../../src/types/effective-pack.js';

function makeModule(id: string, from: string, to?: string): BaseStandardsModule {
  return {
    baseModuleId: id,
    displayName: 'Test Module',
    supportedTrackFamilies: [brandTrackFamilyId('buildings')],
    corpus: [],
    hierarchyFragments: [],
    contradictionPatternFragments: [],
    versionIndex: '1',
    effectiveFrom: from,
    ...(to !== undefined && { effectiveTo: to }),
    ownershipPackId: brandPackId('pack-us-tx-buildings-v1'),
    provenance: { sourceOwner: 'test', sourceAuthority: 'primary', lineageRef: 'test' },
  };
}

describe('overlap detection', () => {
  it('rejects two base modules with same key active on same date', () => {
    const m1 = makeModule('bsm-v1', '2024-01-01');
    const m2 = makeModule('bsm-v1', '2024-06-01');
    expect(() => detectIllegalOverlap([m1, m2], [], '2025-01-01')).toThrow(
      expect.objectContaining({ code: 'ERR_EFFECTIVE_DATE_OVERLAP' }),
    );
  });
  it('allows two modules with different ids', () => {
    const m1 = makeModule('bsm-v1', '2024-01-01');
    const m2 = makeModule('bsm-v2', '2024-01-01');
    expect(() => detectIllegalOverlap([m1, m2], [], '2025-01-01')).not.toThrow();
  });
  it('ignores inactive components', () => {
    const m1 = makeModule('bsm-v1', '2024-01-01', '2024-12-31');
    const m2 = makeModule('bsm-v1', '2023-01-01', '2023-12-31');
    expect(() => detectIllegalOverlap([m1, m2], [], '2025-01-01')).not.toThrow();
  });
});
