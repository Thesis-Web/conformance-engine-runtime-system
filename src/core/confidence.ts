import type { ConfidenceBand, ConfidenceClass } from '../types/index.js';

export interface ConfidenceDimensions {
  extraction: number;
  classification: number;
  contradiction: number;
  applicability: number;
  authority: number;
}

// spec §20.3 weighted mean formula
export function computeWeighted(d: ConfidenceDimensions): number {
  return (
    0.2 * d.extraction +
    0.2 * d.classification +
    0.25 * d.contradiction +
    0.2 * d.applicability +
    0.15 * d.authority
  );
}

export function computeConfidenceBand(d: ConfidenceDimensions): ConfidenceBand {
  const w = computeWeighted(d);
  if (w >= 0.85) return 'high';
  if (w >= 0.65) return 'medium';
  return 'low';
}

export function computeConfidenceClass(
  d: ConfidenceDimensions,
  hasAmbiguityFlag: boolean,
): ConfidenceClass {
  if (!hasAmbiguityFlag && d.applicability >= 0.85 && d.authority >= 0.85) {
    return 'deterministic';
  }
  return 'interpretive';
}
