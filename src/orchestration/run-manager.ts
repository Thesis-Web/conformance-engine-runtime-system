import type { RunRecord, CaseRecord, RunStatus } from '../types/index.js';
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
    // ext-spec §11.2 — initialize release state on creation
    releaseState: 'draft',
  };
}

/**
 * Persist extension resolution metadata onto a run record.
 * Called by the orchestrator after resolveEffectivePack() succeeds,
 * before the created→ingesting transition — ext-spec §11.3, §20.
 */
export function patchRunWithResolutionMetadata(
  run: RunRecord,
  metadata: {
    resolvedEffectivePackId: string;
    resolvedAt: string;
    resolvedBy: string;
    governingAsOfDate: string;
    compositionDigest: string;
    componentDigests: string[];
    tierPath: Array<{ tierType: string; tierId: string; parentTierId?: string }>;
  },
): RunRecord {
  return {
    ...run,
    resolvedEffectivePackId: metadata.resolvedEffectivePackId,
    resolvedAt: metadata.resolvedAt,
    resolvedBy: metadata.resolvedBy,
    governingAsOfDate: metadata.governingAsOfDate,
    compositionDigest: metadata.compositionDigest,
    componentDigests: metadata.componentDigests,
    tierPath: metadata.tierPath,
  };
}
export function saveRun(run: RunRecord): void {
  mkdirSync(run.artifactRoot, { recursive: true });
  writeFileSync(join(run.artifactRoot, 'run.json'), JSON.stringify(run, null, 2));
}
export function loadRun(runDir: string): RunRecord {
  return JSON.parse(readFileSync(join(runDir, 'run.json'), 'utf8')) as RunRecord;
}
export function updateRunStatus(run: RunRecord, status: RunStatus): RunRecord {
  return {
    ...run,
    status,
    ...(isTerminal(status) ? { completedAt: new Date().toISOString() } : {}),
  };
}
