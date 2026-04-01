import type { Finding, ComparisonPair, RunRecord } from '../types/index.js';
import type { PackManifest } from '../types/pack-manifest.js';
import { randomUUID } from 'node:crypto';

export interface RuleInput {
  run: RunRecord;
  pairs: ComparisonPair[];
  findings: Finding[];
  pack: PackManifest;
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

const FORBIDDEN = [
  'approved',
  'certified by engine',
  'passes authority review',
  'this system certifies',
] as const;

const RULE_CERT_001: DeterministicRule = {
  ruleId: 'RULE-CERT-001',
  packId: 'all',
  applies: () => true,
  execute: (input) => {
    for (const f of input.findings) {
      const lower = f.narrativeDescription.toLowerCase();
      for (const p of FORBIDDEN) {
        if (lower.includes(p)) throw new Error(`certification language in finding: ${f.findingId}`);
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
    for (const docClass of input.pack.supportedDocumentClasses) {
      const hasPair = input.pairs.some((p) => p.parameterKey === docClass);
      if (!hasPair) {
        results.push({
          finding: {
            findingId: randomUUID(),
            runId: input.run.runId,
            packId: input.pack.packId,
            findingClass: 'HOLE',
            severity: 'high',
            confidenceClass: 'deterministic',
            confidenceBand: 'high',
            extractionConfidence: 1.0,
            classificationConfidence: 1.0,
            contradictionConfidence: 1.0,
            applicabilityConfidence: 0.9,
            sourceAuthorityConfidence: 0.9,
            sourceARefId: `synthetic:${docClass}`,
            escalationRequired: false,
            narrativeDescription: `No source references found for required document class: ${docClass}`,
            tags: ['RULE-HOLE-001', docClass],
            emittedBy: 'rules',
          },
        });
      }
    }
    return results;
  },
};

export const CORE_RULES: DeterministicRule[] = [RULE_CERT_001, RULE_HOLE_001];

export function applyDeterministicRules(input: RuleInput): Finding[] {
  const results: Finding[] = [];
  const seen = new Set<string>();
  for (const rule of CORE_RULES) {
    if (!rule.applies(input)) continue;
    for (const r of rule.execute(input)) {
      if (!seen.has(r.finding.findingId)) {
        seen.add(r.finding.findingId);
        results.push(r.finding);
      }
    }
  }
  return results;
}
