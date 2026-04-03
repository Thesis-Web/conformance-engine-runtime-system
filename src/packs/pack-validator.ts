import type { PackManifest } from '../types/pack-manifest.js';
import type { PackId } from '../types/index.js';

export interface PackValidationResult {
  valid: boolean;
  errors: string[];
}

export const VALID_PACK_IDS: ReadonlyArray<PackId> = [
  'pack-california-highrise-v1',
  'pack-california-appliance-refrig-v2',
  'pack-california-datacenter-v3',
];

// INCOMPLETE-002 fix: deep pack manifest validation.
// Spec §22 defines the full PackManifest contract. Previously only 5 checks
// ran. Now validates:
//   - packId in allowed set
//   - versionIndex non-empty
//   - corpus non-empty with required fields per CorpusEntry (§22.2)
//   - classMap rules completeness per ClassMapRule (§22.2A)
//   - hierarchyConfig rules shape per HierarchyRule (§22.3)
//   - contradictionPatterns shape per ContradictionPattern (§22.4)
//   - standardVersionPolicy entries per StandardVersionEntry (§22.2C)
//   - supportedDocumentClasses non-empty
//   - ownership boundary: corpus entries must carry ownershipPackId matching manifest packId
//     (cross-pack ownership deferred to inter-pack audit; here we flag missing field)
//   - no pack-mutation forbidden fields (belt-and-suspenders alongside gate)

const FORBIDDEN_PACK_FIELDS = [
  'overridePipeline',
  'disablePass1',
  'disablePass2',
  'alteredArtifacts',
];

export function validatePack(manifest: PackManifest): PackValidationResult {
  const errors: string[] = [];

  // 1. PackId
  if (!VALID_PACK_IDS.includes(manifest.packId)) {
    errors.push(`unknown packId: ${manifest.packId}`);
  }

  // 2. versionIndex
  if (!manifest.versionIndex || !manifest.versionIndex.trim()) {
    errors.push('versionIndex is empty');
  }

  // 3. Corpus entries — spec §22.2
  if (!Array.isArray(manifest.corpus) || manifest.corpus.length === 0) {
    errors.push('corpus is empty');
  } else {
    manifest.corpus.forEach((entry, i) => {
      if (!entry.corpusId?.trim()) errors.push(`corpus[${i}]: missing corpusId`);
      if (!entry.title?.trim()) errors.push(`corpus[${i}]: missing title`);
      if (!entry.versionLabel?.trim()) errors.push(`corpus[${i}]: missing versionLabel`);
      if (!entry.ownershipPackId?.trim()) errors.push(`corpus[${i}]: missing ownershipPackId`);
      if (!entry.citationKey?.trim()) errors.push(`corpus[${i}]: missing citationKey`);
      if (!['primary', 'secondary', 'reference'].includes(entry.authority)) {
        errors.push(`corpus[${i}]: invalid authority value: ${String(entry.authority)}`);
      }
    });
  }

  // 4. ClassMap rules — spec §22.2A
  if (!Array.isArray(manifest.classMap) || manifest.classMap.length === 0) {
    errors.push('classMap is empty — pack cannot classify any documents');
  } else {
    manifest.classMap.forEach((rule, i) => {
      if (!rule.ruleId?.trim()) errors.push(`classMap[${i}]: missing ruleId`);
      if (!rule.docClass?.trim()) errors.push(`classMap[${i}]: missing docClass`);
      if (!rule.matchCriteria?.trim()) errors.push(`classMap[${i}]: missing matchCriteria`);
      if (typeof rule.confidence !== 'number' || rule.confidence < 0 || rule.confidence > 1) {
        errors.push(`classMap[${i}]: confidence must be a number in [0,1]`);
      }
      if (typeof rule.priority !== 'number') {
        errors.push(`classMap[${i}]: missing or non-numeric priority`);
      }
    });
  }

  // 5. HierarchyConfig rules — spec §22.3
  if (!Array.isArray(manifest.hierarchyConfig)) {
    errors.push('hierarchyConfig must be an array');
  } else {
    manifest.hierarchyConfig.forEach((rule, i) => {
      if (!rule.hierarchyId?.trim()) errors.push(`hierarchyConfig[${i}]: missing hierarchyId`);
      if (!rule.description?.trim()) errors.push(`hierarchyConfig[${i}]: missing description`);
      if (!rule.higher) errors.push(`hierarchyConfig[${i}]: missing higher`);
      if (!rule.lower) errors.push(`hierarchyConfig[${i}]: missing lower`);
    });
  }

  // 6. ContradictionPatterns — spec §22.4
  if (!Array.isArray(manifest.contradictionPatterns)) {
    errors.push('contradictionPatterns must be an array');
  } else {
    manifest.contradictionPatterns.forEach((pattern, i) => {
      if (!pattern.patternId?.trim()) errors.push(`contradictionPatterns[${i}]: missing patternId`);
      if (!pattern.description?.trim())
        errors.push(`contradictionPatterns[${i}]: missing description`);
      if (!Array.isArray(pattern.docClasses) || pattern.docClasses.length === 0) {
        errors.push(`contradictionPatterns[${i}]: docClasses must be a non-empty array`);
      }
      if (!Array.isArray(pattern.parameterKeys) || pattern.parameterKeys.length === 0) {
        errors.push(`contradictionPatterns[${i}]: parameterKeys must be a non-empty array`);
      }
      if (!pattern.severityDefault) {
        errors.push(`contradictionPatterns[${i}]: missing severityDefault`);
      }
    });
  }

  // 7. StandardVersionPolicy entries — spec §22.2C
  if (!Array.isArray(manifest.standardVersionPolicy?.entries)) {
    errors.push('standardVersionPolicy.entries is not an array');
  } else if (manifest.standardVersionPolicy.entries.length === 0) {
    errors.push('standardVersionPolicy.entries is empty — pack cannot detect stale versions');
  } else {
    manifest.standardVersionPolicy.entries.forEach((entry, i) => {
      if (!entry.standardId?.trim()) {
        errors.push(`standardVersionPolicy.entries[${i}]: missing standardId`);
      }
      if (!entry.citationKey?.trim()) {
        errors.push(`standardVersionPolicy.entries[${i}]: missing citationKey`);
      }
      if (!entry.currentAdoptedVersion?.trim()) {
        errors.push(`standardVersionPolicy.entries[${i}]: missing currentAdoptedVersion`);
      }
      if (!Array.isArray(entry.allowedVersions) || entry.allowedVersions.length === 0) {
        errors.push(
          `standardVersionPolicy.entries[${i}]: allowedVersions must be a non-empty array`,
        );
      }
      if (!['STALE_finding', 'reject', 'warn'].includes(entry.staleBehavior)) {
        errors.push(
          `standardVersionPolicy.entries[${i}]: invalid staleBehavior: ${String(entry.staleBehavior)}`,
        );
      }
    });
  }

  // 8. supportedDocumentClasses
  if (
    !Array.isArray(manifest.supportedDocumentClasses) ||
    manifest.supportedDocumentClasses.length === 0
  ) {
    errors.push('supportedDocumentClasses is empty');
  }

  // 9. Pack-mutation forbidden fields (belt-and-suspenders alongside pack-mutation gate)
  const keys = Object.keys(manifest as unknown as Record<string, unknown>);
  for (const field of FORBIDDEN_PACK_FIELDS) {
    if (keys.includes(field)) {
      errors.push(`forbidden pack-mutation field present: ${field}`);
    }
  }

  return { valid: errors.length === 0, errors };
}
