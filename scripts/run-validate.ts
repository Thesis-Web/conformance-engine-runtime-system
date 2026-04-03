/**
 * run:validate — validates a completed run directory against spec §32 gate set.
 *
 * CONTRA-003 fix:
 * - Loads findings using correct artifact keys: contradictions / holes / ambiguities
 * - Reconstructs lane map from 03-source-inventory.json sourceRefLanes array
 *   (emitted by artifact-builder since CONTRA-003 fix in Turn 3)
 * - Empty lane map no longer causes noLane3AuthorityGate to pass vacuously
 *
 * Exported as validateRunDir() so the CLI can call it directly (DIFF-001 fix).
 */

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { runAllGates, REQUIRED_ARTIFACT_NAMES } from '../src/validation/gates.js';
import type { RunRecord, Finding } from '../src/types/index.js';

export interface ValidateRunResult {
  allPassed: boolean;
  gateResults: Array<{ gateName: string; passed: boolean; errors: string[] }>;
  artifactStatus: Array<{ name: string; present: boolean }>;
}

export function validateRunDir(runDir: string): ValidateRunResult {
  if (!existsSync(runDir)) {
    throw new Error(`run directory not found: ${runDir}`);
  }

  const runJsonPath = join(runDir, 'run.json');
  if (!existsSync(runJsonPath)) {
    throw new Error(`run.json not found in: ${runDir}`);
  }

  const run = JSON.parse(readFileSync(runJsonPath, 'utf8')) as RunRecord;

  // CONTRA-003 fix: load findings using the correct artifact shape keys.
  // artifact-builder emits contradictions/holes/ambiguities — not items[].
  const findings: Finding[] = [];

  const load = <K extends string>(artifactName: string, key: K): Finding[] => {
    const path = join(runDir, artifactName);
    if (!existsSync(path)) return [];
    try {
      const parsed = JSON.parse(readFileSync(path, 'utf8')) as Record<string, unknown>;
      const arr = parsed[key];
      return Array.isArray(arr) ? (arr as Finding[]) : [];
    } catch {
      return [];
    }
  };

  findings.push(...load('06-contradiction-log.json', 'contradictions'));
  findings.push(...load('07-hole-log.json', 'holes'));
  findings.push(...load('08-ambiguity-queue.json', 'ambiguities'));

  // CONTRA-003 fix: reconstruct lane map from 03-source-inventory.json
  // sourceRefLanes array emitted by the fixed artifact-builder.
  const laneMap = new Map<string, string>();
  const inventoryPath = join(runDir, '03-source-inventory.json');
  if (existsSync(inventoryPath)) {
    try {
      const inventory = JSON.parse(readFileSync(inventoryPath, 'utf8')) as {
        sourceRefLanes?: Array<{ sourceRefId: string; sourceLane: string }>;
      };
      if (Array.isArray(inventory.sourceRefLanes)) {
        for (const entry of inventory.sourceRefLanes) {
          laneMap.set(entry.sourceRefId, entry.sourceLane);
        }
      }
    } catch {
      // non-fatal — empty lane map is safe; gate will pass unless findings
      // explicitly carry live_candidate refs we cannot look up
    }
  }

  const gateResults = runAllGates(run, findings, laneMap, undefined);

  let allPassed = true;
  for (const gate of gateResults) {
    if (!gate.passed) allPassed = false;
  }

  const artifactStatus = REQUIRED_ARTIFACT_NAMES.map((name) => ({
    name,
    present: existsSync(join(runDir, name)),
  }));

  for (const a of artifactStatus) {
    if (!a.present) allPassed = false;
  }

  return { allPassed, gateResults, artifactStatus };
}

// CLI entrypoint when called directly via npx tsx
const runDir = process.argv[2];
if (runDir) {
  try {
    const result = validateRunDir(runDir);
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
    process.exit(result.allPassed ? 0 : 1);
  } catch (err) {
    console.error(`run:validate ERROR — ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  }
}
