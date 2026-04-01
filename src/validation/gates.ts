import type { Finding, RunRecord } from '../types/index.js';
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
];

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
];

export function noCertificationLanguageGate(text: string): GateResult {
  const lower = text.toLowerCase();
  const errors = FORBIDDEN_CERT_PHRASES.filter((p) => lower.includes(p)).map(
    (p) => `forbidden phrase detected: "${p}"`,
  );
  return { passed: errors.length === 0, gateName: 'no-certification-language', errors };
}

export function confidenceRangeGate(findings: Finding[]): GateResult {
  const errors: string[] = [];
  for (const f of findings) {
    const dims: [string, number][] = [
      ['extractionConfidence', f.extractionConfidence],
      ['classificationConfidence', f.classificationConfidence],
      ['contradictionConfidence', f.contradictionConfidence],
      ['applicabilityConfidence', f.applicabilityConfidence],
      ['sourceAuthorityConfidence', f.sourceAuthorityConfidence],
    ];
    for (const [name, val] of dims) {
      if (val < 0 || val > 1) errors.push(`${f.findingId} ${name}=${val} out of [0,1]`);
    }
  }
  return { passed: errors.length === 0, gateName: 'confidence-range', errors };
}

export function noLane3AuthorityGate(
  findings: Finding[],
  laneMap: Map<string, string>,
): GateResult {
  const errors = findings
    .filter(
      (f) =>
        laneMap.get(f.sourceARefId) === 'live_candidate' ||
        (f.sourceBRefId !== undefined && laneMap.get(f.sourceBRefId) === 'live_candidate'),
    )
    .map((f) => `finding ${f.findingId} cites live_candidate source`);
  return { passed: errors.length === 0, gateName: 'no-lane3-authority', errors };
}

export function artifactPresenceGate(
  artifactRoot: string,
  required: ReadonlyArray<string>,
): GateResult {
  const errors = required
    .filter((n) => !existsSync(join(artifactRoot, n)))
    .map((n) => `missing artifact: ${n}`);
  return { passed: errors.length === 0, gateName: 'artifact-presence', errors };
}

export function artifactFilenameGate(artifactRoot: string): GateResult {
  const errors: string[] = [];
  try {
    const files = readdirSync(artifactRoot);
    const numbered = files.filter((f) => /^\d{2}-/.test(f));
    for (const f of numbered) {
      if (!REQUIRED_ARTIFACT_NAMES.includes(f)) errors.push(`unexpected artifact: ${f}`);
    }
  } catch {
    errors.push(`cannot read artifactRoot: ${artifactRoot}`);
  }
  return { passed: errors.length === 0, gateName: 'artifact-filename', errors };
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
