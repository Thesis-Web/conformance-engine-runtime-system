import { randomUUID } from 'node:crypto';

import type {
  ComparisonPair,
  Finding,
  RunRecord,
  SourceReference,
  SourceLane,
} from '../types/index.js';
import type { PackManifest } from '../types/pack-manifest.js';
import { canEmitFindings } from './source-lane.js';

export interface RuleInput {
  run: RunRecord;
  pairs: ComparisonPair[];
  findings: Finding[];
  pack: PackManifest;
  /** sourceRefId → SourceLane map */
  laneMap?: ReadonlyMap<string, string>;
  /** Source references for text inspection */
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

// STUB-005: lane-check helper — spec §17.4.1 deterministic assertion boundary.
// Lane 3 (live_candidate) sources must not participate in deterministic findings.
// If either source in a pair is live_candidate, route to interpretive escalation.
function pairCanEmitDeterministicFinding(
  sourceARefId: string,
  sourceBRefId: string | undefined,
  laneMap: ReadonlyMap<string, string> | undefined,
): boolean {
  if (!laneMap) return true;
  const laneA = laneMap.get(sourceARefId) ?? 'case_bound';
  if (!canEmitFindings(laneA as SourceLane)) return false;
  if (sourceBRefId) {
    const laneB = laneMap.get(sourceBRefId) ?? 'case_bound';
    if (!canEmitFindings(laneB as SourceLane)) return false;
  }
  return true;
}

const FORBIDDEN_CERTIFICATION_PHRASES = [
  'approved',
  'certified by engine',
  'passes authority review',
  'this system certifies',
];

// RULE-CERT-001: flag any finding whose narrative contains certification language.
// Emits CONTRA rather than throwing so gates can inspect the output.
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

// ---------------------------------------------------------------------------
// SOLVE-017-001: RULE_HOLE_001 — per-pack case-minimum required classes.
//
// Spec §26.2–§26.4 defines required class sets per pack. Previously these were
// hardcoded in the engine, which meant TX and future-jurisdiction packs got no
// HOLE detection. Required classes are now declared in each pack manifest via
// caseMinimumRequiredClasses and caseOneOfRequiredClasses fields, making the
// rule pack-agnostic. New jurisdictions need no engine changes.
// ---------------------------------------------------------------------------

const RULE_HOLE_001: DeterministicRule = {
  ruleId: 'RULE-HOLE-001',
  packId: 'all',
  applies: () => true,
  execute: (input) => {
    const results: RuleResult[] = [];

    // Determine which doc classes are present in the case via sourceRefs tags or pairs.
    // A class is "present" if at least one sourceRef carries it (via chunk metadata)
    // or a pair references it as a parameterKey.
    const presentClasses = new Set<string>();
    for (const ref of input.sourceRefs ?? []) {
      const dc = ref.metadata['docClass'];
      if (typeof dc === 'string') presentClasses.add(dc);
    }
    for (const finding of input.findings) {
      for (const tag of finding.tags) presentClasses.add(tag);
    }
    for (const pair of input.pairs) {
      presentClasses.add(pair.parameterKey);
    }

    // SOLVE-017-001: read required classes from pack manifest, not hardcoded map.
    // Any pack that declares caseMinimumRequiredClasses gets HOLE detection.
    // Packs without the field (legacy or not yet updated) get no HOLE detection — safe degradation.
    const requiredClasses = input.pack.caseMinimumRequiredClasses ?? [];
    const oneOfClasses = input.pack.caseOneOfRequiredClasses ?? [];
    const existingNarratives = new Set(input.findings.map((f) => f.narrativeDescription));

    for (const docClass of requiredClasses) {
      if (presentClasses.has(docClass)) continue;

      const narrativeDescription =
        `Required document class '${docClass}' is absent from the case package. ` +
        `Pack ${input.pack.packId} mandates this class for a valid case run per spec §26.`;

      if (existingNarratives.has(narrativeDescription)) continue;

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
          sourceARefId: `PACK:${docClass}`,
          escalationRequired: false,
          narrativeDescription,
          resolutionPath: `Provide a ${docClass} document in the case package.`,
          tags: [docClass, 'RULE-HOLE-001'],
          emittedBy: 'rules',
        },
      });
    }

    // One-of constraint: at least one of the declared classes must be present.
    // Applies to any pack that declares a non-empty caseOneOfRequiredClasses list.
    if (oneOfClasses.length > 0) {
      const hasOneOf = oneOfClasses.some((cls) => presentClasses.has(cls));
      if (!hasOneOf) {
        const narrativeDescription =
          `Pack ${input.pack.packId} requires at least one of: ${oneOfClasses.join(', ')}. ` +
          `None are present in the case package.`;
        if (!existingNarratives.has(narrativeDescription)) {
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
              sourceARefId: 'PACK:ONE_OF_OPTIONAL',
              escalationRequired: false,
              narrativeDescription,
              resolutionPath: `Add at least one of: ${oneOfClasses.join(', ')}.`,
              tags: ['RULE-HOLE-001', 'one-of-optional'],
              emittedBy: 'rules',
            },
          });
        }
      }
    }

    return results;
  },
};

