import type { RunRecord, CaseRecord } from '../types/index.js';
import type { RunStatus } from '../types/index.js';
import { randomUUID } from 'node:crypto';
import { writeFileSync, readFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { isTerminal } from './state-machine.js';

export function createRun(caseRecord: CaseRecord, artifactRoot: string): RunRecord {
  const runId = randomUUID();

  return {
    runId,
    caseId: caseRecord.caseId,
    packId: caseRecord.packId,
    status: 'created',
    startedAt: new Date().toISOString(),
    engineVersion: '0.1.0',
    blueprintVersion: '1-2-2',
    specVersion: '1-2-2',
    operatorMode: 'manual_prompt_bridge',
    artifactRoot: join(artifactRoot, runId),
  };
}

export function saveRun(run: RunRecord): void {
  mkdirSync(run.artifactRoot, { recursive: true });
  writeFileSync(join(run.artifactRoot, 'run.json'), JSON.stringify(run, null, 2));
}

export function updateRunStatus(run: RunRecord, status: RunStatus): RunRecord {
  return {
    ...run,
    status,
    ...(isTerminal(status) ? { completedAt: new Date().toISOString() } : {}),
  };
}
