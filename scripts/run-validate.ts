/**
 * run:validate — validates a completed run directory against spec §32 gate set.
 *
 * Usage: npx tsx scripts/run-validate.ts <run-directory>
 * Exits 0 if all gates pass, non-zero otherwise.
 */

import { existsSync } from 'node:fs';
import { runAllGates, REQUIRED_ARTIFACT_NAMES } from '../src/validation/gates.js';
import type { RunRecord, Finding } from '../src/types/index.js';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const runDir = process.argv[2];

if (!runDir) {
  console.error('run:validate — usage: npx tsx scripts/run-validate.ts <run-directory>');
  process.exit(1);
}

if (!existsSync(runDir)) {
  console.error(`run:validate — directory not found: ${runDir}`);
  process.exit(1);
}

const runJsonPath = join(runDir, 'run.json');
if (!existsSync(runJsonPath)) {
  console.error(`run:validate — run.json not found in: ${runDir}`);
  process.exit(1);
}

try {
  const run = JSON.parse(readFileSync(runJsonPath, 'utf8')) as RunRecord;

  // Load findings from artifact if present
  let findings: Finding[] = [];
  const findingArtifacts = [
    '06-contradiction-log.json',
    '07-hole-log.json',
    '08-ambiguity-queue.json',
  ];
  for (const name of findingArtifacts) {
    const path = join(runDir, name);
    if (existsSync(path)) {
      try {
        const parsed = JSON.parse(readFileSync(path, 'utf8')) as { items?: Finding[] };
        if (Array.isArray(parsed.items)) {
          findings = findings.concat(parsed.items);
        }
      } catch {
        // non-fatal — continue
      }
    }
  }

  const laneMap = new Map<string, string>();
  const gateResults = runAllGates(run, findings, laneMap, undefined);

  let allPassed = true;
  for (const gate of gateResults) {
    const status = gate.passed ? 'PASS' : 'FAIL';
    console.log(
      `[${status}] ${gate.gateName}${gate.errors.length > 0 ? ': ' + gate.errors.join(', ') : ''}`,
    );
    if (!gate.passed) allPassed = false;
  }

  // Artifact presence check reported separately for clarity
  console.log('\nRequired artifact check:');
  for (const name of REQUIRED_ARTIFACT_NAMES) {
    const present = existsSync(join(runDir, name));
    console.log(`  [${present ? 'OK' : 'MISSING'}] ${name}`);
    if (!present) allPassed = false;
  }

  console.log(`\nrun:validate — ${allPassed ? 'PASS' : 'FAIL'}`);
  process.exit(allPassed ? 0 : 1);
} catch (err) {
  console.error(`run:validate ERROR — ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
}