// ---------------------------------------------------------------------------
// DRIFT-004 fix: RULE_CONTRA_001 — actual value comparison.
//
// Spec §18.2: "Generate CONTRA when two sources cannot both be true under
// the same case condition." Previously this emitted CONTRA from pattern
// match on parameterKey alone — no actual value divergence confirmed.
//
// Fix: for each parameter_match pair that hits a contradiction pattern,
// extract the value associated with the parameterKey from the normalized
// text of both sourceA and sourceB. If both values are found and differ →
// deterministic CONTRA. If values cannot be extracted → AMBIGUITY with
// escalation (interpretive boundary, spec §17.4.2).
//
// Value extraction: looks for lines containing the parameterKey (case-
// insensitive, normalized spaces) and reads the token after the first
// colon or equals sign on that line. Simple but deterministic for the
// fixture and real document shapes used in this build.
// ---------------------------------------------------------------------------

function extractParameterValue(text: string, parameterKey: string): string | null {
  const keyPattern = parameterKey.replace(/_/g, '[_ ]');
  const regex = new RegExp(`${keyPattern}\\s*[:=]\\s*(.+)`, 'i');
  const lines = text.split(/\r?\n/);
  for (const line of lines) {
    const match = regex.exec(line);
    if (match) {
      const value = match[1]?.trim();
      return value && value.length > 0 ? value.toLowerCase() : null;
    }
  }
  return null;
}

function normalizeValue(v: string): string {
  return v.replace(/\s+/g, ' ').trim().toLowerCase();
}

