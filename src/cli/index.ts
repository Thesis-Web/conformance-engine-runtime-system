import { parseArgs } from 'node:util';
import { resolve, join } from 'node:path';
import { createCase, saveCase } from '../orchestration/case-manager.js';
import { loadPack, packExists } from '../packs/pack-loader.js';
import { validatePack } from '../packs/pack-validator.js';
import { runCase, type ResolutionBundle } from '../orchestration/run-orchestrator.js';
import type { PackId } from '../types/index.js';
import { brandPackId } from '../types/identifiers.js';
import { loadJurisdictionFamilyConfig } from '../packs/jurisdiction-families/jurisdiction-family-loader.js';
import { loadBaseStandardsModulesFromDir } from '../packs/base-modules/base-standards-loader.js';
import { loadTierOverlaysFromDir } from '../packs/tier-overlays/tier-overlay-loader.js';
import { validateJurisdictionFamilyConfig } from '../packs/jurisdiction-families/jurisdiction-family-validator.js';
import { validateBaseStandardsModules } from '../packs/base-modules/base-standards-validator.js';
import { validateTierOverlays } from '../packs/tier-overlays/tier-overlay-validator.js';
import type { EffectivePackResolutionInput } from '../types/effective-pack.js';

const VALID_PACK_IDS: ReadonlyArray<PackId> = [
  brandPackId('pack-california-highrise-v1'),
  brandPackId('pack-california-appliance-refrig-v2'),
  brandPackId('pack-california-datacenter-v3'),
];

const USAGE = `Usage:
  cers init-case   --pack <packId> --title <title> [--source-root <path>]
  cers run-case    --case <casePath> --pack <packManifestPath>
                   [--track-family <id>] [--jurisdiction-family <id>]
                   [--jurisdiction-id <id>] [--governing-as-of <YYYY-MM-DD>]
                   [--municipality-id <id>] [--fixture-root <path>]
                   [--store-root <path>]
  cers validate-pack --manifest <path>
  cers validate-run  --run <runDir>
  cers replay-run    --run <runDir>

Resolution flags (run-case only):
  --track-family       TrackFamilyId (e.g. buildings)
  --jurisdiction-family JurisdictionFamilyId (e.g. us_state_local_v1)
  --jurisdiction-id    JurisdictionId (e.g. us-tx)
  --governing-as-of    Governing date YYYY-MM-DD
  --municipality-id    Optional municipality id
  --fixture-root       Root of extension fixtures (default: fixtures/extension)
  --store-root         Root of effective-pack store (default: fixtures/extension/effective-pack-store)`;

