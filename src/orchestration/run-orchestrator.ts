import { loadPack } from '../packs/pack-loader.js';
import { validatePack } from '../packs/pack-validator.js';
import { createRun, saveRun, updateRunStatus, loadRun } from './run-manager.js';
import { loadCase } from './case-manager.js';
import { transition } from './state-machine.js';
import { ingestFile, validateCaseSize } from '../core/ingest.js';
import { extractText } from '../core/extractor.js';
import { normalizeText, buildChunkId } from '../core/normalizer.js';
import { classifyDocument } from '../core/classifier.js';
import { buildArtifacts } from '../artifacts/artifact-builder.js';
import { generateAsks } from '../core/ask-generator.js';
import { runAllGates } from '../validation/gates.js';
import type { RunRecord, CaseRecord, SourceReference, Finding } from '../types/index.js';
import { readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';

export interface RunCaseInput {
  casePath: string;
  packManifestPath: string;
}

export interface RunCaseOutput {
  run: RunRecord;
  artifactRoot: string;
  gateResults: ReturnType<typeof runAllGates>;
}

type AcceptedIngestResult = {
  fileId: string;
  originalFilename: string;
  storedPath: string;
  contentAccepted: boolean;
};

type ClassifiedSourceReference = SourceReference & {
  resolvedDocClass: SourceReference['docClass'];
};

export async function runCase(input: RunCaseInput): Promise<RunCaseOutput> {
  const caseRecord: CaseRecord = loadCase(input.casePath);

  const pack = loadPack(input.packManifestPath);
  const packValidation = validatePack(pack);

  if (!packValidation) {
    throw new Error('invalid pack manifest');
  }

  const initialRun = createRun(caseRecord, join(input.casePath, 'runs'));
  saveRun(initialRun);

  const reloadedRun = loadRun(initialRun.artifactRoot);
  let run: RunRecord = reloadedRun;

  transition(run.status, 'ingesting');
  run = updateRunStatus(run, 'ingesting');
  saveRun(run);

  const sourceRoot = resolve(caseRecord.sourceRoot);
  const sourceFilenames = readdirSync(sourceRoot);
  const ingestedFiles = sourceFilenames.map((filename) =>
    ingestFile(join(sourceRoot, filename), caseRecord, run),
  );

  validateCaseSize(ingestedFiles);

  transition(run.status, 'ingested');
  run = updateRunStatus(run, 'ingested');
  saveRun(run);

  const acceptedFiles = ingestedFiles.filter(
    (file): file is AcceptedIngestResult => file.contentAccepted,
  );

  const sourceReferences: SourceReference[] = [];

  for (const file of acceptedFiles) {
    const extractedText = await extractText(file.storedPath);
    const normalizedText = normalizeText(extractedText);
    const chunks = normalizedText
      .split(/\n\s*\n/g)
      .map((chunk) => chunk.trim())
      .filter((chunk) => chunk.length > 0);

    const chunkSourceRefs =
      chunks.length > 0
        ? chunks.map((chunk, index) => ({
            sourceRefId: randomUUID(),
            fileId: file.fileId,
            docClass: 'STDREFERENCE' as SourceReference['docClass'],
            chunkOrdinal: index + 1,
            text: chunk,
            normalizedText: chunk,
            metadata: {
              chunkId: buildChunkId(file.fileId, index + 1),
              originalFilename: file.originalFilename,
            },
          }))
        : [
            {
              sourceRefId: randomUUID(),
              fileId: file.fileId,
              docClass: 'STDREFERENCE' as SourceReference['docClass'],
              chunkOrdinal: 1,
              text: normalizedText,
              normalizedText,
              metadata: {
                chunkId: buildChunkId(file.fileId, 1),
                originalFilename: file.originalFilename,
              },
            },
          ];

    sourceReferences.push(...chunkSourceRefs);
  }

  transition(run.status, 'classified');
  run = updateRunStatus(run, 'classified');
  saveRun(run);

  const classified: ClassifiedSourceReference[] = sourceReferences.map((sourceRef) => {
    const classification = classifyDocument(sourceRef, pack.classMap);

    return {
      ...sourceRef,
      resolvedDocClass: classification.docClass,
    };
  });

  const comparisonPairs: Array<{
    pairId: string;
    sourceARefId: string;
    sourceBRefId: string;
  }> = [];

  transition(run.status, 'compare_pairs_built');
  run = updateRunStatus(run, 'compare_pairs_built');
  saveRun(run);

  const pass1Result: {
    proposedFindings: Finding[];
    auditEntries: ReadonlyArray<string>;
  } = {
    proposedFindings: [],
    auditEntries: [],
  };

  transition(run.status, 'pass1_complete');
  run = updateRunStatus(run, 'pass1_complete');
  saveRun(run);

  const pass2Result: {
    proposedFindings: Finding[];
    auditEntries: ReadonlyArray<string>;
  } = {
    proposedFindings: [],
    auditEntries: [],
  };

  transition(run.status, 'pass2_complete');
  run = updateRunStatus(run, 'pass2_complete');
  saveRun(run);

  const findings: Finding[] = [];

  transition(run.status, 'rules_complete');
  run = updateRunStatus(run, 'rules_complete');
  saveRun(run);

  const asks = generateAsks([], pack);

  await buildArtifacts({
    run,
    caseRecord,
    pack,
    ingestedFiles,
    sourceReferences: classified,
    comparisonPairs,
    pass1Result,
    pass2Result,
    findings,
    asks,
  });

  transition(run.status, 'artifacts_built');
  run = updateRunStatus(run, 'artifacts_built');
  saveRun(run);

  const gateResults = runAllGates(run, [], new Map());

  transition(run.status, 'validated');
  run = updateRunStatus(run, 'validated');
  saveRun(run);

  transition(run.status, 'complete');
  run = updateRunStatus(run, 'complete');
  saveRun(run);

  return {
    run,
    artifactRoot: run.artifactRoot,
    gateResults,
  };
}
