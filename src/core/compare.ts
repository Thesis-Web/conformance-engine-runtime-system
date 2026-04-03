/**
 * Compare stage — §17.7 canonical buildComparisonPairs implementation.
 *
 * Constructs ComparisonPair[] deterministically from:
 *   - classified source references
 *   - active pack ContradictionPattern[]
 *   - required artifact presence rules (from supportedDocumentClasses)
 *   - standard version policy entries
 *   - document-class compatibility rules (wording_check for ENG_LETTER)
 *
 * Per §17.7.4 pair construction rules:
 *   1. parameter_match — two source refs + one pack-governed parameterKey
 *   2. presence_check  — required artifact expectation vs actual presence
 *   3. version_check   — case-bound citation vs curated-reference policy entry
 *   4. wording_check   — ENG_LETTER wording vs evidence support source
 *   5. No deterministic pair emitted when parameterKey cannot be assigned (→ interpretive escalation)
 */

import { randomUUID } from 'node:crypto';
import type { ComparisonPair, SourceReference, RunRecord } from '../types/index.js';
import type { PackManifest } from '../types/pack-manifest.js';

// Synthetic source ref id prefix for presence_check absent-artifact placeholders
const ABSENT_ARTIFACT_PREFIX = 'ABSENT_ARTIFACT:';

/**
 * §17.7.2 — Parameter keys that must be stable and deterministic within a pack.
 * Used to assign parameterKey when matching doc classes via contradiction patterns.
 */
function deriveParameterKey(
  patternParamKeys: string[],
  refA: SourceReference,
  refB: SourceReference,
): string | null {
  // Use the first parameterKey from the pattern that appears relevant to either source's class
  if (patternParamKeys.length === 0) return null;
  // Primary key is the first entry; additional keys may be present for multi-param patterns
  return patternParamKeys[0] ?? null;
}

/**
 * §17.7.3 — parameter_match pairs.
 * For each ContradictionPattern, find source ref pairs whose docClasses match the pattern.
 * Only emit a pair when both sources are present and a parameterKey can be assigned.
 */
function buildParameterMatchPairs(
  classified: SourceReference[],
  pack: PackManifest,
  runId: string,
): ComparisonPair[] {
  const pairs: ComparisonPair[] = [];

  for (const pattern of pack.contradictionPatterns) {
    // Collect source refs that belong to any of the pattern's docClasses
    const matchingSources = classified.filter((ref) => pattern.docClasses.includes(ref.docClass));

    if (matchingSources.length < 2) continue;

    // Pair every combination within the matching set
    for (let i = 0; i < matchingSources.length; i++) {
      for (let j = i + 1; j < matchingSources.length; j++) {
        const refA = matchingSources[i];
        const refB = matchingSources[j];

        // §17.7.4 rule 5 — skip pair if no parameterKey can be deterministically assigned
        const paramKey = deriveParameterKey(pattern.parameterKeys, refA!, refB!);
        if (paramKey === null) continue;

        pairs.push({
          pairId: randomUUID(),
          runId,
          packId: pack.packId,
          sourceARefId: refA!.sourceRefId,
          sourceBRefId: refB!.sourceRefId,
          comparisonType: 'parameter_match',
          parameterKey: paramKey,
          patternId: pattern.patternId,
        });
      }
    }
  }

  return pairs;
}

/**
 * §17.7.3 — presence_check pairs.
 * DIFF-COMPARE-001 fix: presence checks must be scoped to document classes that are
 * actually required by the pack's contradiction patterns. A HOLE means a *required*
 * artifact is absent (spec §18.3), not merely a supported class that happens to be
 * absent. Iterating over all supportedDocumentClasses generates spurious HOLEs for
 * classes that are optional in a given case.
 *
 * Required classes are those that appear in at least one contradiction pattern's
 * docClasses list — these are the classes the pack needs to execute its cross-check
 * logic. If none are present, presence-check pairs would be vacuous anyway.
 *
 * §17.7.4 rule 2 — synthetic sourceB ref is allowed for absent artifacts.
 */