export async function main(): Promise<void> {
  const args = parseArgs({
    options: {
      pack: { type: 'string', short: 'p' },
      title: { type: 'string', short: 't' },
      'source-root': { type: 'string' },
      case: { type: 'string' },
      manifest: { type: 'string' },
      run: { type: 'string' },
      // Resolution flags — STUB-001
      'track-family': { type: 'string' },
      'jurisdiction-family': { type: 'string' },
      'jurisdiction-id': { type: 'string' },
      'governing-as-of': { type: 'string' },
      'municipality-id': { type: 'string' },
      'fixture-root': { type: 'string' },
      'store-root': { type: 'string' },
    },
    allowPositionals: true,
  });

  const command = args.positionals[0];

  switch (command) {
    case 'init-case': {
      const packId = args.values['pack'];
      const title = args.values['title'];
      if (!packId || !title) {
        console.error('init-case requires --pack and --title');
        process.exit(1);
      }
      if (!VALID_PACK_IDS.includes(packId as PackId)) {
        console.error(`unknown packId: ${packId}`);
        process.exit(1);
      }
      const sourceRoot = resolve(args.values['source-root'] ?? './sources');
      const newCase = createCase({
        packId: packId as PackId,
        title,
        createdBy: 'operator',
        sourceRoot,
      });
      const caseDir = join('./cases', newCase.caseId);
      saveCase(newCase, caseDir);
      console.log(JSON.stringify(newCase, null, 2));
      break;
    }
    case 'run-case': {
      const casePath = args.values['case'];
      const packManifestPath = args.values['pack'];
      if (!casePath || !packManifestPath) {
        console.error('run-case requires --case and --pack');
        process.exit(1);
      }

      // STUB-001 + STUB-007: if resolution flags are present, build a ResolutionBundle.
      // The CLI loads family/modules/overlays using the canonical loaders, validates them,
      // and passes the pre-loaded data to runCase(). Layer 3 content flows in from outside.
      let resolution: ResolutionBundle | undefined = undefined;

      const trackFamily = args.values['track-family'];
      const jurisdictionFamily = args.values['jurisdiction-family'];
      const jurisdictionId = args.values['jurisdiction-id'];
      const governingAsOf = args.values['governing-as-of'];

      if (trackFamily && jurisdictionFamily && jurisdictionId && governingAsOf) {
        const fixtureRoot = resolve(args.values['fixture-root'] ?? 'fixtures/extension');
        const storeRoot = resolve(
          args.values['store-root'] ?? 'fixtures/extension/effective-pack-store',
        );

        // Load and validate jurisdiction family config — STUB-007 wiring
        const familyConfigPath = join(
          fixtureRoot,
          'jurisdiction-families',
          `${jurisdictionFamily}.json`,
        );
        const family = loadJurisdictionFamilyConfig(familyConfigPath);
        const familyValidation = validateJurisdictionFamilyConfig(family);
        if (!familyValidation.valid) {
          console.error(
            `jurisdiction family config validation failed: ${familyValidation.errors.join(', ')}`,
          );
          process.exit(1);
        }

        // Load and validate base standards modules — STUB-007 wiring
        const baseModulesDir = join(fixtureRoot, 'base-modules');
        const modules = loadBaseStandardsModulesFromDir(baseModulesDir);
        const modulesValidation = validateBaseStandardsModules(modules);
        if (!modulesValidation.valid) {
          console.error(
            `base standards modules validation failed: ${modulesValidation.errors.join(', ')}`,
          );
          process.exit(1);
        }

        // Load and validate tier overlays — STUB-007 wiring
        const overlaysDir = join(fixtureRoot, 'tier-overlays');
        const overlays = loadTierOverlaysFromDir(overlaysDir);
        const overlaysValidation = validateTierOverlays(overlays);
        if (!overlaysValidation.valid) {
          console.error(`tier overlays validation failed: ${overlaysValidation.errors.join(', ')}`);
          process.exit(1);
        }

        // Load pack manifest for packId
        const baseManifest = loadPack(resolve(packManifestPath));
        const packValidation = validatePack(baseManifest);
        if (!packValidation.valid) {
          console.error(`pack manifest validation failed: ${packValidation.errors.join(', ')}`);
          process.exit(1);
        }

        const resolutionInput: EffectivePackResolutionInput = {
          mode: 'new_case',
          caseId: '' as EffectivePackResolutionInput['caseId'], // filled by orchestrator
          runId: '' as EffectivePackResolutionInput['runId'], // filled by orchestrator
          packId: baseManifest.packId,
          trackFamilyId: trackFamily as EffectivePackResolutionInput['trackFamilyId'],
          jurisdictionFamilyId: jurisdictionFamily,
          jurisdictionId,
          governingAsOfDate: governingAsOf,
          operatorId: 'cli-operator',
          ...(args.values['municipality-id'] !== undefined && {
            municipalityId: args.values['municipality-id'],
          }),
        };

        resolution = {
          input: resolutionInput,
          family,
          modules,
          overlays,
          storeRoot,
        };

        console.log(`Resolution mode: effective-pack for ${jurisdictionId} ${trackFamily}`);
      }

      const result = await runCase({
        casePath: resolve(casePath),
        packManifestPath: resolve(packManifestPath),
        ...(resolution !== undefined && { resolution }),
      });
      console.log(
        JSON.stringify(
          {
            runId: result.run.runId,
            status: result.run.status,
            artifactRoot: result.artifactRoot,
            gates: result.gateResults.map((g) => ({ gate: g.gateName, passed: g.passed })),
          },
          null,
          2,
        ),
      );
      break;
    }
    case 'validate-pack': {
      const manifestPath = args.values['manifest'];
      if (!manifestPath) {
        console.error('validate-pack requires --manifest');
        process.exit(1);
      }
      const manifest = loadPack(resolve(manifestPath));
      const result = validatePack(manifest);
      console.log(JSON.stringify(result, null, 2));
      if (!result.valid) process.exit(1);
      break;
    }
    case 'validate-run': {
      const runDir = args.values['run'];
      if (!runDir) {
        console.error('validate-run requires --run');
        process.exit(1);
      }
      const { validateRunDir } = await import('../../scripts/run-validate.js');
      try {
        const result = validateRunDir(resolve(runDir));
        for (const gate of result.gateResults) {
          const status = gate.passed ? 'PASS' : 'FAIL';
          console.log(
            `[${status}] ${gate.gateName}${gate.errors.length > 0 ? ': ' + gate.errors.join(', ') : ''}`,
          );
        }
        console.log('\nRequired artifact check:');
        for (const a of result.artifactStatus) {
          console.log(`  [${a.present ? 'OK' : 'MISSING'}] ${a.name}`);
        }
        console.log(`\nrun:validate — ${result.allPassed ? 'PASS' : 'FAIL'}`);
        if (!result.allPassed) process.exit(1);
      } catch (err) {
        console.error(`validate-run ERROR — ${err instanceof Error ? err.message : String(err)}`);
        process.exit(1);
      }
      break;
    }
    case 'replay-run': {
      const { replayRun } = await import('./replay.js');
      const runDir = args.values['run'];
      if (!runDir) {
        console.error('replay-run requires --run');
        process.exit(1);
      }
      const result = replayRun(resolve(runDir));
      console.log(JSON.stringify(result, null, 2));
      break;
    }
    default: {
      console.log(USAGE);
      break;
    }
  }
}

main().catch(console.error);
