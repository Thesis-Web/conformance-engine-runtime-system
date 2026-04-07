import type { RelativePath } from './primitives.js';
import type { PackId, DocumentClass, Severity } from './enums.js';

export interface PackManifest {
  packId: PackId;
  versionIndex: string;
  displayName: string;
  jurisdiction: string;
  corpus: CorpusEntry[];
  classMap: ClassMapRule[];
  hierarchyConfig: HierarchyRule[];
  contradictionPatterns: ContradictionPattern[];
  optionalExtractors: ExtractorHint[];
  standardVersionPolicy: StandardVersionPolicy;
  supportedDocumentClasses: DocumentClass[];
  /**
   * Spec §26 — required document classes for a valid case run under this pack.
   * RULE-HOLE-001 emits a HOLE finding for each class in this list that is absent.
   * Pack-defined rather than hardcoded so new jurisdictions need no engine changes.
   */
  caseMinimumRequiredClasses?: DocumentClass[];
  /**
   * Spec §26.2 (buildings track) — at least one of these classes must be present.
   * If none are present, RULE-HOLE-001 emits a single HOLE with 'one-of-optional' tag.
   * Empty array or absent means no one-of constraint applies.
   */
  caseOneOfRequiredClasses?: DocumentClass[];
}

export interface CorpusEntry {
  corpusId: string;
  authority: 'primary' | 'secondary' | 'reference';
  title: string;
  versionLabel: string;
  ownershipPackId: PackId;
  citationKey: string;
  localPath?: RelativePath;
  externalReference?: string;
}

export interface ClassMapRule {
  ruleId: string;
  docClass: DocumentClass;
  matchCriteria: string;
  confidence: number;
  priority: number;
}

export type ExtractorHintType =
  | 'section_marker'
  | 'table_extractor'
  | 'header_pattern'
  | 'field_locator'
  | 'keyword_bias';

export interface ExtractorHint {
  hintId: string;
  appliesTo: DocumentClass[];
  hintType: ExtractorHintType;
  pattern?: string;
  note?: string;
}

export interface StandardVersionEntry {
  standardId: string;
  citationKey: string;
  currentAdoptedVersion: string;
  allowedVersions: string[];
  staleBehavior: 'STALE_finding' | 'reject' | 'warn';
}

export interface StandardVersionPolicy {
  entries: StandardVersionEntry[];
}

export interface HierarchyRule {
  hierarchyId: string;
  description: string;
  higher: DocumentClass | 'source_lane';
  lower: DocumentClass | 'source_lane';
  condition?: string;
}

export interface ContradictionPattern {
  patternId: string;
  description: string;
  docClasses: DocumentClass[];
  parameterKeys: string[];
  severityDefault: Severity;
}
