import type { CaseRecord } from '../types/index.js';
import type { PackId } from '../types/index.js';
import { randomUUID } from 'node:crypto';
import { writeFileSync, readFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
export interface CreateCaseInput {
  packId: PackId;
  title: string;
  createdBy: string;
  sourceRoot: string;
  externalCaseRef?: string;
  notes?: string;
}
export function createCase(input: CreateCaseInput): CaseRecord {
  return {
    caseId: randomUUID(),
    packId: input.packId,
    title: input.title,
    createdAt: new Date().toISOString(),
    createdBy: input.createdBy,
    actorMode: 'human_interface_first',
    sourceRoot: input.sourceRoot,
    ...(input.externalCaseRef !== undefined ? { externalCaseRef: input.externalCaseRef } : {}),
    ...(input.notes !== undefined ? { notes: input.notes } : {}),
  };
}
export function saveCase(caseRecord: CaseRecord, caseDir: string): void {
  mkdirSync(caseDir, { recursive: true });
  writeFileSync(join(caseDir, 'case.json'), JSON.stringify(caseRecord, null, 2));
}
export function loadCase(caseDir: string): CaseRecord {
  return JSON.parse(readFileSync(join(caseDir, 'case.json'), 'utf8')) as CaseRecord;
}
