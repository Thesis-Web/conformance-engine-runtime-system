import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import type { JurisdictionFamilyConfig } from '../../types/effective-pack.js';

export function loadJurisdictionFamilyConfig(configPath: string): JurisdictionFamilyConfig {
  const raw = readFileSync(configPath, 'utf8');
  return JSON.parse(raw) as JurisdictionFamilyConfig;
}

export function loadJurisdictionFamilyConfigsFromDir(dirPath: string): JurisdictionFamilyConfig[] {
  const entries = readdirSync(dirPath, { withFileTypes: true });

  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
    .map((entry) => loadJurisdictionFamilyConfig(join(dirPath, entry.name)));
}
