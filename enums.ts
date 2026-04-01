export type PackId =
  | 'pack-california-highrise-v1'
  | 'pack-california-appliance-refrig-v2'
  | 'pack-california-datacenter-v3';

export type SourceLane = 'case_bound' | 'curated_reference' | 'live_candidate';

export type DocumentClass =
  | 'COMPLIANCE_CERT'
  | 'DESIGN_PLANS'
  | 'SPEC_SHEET'
  | 'TEST_REPORT'
  | 'ENG_LETTER'
  | 'STD_REFERENCE'
  | 'MFR_SUBMITTAL'
  | 'FIELD_ANNOTATION';

export type FindingClass =
  | 'DIFF'
  | 'HOLE'
  | 'CONTRA'
  | 'AMBIGUITY'
  | 'UNSUPPORTED'
  | 'STALE'
  | 'ASK';

export type ConfidenceBand = 'high' | 'medium' | 'low';

export type ConfidenceClass = 'deterministic' | 'interpretive';

export type RunStatus =
  | 'created'
  | 'ingesting'
  | 'ingested'
  | 'classified'
  | 'compare_pairs_built'
  | 'pass1_complete'
  | 'pass2_complete'
  | 'rules_complete'
  | 'artifacts_built'
  | 'validated'
  | 'complete'
  | 'failed';

export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info';
