import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import type { BaseStandardsModule } from '../../types/effective-pack.js';

export function loadBaseStandardsModule(modulePath: string): BaseStandardsModule {
  const raw = readFileSync(modulePath, 'utf8');
  return JSON.parse(raw) as BaseStandardsModule;
}

export function loadBaseStandardsModulesFromDir(dirPath: string): BaseStandardsModule[] {
  const entries = readdirSync(dirPath, { withFileTypes: true });

  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
    .map((entry) => loadBaseStandardsModule(join(dirPath, entry.name)));
}
