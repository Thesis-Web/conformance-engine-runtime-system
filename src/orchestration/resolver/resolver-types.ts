/**
 * Canonical re-export barrel for resolver types.
 * ext-spec §5.1 — required additive path.
 * Types live in their respective source files; this is the canonical re-export surface.
 */
export type { ReplayPinnedFields } from './replay-resolution.js';
export type { SelectedComponents } from './component-selection.js';
export { ResolverError } from './tier-path-builder.js';
export type { ResolveEffectivePackOptions } from './resolve-effective-pack.js';
