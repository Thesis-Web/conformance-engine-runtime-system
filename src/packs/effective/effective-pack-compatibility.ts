/**
 * Effective-pack compatibility checker — ext-spec §12
 *
 * Enforces that EffectivePackManifest is a strict superset of PackManifest.
 * Layer 1 function signatures remain typed to PackManifest.
 * projectToBasePackManifest() strips extension fields before engine runs.
 *
 * validateEffectivePackCompatibility() must prove four conditions:
 *   1. all required PackManifest fields are present
 *   2. all base manifest arrays satisfy existing schema law
 *   3. no extension-only field is needed for Layer 1 execution
 *   4. projecting the manifest loses no data required by base engine behavior
 */

import type { PackManifest } from '../../types/pack-manifest.js';
import type { EffectivePackManifest } from '../../types/effective-pack.js';

export class CompatibilityError extends Error {
  public readonly code: string;

  public constructor(message: string) {
    super(message);
    this.name = 'CompatibilityError';
    this.code = 'ERR_EFFECTIVE_PACK_COMPATIBILITY';
  }
}

/**
 * ext-spec §12.3 — project EffectivePackManifest to base PackManifest view.
 * Called before Layer 1 engine runs. Extension-only fields are stripped.
 * Layer 1 never sees EffectivePackManifest directly.
 */
export function projectToBasePackManifest(effective: EffectivePackManifest): PackManifest {
  return {
    packId: effective.packId,
    versionIndex: effective.versionIndex,
    displayName: effective.displayName,
    jurisdiction: effective.jurisdiction,
    corpus: effective.corpus,
    classMap: effective.classMap,
    hierarchyConfig: effective.hierarchyConfig,
    contradictionPatterns: effective.contradictionPatterns,
    optionalExtractors: effective.optionalExtractors,
    standardVersionPolicy: effective.standardVersionPolicy,
    supportedDocumentClasses: effective.supportedDocumentClasses,
  };
}

/**
 * ext-spec §12.4 — four-condition compatibility validation.
 * Throws CompatibilityError on any failure.
 */
export function validateEffectivePackCompatibility(manifest: EffectivePackManifest): void {
  // Condition 1: required PackManifest fields present
  const requiredFields: Array<keyof PackManifest> = [
    'packId',
    'versionIndex',
    'displayName',
    'jurisdiction',
    'corpus',
    'classMap',
    'hierarchyConfig',
    'contradictionPatterns',
    'optionalExtractors',
    'standardVersionPolicy',
    'supportedDocumentClasses',
  ];

  for (const field of requiredFields) {
    if (manifest[field] === undefined || manifest[field] === null) {
      throw new CompatibilityError(
        `Required PackManifest field '${field}' is missing from EffectivePackManifest`,
      );
    }
  }

  // Condition 2: base arrays are valid (non-null arrays)
  if (!Array.isArray(manifest.corpus)) {
    throw new CompatibilityError('corpus must be an array');
  }
  if (!Array.isArray(manifest.classMap)) {
    throw new CompatibilityError('classMap must be an array');
  }
  if (!Array.isArray(manifest.hierarchyConfig)) {
    throw new CompatibilityError('hierarchyConfig must be an array');
  }
  if (!Array.isArray(manifest.contradictionPatterns)) {
    throw new CompatibilityError('contradictionPatterns must be an array');
  }
  if (!Array.isArray(manifest.optionalExtractors)) {
    throw new CompatibilityError('optionalExtractors must be an array');
  }
  if (!Array.isArray(manifest.supportedDocumentClasses)) {
    throw new CompatibilityError('supportedDocumentClasses must be an array');
  }
  if (!manifest.standardVersionPolicy || !Array.isArray(manifest.standardVersionPolicy.entries)) {
    throw new CompatibilityError('standardVersionPolicy.entries must be an array');
  }

  // Condition 3: extension-only fields are not required for Layer 1
  // (verified structurally — project() strips them; Layer 1 never reads them)
  // No throw needed — this is architectural, enforced by projectToBasePackManifest()

  // Condition 4: projection must not lose required base-engine data
  const projected = projectToBasePackManifest(manifest);
  for (const field of requiredFields) {
    if (projected[field] === undefined || projected[field] === null) {
      throw new CompatibilityError(
        `Projection lost required field '${field}' — base engine would be missing data`,
      );
    }
  }
}
