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
  SourceReference,
} from '../types/index.js';
import type { ClassificationResult } from '../core/classifier.js';
import { REQUIRED_ARTIFACT_NAMES } from '../validation/gates.js';
export { REQUIRED_ARTIFACT_NAMES };

export interface ArtifactInput {
  run: RunRecord;
  caseRecord: CaseRecord;
  ingestedFiles: IngestedFile[];
  sourceRefs: SourceReference[];
  sourceRefLaneMap: ReadonlyMap<string, string>;
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

// §30.1 — emit one citation line per finding: sourceA ref + optional sourceB ref.
function citationLine(f: Finding): string {
  const b = f.sourceBRefId !== undefined ? ` | Source B: ${f.sourceBRefId}` : '';
  return `  - [${f.findingClass}/${f.findingId.slice(0, 8)}] Source A: ${f.sourceARefId}${b} — ${f.narrativeDescription.slice(0, 120)}`;
}

function buildOutputBrief(input: ArtifactInput): string {
  const contras = input.allFindings.filter((f) => f.findingClass === 'CONTRA');
  const holes = input.allFindings.filter((f) => f.findingClass === 'HOLE');
  const ambigs = input.allFindings.filter(
    (f) => f.findingClass === 'AMBIGUITY' || f.escalationRequired,
  );

  // CONTRA-OUTPUT-001 fix: spec §30.1 requires "citations per item" — each summary
  // section must include source citation lines, not aggregate counts alone.
  const contraLines = contras.length > 0 ? contras.map(citationLine) : ['  (none)'];
  const holeLines = holes.length > 0 ? holes.map(citationLine) : ['  (none)'];
  const ambigLines = ambigs.length > 0 ? ambigs.map(citationLine) : ['  (none)'];
  const askLines =
    input.asks.length > 0
      ? input.asks.map(
          (a) =>
            `  - [ASK/${a.askId.slice(0, 8)}] [${a.askType}] ${a.text.slice(0, 120)} (severity: ${a.severity})`,
        )
      : ['  (none)'];

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
    `Contradictions detected: ${contras.length}`,
    ...contraLines,
    `## Hole Summary`,
    `Holes detected: ${holes.length}`,
    ...holeLines,
    `## Ambiguity Summary`,
    `Ambiguities/Escalations: ${ambigs.length}`,
    ...ambigLines,
    `## Ask Summary`,
    `Asks: ${input.asks.length} | Required for clean output: ${input.asks.filter((a) => a.requiredForCleanOutput).length}`,
    ...askLines,
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
      // DIFF-PACKET-001 fix: spec §30.2 requires "citation references" as a first-class element
      lines.push(`#### Citations`);
      lines.push(`- Source A: \`${f.sourceARefId}\``);
      if (f.sourceBRefId !== undefined) lines.push(`- Source B: \`${f.sourceBRefId}\``);
      lines.push(`#### Narrative`);
      lines.push(`- ${f.narrativeDescription}`);
      if (f.resolutionPath !== undefined) lines.push(`- Resolution path: ${f.resolutionPath}`);
      const relatedAsks = input.asks.filter((a) => a.linkedFindingId === f.findingId);
      if (relatedAsks.length > 0) {
        lines.push(`#### Recommended Asks`);
        for (const a of relatedAsks) lines.push(`  - ASK [${a.askType}]: ${a.text}`);
      }
      lines.push('');
    }
  }

  // DIFF-PACKET-001 fix: spec §30.2 requires "deferred/operator notes" section
  const escalated = input.allFindings.filter((f) => f.escalationRequired);
  lines.push(`## Deferred / Operator Notes`);
  if (escalated.length > 0) {
    lines.push(
      `${escalated.length} finding(s) are escalated and require engineer resolution before output is considered clean.`,
    );
    for (const f of escalated) {
      lines.push(
        `- [${f.findingClass}/${f.findingId.slice(0, 8)}] ${f.narrativeDescription.slice(0, 100)}`,
      );
    }
  } else {
    lines.push(`No findings are currently escalated.`);
  }
  lines.push('');
  lines.push(
    `> This packet is not a certification, approval, or signoff. Engineer review and professional judgment are required.`,
  );

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

  // CONTRA-003 fix: emit sourceRefLanes array so run-validate and any
  // post-run gate check can reconstruct the sourceRefId → SourceLane map
  // without access to the in-memory sourceRefLaneMap from the run session.
  w('03-source-inventory.json', {
    runId: input.run.runId,
    sources: input.ingestedFiles.map((f) => ({
      fileId: f.fileId,
      originalFilename: f.originalFilename,
      sourceLane: f.sourceLane,
      contentAccepted: f.contentAccepted,
    })),
    sourceRefLanes: input.sourceRefs.map((ref) => ({
      sourceRefId: ref.sourceRefId,
      fileId: ref.fileId,
      sourceLane: input.sourceRefLaneMap.get(ref.sourceRefId) ?? 'case_bound',
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

// §27.2 — emitOperatorPrompt
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
