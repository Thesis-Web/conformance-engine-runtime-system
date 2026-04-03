import { parseArgs } from 'node:util';
import { resolve, join } from 'node:path';
import { createCase, saveCase } from '../orchestration/case-manager.js';
import { loadPack, packExists } from '../packs/pack-loader.js';
import { validatePack } from '../packs/pack-validator.js';
import { runCase } from '../orchestration/run-orchestrator.js';
import type { PackId } from '../types/index.js';

const VALID_PACK_IDS: ReadonlyArray<PackId> = [
  'pack-california-highrise-v1',
  'pack-california-appliance-refrig-v2',
  'pack-california-datacenter-v3',
];

const USAGE = `Usage:
  cers init-case   --pack <packId> --title <title> [--source-root <path>]
  cers run-case    --case <casePath> --pack <packManifestPath>
  cers validate-pack --manifest <path>
  cers validate-run  --run <runDir>
  cers replay-run    --run <runDir>`;

export async function main(): Promise<void> {
  const args = parseArgs({
    options: {
      pack: { type: 'string', short: 'p' },
      title: { type: 'string', short: 't' },
      'source-root': { type: 'string' },
      case: { type: 'string' },
      manifest: { type: 'string' },
      run: { type: 'string' },
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
      const result = await runCase({
        casePath: resolve(casePath),
        packManifestPath: resolve(packManifestPath),
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
      // DIFF-001 fix: was a stub. Now calls validateRunDir() from run-validate.ts.
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
