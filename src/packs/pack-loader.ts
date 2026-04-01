import type { PackManifest } from '../types/pack-manifest.js';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

export function loadPack(manifestPath: string): PackManifest {
  if (!existsSync(resolve(manifestPath))) {
    throw new Error(`pack manifest not found: ${manifestPath}`);
  }
  const raw = readFileSync(resolve(manifestPath), 'utf8');
  const manifest: unknown = JSON.parse(raw);

  const requiredFields = [
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
    'supportedDocumentClasses'
  ] as const;

  for (const field of requiredFields) {
    if (!(manifest as any)[field]) {
      throw new Error(`pack manifest missing required field: ${field}`);
    }
  }

  return manifest as PackManifest;
}

export function packExists(manifestPath: string): boolean {
  return existsSync(resolve(manifestPath));
}
