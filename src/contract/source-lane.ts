import type { SourceLane } from '../types/index.js';

export const LANE_PRECEDENCE: Readonly<Record<SourceLane, number>> = {
  case_bound: 1,
  curated_reference: 2,
  live_candidate: 3,
} as const;

export function higherAuthority(a: SourceLane, b: SourceLane): SourceLane {
  return LANE_PRECEDENCE[a] <= LANE_PRECEDENCE[b] ? a : b;
}

export function canEmitFindings(lane: SourceLane): boolean {
  switch (lane) {
    case 'case_bound':
      return true;
    case 'curated_reference':
      return true;
    case 'live_candidate':
      return false;
  }
}