const RULE_CONTRA_001: DeterministicRule = {
  ruleId: 'RULE-CONTRA-001',
  packId: 'all',
  applies: (input) =>
    input.pairs.some((p) => p.comparisonType === 'parameter_match') &&
    (input.sourceRefs?.length ?? 0) > 0,
  execute: (input) => {
    const results: RuleResult[] = [];
    if (!input.sourceRefs) return results;

    const sourceRefMap = new Map<string, SourceReference>(
      input.sourceRefs.map((r) => [r.sourceRefId, r]),
    );

    for (const pair of input.pairs) {
      if (pair.comparisonType !== 'parameter_match') continue;
      if (!pair.sourceBRefId) continue;

      const patternMatches = input.pack.contradictionPatterns.some((pattern) =>
        pattern.parameterKeys.includes(pair.parameterKey),
      );
      if (!patternMatches) continue;

      const refA = sourceRefMap.get(pair.sourceARefId);
      const refB = sourceRefMap.get(pair.sourceBRefId);
      if (!refA || !refB) continue;

      const valueA = extractParameterValue(refA.normalizedText, pair.parameterKey);
      const valueB = extractParameterValue(refB.normalizedText, pair.parameterKey);

      // STUB-005: lane check — reject deterministic finding if either source is Lane 3.
      if (!pairCanEmitDeterministicFinding(pair.sourceARefId, pair.sourceBRefId, input.laneMap)) {
        results.push({
          finding: {
            findingId: randomUUID(),
            runId: input.run.runId,
            packId: input.pack.packId,
            findingClass: 'AMBIGUITY',
            severity: 'medium',
            confidenceClass: 'interpretive',
            confidenceBand: 'low',
            extractionConfidence: 0.3,
            classificationConfidence: 0.5,
            contradictionConfidence: 0.3,
            applicabilityConfidence: 0.3,
            sourceAuthorityConfidence: 0.3,
            sourceARefId: pair.sourceARefId,
            sourceBRefId: pair.sourceBRefId,
            escalationRequired: true,
            narrativeDescription: `Comparison pair for '${pair.parameterKey}' involves a Lane 3 live_candidate source. Cannot emit deterministic finding. Requires engineer review and promotion before findings can be asserted.`,
            tags: [pair.parameterKey, 'live_candidate_ref', 'lane3-blocked'],
            emittedBy: 'rules',
          },
        });
        continue;
      }

      // Both values found — compare them
      if (valueA !== null && valueB !== null) {
        if (normalizeValue(valueA) === normalizeValue(valueB)) continue; // agreement, no finding

        const severity =
          pair.parameterKey === 'fire_rating' || pair.parameterKey === 'seismic_reference'
            ? 'critical'
            : 'high';

        const narrativeDescription =
          `Contradicting values for parameter '${pair.parameterKey}': ` +
          `Source A reports "${valueA}", Source B reports "${valueB}". ` +
          `Sources ${pair.sourceARefId} and ${pair.sourceBRefId} cannot both be correct.`;

        const alreadyPresent = input.findings.some(
          (f) =>
            f.findingClass === 'CONTRA' &&
            f.sourceARefId === pair.sourceARefId &&
            f.sourceBRefId === pair.sourceBRefId &&
            f.narrativeDescription === narrativeDescription,
        );
        if (alreadyPresent) continue;

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
            resolutionPath: `Reconcile value for '${pair.parameterKey}' between the two sources.`,
            tags: [pair.parameterKey, 'RULE-CONTRA-001'],
            emittedBy: 'rules',
          },
        });
      } else {
        // Value(s) could not be extracted from text — interpretive boundary (§17.4.2)
        // Emit AMBIGUITY with escalation rather than asserting a false deterministic CONTRA.
        const narrativeDescription =
          `Parameter '${pair.parameterKey}' appears in contradiction pattern but value could not ` +
          `be deterministically extracted from one or both sources ` +
          `(${pair.sourceARefId} / ${pair.sourceBRefId ?? 'n/a'}). ` +
          `Manual comparison required.`;

        const alreadyPresent = input.findings.some(
          (f) =>
            f.findingClass === 'AMBIGUITY' &&
            f.sourceARefId === pair.sourceARefId &&
            f.narrativeDescription === narrativeDescription,
        );
        if (alreadyPresent) continue;

        results.push({
          finding: {
            findingId: randomUUID(),
            runId: input.run.runId,
            packId: input.pack.packId,
            findingClass: 'AMBIGUITY',
            severity: 'medium',
            confidenceClass: 'interpretive',
            confidenceBand: 'low',
            extractionConfidence: 0.4,
            classificationConfidence: 0.6,
            contradictionConfidence: 0.4,
            applicabilityConfidence: 0.5,
            sourceAuthorityConfidence: 0.7,
            sourceARefId: pair.sourceARefId,
            sourceBRefId: pair.sourceBRefId,
            escalationRequired: true,
            narrativeDescription,
            askText: `Manually compare '${pair.parameterKey}' values between the two sources and confirm whether a contradiction exists.`,
            tags: [pair.parameterKey, 'RULE-CONTRA-001', 'value-extraction-failed'],
            emittedBy: 'rules',
          },
        });
      }
    }

    return results;
  },
};

// RULE-LANE3-001: flag findings whose source refs are Lane 3 live_candidate.
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

// RULE-STALE-001: deterministic stale-version detection (spec §18.6, §17.7.3).
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

      const standardId = pair.parameterKey.replace('standard_version:', '');
      const policyEntry = input.pack.standardVersionPolicy.entries.find(
        (e) => e.standardId === standardId,
      );
      if (!policyEntry || policyEntry.staleBehavior !== 'STALE_finding') continue;

      const citingRef = sourceRefMap.get(pair.sourceARefId);
      if (!citingRef) continue;

      // STUB-005: lane check — do not emit deterministic STALE for Lane 3 sources.
      if (!pairCanEmitDeterministicFinding(pair.sourceARefId, pair.sourceBRefId, input.laneMap)) {
        continue; // Lane 3 source; gate will catch this; no deterministic assertion.
      }

      const searchText = citingRef.normalizedText + ' ' + JSON.stringify(citingRef.metadata);
      const yearPattern = /\b(19|20)\d{2}\b/g;
      const yearMatches = [...searchText.matchAll(yearPattern)].map((m) => m[0] ?? '');
      const uniqueYears = [...new Set(yearMatches)];
      const staleVersions = uniqueYears.filter(
        (v) => v.length > 0 && !policyEntry.allowedVersions.includes(v),
      );
      if (staleVersions.length === 0) continue;

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
    if (!rule.applies(input)) continue;
    for (const result of rule.execute(input)) {
      emitted.set(result.finding.findingId, result.finding);
    }
  }
  return [...emitted.values()];
}
