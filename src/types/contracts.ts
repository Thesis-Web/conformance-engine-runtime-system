import type { Uuid, IsoDatetime, Sha256Hex, RelativePath, NonEmptyString } from './primitives.js';
import type {
  PackId,
  SourceLane,
  DocumentClass,
  FindingClass,
  ConfidenceBand,
  ConfidenceClass,
  RunStatus,
  Severity,
} from './enums.js';

export interface CaseRecord {
  caseId: Uuid;
  externalCaseRef?: string;
  packId: PackId;
  title: NonEmptyString;
  createdAt: IsoDatetime;
  createdBy: NonEmptyString;
  actorMode: 'human_interface_first';
  sourceRoot: RelativePath;
  notes?: string;
}

export interface RunRecord {
  runId: Uuid;
  caseId: Uuid;
  packId: PackId;
  status: RunStatus;
  startedAt: IsoDatetime;
  completedAt?: IsoDatetime;
  engineVersion: string;
  blueprintVersion: string;
  specVersion: string;
  operatorMode: 'manual_prompt_bridge';
  artifactRoot: RelativePath;
  failureReason?: string;
}

export interface IngestedFile {
  fileId: Uuid;
  caseId: Uuid;
  runId: Uuid;
  originalFilename: NonEmptyString;
  storedPath: RelativePath;
  mimeTypeDetected: NonEmptyString;
  extensionObserved: string;
  sha256: Sha256Hex;
  byteCount: number;
  sourceLane: SourceLane;
  contentAccepted: boolean;
  rejectionReason?: string;
  ingestedAt: IsoDatetime;
}

export interface SourceReference {
  sourceRefId: Uuid;
  fileId: Uuid;
  docClass: DocumentClass;
  pageStart?: number;
  pageEnd?: number;
  sectionLabel?: string;
  chunkOrdinal: number;
  text: string;
  normalizedText: string;
  metadata: Record<string, string | number | boolean | null>;
}

export interface Finding {
  findingId: Uuid;
  runId: Uuid;
  packId: PackId;
  findingClass: FindingClass;
  severity: Severity;
  confidenceClass: ConfidenceClass;
  confidenceBand: ConfidenceBand;
  extractionConfidence: number;
  classificationConfidence: number;
  contradictionConfidence: number;
  applicabilityConfidence: number;
  sourceAuthorityConfidence: number;
  sourceARefId: Uuid;
  sourceBRefId?: Uuid;
  escalationRequired: boolean;
  narrativeDescription: NonEmptyString;
  resolutionPath?: string;
  askText?: string;
  tags: string[];
  emittedBy: 'pass1' | 'pass2' | 'rules' | 'merged';
}

export interface Ask {
  askId: Uuid;
  runId: Uuid;
  linkedFindingId: Uuid;
  packId: PackId;
  severity: Severity;
  askType: 'required_artifact' | 'clarification' | 'authority_check' | 'evidence_gap';
  text: NonEmptyString;
  requiredForCleanOutput: boolean;
}

export interface ComparisonPair {
  pairId: Uuid;
  runId: Uuid;
  packId: PackId;
  sourceARefId: Uuid;
  sourceBRefId: Uuid;
  comparisonType: 'parameter_match' | 'presence_check' | 'version_check' | 'wording_check';
  parameterKey: string;
  patternId?: string;
}

// §27.2 — OperatorPrompt: emitted as 12-operator-prompt.json when the runtime
// needs human bridge input in human-as-interface-first mode.
export interface OperatorPrompt {
  promptId: Uuid;
  runId: Uuid;
  step: string;
  reason: string;
  requiredInputShape: Record<string, string>;
  blocking: boolean;
}
