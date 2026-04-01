import type { PackManifest } from '../types/pack-manifest.js';
import type { PackId } from '../types/index.js';
export interface PackValidationResult {
  valid: boolean;
  errors: string[];
}
export const VALID_PACK_IDS: ReadonlyArray<PackId> = [
  'pack-california-highrise-v1',
  'pack-california-appliance-refrig-v2',
  'pack-california-datacenter-v3',
];
export function validatePack(manifest: PackManifest): PackValidationResult {
  const errors: string[] = [];
  if (!VALID_PACK_IDS.includes(manifest.packId)) errors.push(`unknown packId: ${manifest.packId}`);
  if (!manifest.versionIndex.trim()) errors.push('versionIndex is empty');
  if (manifest.corpus.length === 0) errors.push('corpus is empty');
  if (manifest.supportedDocumentClasses.length === 0)
    errors.push('supportedDocumentClasses is empty');
  if (!Array.isArray(manifest.standardVersionPolicy.entries))
    errors.push('standardVersionPolicy.entries is not an array');
  return { valid: errors.length === 0, errors };
}
