import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import type { TierOverlay } from '../../types/effective-pack.js';

export function loadTierOverlay(overlayPath: string): TierOverlay {
  const raw = readFileSync(overlayPath, 'utf8');
  return JSON.parse(raw) as TierOverlay;
}

export function loadTierOverlaysFromDir(dirPath: string): TierOverlay[] {
  const entries = readdirSync(dirPath, { withFileTypes: true });

  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
    .map((entry) => loadTierOverlay(join(dirPath, entry.name)));
}