function buildPresenceCheckPairs(
  classified: SourceReference[],
  pack: PackManifest,
  runId: string,
): ComparisonPair[] {
  const pairs: ComparisonPair[] = [];
  const presentClasses = new Set(classified.map((ref) => ref.docClass));

  // Derive required classes from contradiction patterns (the pack's cross-check targets).
  // Use a Set to deduplicate across multiple patterns.
  const requiredByPatterns = new Set(pack.contradictionPatterns.flatMap((p) => p.docClasses));

  for (const requiredClass of requiredByPatterns) {
    if (presentClasses.has(requiredClass)) continue;

    const syntheticARefId = `${ABSENT_ARTIFACT_PREFIX}${requiredClass}`;
    const syntheticBRefId = `${ABSENT_ARTIFACT_PREFIX}EXPECT:${requiredClass}`;

    pairs.push({
      pairId: randomUUID(),
      runId,
      packId: pack.packId,
      sourceARefId: syntheticARefId,
      sourceBRefId: syntheticBRefId,
      comparisonType: 'presence_check',
      parameterKey: requiredClass,
    });
  }

  return pairs;
}

/**
 * §17.7.3 — version_check pairs.
 * For each standard version policy entry, find case-bound sources that reference
 * the standard's citationKey in their text or metadata.
 * Compares cited version against pack-governed allowed versions.
 */
function buildVersionCheckPairs(
  classified: SourceReference[],
  pack: PackManifest,
  runId: string,
): ComparisonPair[] {
  const pairs: ComparisonPair[] = [];

  for (const entry of pack.standardVersionPolicy.entries) {
    // Find sources that reference this standard's citation key
    const citingRefs = classified.filter((ref) => {
      const searchSpace = (ref.normalizedText + JSON.stringify(ref.metadata)).toLowerCase();
      return searchSpace.includes(entry.citationKey.toLowerCase());
    });

    if (citingRefs.length === 0) continue;

    // §17.7.4 rule 3 — compare case-bound citation to curated-reference policy entry
    const policyRefId = `POLICY:${entry.standardId}`;

    for (const citingRef of citingRefs) {
      pairs.push({
        pairId: randomUUID(),
        runId,
        packId: pack.packId,
        sourceARefId: citingRef.sourceRefId,
        sourceBRefId: policyRefId,
        comparisonType: 'version_check',
        parameterKey: `standard_version:${entry.standardId}`,
      });
    }
  }

  return pairs;
}

/**
 * §17.7.3 — wording_check pairs.
 * §17.7.4 rule 4 — required where pack law says ENG_LETTER wording must be checked
 * against underlying evidence support sources.
 * Pairs every ENG_LETTER with every TEST_REPORT or MFR_SUBMITTAL.
 */
function buildWordingCheckPairs(
  classified: SourceReference[],
  pack: PackManifest,
  runId: string,
): ComparisonPair[] {
  const pairs: ComparisonPair[] = [];

  const engLetters = classified.filter((ref) => ref.docClass === 'ENG_LETTER');
  const evidenceSources = classified.filter(
    (ref) => ref.docClass === 'TEST_REPORT' || ref.docClass === 'MFR_SUBMITTAL',
  );

  if (engLetters.length === 0 || evidenceSources.length === 0) return pairs;

  for (const letter of engLetters) {
    for (const evidence of evidenceSources) {
      pairs.push({
        pairId: randomUUID(),
        runId,
        packId: pack.packId,
        sourceARefId: letter.sourceRefId,
        sourceBRefId: evidence.sourceRefId,
        comparisonType: 'wording_check',
        parameterKey: 'engineering_assertion_vs_evidence',
      });
    }
  }

  return pairs;
}

/**
 * §17.7.1 — Top-level canonical buildComparisonPairs.
 * Deterministically constructs all pair types from classified source references and pack law.
 * Called from the orchestrator after the 'classified' state transition.
 */
export function buildComparisonPairs(
  classified: SourceReference[],
  pack: PackManifest,
  run: RunRecord,
): ComparisonPair[] {
  const paramMatchPairs = buildParameterMatchPairs(classified, pack, run.runId);
  const presencePairs = buildPresenceCheckPairs(classified, pack, run.runId);
  const versionPairs = buildVersionCheckPairs(classified, pack, run.runId);
  const wordingPairs = buildWordingCheckPairs(classified, pack, run.runId);

  return [...paramMatchPairs, ...presencePairs, ...versionPairs, ...wordingPairs];
}
