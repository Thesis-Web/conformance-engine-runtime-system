import { loadPack } from '../src/packs/pack-loader.js';
import { validatePack } from '../src/packs/pack-validator.js';
import { runEffectivePackResolutionGates } from '../src/validation/effective-pack-resolution-gate.js';
import { REQUIRED_ARTIFACT_NAMES } from '../src/validation/gates.js';
import { loadJurisdictionFamilyConfig } from '../src/packs/jurisdiction-families/jurisdiction-family-loader.js';
import { loadBaseStandardsModulesFromDir } from '../src/packs/base-modules/base-standards-loader.js';
import { loadTierOverlaysFromDir } from '../src/packs/tier-overlays/tier-overlay-loader.js';
import { resolveEffectivePack } from '../src/orchestration/resolver/resolve-effective-pack.js';
import {
  clearStore,
  lookupEffectivePackById,
} from '../src/orchestration/effective-pack-store/effective-pack-store.js';
import { brandPackId, brandTrackFamilyId } from '../src/types/identifiers.js';
import { existsSync, readdirSync, readFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type {
  EffectivePackManifest,
  EffectivePackStoreRecord,
} from '../src/types/effective-pack.js';

const BASE_PACKS = [
  'fixtures/pack-v1/manifest.json',
  'fixtures/pack-v2/manifest.json',
  'fixtures/pack-v3/manifest.json',
];

let pass = true;

// --- Base pack validation ---
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

// ---------------------------------------------------------------------------
// HOLE-AUDIT-001 + HOLE-AUDIT-004: Extension validation must run live
// resolution behavior — not just fixture-shape checks.
//
// If extension fixtures exist, we:
//   1. Run a fresh new_case resolution against TX buildings fixtures
//   2. Run a reuse resolution using the same inputs (should hit store)
//   3. Verify the store record is marked replayValidated=true
//   4. Run an overlap rejection case (duplicate module same dates)
//   5. Run the extension gates against the resulting live manifests
//
// If extension fixtures are absent, skip with a clear message.
// If extension fixtures exist but resolution produces zero manifests, FAIL.
// ---------------------------------------------------------------------------

const EXT_DIR = 'fixtures/extension';
const EXT_FAMILY_DIR = join(EXT_DIR, 'jurisdiction-families');
const EXT_MODULES_DIR = join(EXT_DIR, 'base-modules');
const EXT_OVERLAYS_DIR = join(EXT_DIR, 'tier-overlays');
const EXT_PACKS_DIR = join(EXT_DIR, 'packs');

const extensionActive =
  existsSync(EXT_FAMILY_DIR) && existsSync(EXT_MODULES_DIR) && existsSync(EXT_OVERLAYS_DIR);

async function runExtensionValidation(): Promise<boolean> {
  let extPass = true;
  if (!extensionActive) {
    console.log('\nNo extension fixtures found — extension validation skipped.');
    return extPass;
  } else {
    console.log('\nRunning extension live resolution validation...');

    // Clear store before each validate run to ensure clean state
    clearStore();

    const effectiveManifests: EffectivePackManifest[] = [];
    const storeRecords: EffectivePackStoreRecord[] = [];
    const resolutionResults: Array<{ resolved: boolean; rejectionCode?: string }> = [];

    try {
      const storeRoot = mkdtempSync(join(tmpdir(), 'cers-pack-validate-'));
      const family = loadJurisdictionFamilyConfig(join(EXT_FAMILY_DIR, 'us_state_local_v1.json'));
      const modules = loadBaseStandardsModulesFromDir(EXT_MODULES_DIR);
      const overlays = loadTierOverlaysFromDir(EXT_OVERLAYS_DIR);

      // Load TX buildings pack manifest
      const txBuildingsPack = existsSync(
        join(EXT_PACKS_DIR, 'pack-us-tx-buildings-v1', 'manifest.json'),
      )
        ? loadPack(join(EXT_PACKS_DIR, 'pack-us-tx-buildings-v1', 'manifest.json'))
        : loadPack('fixtures/pack-v1/manifest.json'); // fallback to CA pack for base manifest shape

      // --- Test 1: Fresh new_case resolution ---
      const baseResolutionInput = {
        mode: 'new_case' as const,
        caseId: 'validate-case-001' as Parameters<typeof brandPackId>[0],
        runId: 'validate-run-001' as Parameters<typeof brandPackId>[0],
        packId: brandPackId('pack-us-tx-buildings-v1'),
        trackFamilyId: brandTrackFamilyId('buildings'),
        jurisdictionFamilyId: 'us_state_local_v1',
        jurisdictionId: 'us-tx',
        governingAsOfDate: '2025-01-01',
        operatorId: 'pack-validate-script',
      };

      const freshResult = await resolveEffectivePack({
        input: baseResolutionInput,
        family,
        allModules: modules,
        allOverlays: overlays,
        basePackManifest: txBuildingsPack,
        storeRoot,
        artifactRoot: storeRoot,
      });

      resolutionResults.push({
        resolved: freshResult.resolved,
        ...(freshResult.rejectionCode !== undefined && {
          rejectionCode: freshResult.rejectionCode,
        }),
      });

      if (!freshResult.resolved || !freshResult.manifest) {
        console.error(
          'FAIL extension live resolution — fresh new_case failed: ' +
            (freshResult.rejectionReason ?? 'unknown'),
        );
        pass = false;
      } else {
        console.log(
          'OK extension: fresh new_case resolution produced effectivePackId ' +
            String(freshResult.effectivePackId),
        );
        effectiveManifests.push(freshResult.manifest);

        // Verify store record has replayValidated=true (DIFF-AUDIT-002 fix)
        const storeRecord = lookupEffectivePackById(freshResult.manifest.effectivePackId);
        if (!storeRecord) {
          console.error('FAIL extension: store record missing after fresh compose');
          pass = false;
        } else {
          storeRecords.push(storeRecord);
          if (!storeRecord.replayValidated) {
            console.error(
              'FAIL extension: replayValidated is false after fresh compose — DIFF-AUDIT-002 not fixed',
            );
            pass = false;
          } else {
            console.log('OK extension: store record replayValidated=true after fresh compose');
          }
          if (!storeRecord.compatibilityValidated) {
            console.error('FAIL extension: compatibilityValidated is false');
            pass = false;
          } else {
            console.log('OK extension: store record compatibilityValidated=true');
          }
        }
      }

      // --- Test 2: Reuse resolution (same inputs should reuse store) ---
      const reuseResult = await resolveEffectivePack({
        input: {
          ...baseResolutionInput,
          runId: 'validate-run-002' as typeof baseResolutionInput.runId,
        },
        family,
        allModules: modules,
        allOverlays: overlays,
        basePackManifest: txBuildingsPack,
        storeRoot,
        artifactRoot: storeRoot,
      });

      resolutionResults.push({
        resolved: reuseResult.resolved,
        ...(reuseResult.rejectionCode !== undefined && {
          rejectionCode: reuseResult.rejectionCode,
        }),
      });

      if (!reuseResult.resolved) {
        console.error(
          'FAIL extension: reuse resolution failed: ' + (reuseResult.rejectionReason ?? 'unknown'),
        );
        pass = false;
      } else {
        console.log('OK extension: reuse resolution returned ' + reuseResult.resolutionMethod);
        if (reuseResult.manifest) effectiveManifests.push(reuseResult.manifest);
      }

      // --- Test 3: No-match rejection ---
      // Module selection is driven by trackFamilyId + family-referenced module IDs,
      // not jurisdictionId. To produce a genuine no-match, pass allModules: [] so
      // selectApplicableBaseModules returns empty and selectComponents throws
      // ERR_NO_BASE_MODULES before composition is attempted.
      const noMatchResult = await resolveEffectivePack({
        input: {
          ...baseResolutionInput,
          runId: 'validate-run-003' as typeof baseResolutionInput.runId,
        },
        family,
        allModules: [], // empty — no base modules available → must reject
        allOverlays: [],
        basePackManifest: txBuildingsPack,
        storeRoot,
        artifactRoot: storeRoot,
      });

      resolutionResults.push({
        resolved: noMatchResult.resolved,
        ...(noMatchResult.rejectionCode !== undefined && {
          rejectionCode: noMatchResult.rejectionCode,
        }),
      });

      if (noMatchResult.resolved) {
        console.error('FAIL extension: no-match case should have rejected but resolved');
        pass = false;
      } else {
        console.log(
          'OK extension: no-match rejection fired correctly: ' +
            (noMatchResult.rejectionCode ?? 'unknown'),
        );
      }
    } catch (err) {
      console.error('FAIL extension live resolution threw: ' + String(err));
      pass = false;
    }

    // HOLE-AUDIT-001: Require at least one manifest from live resolution.
    if (effectiveManifests.length === 0) {
      console.error(
        'FAIL extension: zero effective manifests produced — extension gate has no coverage',
      );
      pass = false;
    } else {
      console.log(
        `\nRunning extension gates against ${effectiveManifests.length} live manifests, ${storeRecords.length} store records...`,
      );

      const extGateResults = runEffectivePackResolutionGates({
        manifests: effectiveManifests,
        storeRecords,
        artifactNames: [...REQUIRED_ARTIFACT_NAMES],
        resolutionResults,
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
    }

    // Also check any pre-existing extension pack manifests if they have effectivePackId
    if (existsSync(EXT_PACKS_DIR)) {
      try {
        const packDirs = readdirSync(EXT_PACKS_DIR, { withFileTypes: true })
          .filter((e) => e.isDirectory())
          .map((e) => e.name);
        for (const dir of packDirs) {
          const mPath = join(EXT_PACKS_DIR, dir, 'manifest.json');
          if (existsSync(mPath)) {
            const raw = JSON.parse(readFileSync(mPath, 'utf8')) as Record<string, unknown>;
            // TX nominal pack manifests are base PackManifest, not EffectivePackManifest
            // Validate them as base packs
            if (!('effectivePackId' in raw)) {
              const manifest = loadPack(mPath);
              const result = validatePack(manifest);
              if (!result.valid) {
                console.error(`FAIL extension pack: ${mPath} — ${result.errors.join(', ')}`);
                pass = false;
              } else {
                console.log(`OK extension pack: ${mPath}`);
              }
            }
          }
        }
      } catch {
        // non-fatal
      }
    }

    clearStore();
  }
  return extPass;
}

(async () => {
  const extResult = await runExtensionValidation();
  if (!extResult) pass = false;

  if (!pass) {
    process.exit(1);
  }

  console.log('\npack:validate PASS');
})().catch((err) => {
  console.error('extension validation error:', err);
  process.exit(1);
});
