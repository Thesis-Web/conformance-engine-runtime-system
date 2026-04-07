/**
 * Identifier validation unit tests — ext-spec §5.1, §27.2
 * Covers: PackId, TrackFamilyId, EffectivePackId validators
 */
import { describe, it, expect } from 'vitest';
import { validatePackId, validateTrackFamilyId, brandPackId } from '../../src/types/identifiers.js';
import { parseEffectivePackId } from '../../src/packs/effective/effective-pack-id.js';

describe('PackId validation', () => {
  it('accepts all three legacy California pack ids', () => {
    expect(validatePackId('pack-california-highrise-v1').valid).toBe(true);
    expect(validatePackId('pack-california-appliance-refrig-v2').valid).toBe(true);
    expect(validatePackId('pack-california-datacenter-v3').valid).toBe(true);
  });
  it('sets isLegacyBypass true for legacy ids', () => {
    expect(validatePackId('pack-california-highrise-v1').isLegacyBypass).toBe(true);
  });
  it('accepts a valid open pack id for Texas buildings', () => {
    expect(validatePackId('pack-us-tx-buildings-v1').valid).toBe(true);
    expect(validatePackId('pack-us-tx-buildings-v1').isLegacyBypass).toBe(false);
  });
  it('rejects empty string', () => {
    expect(validatePackId('').valid).toBe(false);
  });
  it('rejects pack id without version segment', () => {
    expect(validatePackId('pack-us-tx-buildings').valid).toBe(false);
  });
  it('rejects pack id with unknown jurisdiction scope', () => {
    expect(validatePackId('pack-us-aq-buildings-v1').valid).toBe(false);
  });
});

describe('TrackFamilyId validation', () => {
  it('accepts governed values', () => {
    expect(validateTrackFamilyId('buildings')).toBe(true);
    expect(validateTrackFamilyId('appliance_refrigeration')).toBe(true);
    expect(validateTrackFamilyId('datacenter')).toBe(true);
  });
  it('rejects unknown values', () => {
    expect(validateTrackFamilyId('electrical')).toBe(false);
    expect(validateTrackFamilyId('')).toBe(false);
  });
});

describe('EffectivePackId parsing', () => {
  it('accepts valid epack prefix', () => {
    expect(() =>
      parseEffectivePackId('epack-us-tx-buildings-v1-abc12345-2025-01-01-def456789012'),
    ).not.toThrow();
  });
  it('rejects non-epack prefix', () => {
    expect(() => parseEffectivePackId('pack-us-tx-buildings-v1')).toThrow();
  });
});
