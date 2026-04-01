import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import type { Finding, RunRecord } from '../types/index.js';
import type { PackManifest } from '../types/pack-manifest.js';

export const REQUIRED_ARTIFACT_NAMES = [
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

export const FORBIDDEN_CERT_PHRASES = [
  'approved',
  'certified by engine',
  'passes authority review',
  'this system certifies',
] as const;

export interface GateResult {
  gateName: string;
  passed: boolean;
  errors: string[];
}

export function noCertificationLanguageGate(text: string): GateResult {
  const lower = text.toLowerCase();
  const errors = FORBIDDEN_CERT_PHRASES.filter((phrase) => lower.includes(phrase));

  return {
    gateName: 'no-certification-language',
    passed: errors.length === 0,
    errors,
  };
}

export function confidenceRangeGate(findings: Finding[]): GateResult {
  const errors: string[] = [];

  for (const finding of findings) {
    const values = [
      finding.extractionConfidence,
      finding.classificationConfidence,
      finding.contradictionConfidence,
      finding.applicabilityConfidence,
      finding.sourceAuthorityConfidence,
    ];

    if (values.some((value) => value < 0 || value > 1)) {
      errors.push(finding.findingId);
    }
  }

  return {
    gateName: 'confidence-range',
    passed: errors.length === 0,
    errors,
  };
}

export function noLane3AuthorityGate(
  findings: Finding[],
  laneMap: ReadonlyMap<string, string>,
): GateResult {
  const errors: string[] = [];

  for (const finding of findings) {
    const sourceALane = laneMap.get(finding.sourceARefId);
    const sourceBLane = finding.sourceBRefId ? laneMap.get(finding.sourceBRefId) : undefined;

    if (sourceALane === 'live_candidate' || sourceBLane === 'live_candidate') {
      errors.push(finding.findingId);
    }
  }

  return {
    gateName: 'no-lane3-authority',
    passed: errors.length === 0,
    errors,
  };
}

export function artifactPresenceGate(
  artifactRoot: string,
  required: ReadonlyArray<string> = REQUIRED_ARTIFACT_NAMES,
): GateResult {
  const errors = required.filter((name) => !existsSync(join(artifactRoot, name)));

  return {
    gateName: 'artifact-presence',
    passed: errors.length === 0,
    errors,
  };
}

export function artifactFilenameGate(
  artifactRoot: string,
  required: ReadonlyArray<string> = REQUIRED_ARTIFACT_NAMES,
): GateResult {
  const present = new Set(readdirSync(artifactRoot));
  const errors = [...present].filter(
    (name) =>
      (/^\d{2}-/.test(name) || name.endsWith('.md') || name.endsWith('.json')) &&
      !required.includes(name),
  );

  return {
    gateName: 'artifact-filename',
    passed: errors.length === 0,
    errors,
  };
}

export function demoExposureGate(artifactRoot: string): GateResult {
  const forbidden = ['prompt chain', 'internal reasoning', 'pack-law-internal', 'rule-debug'];
  const errors: string[] = [];

  for (const file of readdirSync(artifactRoot)) {
    const lowerName = file.toLowerCase();
    if (forbidden.some((token) => lowerName.includes(token))) {
      errors.push(`filename:${file}`);
      continue;
    }

    if (file.endsWith('.md')) {
      const content = readFileSync(join(artifactRoot, file), 'utf8').toLowerCase();
      if (forbidden.some((token) => content.includes(token))) {
        errors.push(`content:${file}`);
      }
    }
  }

  return {
    gateName: 'demo-exposure',
    passed: errors.length === 0,
    errors,
  };
}

export function packMutationGate(manifest: PackManifest): GateResult {
  const forbiddenFields = ['overridePipeline', 'disablePass1', 'disablePass2', 'alteredArtifacts'];
  const keys = Object.keys(manifest as unknown as Record<string, unknown>);
  const errors = forbiddenFields.filter((field) => keys.includes(field));

  return {
    gateName: 'pack-mutation',
    passed: errors.length === 0,
    errors,
  };
}

export function scopeChangeLogGate(changeLogPath: string): GateResult {
  if (!existsSync(changeLogPath)) {
    return {
      gateName: 'scope-change-log',
      passed: true,
      errors: [],
    };
  }

  const content = readFileSync(changeLogPath, 'utf8');
  const passed = content.includes('owner-approved');

  return {
    gateName: 'scope-change-log',
    passed,
    errors: passed ? [] : ['missing owner-approved marker'],
  };
}

export function deterministicReplayGate(runDir1: string, runDir2: string): GateResult {
  const artifactNames = (dir: string): string[] =>
    readdirSync(dir)
      .filter((file) => /^\d{2}-/.test(file) || file.endsWith('.md') || file.endsWith('.json'))
      .sort();

  const left = artifactNames(runDir1);
  const right = artifactNames(runDir2);

  const errors: string[] = [];

  for (const file of left) {
    if (!right.includes(file)) {
      errors.push(`missing-in-run2:${file}`);
    }
  }

  for (const file of right) {
    if (!left.includes(file)) {
      errors.push(`missing-in-run1:${file}`);
    }
  }

  return {
    gateName: 'deterministic-replay',
    passed: errors.length === 0,
    errors,
  };
}

export function runAllGates(
  run: RunRecord,
  findings: Finding[],
  laneMap: ReadonlyMap<string, string>,
  manifest?: PackManifest,
  changeLogPath = 'logs/scope-change.log',
  replayDirs?: { runDir1: string; runDir2: string },
): GateResult[] {
  const outputBriefPath = join(run.artifactRoot, '10-output-brief.md');
  const outputBrief = existsSync(outputBriefPath) ? readFileSync(outputBriefPath, 'utf8') : '';

  const results: GateResult[] = [
    noCertificationLanguageGate(outputBrief),
    confidenceRangeGate(findings),
    noLane3AuthorityGate(findings, laneMap),
    artifactPresenceGate(run.artifactRoot),
    artifactFilenameGate(run.artifactRoot),
    demoExposureGate(run.artifactRoot),
    scopeChangeLogGate(changeLogPath),
  ];

  if (manifest) {
    results.push(packMutationGate(manifest));
  }

  if (replayDirs) {
    results.push(deterministicReplayGate(replayDirs.runDir1, replayDirs.runDir2));
  }

  return results;
}
