import { randomUUID } from 'node:crypto';

import type { ComparisonPair, Finding, RunRecord } from '../types/index.js';
import type { PackManifest } from '../types/pack-manifest.js';

export interface RuleInput {
  run: RunRecord;
  pairs: ComparisonPair[];
  findings: Finding[];
  pack: PackManifest;
  laneMap?: ReadonlyMap<string, string>;
}

export interface RuleResult {
  finding: Finding;
}

export interface DeterministicRule {
  ruleId: string;
  packId: string | 'all';
  applies(input: RuleInput): boolean;
  execute(input: RuleInput): RuleResult[];
}

const FORBIDDEN_CERTIFICATION_PHRASES = [
  'approved',
  'certified by engine',
  'passes authority review',
  'this system certifies',
];

const RULE_CERT_001: DeterministicRule = {
  ruleId: 'RULE-CERT-001',
  packId: 'all',
  applies: () => true,
  execute: (input) => {
    for (const finding of input.findings) {
      const haystack = finding.narrativeDescription.toLowerCase();
      const hit = FORBIDDEN_CERTIFICATION_PHRASES.find((phrase) => haystack.includes(phrase));
      if (hit) {
        throw new Error('certification language detected in finding: ' + finding.findingId);
      }
    }

    return [];
  },
};

const RULE_HOLE_001: DeterministicRule = {
  ruleId: 'RULE-HOLE-001',
  packId: 'all',
  applies: () => true,
  execute: (input) => {
    const results: RuleResult[] = [];

    const existingNarratives = new Set(
      input.findings.map((finding) => finding.narrativeDescription),
    );

    for (const docClass of input.pack.supportedDocumentClasses) {
      const hasPair = input.pairs.some((pair) => pair.parameterKey === docClass);
      const hasFinding = input.findings.some((finding) => finding.tags.includes(docClass));

      if (!hasPair && !hasFinding) {
        const narrativeDescription =
          'No source references found for required document class: ' + docClass;

        if (existingNarratives.has(narrativeDescription)) {
          continue;
        }

        results.push({
          finding: {
            findingId: randomUUID(),
            runId: input.run.runId,
            packId: input.pack.packId,
            findingClass: 'HOLE',
            severity: 'high',
            confidenceClass: 'deterministic',
            confidenceBand: 'high',
            extractionConfidence: 0.9,
            classificationConfidence: 0.9,
            contradictionConfidence: 0.9,
            applicabilityConfidence: 0.9,
            sourceAuthorityConfidence: 0.9,
            sourceARefId: 'PACK:' + docClass,
            escalationRequired: false,
            narrativeDescription,
            tags: [docClass],
            emittedBy: 'rules',
          },
        });
      }
    }

    return results;
  },
};

const RULE_LANE3_001: DeterministicRule = {
  ruleId: 'RULE-LANE3-001',
  packId: 'all',
  applies: (input) => Boolean(input.laneMap && input.laneMap.size > 0),
  execute: (input) => {
    const results: RuleResult[] = [];

    for (const finding of input.findings) {
      const sourceALane = input.laneMap?.get(finding.sourceARefId);
      const sourceBLane = finding.sourceBRefId
        ? input.laneMap?.get(finding.sourceBRefId)
        : undefined;

      if (sourceALane === 'live_candidate' || sourceBLane === 'live_candidate') {
        results.push({
          finding: {
            ...finding,
            confidenceClass: 'interpretive',
            escalationRequired: true,
            tags: finding.tags.includes('live_candidate_ref')
              ? finding.tags
              : [...finding.tags, 'live_candidate_ref'],
          },
        });
      }
    }

    return results;
  },
};

const RULE_CONTRA_001: DeterministicRule = {
  ruleId: 'RULE-CONTRA-001',
  packId: 'all',
  applies: (input) => input.pairs.some((pair) => pair.comparisonType === 'parameter_match'),
  execute: (input) => {
    const results: RuleResult[] = [];

    for (const pair of input.pairs) {
      if (pair.comparisonType !== 'parameter_match') {
        continue;
      }

      const patternMatches = input.pack.contradictionPatterns.some((pattern) =>
        pattern.parameterKeys.includes(pair.parameterKey),
      );

      if (!patternMatches) {
        continue;
      }

      const severity =
        pair.parameterKey === 'fire_rating' || pair.parameterKey === 'seismic_reference'
          ? 'critical'
          : 'high';

      const narrativeDescription =
        `Contradicting values for parameter: ${pair.parameterKey} between sources ` +
        `${pair.sourceARefId} and ${pair.sourceBRefId}`;

      const alreadyPresent = input.findings.some(
        (finding) =>
          finding.findingClass === 'CONTRA' &&
          finding.sourceARefId === pair.sourceARefId &&
          finding.sourceBRefId === pair.sourceBRefId &&
          finding.narrativeDescription === narrativeDescription,
      );

      if (alreadyPresent) {
        continue;
      }

      results.push({
        finding: {
          findingId: randomUUID(),
          runId: input.run.runId,
          packId: input.pack.packId,
          findingClass: 'CONTRA',
          severity,
          confidenceClass: 'deterministic',
          confidenceBand: 'high',
          extractionConfidence: 0.9,
          classificationConfidence: 0.9,
          contradictionConfidence: 0.9,
          applicabilityConfidence: 0.9,
          sourceAuthorityConfidence: 0.9,
          sourceARefId: pair.sourceARefId,
          sourceBRefId: pair.sourceBRefId,
          escalationRequired: false,
          narrativeDescription,
          tags: [pair.parameterKey],
          emittedBy: 'rules',
        },
      });
    }

    return results;
  },
};

export const CORE_RULES: DeterministicRule[] = [
  RULE_CERT_001,
  RULE_HOLE_001,
  RULE_LANE3_001,
  RULE_CONTRA_001,
];

export function applyDeterministicRules(input: RuleInput): Finding[] {
  const emitted = new Map<string, Finding>();

  for (const finding of input.findings) {
    emitted.set(finding.findingId, finding);
  }

  for (const rule of CORE_RULES) {
    if (!rule.applies(input)) {
      continue;
    }

    for (const result of rule.execute(input)) {
      emitted.set(result.finding.findingId, result.finding);
    }
  }

  return [...emitted.values()];
}
