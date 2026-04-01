import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

export interface ReplayResult {
  runId: string;
  artifactCount: number;
  verified: boolean;
}

export function replayRun(runDir: string): ReplayResult {
  const runRecord = JSON.parse(readFileSync(join(runDir, 'run.json'), 'utf8')) as { runId: string };
  const files = readdirSync(runDir);
  const artifacts = files.filter((f) => /^\d{2}-/.test(f));
  return { runId: runRecord.runId, artifactCount: artifacts.length, verified: artifacts.length >= 9 };
}

