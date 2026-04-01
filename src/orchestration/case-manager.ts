import type { CaseRecord } from '../types/index.js';
import type { PackId } from '../types/index.js';
import { randomUUID } from 'node:crypto';
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve, join } from 'node:path';

export interface CreateCaseInput {
  packId: PackId;
  title: string;
  createdBy: string;
  sourceRoot: string;
  externalCaseRef?: string;
  notes?: string;
}

export function createCase(input: CreateCaseInput): CaseRecord {
  const caseId = randomUUID();
  const createdAt = new Date().toISOString();

  return {
    caseId,
    packId: input.packId,
    title: input.title,
    createdAt,
    createdBy: input.createdBy,
    actorMode: 'human_interface_first',
    sourceRoot: input.sourceRoot,
    ...(input.externalCaseRef !== undefined
      ? { externalCaseRef: input.externalCaseRef }
      : {}),
    ...(input.notes !== undefined ? { notes: input.notes } : {}),
  };
}

export function saveCase(caseRecord: CaseRecord, caseDir: string): void {
  const resolvedCaseDir = resolve(caseDir);

  if (!existsSync(resolvedCaseDir)) {
    mkdirSync(resolvedCaseDir, { recursive: true });
  }

  writeFileSync(
    join(resolvedCaseDir, 'case.json'),
    JSON.stringify(caseRecord, null, 2),
  );
}

export function loadCase(caseDir: string): CaseRecord {
  const casePath = join(resolve(caseDir), 'case.json');
  const raw = readFileSync(casePath, 'utf8');

  return JSON.parse(raw) as CaseRecord;
}
