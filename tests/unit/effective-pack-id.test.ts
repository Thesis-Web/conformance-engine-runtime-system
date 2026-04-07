/**
 * EffectivePackId derivation unit tests — ext-spec §5.1, §27.2
 */
import { describe, it, expect } from 'vitest';
import { deriveEffectivePackId } from '../../src/packs/effective/effective-pack-id.js';
import { brandPackId } from '../../src/types/identifiers.js';
import type { Sha256Hex } from '../../src/types/primitives.js';

const DIGEST = 'abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890' as Sha256Hex;

describe('EffectivePackId derivation', () => {
  it('same inputs always produce same id', () => {
    const a = deriveEffectivePackId(
      brandPackId('pack-us-tx-buildings-v1'),
      'us-tx',
      '2025-01-01',
      DIGEST,
    );
    const b = deriveEffectivePackId(
      brandPackId('pack-us-tx-buildings-v1'),
      'us-tx',
      '2025-01-01',
      DIGEST,
    );
    expect(a).toBe(b);
  });
  it('different jurisdictionId produces different id', () => {
    const a = deriveEffectivePackId(
      brandPackId('pack-us-tx-buildings-v1'),
      'us-tx',
      '2025-01-01',
      DIGEST,
    );
    const b = deriveEffectivePackId(
      brandPackId('pack-us-tx-buildings-v1'),
      'us-ca',
      '2025-01-01',
      DIGEST,
    );
    expect(a).not.toBe(b);
  });
  it('different compositionDigest produces different id', () => {
    const d2 = 'ffff1234567890abcdef1234567890abcdef1234567890abcdef1234567890ab' as Sha256Hex;
    const a = deriveEffectivePackId(
      brandPackId('pack-us-tx-buildings-v1'),
      'us-tx',
      '2025-01-01',
      DIGEST,
    );
    const b = deriveEffectivePackId(
      brandPackId('pack-us-tx-buildings-v1'),
      'us-tx',
      '2025-01-01',
      d2,
    );
    expect(a).not.toBe(b);
  });
  it('id starts with epack-', () => {
    const id = deriveEffectivePackId(
      brandPackId('pack-us-tx-buildings-v1'),
      'us-tx',
      '2025-01-01',
      DIGEST,
    );
    expect((id as string).startsWith('epack-')).toBe(true);
  });
});
