import type { RunRecord, Finding } from '../types/index.js';
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

export interface GateResult {
  passed: boolean;
  gateName: string;
  errors: string[];
}

export const FORBIDDEN_CERT_PHRASES: ReadonlyArray<string> = [
  'approved',
  'certified by engine',
  'passes authority review',
  'this system certifies',
] as const;

export const REQUIRED_ARTIFACT_NAMES: ReadonlyArray<string> = [
  '01-ingest-log.json',
  '02-provenance-ledger.json',
  '03-source-inventory.json',
  '04-classification-output.json',
  '05-comparison-result-set.json',
  '06-contradiction-log.json',
  '07-hole-log.json',
  '08-ambiguity-queue.json',
  '09-ask-list.json',
  '10-output-brief.md',
  '11-engineer-review-packet.md',
] as const;

function confidenceValues(finding: Finding): ReadonlyArray<number> {
  return [
    finding.extractionConfidence,
    finding.classificationConfidence,
    finding.contradictionConfidence,
    finding.applicabilityConfidence,
    finding.sourceAuthorityConfidence,
  ];
}

export function noCertificationLanguageGate(text: string): GateResult {
  const normalized = text.toLowerCase();
  const errors = FORBIDDEN_CERT_PHRASES.filter((phrase) =>
    normalized.includes(phrase),
  ).map((phrase) => `forbidden certification phrase found: ${phrase}`);

  return {
    passed: errors.length === 0,
    gateName: 'no-certification-language',
    errors,
  };
}

export function confidenceRangeGate(findings: Finding[]): GateResult {
  const errors: string[] = [];

  for (const finding of findings) {
    const values = confidenceValues(finding);

    for (const value of values) {
      if (value < 0 || value > 1) {
        errors.push(
          `finding ${finding.findingId} has confidence value outside [0,1]: ${String(value)}`,
        );
      }
    }
  }

  return {
    passed: errors.length === 0,
    gateName: 'confidence-range',
    errors,
  };
}

export function noLane3AuthorityGate(
  findings: Finding[],
  laneMap: Map<string, string>,
): GateResult {
  const errors: string[] = [];

  for (const finding of findings) {
    const sourceALane = laneMap.get(finding.sourceARefId);
    if (sourceALane === 'live_candidate') {
      errors.push(
        `finding ${finding.findingId} references live_candidate in sourceARefId`,
      );
    }

    if (finding.sourceBRefId !== undefined) {
      const sourceBLane = laneMap.get(finding.sourceBRefId);
      if (sourceBLane === 'live_candidate') {
        errors.push(
          `finding ${finding.findingId} references live_candidate in sourceBRefId`,
        );
      }
    }
  }

  return {
    passed: errors.length === 0,
    gateName: 'no-lane3-authority',
    errors,
  };
}

export function artifactPresenceGate(
  artifactRoot: string,
  required: ReadonlyArray<string>,
): GateResult {
  const errors = required
    .filter((filename) => !existsSync(join(artifactRoot, filename)))
    .map((filename) => `missing required artifact: ${filename}`);

  return {
    passed: errors.length === 0,
    gateName: 'artifact-presence',
    errors,
  };
}

export function artifactFilenameGate(artifactRoot: string): GateResult {
  const files = readdirSync(artifactRoot);
  const candidatePattern = /^(0[0-9]|1[0-5])-[A-Za-z0-9-]+\.(json|md)$/;
  const allowedNames = new Set<string>([
    ...REQUIRED_ARTIFACT_NAMES,
    '00-failure-log.json',
    '12-operator-prompt.json',
    '13-pass1-raw-findings.json',
    '14-pass2-audit-findings.json',
    '15-validation-report.json',
  ]);

  const errors = files
    .filter((file) => /^(0[0-9]|1[0-5])-/.test(file))
    .flatMap((file) => {
      const fileErrors: string[] = [];

      if (!candidatePattern.test(file)) {
        fileErrors.push(`artifact filename does not match required pattern: ${file}`);
      }

      if (!allowedNames.has(file)) {
        fileErrors.push(`artifact filename not allowed by spec: ${file}`);
      }

      return fileErrors;
    });

  return {
    passed: errors.length === 0,
    gateName: 'artifact-filename',
    errors,
  };
}

export function runAllGates(
  run: RunRecord,
  findings: Finding[],
  laneMap: Map<string, string>,
): GateResult[] {
  return [
    noCertificationLanguageGate(run.runId),
    confidenceRangeGate(findings),
    noLane3AuthorityGate(findings, laneMap),
    artifactPresenceGate(run.artifactRoot, REQUIRED_ARTIFACT_NAMES),
    artifactFilenameGate(run.artifactRoot),
  ];
}
