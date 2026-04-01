import type { Finding, ComparisonPair, RunRecord } from '../types/index.js';
import type { PackManifest } from '../types/pack-manifest.js';
import { canEmitFindings } from './source-lane.js';
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

const RULE_LANE3_001: DeterministicRule = {
  ruleId: 'RULE-LANE3-001',
  packId: 'all',
  applies: () => true,
  execute: (input) => {
    return input.findings
      .filter(f => {
        // simplistic lane check via sourceARefId presence in live sources (stub)
        return !canEmitFindings(/* would need full source lookup */);
      })
      .map(f => ({
        finding: {
          ...f,
          escalationRequired: true,
          confidenceClass: 'interpretive' as const
        }
      }));
  }
};

const RULE_CERT_001: DeterministicRule = {
  ruleId: 'RULE-CERT-001',
  packId: 'all',
  applies: () => true,
  execute: (input) => {
    const forbidden = ['approved', 'certified by engine', 'passes authority review', 'this system certifies'];
    for (const f of input.findings) {
      const lower = f.narrativeDescription.toLowerCase();
      if (forbidden.some(phrase => lower.includes(phrase))) {
        throw new Error(`certification language detected in finding: ${f.findingId}`);
      }
    }
    return [];
  }
};

const RULE_HOLE_001: DeterministicRule = {
  ruleId: 'RULE-HOLE-001',
  packId: 'all',
  applies: () => true,
  execute: (input) => {
    const results: RuleResult[] = [];
    for (const docClass of input.pack.supportedDocumentClasses) {
      const hasPair = input.pairs.some(p => /* stub match */ true);
      const hasFinding = input.findings.some(f => f.findingClass === 'HOLE' && f.narrativeDescription.includes(docClass));
      if (!hasPair && !hasFinding) {
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
            applicabilityConfidence: 1.0,
            sourceAuthorityConfidence: 1.0,
            sourceARefId: '',
            escalationRequired: true,
            narrativeDescription: `No source references found for required document class: ${docClass}`,
            tags: ['required-artifact'],
            emittedBy: 'rules'
          } as Finding
        });
      }
    }
    return results;
  }
};

export const CORE_RULES: DeterministicRule[] = [
  RULE_LANE3_001,
  RULE_CERT_001,
  RULE_HOLE_001
];

export function applyDeterministicRules(input: RuleInput): Finding[] {
  let allFindings: Finding[] = [...input.findings];

  for (const rule of CORE_RULES) {
    if (rule.applies(input)) {
      const results = rule.execute(input);
      for (const r of results) {
        allFindings.push(r.finding);
      }
    }
  }

  // simple dedup by findingId
  const seen = new Set<string>();
  const deduped: Finding[] = [];
  for (const f of allFindings) {
    if (!seen.has(f.findingId)) {
      seen.add(f.findingId);
      deduped.push(f);
    }
  }

  return deduped;
}
