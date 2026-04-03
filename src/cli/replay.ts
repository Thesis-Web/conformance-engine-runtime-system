import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';

export interface ReplayResult {
  runId: string;
  artifactCount: number;
  verified: boolean;
  artifactHashes: Record<string, string>;
}

export function stripTimestamps(content: string): string {
  return content.replace(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z/g, 'TIMESTAMP_STRIPPED');
}

export function hashArtifact(filePath: string): string {
  const raw = readFileSync(filePath, 'utf8');
  const stripped = stripTimestamps(raw);
  const hash = createHash('sha256');
  hash.update(stripped, 'utf8');
  return hash.digest('hex');
}

export function replayRun(runDir: string): ReplayResult {
  const runJsonPath = join(runDir, 'run.json');

  if (!existsSync(runJsonPath)) {
    throw new Error(`run.json not found in ${runDir}`);
  }

  const runRaw = readFileSync(runJsonPath, 'utf8');
  const run = JSON.parse(runRaw) as { runId: string };

  const allFiles = readdirSync(runDir);
  const artifactFiles = allFiles.filter((file) => {
    if (file === 'run.json') return false;
    if (!/^\d{2}-.*\.(json|md)$/.test(file)) return false;
    return true;
  });

  const artifactHashes: Record<string, string> = {};
  for (const file of artifactFiles) {
    const fullPath = join(runDir, file);
    artifactHashes[file] = hashArtifact(fullPath);
  }

  const artifactCount = artifactFiles.length;

  // DRIFT-002 fix: spec §29.1 requires 11 artifacts (01-11).
  // Previous threshold was >= 9, which allowed two missing required artifacts
  // and still returned verified: true. Threshold raised to match spec law.
  const verified = artifactCount >= 11;

  return {
    runId: run.runId,
    artifactCount,
    verified,
    artifactHashes,
  };
}

export function compareReplays(
  run1Dir: string,
  run2Dir: string,
): { match: boolean; diffs: string[] } {
  const replay1 = replayRun(run1Dir);
  const replay2 = replayRun(run2Dir);

  const files1 = new Set(Object.keys(replay1.artifactHashes));
  const files2 = new Set(Object.keys(replay2.artifactHashes));
  const allFiles = new Set<string>([...files1, ...files2]);
  const diffs: string[] = [];

  for (const file of allFiles) {
    const inFirst = files1.has(file);
    const inSecond = files2.has(file);

    if (!inFirst) {
      diffs.push(`missing in first run: ${file}`);
      continue;
    }

    if (!inSecond) {
      diffs.push(`missing in second run: ${file}`);
      continue;
    }

    const hash1 = replay1.artifactHashes[file];
    const hash2 = replay2.artifactHashes[file];

    if (hash1 !== hash2) {
      diffs.push(`hash mismatch for ${file}`);
    }
  }

  return {
    match: diffs.length === 0,
    diffs,
  };
}
