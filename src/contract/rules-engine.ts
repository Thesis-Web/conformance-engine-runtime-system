import { randomUUID } from 'node:crypto';

import type { ComparisonPair, Finding, RunRecord, SourceReference } from '../types/index.js';
import type { PackManifest } from '../types/pack-manifest.js';

export interface RuleInput {
  run: RunRecord;
  pairs: ComparisonPair[];
  findings: Finding[];
  pack: PackManifest;
  /** sourceRefId → SourceLane map (CONTRA-AUDIT-002 fix: keyed on sourceRefId, not fileId) */
  laneMap?: ReadonlyMap<string, string>;
  /** Source references needed for RULE-STALE-001 text inspection (HOLE-AUDIT-001) */
  sourceRefs?: ReadonlyArray<SourceReference>;
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

/**
 * CONTRA-AUDIT-005 fix: RULE-CERT-001 must emit a CONTRA finding, not throw.
 * Throwing crashed the run before artifacts were written, bypassing all gates.
 * The noCertificationLanguageGate (§32.2) independently checks output-brief.
 * This rule flags the offending finding so the gate has something to act on.
 */
const RULE_CERT_001: DeterministicRule = {
  ruleId: 'RULE-CERT-001',
  packId: 'all',
  applies: () => true,
  execute: (input) => {
    const results: RuleResult[] = [];

    for (const finding of input.findings) {
      const haystack = finding.narrativeDescription.toLowerCase();
      const hit = FORBIDDEN_CERTIFICATION_PHRASES.find((phrase) => haystack.includes(phrase));
      if (hit) {
        results.push({
          finding: {
            findingId: randomUUID(),
            runId: input.run.runId,
            packId: input.pack.packId,
            findingClass: 'CONTRA',
            severity: 'critical',
            confidenceClass: 'deterministic',
            confidenceBand: 'high',
            extractionConfidence: 0.95,
            classificationConfidence: 0.95,
            contradictionConfidence: 0.95,
            applicabilityConfidence: 0.95,
            sourceAuthorityConfidence: 0.95,
            sourceARefId: finding.findingId,
            escalationRequired: true,
            narrativeDescription:
              `Forbidden certification language detected in finding ${finding.findingId}: ` +
              `matched phrase "${hit}". This output must not be presented as certification. ` +
              `Requires engineer review before any output is accepted.`,
            resolutionPath:
              'Remove or rephrase the finding narrative to eliminate certification language before output is released.',
            tags: ['cert-language-violation', 'RULE-CERT-001'],
            emittedBy: 'rules',
          },
        });
      }
    }

    return results;
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

/**
 * RULE-LANE3-001: flag findings whose source refs are Lane 3 live_candidate.
 * Depends on laneMap being keyed on sourceRefId (CONTRA-AUDIT-002 fix).
 */
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

/**
 * HOLE-AUDIT-001 fix: RULE-STALE-001 — deterministic stale-version detection.
 * Spec §18.6: generate STALE when cited version is outside pack-governed allowed set.
 * Spec §17.7.3: version_check pairs encode standard-citation comparisons.
 *
 * For each version_check pair where staleBehavior === 'STALE_finding':
 *   1. Look up the citing source text via sourceRefs
 *   2. Extract 4-digit year tokens from the text
 *   3. If any year token is NOT in allowedVersions → emit STALE with citations
 */
const RULE_STALE_001: DeterministicRule = {
  ruleId: 'RULE-STALE-001',
  packId: 'all',
  applies: (input) =>
    input.pairs.some((p) => p.comparisonType === 'version_check') &&
    input.sourceRefs !== undefined &&
    input.sourceRefs.length > 0,
  execute: (input) => {
    const results: RuleResult[] = [];
    if (!input.sourceRefs) return results;

    const sourceRefMap = new Map<string, SourceReference>(
      input.sourceRefs.map((r) => [r.sourceRefId, r]),
    );

    for (const pair of input.pairs) {
      if (pair.comparisonType !== 'version_check') continue;

      // parameterKey format: "standard_version:{standardId}"
      const standardId = pair.parameterKey.replace('standard_version:', '');
      const policyEntry = input.pack.standardVersionPolicy.entries.find(
        (e) => e.standardId === standardId,
      );

      if (!policyEntry || policyEntry.staleBehavior !== 'STALE_finding') continue;

      const citingRef = sourceRefMap.get(pair.sourceARefId);
      if (!citingRef) continue;

      const searchText = citingRef.normalizedText + ' ' + JSON.stringify(citingRef.metadata);

      // Extract 4-digit year tokens (19xx / 20xx) from source text
      const yearPattern = /\b(19|20)\d{2}\b/g;
      const yearMatches = [...searchText.matchAll(yearPattern)].map((m) => m[0] ?? '');
      const uniqueYears = [...new Set(yearMatches)];

      const staleVersions = uniqueYears.filter(
        (v) => v.length > 0 && !policyEntry.allowedVersions.includes(v),
      );

      if (staleVersions.length === 0) continue;

      // Deduplicate: skip if STALE for this sourceRef+standard already emitted
      const alreadyEmitted = input.findings.some(
        (f) =>
          f.findingClass === 'STALE' &&
          f.sourceARefId === pair.sourceARefId &&
          f.tags.includes(standardId),
      );
      if (alreadyEmitted) continue;

      results.push({
        finding: {
          findingId: randomUUID(),
          runId: input.run.runId,
          packId: input.pack.packId,
          findingClass: 'STALE',
          severity: 'medium',
          confidenceClass: 'deterministic',
          confidenceBand: 'high',
          extractionConfidence: 0.85,
          classificationConfidence: 0.85,
          contradictionConfidence: 0.85,
          applicabilityConfidence: 0.85,
          sourceAuthorityConfidence: 0.85,
          sourceARefId: pair.sourceARefId,
          sourceBRefId: pair.sourceBRefId,
          escalationRequired: false,
          narrativeDescription:
            `Source references version(s) [${staleVersions.join(', ')}] for standard ` +
            `'${standardId}', which are not in the pack-governed allowed set ` +
            `[${policyEntry.allowedVersions.join(', ')}]. ` +
            `Current adopted version: ${policyEntry.currentAdoptedVersion}.`,
          resolutionPath:
            `Update citation to a pack-governed allowed version: ` +
            `[${policyEntry.allowedVersions.join(', ')}].`,
          tags: [standardId, 'version_check', 'RULE-STALE-001'],
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
  RULE_STALE_001,
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
