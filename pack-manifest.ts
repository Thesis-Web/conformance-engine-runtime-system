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
