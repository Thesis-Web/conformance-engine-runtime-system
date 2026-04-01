import { REQUIRED_ARTIFACT_NAMES } from '../src/validation/gates.js';

if (REQUIRED_ARTIFACT_NAMES.length !== 11) {
  console.error('FAIL: expected 11 artifact names, got ' + REQUIRED_ARTIFACT_NAMES.length);
  process.exit(1);
}

for (const artifactName of REQUIRED_ARTIFACT_NAMES) {
  console.log('OK: ' + artifactName);
}

console.log('artifact:validate PASS — ' + REQUIRED_ARTIFACT_NAMES.length + ' artifacts defined');
