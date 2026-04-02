import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import type {
  IngestedFile,
  Finding,
  Ask,
  RunRecord,
  CaseRecord,
  ComparisonPair,
  OperatorPrompt,
} from '../types/index.js';
import type { ClassificationResult } from '../core/classifier.js';
import { REQUIRED_ARTIFACT_NAMES } from '../validation/gates.js';
export { REQUIRED_ARTIFACT_NAMES };

export interface ArtifactInput {
  run: RunRecord;
  caseRecord: CaseRecord;
  ingestedFiles: IngestedFile[];
  classifications: Array<{ fileId: string; result: ClassificationResult }>;
  comparisonPairs: ComparisonPair[];
  allFindings: Finding[];
  asks: Ask[];
}

const SEVERITY_ORDER: ReadonlyArray<Finding['severity']> = [
  'critical',
  'high',
  'medium',
  'low',
  'info',
];

function buildOutputBrief(input: ArtifactInput): string {
  const contras = input.allFindings.filter((f) => f.findingClass === 'CONTRA');
  const holes = input.allFindings.filter((f) => f.findingClass === 'HOLE');
  const ambigs = input.allFindings.filter(
    (f) => f.findingClass === 'AMBIGUITY' || f.escalationRequired,
  );
  return [
    `# CERS Output Brief`,
    `## Case Summary`,
    `Case: ${input.caseRecord.caseId} | ${input.caseRecord.title}`,
    `## Active Pack`,
    `Pack: ${input.run.packId}`,
    `## Run Metadata`,
    `Run: ${input.run.runId} | Status: ${input.run.status} | Started: ${input.run.startedAt}`,
    `## Source Inventory Summary`,
    `Files ingested: ${input.ingestedFiles.length} | Accepted: ${input.ingestedFiles.filter((f) => f.contentAccepted).length}`,
    `## Contradiction Summary`,
    `Contradictions: ${contras.length}`,
    `## Hole Summary`,
    `Holes: ${holes.length}`,
    `## Ambiguity Summary`,
    `Ambiguities/Escalations: ${ambigs.length}`,
    `## Ask Summary`,
    `Asks: ${input.asks.length} | Required for clean output: ${input.asks.filter((a) => a.requiredForCleanOutput).length}`,
    ``,
    `> OPERATOR NOTE: This output is not a certification, approval, or signoff. All findings require licensed engineer review.`,
  ].join('\n');
}

function buildEngineerPacket(input: ArtifactInput): string {
  const lines: string[] = ['# CERS Engineer Review Packet', ''];
  for (const sev of SEVERITY_ORDER) {
    const group = input.allFindings.filter((f) => f.severity === sev);
    if (group.length === 0) continue;
    lines.push(`## ${sev.toUpperCase()} Findings (${group.length})`);
    for (const f of group) {
      lines.push(`### ${f.findingClass} — ${f.findingId}`);
      lines.push(
        `- Severity: ${f.severity} | Class: ${f.confidenceClass} | Escalated: ${f.escalationRequired}`,
      );
      lines.push(
        `- Source A: ${f.sourceARefId}${f.sourceBRefId !== undefined ? ` | Source B: ${f.sourceBRefId}` : ''}`,
      );
      lines.push(`- ${f.narrativeDescription}`);
      const relatedAsks = input.asks.filter((a) => a.linkedFindingId === f.findingId);
      for (const a of relatedAsks) lines.push(`  - ASK [${a.askType}]: ${a.text}`);
      lines.push('');
    }
  }
  return lines.join('\n');
}

export function buildArtifacts(input: ArtifactInput): void {
  mkdirSync(input.run.artifactRoot, { recursive: true });
  const w = (name: string, data: unknown) =>
    writeFileSync(join(input.run.artifactRoot, name), JSON.stringify(data, null, 2));
  w('01-ingest-log.json', {
    runId: input.run.runId,
    caseId: input.caseRecord.caseId,
    files: input.ingestedFiles,
  });
  w('02-provenance-ledger.json', {
    runId: input.run.runId,
    caseId: input.caseRecord.caseId,
    provenance: input.ingestedFiles.map((f) => ({
      fileId: f.fileId,
      sha256: f.sha256,
      storedPath: f.storedPath,
      ingestedAt: f.ingestedAt,
    })),
  });
  w('03-source-inventory.json', {
    runId: input.run.runId,
    sources: input.ingestedFiles.map((f) => ({
      fileId: f.fileId,
      originalFilename: f.originalFilename,
      sourceLane: f.sourceLane,
      contentAccepted: f.contentAccepted,
    })),
  });
  w('04-classification-output.json', {
    runId: input.run.runId,
    classifications: input.classifications,
  });
  w('05-comparison-result-set.json', {
    runId: input.run.runId,
    comparisonPairs: input.comparisonPairs,
  });
  w('06-contradiction-log.json', {
    runId: input.run.runId,
    contradictions: input.allFindings.filter((f) => f.findingClass === 'CONTRA'),
  });
  w('07-hole-log.json', {
    runId: input.run.runId,
    holes: input.allFindings.filter((f) => f.findingClass === 'HOLE'),
  });
  w('08-ambiguity-queue.json', {
    runId: input.run.runId,
    ambiguities: input.allFindings.filter(
      (f) => f.findingClass === 'AMBIGUITY' || f.escalationRequired,
    ),
  });
  w('09-ask-list.json', { runId: input.run.runId, asks: input.asks });
  writeFileSync(join(input.run.artifactRoot, '10-output-brief.md'), buildOutputBrief(input));
  writeFileSync(
    join(input.run.artifactRoot, '11-engineer-review-packet.md'),
    buildEngineerPacket(input),
  );
}

// §27.2 — emitOperatorPrompt: writes 12-operator-prompt.json when the runtime
// needs human bridge input. Blocking=true means the run cannot safely proceed
// without operator action.
export interface OperatorPromptInput {
  runId: string;
  step: string;
  reason: string;
  requiredInputShape: Record<string, string>;
  blocking: boolean;
  artifactRoot: string;
}

export function emitOperatorPrompt(input: OperatorPromptInput): OperatorPrompt {
  const prompt: OperatorPrompt = {
    promptId: randomUUID(),
    runId: input.runId,
    step: input.step,
    reason: input.reason,
    requiredInputShape: input.requiredInputShape,
    blocking: input.blocking,
  };
  writeFileSync(
    join(input.artifactRoot, '12-operator-prompt.json'),
    JSON.stringify(prompt, null, 2),
  );
  return prompt;
}
