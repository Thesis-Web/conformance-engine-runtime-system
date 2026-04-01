import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

import type {
  IngestedFile,
  Finding,
  Ask,
  RunRecord,
  CaseRecord,
  ComparisonPair,
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

type SeverityLevel = 'critical' | 'high' | 'medium' | 'low' | 'info';

const SEVERITY_ORDER: SeverityLevel[] = ['critical', 'high', 'medium', 'low', 'info'];

function writeJson(path: string, value: unknown): void {
  writeFileSync(path, JSON.stringify(value, null, 2), 'utf-8');
}

function countAcceptedFiles(files: IngestedFile[]): number {
  return files.filter((file) => file.contentAccepted).length;
}

function formatFindingSummary(findings: Finding[]): string[] {
  if (findings.length === 0) {
    return ['- None'];
  }

  return findings.map((finding) => `- ${finding.findingId}: ${finding.narrativeDescription}`);
}

function formatAskSummary(asks: Ask[]): string[] {
  if (asks.length === 0) {
    return ['- None'];
  }

  return asks.map((ask) => `- ${ask.askId}: ${ask.text}`);
}

function buildOutputBrief(input: ArtifactInput): string {
  const contradictions = input.allFindings.filter((finding) => finding.findingClass === 'CONTRA');
  const holes = input.allFindings.filter((finding) => finding.findingClass === 'HOLE');
  const ambiguities = input.allFindings.filter(
    (finding) => finding.findingClass === 'AMBIGUITY' || finding.escalationRequired,
  );

  const lines: string[] = [
    '# Output Brief',
    '',
    '## Case Summary',
    `- Case ID: ${input.caseRecord.caseId}`,
    `- Title: ${input.caseRecord.title}`,
    `- Created By: ${input.caseRecord.createdBy}`,
    '',
    '## Active Pack',
    `- Pack ID: ${input.run.packId}`,
    '',
    '## Run Metadata',
    `- Run ID: ${input.run.runId}`,
    `- Status: ${input.run.status}`,
    `- Started At: ${input.run.startedAt}`,
    `- Engine Version: ${input.run.engineVersion}`,
    `- Blueprint Version: ${input.run.blueprintVersion}`,
    `- Spec Version: ${input.run.specVersion}`,
    '',
    '## Source Inventory Summary',
    `- Total Files: ${input.ingestedFiles.length}`,
    `- Accepted Files: ${countAcceptedFiles(input.ingestedFiles)}`,
    `- Classification Results: ${input.classifications.length}`,
    '',
    '## Contradiction Summary',
    ...formatFindingSummary(contradictions),
    '',
    '## Hole Summary',
    ...formatFindingSummary(holes),
    '',
    '## Ambiguity Summary',
    ...formatFindingSummary(ambiguities),
    '',
    '## Ask Summary',
    ...formatAskSummary(input.asks),
    '',
    'OPERATOR NOTE: This output is not a certification, approval, or signoff. All findings require licensed engineer review.',
    '',
  ];

  return lines.join('\n');
}

function groupFindingsBySeverity(findings: Finding[]): Map<SeverityLevel, Finding[]> {
  const grouped = new Map<SeverityLevel, Finding[]>();

  for (const severity of SEVERITY_ORDER) {
    grouped.set(severity, []);
  }

  for (const finding of findings) {
    const bucket = grouped.get(finding.severity as SeverityLevel);
    if (bucket) {
      bucket.push(finding);
    }
  }

  return grouped;
}

function buildEngineerReviewPacket(input: ArtifactInput): string {
  const grouped = groupFindingsBySeverity(input.allFindings);
  const lines: string[] = ['# Engineer Review Packet', ''];

  for (const severity of SEVERITY_ORDER) {
    const findings = grouped.get(severity) ?? [];
    if (findings.length === 0) {
      continue;
    }

    lines.push(`## ${severity}`);
    lines.push('');

    for (const finding of findings) {
      lines.push(`### ${finding.findingId}`);
      lines.push(`- findingClass: ${finding.findingClass}`);
      lines.push(`- severity: ${finding.severity}`);
      lines.push(`- narrativeDescription: ${finding.narrativeDescription}`);
      lines.push(`- sourceARefId: ${finding.sourceARefId}`);
      lines.push(`- escalationRequired: ${finding.escalationRequired ? 'true' : 'false'}`);
      lines.push('');
    }
  }

  lines.push('## All Asks');
  lines.push('');

  if (input.asks.length === 0) {
    lines.push('- None');
  } else {
    for (const ask of input.asks) {
      lines.push(`- ${ask.askId}: ${ask.text}`);
    }
  }

  lines.push('');

  return lines.join('\n');
}

export function buildArtifacts(input: ArtifactInput): void {
  mkdirSync(input.run.artifactRoot, { recursive: true });

  writeJson(join(input.run.artifactRoot, '01-ingest-log.json'), {
    runId: input.run.runId,
    caseId: input.caseRecord.caseId,
    files: input.ingestedFiles,
  });

  writeJson(join(input.run.artifactRoot, '02-provenance-ledger.json'), {
    runId: input.run.runId,
    caseId: input.caseRecord.caseId,
    provenance: input.ingestedFiles.map((file) => ({
      fileId: file.fileId,
      sha256: file.sha256,
      storedPath: file.storedPath,
      ingestedAt: file.ingestedAt,
    })),
  });

  writeJson(join(input.run.artifactRoot, '03-source-inventory.json'), {
    runId: input.run.runId,
    sources: input.ingestedFiles.map((file) => ({
      fileId: file.fileId,
      originalFilename: file.originalFilename,
      sourceLane: file.sourceLane,
      contentAccepted: file.contentAccepted,
    })),
  });

  writeJson(join(input.run.artifactRoot, '04-classification-output.json'), {
    runId: input.run.runId,
    classifications: input.classifications,
  });

  writeJson(join(input.run.artifactRoot, '05-comparison-result-set.json'), {
    runId: input.run.runId,
    comparisonPairs: input.comparisonPairs,
  });

  writeJson(join(input.run.artifactRoot, '06-contradiction-log.json'), {
    runId: input.run.runId,
    contradictions: input.allFindings.filter((finding) => finding.findingClass === 'CONTRA'),
  });

  writeJson(join(input.run.artifactRoot, '07-hole-log.json'), {
    runId: input.run.runId,
    holes: input.allFindings.filter((finding) => finding.findingClass === 'HOLE'),
  });

  writeJson(join(input.run.artifactRoot, '08-ambiguity-queue.json'), {
    runId: input.run.runId,
    ambiguities: input.allFindings.filter(
      (finding) => finding.findingClass === 'AMBIGUITY' || finding.escalationRequired,
    ),
  });

  writeJson(join(input.run.artifactRoot, '09-ask-list.json'), {
    runId: input.run.runId,
    asks: input.asks,
  });

  writeFileSync(join(input.run.artifactRoot, '10-output-brief.md'), buildOutputBrief(input), 'utf-8');
  writeFileSync(
    join(input.run.artifactRoot, '11-engineer-review-packet.md'),
    buildEngineerReviewPacket(input),
    'utf-8',
  );
}
