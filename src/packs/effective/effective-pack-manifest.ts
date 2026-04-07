/**
 * Canonical re-export barrel for EffectivePackManifest types.
 * ext-spec §5.1 — required additive path.
 * Types live in src/types/effective-pack.ts per the unified type strategy.
 */
export type {
  EffectivePackManifest,
  ComponentProvenanceEntry,
  EffectivePackResolutionInput,
  EffectivePackResolutionResult,
  EffectivePackStoreRecord,
} from '../../types/effective-pack.js';
