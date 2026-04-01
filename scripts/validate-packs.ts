import { loadPack } from '../src/packs/pack-loader.js';
import { validatePack } from '../src/packs/pack-validator.js';

const packs = [
  'fixtures/pack-v1/manifest.json',
  'fixtures/pack-v2/manifest.json',
  'fixtures/pack-v3/manifest.json',
];

let pass = true;

for (const packPath of packs) {
  const manifest = loadPack(packPath);
  const result = validatePack(manifest);

  if (!result.valid) {
    console.error('FAIL: ' + packPath + ' ' + result.errors.join(','));
    pass = false;
  } else {
    console.log('OK: ' + packPath);
  }
}

if (!pass) {
  process.exit(1);
}

console.log('pack:validate PASS');
