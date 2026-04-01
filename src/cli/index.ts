import { parseArgs } from 'node:util';
import { resolve } from 'node:path';
import { createCase, saveCase } from '../orchestration/case-manager.js';
import { loadPack, validatePack } from '../packs/pack-validator.js'; // corrected import path per prior build

export async function main(): Promise<void> {
  const args = parseArgs({
    options: {
      pack: { type: 'string', short: 'p' },
      title: { type: 'string', short: 't' },
      'source-root': { type: 'string' },
      case: { type: 'string' },
      manifest: { type: 'string' },
      run: { type: 'string' }
    },
    allowPositionals: true
  });

  const command = args.positionals[0];

  switch (command) {
    case 'init-case': {
      if (!args.values.pack || !args.values.title) {
        console.error('Usage: cers init-case --pack <packId> --title <title> [--source-root <path>]');
        process.exit(1);
      }
      const newCase = createCase(args.values.pack as any, args.values.title, args.values['source-root'] || './sources');
      saveCase(newCase);
      console.log(JSON.stringify(newCase, null, 2));
      break;
    }

    case 'run-case': {
      if (!args.values.case || !args.values.pack) {
        console.error('Usage: cers run-case --case <casePath> --pack <packId>');
        process.exit(1);
      }
      console.log('run-case: stub — wiring pending pass adapters');
      break;
    }

    case 'validate-pack': {
      if (!args.values.manifest) {
        console.error('Usage: cers validate-pack --manifest <path>');
        process.exit(1);
      }
      try {
        const manifest = loadPack(args.values.manifest);
        const result = validatePack(manifest);
        console.log(JSON.stringify(result, null, 2));
      } catch (e) {
        console.error('Validation failed:', (e as Error).message);
      }
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

    default:
      console.log(`CERS CLI v0.1.0
Usage:
  cers init-case --pack <packId> --title <title> [--source-root <path>]
  cers run-case --case <casePath> --pack <packId>
  cers validate-pack --manifest <path>
  cers validate-run --run <runDir>
  cers replay-run --run <runDir>`);
  }
}

main().catch(console.error);
