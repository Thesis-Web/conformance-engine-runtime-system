import { loadPack } from '../packs/pack-loader.js';
import { validatePack } from '../packs/pack-validator.js';
import { createRun, saveRun, updateRunStatus } from './run-manager.js';
import { loadCase } from './case-manager.js';
import { transition } from './state-machine.js';
import { ingestFile, validateCaseSize } from '../core/ingest.js';
import { extractText } from '../core/extractor.js';
import { chunkText } from '../core/chunker.js';
import { classifyDocument } from '../core/classifier.js';
import { buildComparisonPairs } from '../core/compare.js';
import { buildArtifacts, emitOperatorPrompt } from '../artifacts/artifact-builder.js';
import { generateAsks } from '../core/ask-generator.js';
import { runAllGates } from '../validation/gates.js';
import { runPass1 } from '../core/pass1-adapter.js';
import { runPass2 } from '../core/pass2-adapter.js';
import { applyDeterministicRules } from '../contract/rules-engine.js';
import {
  mergeFindingSets,
  type Pass1Output,
  type Pass2Output,
  type RulesOutput,
} from '../core/finding-merge.js';
import type { RunRecord, SourceReference, Finding, IngestedFile } from '../types/index.js';
import type { GateResult } from '../validation/gates.js';
import { readdirSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

export interface RunCaseInput {
  casePath: string;
  packManifestPath: string;
}

export interface RunCaseOutput {
  run: RunRecord;
  artifactRoot: string;
  gateResults: GateResult[];
}

function writeFailureLog(artifactRoot: string, runId: string, stage: string, err: unknown): void {
  try {
    mkdirSync(artifactRoot, { recursive: true });
    const log = {
      runId,
      stage,
      failureCode: 'RUNTIME_ERROR',
      failureMessage: String(err),
      stackSummary: err instanceof Error ? (err.stack ?? '') : '',
      safeOperatorNextStep: `Review stage '${stage}' and retry with a new run.`,
    };
    writeFileSync(join(artifactRoot, '00-failure-log.json'), JSON.stringify(log, null, 2));
  } catch {
    // best-effort
  }
}

export async function runCase(input: RunCaseInput): Promise<RunCaseOutput> {
  const caseRecord = loadCase(input.casePath);
  const pack = loadPack(input.packManifestPath);
  const packValidation = validatePack(pack);
  if (!packValidation.valid) {
    throw new Error(`pack validation failed: ${packValidation.errors.join(', ')}`);
  }

  let run = createRun(caseRecord, join(input.casePath, 'runs'));
  saveRun(run);

  try {
    // Steps 4-5: ingest
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
      /* sourceRoot may not exist in POC */
    }

    if (!validateCaseSize(ingestedFiles)) {
      throw new Error('case size exceeds MAX_CASE_BYTES');
    }
    transition(run.status, 'ingested');
    run = updateRunStatus(run, 'ingested');
    saveRun(run);

    // Steps 6-7: extract, normalize via chunker (§14 + §15), classify
    // §14.3 — chunking is deterministic and governs SourceReference production
    const sourceRefs: SourceReference[] = [];
    const classifications: Array<{ fileId: string; result: ReturnType<typeof classifyDocument> }> =
      [];
    for (const file of ingestedFiles) {
      if (!file.contentAccepted) continue;
      const extraction = extractText(file.storedPath, file.fileId);

      // Classify first so chunker can use the correct docClass
      const classResult = classifyDocument({
        filename: file.originalFilename,
        contentSnippet: extraction.rawText.slice(0, 500),
        classMapRules: pack.classMap,
      });
      classifications.push({ fileId: file.fileId, result: classResult });

      // §14.3 — chunk into governed SourceReferences using canonical chunker
      const chunks = chunkText(extraction.rawText, file.fileId, classResult.docClass);

      // Attach extraction metadata to each chunk's metadata
      for (const chunk of chunks) {
        sourceRefs.push({
          ...chunk,
          metadata: {
            ...chunk.metadata,
            parserVersion: extraction.parserVersion,
            usedOcrFallback: extraction.usedOcrFallback,
          },
        });
      }
    }
    transition(run.status, 'classified');
    run = updateRunStatus(run, 'classified');
    saveRun(run);

    // Step 8: §17.7 canonical buildComparisonPairs — not a stub cross-product
    const comparisonPairs = buildComparisonPairs(sourceRefs, pack, run);
    transition(run.status, 'compare_pairs_built');
    run = updateRunStatus(run, 'compare_pairs_built');
    saveRun(run);

    // Step 9: Pass 1 — BEST-SOLVE-001: map Pass1RawOutput.proposedFindings → Pass1Output.findings
    let pass1Out: Pass1Output = { findings: [], extractionNotes: [] };
    try {
      const raw = await runPass1({ run, sourceRefs, pack });
      pass1Out = { findings: raw.proposedFindings, extractionNotes: raw.extractionNotes };
    } catch (err) {
      pass1Out = { findings: [], extractionNotes: [`pass1 error: ${String(err)}`] };
    }
    transition(run.status, 'pass1_complete');
    run = updateRunStatus(run, 'pass1_complete');
    saveRun(run);

    // Step 10: Pass 2
    let pass2Out: Pass2Output = { auditEntries: [], auditCommentary: 'pass2 stub' };
    try {
      pass2Out = await runPass2({ run, pass1: pass1Out, sourceRefs, pack });
    } catch (err) {
      pass2Out = { auditEntries: [], auditCommentary: `pass2 error: ${String(err)}` };
    }
    transition(run.status, 'pass2_complete');
    run = updateRunStatus(run, 'pass2_complete');
    saveRun(run);

    // Step 11: Deterministic rules — wired per HOLE-009
    let rulesFindings: Finding[] = [];
    try {
      rulesFindings = applyDeterministicRules({
        run,
        pairs: comparisonPairs,
        findings: pass1Out.findings,
        pack,
      });
    } catch (err) {
      rulesFindings = [];
    }
    const rulesOut: RulesOutput = { findings: rulesFindings };
    transition(run.status, 'rules_complete');
    run = updateRunStatus(run, 'rules_complete');
    saveRun(run);

    // Step 12: Merge — wired per HOLE-010
    const merged = mergeFindingSets(pass1Out, pass2Out, rulesOut);
    const allFindings = merged.findings;

    // Step 13: asks
    const asks = generateAsks(allFindings, pack);

    // §27.2 — emit operator-prompt artifact if any findings require escalation.
    // In human-as-interface-first mode this signals the operator that manual
    // review is needed before the run output can be treated as clean.
    const escalatedFindings = allFindings.filter((f) => f.escalationRequired);
    if (escalatedFindings.length > 0) {
      mkdirSync(run.artifactRoot, { recursive: true });
      emitOperatorPrompt({
        runId: run.runId,
        step: 'post-merge-escalation-review',
        reason: `${escalatedFindings.length} finding(s) require engineer review before output is considered clean.`,
        requiredInputShape: {
          reviewedFindingIds: 'comma-separated list of findingId values reviewed',
          engineerDecision: 'accepted | rejected | deferred per finding',
          notes: 'free-form engineer notes',
        },
        blocking: true,
        artifactRoot: run.artifactRoot,
      });
    }

    // Steps 14-15: artifacts + gates
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

    const laneMap = new Map(ingestedFiles.map((f) => [f.fileId, f.sourceLane]));
    const gateResults = runAllGates(run, allFindings, laneMap, pack);
    transition(run.status, 'validated');
    run = updateRunStatus(run, 'validated');
    saveRun(run);

    // Steps 16-17: complete
    transition(run.status, 'complete');
    run = updateRunStatus(run, 'complete');
    saveRun(run);

    return { run, artifactRoot: run.artifactRoot, gateResults };
  } catch (err) {
    const failedRun = updateRunStatus(run, 'failed');
    writeFailureLog(run.artifactRoot, run.runId, run.status, err);
    saveRun({ ...failedRun, failureReason: String(err) });
    throw err;
  }
}
