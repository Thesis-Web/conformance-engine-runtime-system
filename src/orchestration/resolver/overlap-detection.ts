/**
 * Canonical re-export barrel for overlap detection.
 * ext-spec §5.1 — required additive path.
 * Implementation lives in overlap-conflict-detector.ts (DRIFT-AUDIT-001 logged deviation).
 */
export {
  detectIllegalOverlap,
  dateRangesOverlap,
  deriveCoexistenceKey,
  type ResolvedComponent,
} from './overlap-conflict-detector.js';
