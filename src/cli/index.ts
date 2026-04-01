import { parseArgs } from 'node:util';
import { resolve, join } from 'node:path';
import { createCase, saveCase, loadCase } from '../orchestration/case-manager.js';
import { loadPack, packExists } from '../packs/pack-loader.js';
import { validatePack } from '../packs/pack-validator.js';
import type { PackId } from '../types/index.js';

const VALID_PACK_IDS: ReadonlyArray<PackId> = [
  'pack-california-highrise-v1',
  'pack-california-appliance-refrig-v2',
  'pack-california-datacenter-v3',
];

const USAGE = `Usage:
  cers init-case   --pack <packId> --title <title> [--source-root <path>]
  cers run-case    --case <casePath> --pack <packId>
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
      const sourceRoot = args.values['source-root'] ?? './sources';
      const newCase = createCase({
        packId: packId as PackId,
        title,
        createdBy: 'operator',
        sourceRoot: resolve(sourceRoot),
      });
      const caseDir = join('./cases', newCase.caseId);
      saveCase(newCase, caseDir);
      console.log(JSON.stringify(newCase, null, 2));
      break;
    }
    case 'run-case': {
      console.log('run-case: stub — wiring pending pass adapters');
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
      console.log('validate-run: stub');
      break;
    }
    case 'replay-run': {
      console.log('replay-run: stub');
      break;
    }
    default: {
      console.log(USAGE);
      break;
    }
  }
}

main().catch(console.error);
