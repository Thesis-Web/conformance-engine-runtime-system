/**
 * replay:smoke — §31.3 deterministic replay gate runner.
 *
 * Builds a canonical artifact set from fixtures, runs replayRun() twice on
 * identical content with different timestamps, and asserts the artifact hashes
 * match after timestamp stripping. Exits non-zero on any failure so ci:gate
 * step 8 fails correctly.
 */

import { mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';
import { replayRun, compareReplays } from '../src/cli/replay.js';

const REQUIRED_ARTIFACTS = [
  '01-ingest-log.json',
  '02-provenance-ledger.json',
  '03-source-inventory.json',
  '04-classification-output.json',
  '05-comparison-result-set.json',
  '06-contradiction-log.json',
  '07-hole-log.json',
  '08-ambiguity-queue.json',
  '09-ask-list.json',
  '10-output-brief.md',
  '11-engineer-review-packet.md',
] as const;

function makeRunDir(runId: string, ts: string): string {
  const dir = join(tmpdir(), `cers-smoke-${randomUUID()}`);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'run.json'), JSON.stringify({ runId, startedAt: ts }), 'utf8');
  for (const name of REQUIRED_ARTIFACTS) {
    const content = JSON.stringify({
      artifact: name,
      runId,
      generatedAt: ts,
      label: 'Internal triage metric — not a conformance determination.',
      items: [],
    });
    writeFileSync(join(dir, name), content, 'utf8');
  }
  return dir;
}

let dir1: string | undefined;
let dir2: string | undefined;

try {
  const runId = randomUUID();
  dir1 = makeRunDir(runId, '2026-01-01T00:00:00.000Z');
  dir2 = makeRunDir(runId, '2026-06-15T12:34:56.789Z');

  const result1 = replayRun(dir1);
  const result2 = replayRun(dir2);

  if (!result1.verified) {
    throw new Error(
      `replay:smoke FAIL — dir1 verified=false, artifactCount=${result1.artifactCount}`,
    );
  }
  if (!result2.verified) {
    throw new Error(
      `replay:smoke FAIL — dir2 verified=false, artifactCount=${result2.artifactCount}`,
    );
  }
  if (result1.artifactCount !== REQUIRED_ARTIFACTS.length) {
    throw new Error(
      `replay:smoke FAIL — expected ${REQUIRED_ARTIFACTS.length} artifacts, got ${result1.artifactCount}`,
    );
  }

  const comparison = compareReplays(dir1, dir2);
  if (!comparison.match) {
    throw new Error(
      `replay:smoke FAIL — hash mismatch after timestamp strip:\n${comparison.diffs.join('\n')}`,
    );
  }

  for (const name of REQUIRED_ARTIFACTS) {
    if (!(name in result1.artifactHashes)) {
      throw new Error(`replay:smoke FAIL — required artifact missing from hash map: ${name}`);
    }
  }

  console.log(
    `replay:smoke PASS — ${result1.artifactCount} artifacts verified, hashes match across timestamp-differing runs`,
  );
  process.exit(0);
} catch (err) {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
} finally {
  for (const dir of [dir1, dir2]) {
    if (dir && existsSync(dir)) rmSync(dir, { recursive: true, force: true });
  }
}
