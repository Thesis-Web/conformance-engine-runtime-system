import { loadPack } from '../packs/pack-loader.js';
import { validatePack } from '../packs/pack-validator.js';
import { createRun, saveRun, updateRunStatus } from './run-manager.js';
import { loadCase, saveCase } from './case-manager.js';
import { transition } from './state-machine.js';
import { ingestFile, validateCaseSize } from '../core/ingest.js';
import { extractText } from '../core/extractor.js';
import { normalizeText, buildChunkId } from '../core/normalizer.js';
import { classifyDocument } from '../core/classifier.js';
import { buildArtifacts } from '../artifacts/artifact-builder.js';
import { generateAsks } from '../core/ask-generator.js';
import { runAllGates } from '../validation/gates.js';
import type { RunRecord, SourceReference, Finding, IngestedFile } from '../types/index.js';
import type { GateResult } from '../validation/gates.js';
import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';

export interface RunCaseInput {
  casePath: string;
  packManifestPath: string;
}

export interface RunCaseOutput {
  run: RunRecord;
  artifactRoot: string;
  gateResults: GateResult[];
}

export async function runCase(input: RunCaseInput): Promise<RunCaseOutput> {
  // Step 1: load case
  const caseRecord = loadCase(input.casePath);

  // Step 2: load and validate pack
  const pack = loadPack(input.packManifestPath);
  const packValidation = validatePack(pack);
  if (!packValidation.valid) {
    throw new Error(`pack validation failed: ${packValidation.errors.join(', ')}`);
  }

  // Step 3: create run
  let run = createRun(caseRecord, join(input.casePath, 'runs'));
  saveRun(run);

  // Step 4-5: ingest files
  transition(run.status, 'ingesting');
  run = updateRunStatus(run, 'ingesting');
  saveRun(run);

  const ingestedFiles: IngestedFile[] = [];
  try {
    const entries = readdirSync(caseRecord.sourceRoot);
    for (const entry of entries) {
      const filePath = join(caseRecord.sourceRoot, entry);
      const output = ingestFile({
        caseId: caseRecord.caseId,
        runId: run.runId,
        filePath,
        sourceLane: 'case_bound',
      });
      ingestedFiles.push(output.file);
    }
  } catch {
    // sourceRoot may not exist yet in POC — continue with empty ingest
  }

  if (!validateCaseSize(ingestedFiles)) {
    run = updateRunStatus(run, 'failed');
    saveRun(run);
    throw new Error('case size exceeds MAX_CASE_BYTES');
  }

  transition(run.status, 'ingested');
  run = updateRunStatus(run, 'ingested');
  saveRun(run);

  // Step 6: extract + normalize → build SourceReferences
  const sourceRefs: SourceReference[] = [];
  const classifications: Array<{ fileId: string; result: ReturnType<typeof classifyDocument> }> =
    [];

  for (const file of ingestedFiles) {
    if (!file.contentAccepted) continue;
    const extraction = extractText(file.storedPath, file.fileId);
    const normalizedText = normalizeText(extraction.rawText);
    const chunkOrdinal = 0;
    const sourceRef: SourceReference = {
      sourceRefId: randomUUID(),
      fileId: file.fileId,
      docClass: 'SPEC_SHEET', // will be overwritten by classification below
      chunkOrdinal,
      text: extraction.rawText,
      normalizedText,
      metadata: {
        parserVersion: extraction.parserVersion,
        usedOcrFallback: extraction.usedOcrFallback,
      },
    };

    // Step 7: classify
    const classResult = classifyDocument({
      filename: file.originalFilename,
      contentSnippet: normalizedText.slice(0, 500),
      classMapRules: pack.classMap,
    });

    sourceRefs.push({ ...sourceRef, docClass: classResult.docClass });
    classifications.push({ fileId: file.fileId, result: classResult });
  }

  transition(run.status, 'classified');
  run = updateRunStatus(run, 'classified');
  saveRun(run);

  // Step 8: build comparison pairs (stub — §17.7 wiring pending)
  const comparisonPairs = sourceRefs
    .flatMap((refA, i) =>
      sourceRefs.slice(i + 1).map((refB) => ({
        pairId: randomUUID(),
        runId: run.runId,
        packId: pack.packId,
        sourceARefId: refA.sourceRefId,
        sourceBRefId: refB.sourceRefId,
        comparisonType: 'parameter_match' as const,
        parameterKey: refA.docClass,
      })),
    )
    .slice(0, 50); // cap stub pairs

  transition(run.status, 'compare_pairs_built');
  run = updateRunStatus(run, 'compare_pairs_built');
  saveRun(run);

  // Steps 9-10: pass1 + pass2 — stubbed for human-as-interface-first POC
  const allFindings: Finding[] = [];
  transition(run.status, 'pass1_complete');
  run = updateRunStatus(run, 'pass1_complete');
  saveRun(run);

  transition(run.status, 'pass2_complete');
  run = updateRunStatus(run, 'pass2_complete');
  saveRun(run);

  // Step 11: deterministic rules (stub)
  transition(run.status, 'rules_complete');
  run = updateRunStatus(run, 'rules_complete');
  saveRun(run);

  // Step 12: ask generation
  const asks = generateAsks(allFindings, pack);

  // Steps 13-14: build artifacts
  buildArtifacts({
    run,
    caseRecord,
    ingestedFiles,
    classifications,
    comparisonPairs,
    allFindings,
    asks,
  });

  transition(run.status, 'artifacts_built');
  run = updateRunStatus(run, 'artifacts_built');
  saveRun(run);

  // Step 15: validation gates
  const laneMap = new Map(ingestedFiles.map((f) => [f.fileId, f.sourceLane]));
  const gateResults = runAllGates(run, allFindings, laneMap);

  transition(run.status, 'validated');
  run = updateRunStatus(run, 'validated');
  saveRun(run);

  // Steps 16-17: complete
  transition(run.status, 'complete');
  run = updateRunStatus(run, 'complete');
  saveRun(run);

  return { run, artifactRoot: run.artifactRoot, gateResults };
}
