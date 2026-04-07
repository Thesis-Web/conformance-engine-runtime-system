import { loadPack } from '../src/packs/pack-loader.js';
import { validatePack } from '../src/packs/pack-validator.js';
import { runEffectivePackResolutionGates } from '../src/validation/effective-pack-resolution-gate.js';
import { REQUIRED_ARTIFACT_NAMES } from '../src/validation/gates.js';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { EffectivePackManifest } from '../src/types/effective-pack.js';
import type { EffectivePackStoreRecord } from '../src/types/effective-pack.js';

const BASE_PACKS = [
  'fixtures/pack-v1/manifest.json',
  'fixtures/pack-v2/manifest.json',
  'fixtures/pack-v3/manifest.json',
];

let pass = true;

// --- Base pack validation (unchanged) ---
for (const packPath of BASE_PACKS) {
  const manifest = loadPack(packPath);
  const result = validatePack(manifest);

  if (!result.valid) {
    console.error('FAIL: ' + packPath + ' ' + result.errors.join(','));
    pass = false;
  } else {
    console.log('OK: ' + packPath);
  }
}

// STUB-003: Extension resolution gates.
// If extension fixture manifests and store records exist, run the five
// effective-pack resolution gates against them. If no extension fixtures
// are present, skip gracefully — this keeps CA-only runs working.
const EXT_PACKS_DIR = 'fixtures/extension/packs';
const EXT_STORE_DIR = 'fixtures/extension/effective-pack-store';

const effectiveManifests: EffectivePackManifest[] = [];
const storeRecords: EffectivePackStoreRecord[] = [];

if (existsSync(EXT_PACKS_DIR)) {
  try {
    const packDirs = readdirSync(EXT_PACKS_DIR, { withFileTypes: true })
      .filter((e) => e.isDirectory())
      .map((e) => e.name);

    for (const dir of packDirs) {
      const manifestPath = join(EXT_PACKS_DIR, dir, 'manifest.json');
      if (existsSync(manifestPath)) {
        try {
          const raw = JSON.parse(readFileSync(manifestPath, 'utf8')) as EffectivePackManifest;
          // Only include manifests that have effectivePackId (true EffectivePackManifest)
          if ('effectivePackId' in raw) {
            effectiveManifests.push(raw);
          }
        } catch {
          // not an effective pack manifest — skip
        }
      }
    }
  } catch {
    // dir unreadable — skip extension gate
  }
}

if (existsSync(EXT_STORE_DIR)) {
  try {
    const storeFiles = readdirSync(EXT_STORE_DIR, { withFileTypes: true })
      .filter((e) => e.isFile() && e.name.endsWith('.json'))
      .map((e) => join(EXT_STORE_DIR, e.name));

    for (const filePath of storeFiles) {
      try {
        const raw = JSON.parse(readFileSync(filePath, 'utf8')) as EffectivePackStoreRecord;
        if ('effectivePackId' in raw && 'compositionDigest' in raw) {
          storeRecords.push(raw);
        }
      } catch {
        // not a valid store record — skip
      }
    }
  } catch {
    // dir unreadable — skip
  }
}

if (effectiveManifests.length > 0 || storeRecords.length > 0) {
  console.log(
    `\nRunning extension resolution gates (${effectiveManifests.length} manifests, ${storeRecords.length} store records)...`,
  );

  const extGateResults = runEffectivePackResolutionGates({
    manifests: effectiveManifests,
    storeRecords,
    artifactNames: [...REQUIRED_ARTIFACT_NAMES],
    resolutionResults: [],
    digestPairs: effectiveManifests.map((m) => ({
      manifest: m,
      expectedDigest: m.compositionDigest,
    })),
  });

  for (const result of extGateResults) {
    if (!result.passed) {
      console.error(`FAIL extension gate [${result.gateName}]: ${result.errors.join(', ')}`);
      pass = false;
    } else {
      console.log(`OK extension gate: ${result.gateName}`);
    }
  }
} else {
  console.log('\nNo extension manifests found — extension resolution gates skipped.');
}

if (!pass) {
  process.exit(1);
}

console.log('pack:validate PASS');
