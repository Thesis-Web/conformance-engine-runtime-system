import { describe, it, expect, afterEach } from 'vitest';
import { stripTimestamps, hashArtifact, replayRun, compareReplays } from '../../src/cli/replay.js';
import { writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';

const tmpDirs: string[] = [];

function makeTmpRunDir(): string {
  const dir = join(tmpdir(), `cers-replay-${randomUUID()}`);
  mkdirSync(dir, { recursive: true });
  tmpDirs.push(dir);
  return dir;
}

afterEach(() => {
  for (const dir of tmpDirs.splice(0, tmpDirs.length)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

it('stripTimestamps removes ISO datetime patterns', () => {
  const input = 'created at 2026-01-01T00:00:00.000Z done';
  const output = stripTimestamps(input);
  expect(output).toContain('TIMESTAMP_STRIPPED');
});

it('stripTimestamps is idempotent', () => {
  const input = 'time 2026-01-01T00:00:00.000Z again 2026-01-01T00:00:00.000Z';
  const once = stripTimestamps(input);
  const twice = stripTimestamps(once);
  expect(twice).toBe(once);
});

it('hashArtifact returns same hash for same content', () => {
  const dir = makeTmpRunDir();
  const filePath = join(dir, 'artifact.json');
  const content = '{"value":42}';

  writeFileSync(filePath, content, 'utf8');

  const hash1 = hashArtifact(filePath);
  const hash2 = hashArtifact(filePath);

  expect(hash1).toBe(hash2);
});

it('hashArtifact strips timestamps before hashing', () => {
  const dir = makeTmpRunDir();
  const filePath1 = join(dir, 'artifact1.json');
  const filePath2 = join(dir, 'artifact2.json');

  const content1 = '{"created":"2026-01-01T00:00:00.000Z","value":1}';
  const content2 = '{"created":"2026-01-02T12:34:56.789Z","value":1}';

  writeFileSync(filePath1, content1, 'utf8');
  writeFileSync(filePath2, content2, 'utf8');

  const hash1 = hashArtifact(filePath1);
  const hash2 = hashArtifact(filePath2);

  expect(hash1).toBe(hash2);
});

it('replayRun verifies a run directory with sufficient artifacts', () => {
  const dir = makeTmpRunDir();
  const runId = randomUUID();

  writeFileSync(join(dir, 'run.json'), JSON.stringify({ runId }), 'utf8');

  const artifactNames = [
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
  ];

  for (const name of artifactNames) {
    writeFileSync(join(dir, name), `content for ${name}`, 'utf8');
  }

  const result = replayRun(dir);

  expect(result.runId).toBe(runId);
  expect(result.artifactCount).toBe(artifactNames.length);
  expect(result.verified).toBe(true);
});

it('compareReplays reports match for identical directories', () => {
  const dir1 = makeTmpRunDir();
  const dir2 = makeTmpRunDir();
  const runId = randomUUID();

  const artifactNames = [
    '01-ingest-log.json',
    '02-provenance-ledger.json',
    '03-source-inventory.json',
    '04-classification-output.json',
    '05-comparison-result-set.json',
    '06-contradiction-log.json',
    '07-hole-log.json',
    '08-ambiguity-queue.json',
    '09-ask-list.json',
  ];

  for (const dir of [dir1, dir2]) {
    writeFileSync(join(dir, 'run.json'), JSON.stringify({ runId }), 'utf8');
    for (const name of artifactNames) {
      writeFileSync(join(dir, name), `same content for ${name}`, 'utf8');
    }
  }

  const comparison = compareReplays(dir1, dir2);

  expect(comparison.match).toBe(true);
  expect(comparison.diffs).toHaveLength(0);
});

it('compareReplays detects differing content between runs', () => {
  const dir1 = makeTmpRunDir();
  const dir2 = makeTmpRunDir();
  const runId1 = randomUUID();
  const runId2 = randomUUID();

  writeFileSync(join(dir1, 'run.json'), JSON.stringify({ runId: runId1 }), 'utf8');
  writeFileSync(join(dir2, 'run.json'), JSON.stringify({ runId: runId2 }), 'utf8');

  const name = '01-ingest-log.json';

  writeFileSync(join(dir1, name), 'content A', 'utf8');
  writeFileSync(join(dir2, name), 'content B', 'utf8');

  const comparison = compareReplays(dir1, dir2);

  expect(comparison.match).toBe(false);
  expect(comparison.diffs.length).toBeGreaterThan(0);
});
