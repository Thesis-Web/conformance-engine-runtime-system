/**
 * Tier path builder unit tests — ext-spec §5.1, §27.2
 */
import { describe, it, expect } from 'vitest';
import {
  buildTierPath,
  ResolverError,
} from '../../src/orchestration/resolver/tier-path-builder.js';
import { brandTrackFamilyId } from '../../src/types/identifiers.js';
import type { JurisdictionFamilyConfig } from '../../src/types/effective-pack.js';

const FAMILY: JurisdictionFamilyConfig = {
  jurisdictionFamilyId: 'us_state_local_v1',
  displayName: 'Test Family',
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

const TRACK = brandTrackFamilyId('buildings');

describe('tier path building', () => {
  it('produces deterministic national -> state order', () => {
    const path = buildTierPath(FAMILY, TRACK, 'us-tx');
    expect(path[0]?.tierType).toBe('national');
    expect(path[1]?.tierType).toBe('state_or_member_state');
  });
  it('same inputs always produce same path', () => {
    const a = buildTierPath(FAMILY, TRACK, 'us-tx');
    const b = buildTierPath(FAMILY, TRACK, 'us-tx');
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });
  it('throws ERR_MUNICIPALITY_REQUIRED when required and absent', () => {
    const family: JurisdictionFamilyConfig = {
      ...FAMILY,
      requiresMunicipalityByTrack: { [brandTrackFamilyId('buildings')]: true },
    };
    expect(() => buildTierPath(family, TRACK, 'us-tx')).toThrow(
      expect.objectContaining({ code: 'ERR_MUNICIPALITY_REQUIRED' }),
    );
  });
});
