import { describe, it, expect } from 'vitest';
import { computeConfidenceBand } from '../../src/core/confidence.js';

describe('Confidence Model (spec §20.3)', () => {
  const band = (e: number, c: number, co: number, a: number, au: number) =>
    computeConfidenceBand({
      extraction: e,
      classification: c,
      contradiction: co,
      applicability: a,
      authority: au,
    });

  it('all 1.0 → high', () => {
    expect(band(1, 1, 1, 1, 1)).toBe('high');
  });
  it('all 0.9 → high', () => {
    expect(band(0.9, 0.9, 0.9, 0.9, 0.9)).toBe('high');
  });
  it('all 0.7 → medium', () => {
    expect(band(0.7, 0.7, 0.7, 0.7, 0.7)).toBe('medium');
  });
  it('all 0.5 → low', () => {
    expect(band(0.5, 0.5, 0.5, 0.5, 0.5)).toBe('low');
  });
  it('all 0.8 → medium (< 0.85)', () => {
    expect(band(0.8, 0.8, 0.8, 0.8, 0.8)).toBe('medium');
  });
  it('all 0.4 → low (< 0.65)', () => {
    expect(band(0.4, 0.4, 0.4, 0.4, 0.4)).toBe('low');
  });
});
