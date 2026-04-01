import type { Finding } from '../types/index.js';

/**
 * Internal readiness metric per spec §21.
 * MUST ONLY appear with mandatory label per §21.2.
 * Never presented as conformance determination.
 */
export interface ReadinessResult {
  score: number;
  label: string;
}

export const READINESS_LABEL = 'Internal triage metric — not a conformance determination.';

export function computeReadiness(findings: Finding[]): ReadinessResult {
  let score = 100;

  for (const f of findings) {
    if (f.findingClass === 'CONTRA' && f.severity === 'critical') score -= 25;
    else if (f.findingClass === 'HOLE' && f.severity === 'critical') score -= 20;
    else if (f.findingClass === 'CONTRA' && f.severity === 'high') score -= 12;
    else if (f.findingClass === 'HOLE' && f.severity === 'high') score -= 10;
    else if (f.findingClass === 'AMBIGUITY' && f.severity === 'high') score -= 6;
    else if (f.findingClass === 'UNSUPPORTED') score -= 4;
    else if (f.findingClass === 'STALE') score -= 3;
    else if (f.findingClass === 'DIFF' && f.severity === 'medium') score -= 2;
  }

  const clamped = Math.max(0, Math.min(100, score));
  return { score: clamped, label: READINESS_LABEL };
}
