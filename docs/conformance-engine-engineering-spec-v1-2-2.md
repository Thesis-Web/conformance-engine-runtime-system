
# Conformance Engine Runtime System Engineering Spec v1-2-2

## 1. Purpose

This engineering spec translates the approved blueprint into deterministic build law for the first build of Conformance Engine Runtime System (CERS). The intent of this spec is to let a builder implement the system line by line without inventing architecture mid-build.

This spec governs the engine-first build. It is exhaustive for Layer 1 (Core Engine), Layer 2 (Runtime Contract), and Layer 3 (Domain Packs), and it defines only the minimum Layer 4 orchestration required to run the first human-as-interface-first POC. Thin portal implementation, sandbox pre-ingest upload staging, and broad production-polish concerns are deferred unless explicitly named in this document as stub contracts.

## 2. Governing Precedence

Precedence order for this build is fixed:

1. Approved blueprint
2. This engineering spec
3. Reference files and approved audit logs
4. Builder implementation details

If any ambiguity exists:
- blueprint governs product purpose and architectural boundaries
- this spec governs implementation law
- if this spec must make a best-solve beyond blueprint law, it must be logged in the build notes and hole/diff log

## 3. Implementation Choice

### 3.1 Chosen Language

This build shall use **TypeScript strict** on Node.js 20+ for the engine, pack system, CLI, and minimum orchestration runtime.

### 3.2 Why TypeScript strict was chosen

TypeScript strict is chosen over Go for this build because:

- the system is schema-heavy and JSON-artifact-heavy
- the first build runs in human-as-interface-first mode, which benefits from fast iteration around artifacts and operator loops
- the later thin portal and case/orchestration layers can share types with the engine
- Zod or equivalent runtime validation integrates naturally with TypeScript strict
- PDF/text/document pipelines and future connector work are easier to stage in the existing Node ecosystem
- the build requires deterministic typed contracts more than low-level concurrency optimization

### 3.3 Strictness Rules

The codebase shall enforce:

- `strict: true`
- `noImplicitAny: true`
- `exactOptionalPropertyTypes: true`
- `noUncheckedIndexedAccess: true`
- `useUnknownInCatchVariables: true`
- `noImplicitOverride: true`
- `noFallthroughCasesInSwitch: true`

No `any` in production code except one isolated adapter boundary with explicit comment and narrowing.

## 4. Build Scope

### 4.1 In Scope

This spec covers:

- Layer 1 core engine
- Layer 2 runtime contract enforcement
- Layer 3 pack manifests and pack-bound logic
- minimum Layer 4 local case/run orchestration required for POC
- CLI/operator mode for human-as-interface-first execution
- artifacts, logs, validation gates, pack loading, and deterministic runtime behavior
- three-pack near-production POC support:
  - California High-rise / Buildings Pack v1
  - Appliance / Refrigeration Pack v2
  - Data Center Pack v3

### 4.2 Out of Scope for This Spec

Explicitly deferred:

- thin portal implementation
- account systems and public auth
- browser upload UX
- sandbox pre-ingest upload path implementation
- direct SharePoint connector implementation
- live Lane 3 retrieval wired into emitted findings
- BIM/CAD semantic parsing beyond intake stubs and file classification
- automated submission package generation
- multi-tenant cloud deployment hardening
- router/API automation replacing human operator loop

## 5. Resolved Audit Carry-Forwards

The following audit items are resolved in this spec by explicit law:

### 5.1 DIFF-003 Resolution
Layer 3 definitions in this spec always name all three initial packs, not only Pack v1.

### 5.2 DIFF-004 Resolution
Title 20 and MAEDbS are owned by Pack v2 corpus.
Pack v1 may reference Pack v2-owned items only as inter-pack contextual references, not as owned primary corpus entries.

### 5.3 DIFF-005 Resolution
POC ingest proof and gates apply across the document-class sets exercised by all three canonical POC case runs, not only Pack v1 wording from blueprint shorthand.

## 6. Product Identity Constraints

The system is:

- an evidence-governed review runtime
- a document truth auditor
- a conformance review engine
- a human-reviewed machine assistant

The system is not:

- a certifier
- a plan authoring tool
- a BIM authoring tool
- a generic chat interface over docs
- a legal or engineering signoff substitute

## 7. Repository Contract

### 7.1 Repository Root Layout

The builder shall produce a repository matching this minimum structure:

    /docs/
      conformance-engine-blueprint-v1-2-2.md
      conformance-engine-engineering-spec-v1-2-2.md
    /src/
      /core/
      /contract/
      /packs/
      /orchestration/
      /cli/
      /artifacts/
      /validation/
      /types/
      /utils/
    /schemas/
      *.schema.json
    /fixtures/
      /pack-v1/
      /pack-v2/
      /pack-v3/
    /runs/
      /RUN-<id>/
    /tests/
      /unit/
      /integration/
      /fixtures/
    package.json
    tsconfig.json
    vitest.config.ts
    README.md

### 7.2 Package Scripts

Required scripts:

- `lint`
- `typecheck`
- `test`
- `test:integration`
- `build`
- `ci:gate`
- `run:poc`
- `run:validate`
- `pack:validate`
- `artifact:validate`

`ci:gate` must run:
1. format check
2. typecheck
3. unit tests
4. integration tests
5. schema validation
6. artifact filename validation
7. pack validation
8. deterministic replay smoke test

## 8. Architecture Mapping

### 8.1 Layer 1 — Core Engine
Implemented in `/src/core`.

### 8.2 Layer 2 — Runtime Contract
Implemented in `/src/contract` and `/schemas`.

### 8.3 Layer 3 — Domain Packs
Implemented in `/src/packs` plus pack manifests stored in `/packs` or `/fixtures` during first build.

### 8.4 Layer 4 — Case and State Orchestration
Implemented only as local deterministic run orchestration in `/src/orchestration`.

### 8.5 Layer 5 — Thin Portal
Deferred. No builder time is spent here beyond typed stubs if necessary.

## 9. Canonical Runtime Flow

Steps 1-4 implement Ingest.
Step 5 implements Normalize.
Step 6 implements Classify.
Steps 7-8 load pack and contract for governed comparison.
Steps 9-11 together implement Compare and Flag.
Step 12 implements Ask.
Steps 13-17 implement Emit, validation, operator output, and completion.

The runtime flow is fixed:

1. create case
2. create run
3. ingest files
4. hash files
5. segment sources into source references
6. classify documents
7. load active pack
8. load runtime contract
9. primary extraction pass
10. adversarial audit pass
11. deterministic rules pass
12. merge and normalize findings
13. generate asks
14. build artifact set
15. validate artifact set
16. emit operator outputs
17. mark run complete or failed

No stage may be skipped.

## 10. Canonical Data Types

### 10.1 Primitive Type Aliases

    type Uuid = string;
    type IsoDatetime = string;
    type Sha256Hex = string;
    type RelativePath = string;
    type NonEmptyString = string;

### 10.2 Enumerations

#### 10.2.1 PackId

- `pack-california-highrise-v1`
- `pack-california-appliance-refrig-v2`
- `pack-california-datacenter-v3`

#### 10.2.2 SourceLane

- `case_bound`
- `curated_reference`
- `live_candidate`

#### 10.2.3 DocumentClass

Global superset:

- `COMPLIANCE_CERT`
- `DESIGN_PLANS`
- `SPEC_SHEET`
- `TEST_REPORT`
- `ENG_LETTER`
- `STD_REFERENCE`
- `MFR_SUBMITTAL`
- `FIELD_ANNOTATION`

#### 10.2.4 FindingClass

- `DIFF`
- `HOLE`
- `CONTRA`
- `AMBIGUITY`
- `UNSUPPORTED`
- `STALE`
- `ASK`

#### 10.2.5 ConfidenceBand

- `high`
- `medium`
- `low`

#### 10.2.6 ConfidenceClass

- `deterministic`
- `interpretive`

#### 10.2.7 RunStatus

- `created`
- `ingesting`
- `ingested`
- `classified`
- `compare_pairs_built`
- `pass1_complete`
- `pass2_complete`
- `rules_complete`
- `artifacts_built`
- `validated`
- `complete`
- `failed`

#### 10.2.8 Severity

- `critical`
- `high`
- `medium`
- `low`
- `info`

### 10.3 Core Interfaces

#### 10.3.1 CaseRecord

```ts
interface CaseRecord {
  caseId: Uuid;
  externalCaseRef?: string;
  packId: PackId;
  title: NonEmptyString;
  createdAt: IsoDatetime;
  createdBy: NonEmptyString;
  actorMode: "human_interface_first";
  sourceRoot: RelativePath;
  notes?: string;
}
```

#### 10.3.2 RunRecord

```ts
interface RunRecord {
  runId: Uuid;
  caseId: Uuid;
  packId: PackId;
  status: RunStatus;
  startedAt: IsoDatetime;
  completedAt?: IsoDatetime;
  engineVersion: string;
  blueprintVersion: string;
  specVersion: string;
  operatorMode: "manual_prompt_bridge";
  artifactRoot: RelativePath;
  failureReason?: string;
}
```

#### 10.3.3 IngestedFile

```ts
interface IngestedFile {
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
```

#### 10.3.4 SourceReference

```ts
interface SourceReference {
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
```

#### 10.3.5 Finding

```ts
interface Finding {
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
  emittedBy: "pass1" | "pass2" | "rules" | "merged";
}
```

#### 10.3.6 Ask

```ts
interface Ask {
  askId: Uuid;
  runId: Uuid;
  linkedFindingId: Uuid;
  packId: PackId;
  severity: Severity;
  askType: "required_artifact" | "clarification" | "authority_check" | "evidence_gap";
  text: NonEmptyString;
  requiredForCleanOutput: boolean;
}
```

#### 10.3.7 ComparisonPair

```ts
interface ComparisonPair {
  pairId: Uuid;
  runId: Uuid;
  packId: PackId;
  sourceARefId: Uuid;
  sourceBRefId: Uuid;
  comparisonType: "parameter_match" | "presence_check" | "version_check" | "wording_check";
  parameterKey: string;
  patternId?: string;
}
```

## 11. Schema Law

### 11.1 Validation Technology

Runtime validation shall use Zod or an equivalent library with:
- runtime parse/throw behavior
- JSON schema export support
- exact optional property behavior matching TS strict

### 11.2 JSON Schema Export

The build shall export machine-readable schemas for:
- case records
- run records
- pack manifests
- finding artifacts
- ask artifacts
- output brief
- engineer review packet

These files belong in `/schemas`.

### 11.3 Unknown Field Policy

For persisted artifacts:
- unknown fields are rejected in strict validation mode
- no schema may accept arbitrary top-level unknown keys
- extension points must be nested under explicit `metadata` objects

## 12. Source Lane Law

### 12.1 Lane Precedence

Authority precedence is fixed:
1. `case_bound`
2. `curated_reference`
3. `live_candidate`

### 12.2 Use Constraints

- Lane 1 sources may directly participate in emitted findings
- Lane 2 sources may directly participate in emitted findings
- Lane 3 sources may not directly participate in emitted findings in POC mode
- Lane 3 may be logged as candidate support only

### 12.3 Promotion Rule

Lane 3 promotion is deferred from first build.
No builder shall implement automatic promotion in v1-2-2.

## 13. Ingest Law

### 13.1 Allowed Engine-Side Inputs for First Build

The engine-side first build must accept:
- `.pdf`
- `.docx`
- `.json`
- `.txt`
- `.csv`

Additional file types may be recorded as unsupported but must not break ingest.

### 13.2 Observed vs Accepted

Observed extension is not authoritative.
Acceptance is based on content/magic-signature or parser verification.

### 13.3 Rejected Types

Hard reject if directly encountered in engine ingest:
- `.exe`
- `.bat`
- `.sh`
- `.mjs`
- `.ps1`
- `.cmd`
- executable binaries
- encrypted archives
- malformed containers that cannot be safely inspected

### 13.4 Archive Rule

Archive handling is deferred from first engine spec unless a local operator manually pre-expands an archive before engine ingestion.
If an archive reaches engine ingest in v1-2-2, the run must reject it and emit a validation artifact explaining the deferral.

### 13.5 Size Limit Law

The following ingest size limits are canonical for v1-2-2:

- `MAX_FILE_BYTES = 104857600` (100 MiB per file)
- `MAX_CASE_BYTES = 2147483648` (2 GiB per case package)

Behavior rules:

- if a single file exceeds `MAX_FILE_BYTES`, reject that file, emit a validation record, and continue processing remaining files unless the case then lacks a mandatory artifact class
- if total accepted case bytes exceed `MAX_CASE_BYTES`, mark the case as ingest-failed, emit failure and validation artifacts, and stop the run before normalization
- rejected files must still appear in the ingest log with rejection reason and observed byte size

### 13.6 Hashing

Every accepted file must receive a SHA-256 hash at first touch.

Pseudocode:

```ts
function hashFile(bytes: Uint8Array): Sha256Hex {
  return sha256(bytes).toHex();
}
```

### 13.7 Immutable Provenance

Once `fileId` + `sha256` + `storedPath` are recorded for a run, they must not mutate.
Any changed file requires a new run.

## 14. Normalization Law

### 14.1 Text Extraction

For POC:
- PDF text extraction may use deterministic parser output
- DOCX extraction must preserve paragraph ordering
- TXT/JSON/CSV keep original textual order
- OCR is not default; use only if extraction is empty and log OCR fallback

### 14.2 Extraction Logging

Each file must record:
- extraction method
- parser version
- page count if known
- fallback usage
- extraction warnings

### 14.3 Chunking

Chunking must be deterministic.

Default chunking law:
- PDF: by page, then by detected section heading within page if available
- DOCX: by heading or paragraph cluster
- TXT: by blank-line paragraphs
- JSON: by object path
- CSV: by row group with header context

Chunk IDs must be reproducible for identical input.

## 15. Document Classification Law

### 15.1 Classification Sources

Document classification may use:
- filename heuristics
- content heuristics
- pack class map
- pass1 model classification
- deterministic rule overrides

### 15.2 Final Class Selection

Final class is chosen by deterministic merge:

1. explicit operator override if present
2. deterministic filename/content rule if confidence high
3. pass1 model proposal if deterministic rules inconclusive
4. pass2 may challenge class
5. rules resolver chooses final class
6. unresolved class becomes escalation item

### 15.3 Classification Pseudocode

```ts
function resolveDocumentClass(input: ClassificationInputs): ClassificationResult {
  if (input.operatorOverride) return locked(input.operatorOverride);
  const ruleHit = evaluateClassRules(input);
  if (ruleHit.isHighConfidence) return ruleHit;
  const pass1 = input.pass1Suggestion;
  const pass2 = input.pass2Audit;
  const merged = mergeClassSuggestions(ruleHit, pass1, pass2);
  if (merged.isResolved) return merged;
  return escalatedUnknownClass(input);
}
```

## 16. Two-Pass Model Chain Law

### 16.1 Pass 1 Contract

Pass 1 inputs:
- pack manifest
- runtime contract
- case metadata
- source references

Pass 1 outputs:
- proposed classifications
- extracted entities
- extracted relationships
- proposed findings
- extraction notes

### 16.2 Pass 2 Contract

Pass 2 inputs:
- pass1 outputs
- same source references
- same pack manifest
- runtime contract

Pass 2 outputs:
- confirmation/challenge of each proposed finding
- added escalation flags
- suppressed weak claims
- revised class hints
- audit commentary artifact

### 16.3 Deterministic Merge

A deterministic merge layer must combine pass1 + pass2 + rules.

Rules:
- pass2 cannot directly emit final findings without merge
- pass2 may downgrade confidence or force escalation
- pass2 may suppress unsupported pass1 claims
- rules pass has final say where blueprint/runtime law is explicit

## 17. Deterministic Rules Engine

### 17.1 Purpose

The deterministic rules engine resolves explicit comparisons and runtime-contract law outside model interpretation.

### 17.2 Rule Categories

- source lane authority rules
- standard-version rules
- required artifact presence rules
- pack contradiction patterns
- document pair comparison rules
- POC mandatory artifact rules

### 17.3 Rule Interface

```ts
interface DeterministicRule {
  ruleId: string;
  packId: PackId | "all";
  applies(input: RuleInput): boolean;
  execute(input: RuleInput): RuleResult[];
}
```

### 17.4 Assertion Boundary Contract

The spec translates blueprint assertion law into executable rules.

#### 17.4.1 Deterministic Assertion

A finding may be emitted as `confidenceClass = "deterministic"` only when all are true:

- the finding originates from an explicit comparison pair, explicit required-artifact rule, or explicit standard-version rule
- the compared parameter key is known
- applicability confidence is at least `0.850`
- source-authority confidence is at least `0.850`
- no unresolved ambiguity flag exists on the same comparison pair

Deterministic assertion is allowed for:
- HOLE from missing required artifacts
- DIFF from explicit parameter mismatches
- CONTRA from explicit incompatible parameter mismatches
- STALE from explicit standard-version policy mismatch
- UNSUPPORTED when no evidence chain exists for a claim after deterministic search

#### 17.4.2 Flag-Only Interpretive Boundary

A finding must be emitted as `confidenceClass = "interpretive"` and `escalationRequired = true` when any of the following is true:

- binding status of a note, annotation, or comment is unresolved
- test applicability to exact assembly configuration is unresolved
- wording sufficiency requires professional interpretation
- a live candidate source could alter the result
- classification remains incomplete or contested
- the same source pair cannot be assigned a deterministic parameter key

Interpretive boundary findings may be emitted as:
- AMBIGUITY
- CONTRA pending engineer reconciliation
- DIFF pending governing-value confirmation
- STALE when policy demands confirmation rather than automatic stale result

#### 17.4.3 Hard Prohibitions

The engine must never:
- emit language asserting certification, approval, or signoff
- silently convert an interpretive issue into a deterministic pass
- cite Lane 3 live retrieval as authoritative final evidence
- treat an unresolved ambiguity as cleared

### 17.5 Escalation Contract

Escalation is mandatory whenever any of the five blueprint triggers occurs. The rules engine shall set `escalationRequired = true` and route the finding into the engineer review packet and ambiguity/escalation artifacts.

| Trigger ID | Trigger Condition | Detection Law | Artifact Capture |
|---|---|---|---|
| ESC-001 | finding is interpretive rather than deterministic | `confidenceClass === "interpretive"` | finding + engineer review packet |
| ESC-002 | authoritative sources conflict without hierarchy resolution | two Lane 1 or Lane 1/Lane 2 sources conflict and no `HierarchyRule` resolves precedence | finding + contradiction log + engineer review packet |
| ESC-003 | candidate live source may affect finding | pass1 or pass2 references a Lane 3 candidate linked to the same parameter key | finding + live-source note + engineer review packet |
| ESC-004 | incomplete context blocks reliable classification | final class unresolved or required paired source absent for deterministic comparison | ambiguity queue + engineer review packet |
| ESC-005 | annotation/comment may materially affect conformance | a FIELD_ANNOTATION or similar note participates in a material comparison pair | ambiguity queue + engineer review packet |

### 17.6 Pack Mutation and Drift Gates

The rules engine and validation gates shall reject any pack manifest that attempts to:

- redefine engine pipeline stages
- disable pass1 or pass2
- alter mandatory artifact outputs
- promote Lane 3 to authoritative final evidence
- redefine runtime contract finding classes

Any addition to Section 4.1 In Scope requires a logged spec change and owner approval before implementation. Silent scope expansion is forbidden.


### 17.7 Compare Contract

The Compare stage is a distinct implementation unit between classification and final finding generation.

#### 17.7.1 ComparisonPair Selection Law

`buildComparisonPairs` must construct `ComparisonPair[]` deterministically from:

- classified source references
- active pack `ContradictionPattern[]`
- required artifact presence rules
- standard version policy entries
- document-class compatibility rules

A pair is only generated when the active pack permits the relevant document-class combination or when a required-artifact or version check requires a synthetic comparison context.

#### 17.7.2 Parameter Key Law

`parameterKey` is the normalized identifier for the value or claim being compared.
It must be stable and deterministic within a pack.
Examples include:

- `equipment_model`
- `assembly_condition`
- `standard_version`
- `fire_rating`
- `seismic_reference`
- `cooling_class`
- `certification_condition`
- `procedure_version`

#### 17.7.3 Comparison Type Law

- `parameter_match` — compare normalized values for the same parameter across two sources
- `presence_check` — compare required artifact expectation against actual package presence
- `version_check` — compare cited standard version against pack-governed current/allowed versions
- `wording_check` — compare an engineering or narrative assertion against evidence support language

#### 17.7.4 Pair Construction Rules

1. `parameter_match` pairs require two source references and one pack-governed `parameterKey`.
2. `presence_check` pairs may use a synthetic sourceB reference representing required-artifact expectation if the artifact is absent.
3. `version_check` pairs may compare a case-bound citation to a curated-reference policy entry.
4. `wording_check` pairs are required where blueprint pack law says engineering-letter wording must be checked against underlying evidence support.
5. If no deterministic `parameterKey` can be assigned, no deterministic pair may be emitted; the issue must instead route to interpretive escalation.

#### 17.7.5 Pattern Coupling

Where a `ComparisonPair` is created from a pack contradiction pattern, `patternId` must be populated with the originating `ContradictionPattern.patternId`.


## 18. Finding Generation Law

### 18.1 DIFF

Generate DIFF when two sources describe the same parameter and values differ without direct logical incompatibility yet established.

### 18.2 CONTRA

Generate CONTRA when two sources cannot both be true under the same case condition.

### 18.3 HOLE

Generate HOLE when a required artifact or evidence class is absent.

### 18.4 AMBIGUITY

Generate AMBIGUITY when a condition is plausibly material but not safe to resolve automatically.

### 18.5 UNSUPPORTED

Generate UNSUPPORTED when a claim appears but no evidence path exists.

### 18.6 STALE

Generate STALE when a cited version is older or outside pack-governed allowed set.

### 18.7 ASK

ASK is emitted for any deterministic or escalated issue requiring new input, with linked finding.

## 19. Finding Severity Law

### 19.1 Default Severity

- CONTRA: `high` by default, `critical` if mandatory conformance blocker
- HOLE: `high` by default, `critical` if required artifact blocks path
- AMBIGUITY: `medium` by default, `high` if authority-relevant
- UNSUPPORTED: `medium`
- STALE: `medium`
- DIFF: `low` or `medium` until promoted
- ASK: mirrors linked finding severity

### 19.2 Severity Promotion

Severity promotes to `critical` if:
- missing artifact blocks package completeness
- contradiction touches code/certification-critical parameter
- unresolved ambiguity blocks clean output

## 20. Confidence Model

### 20.1 Dimension Range

Each confidence dimension is a decimal in `[0.0, 1.0]`.

### 20.2 Storage Precision

Store to 3 decimal places.

### 20.3 Derived Band

Compute `confidenceBand` from weighted mean:

`weighted = 0.20*extraction + 0.20*classification + 0.25*contradiction + 0.20*applicability + 0.15*authority`

Bands:
- `high` if weighted >= 0.850
- `medium` if weighted >= 0.650 and < 0.850
- `low` if weighted < 0.650

### 20.4 Confidence Class

`deterministic` only if:
- finding originated from explicit rule or explicit document mismatch
- applicabilityConfidence >= 0.850
- sourceAuthorityConfidence >= 0.850
- no ambiguity flag set

Else `interpretive`.

## 21. Internal Readiness Metric

The owner approved implementation of an internal readiness metric as an operator-only triage aid. This metric is not a conformance determination and must never be presented as approval, certification, or final review outcome.

### 21.1 Formula

Start at 100.

Subtract:
- 25 per critical CONTRA
- 20 per critical HOLE
- 12 per high CONTRA
- 10 per high HOLE
- 6 per high AMBIGUITY
- 4 per UNSUPPORTED
- 3 per STALE
- 2 per medium DIFF

Clamp to `[0,100]`.

### 21.2 Mandatory Label Constraint

Wherever the readiness score appears in any artifact, it must carry the explicit label:

`Internal triage metric — not a conformance determination.`

Additional constraints:

- it must not appear in `10-output-brief.md` or `11-engineer-review-packet.md` without this label
- it must not appear in any demo-export bundle
- it may appear only in internal operator artifacts unless later law explicitly broadens that scope

### 21.3 Implementation Law

The readiness metric is approved for implementation in this spec version.
A builder shall implement it only as an internal operator-facing metric under the label and exposure constraints in §21.2.
No other artifact may present the metric without the required label.

### 21.4 Guess Log Resolution

ADD-002 is resolved.
The readiness metric is no longer prohibited.
It is approved by owner for implementation with the mandatory label constraint in §21.2.

## 22. Pack Manifest Contract

### 22.1 Manifest Shape

```ts
interface PackManifest {
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
```

### 22.2 CorpusEntry

```ts
interface CorpusEntry {
  corpusId: string;
  authority: "primary" | "secondary" | "reference";
  title: string;
  versionLabel: string;
  ownershipPackId: PackId;
  citationKey: string;
  localPath?: RelativePath;
  externalReference?: string;
}
```

### 22.2A ClassMapRule

```ts
interface ClassMapRule {
  ruleId: string;
  docClass: DocumentClass;
  matchCriteria: string;
  confidence: number;
  priority: number;
}
```

### 22.2B ExtractorHint

```ts
type ExtractorHintType = "section_marker" | "table_extractor" | "header_pattern" | "field_locator" | "keyword_bias";

interface ExtractorHint {
  hintId: string;
  appliesTo: DocumentClass[];
  hintType: ExtractorHintType;
  pattern?: string;
  note?: string;
}
```

### 22.2C StandardVersionPolicy

```ts
interface StandardVersionEntry {
  standardId: string;
  citationKey: string;
  currentAdoptedVersion: string;
  allowedVersions: string[];
  staleBehavior: "STALE_finding" | "reject" | "warn";
}

interface StandardVersionPolicy {
  entries: StandardVersionEntry[];
}
```


### 22.3 HierarchyRule

```ts
interface HierarchyRule {
  hierarchyId: string;
  description: string;
  higher: DocumentClass | "source_lane";
  lower: DocumentClass | "source_lane";
  condition?: string;
}
```

### 22.4 ContradictionPattern

```ts
interface ContradictionPattern {
  patternId: string;
  description: string;
  docClasses: DocumentClass[];
  parameterKeys: string[];
  severityDefault: Severity;
}
```

## 23. Pack v1 — California High-rise / Buildings

### 23.1 Ownership Boundary

Pack v1 owns:
- Title 24 Part 6 references relevant to building cases
- California Building Code structural/fire references relevant to building cases
- pack-owned building-specific standards
- HERS references when used in building case logic

Pack v1 does not own Title 20 or MAEDbS as primary corpus.
Those belong to Pack v2.

### 23.2 Supported Document Classes

Pack v1 supports:
- `COMPLIANCE_CERT`
- `DESIGN_PLANS`
- `SPEC_SHEET`
- `TEST_REPORT`
- `ENG_LETTER`
- `STD_REFERENCE`
- `MFR_SUBMITTAL`
- `FIELD_ANNOTATION`

### 23.3 Mandatory POC Comparison Examples

The first build must support patterns such as:
- plan detail vs test report condition
- engineering letter wording vs evidence support
- compliance certificate field vs plan or specification statement
- manufacturer submittal vs tested condition for building assemblies or rated materials
- field annotation vs formal requirement
- standard version cited vs current pack version
- seismic analysis note or engineering letter reference vs governing structural/seismic citation

## 24. Pack v2 — Appliance / Refrigeration

### 24.1 Ownership Boundary

Pack v2 owns:
- Title 20 references
- MAEDbS corpus entries
- DOE procedure references for selected product classes
- AHRI public directory references where applicable

### 24.2 Supported Document Classes

Pack v2 supports:
- `SPEC_SHEET`
- `TEST_REPORT`
- `MFR_SUBMITTAL`
- `STD_REFERENCE`
- `ENG_LETTER`

### 24.3 Mandatory POC Comparison Examples

Must support:
- manufacturer submittal vs tested condition
- test report vs MAEDbS claim
- product assembly or test condition match vs claimed certification condition in manufacturer submittal or MAEDbS filing
- procedure version cited vs current pack-governed version
- engineering letter assertion wording vs underlying test report evidence support
- unsupported claim in submittal

## 25. Pack v3 — Data Center

### 25.1 Ownership Boundary

Pack v3 owns:
- ASHRAE environmental-class references relevant to selected case
- NFPA 75 / 76 references relevant to selected case
- FM/UL equipment references relevant to selected case

### 25.2 Supported Document Classes

Pack v3 supports:
- `SPEC_SHEET`
- `TEST_REPORT`
- `MFR_SUBMITTAL`
- `ENG_LETTER`
- `DESIGN_PLANS`
- `STD_REFERENCE`

### 25.3 Mandatory POC Comparison Examples

Must support:
- cooling load spec vs equipment limits
- ASHRAE class vs operating conditions
- NFPA suppression reference vs installed/spec materials
- FM/UL certification vs manufacturer submittal
- engineering letter assertion vs underlying cooling, fire, or equipment evidence support
- design plan or equipment schedule listed values vs FM/UL certified or tested equipment conditions

## 26. Canonical POC Cases

### 26.1 POC Law

All three cases run through the same engine/runtime pair.
Only pack law changes.

### 26.2 Pack v1 Case Minimum

At least one case containing enough materials to exercise:
- `DESIGN_PLANS`
- `TEST_REPORT`
- `ENG_LETTER`
- `STD_REFERENCE`
and at least one of:
- `COMPLIANCE_CERT`
- `MFR_SUBMITTAL`
- `FIELD_ANNOTATION`

### 26.3 Pack v2 Case Minimum

At least one case containing:
- `SPEC_SHEET`
- `TEST_REPORT`
- `MFR_SUBMITTAL`
- `STD_REFERENCE`

### 26.4 Pack v3 Case Minimum

At least one case containing:
- `DESIGN_PLANS` or equivalent equipment schedule artifact
- `SPEC_SHEET`
- `TEST_REPORT`
- `STD_REFERENCE`

### 26.5 POC Gate Resolution of DIFF-005

POC ingest fidelity gate applies across all exercised class sets from all three cases, not Pack v1 only.

## 27. Human-as-Interface-First Mode

### 27.1 Operator Role

The human operator may:
- choose input files
- launch runs
- paste prompted values if a step requires manual bridge
- confirm candidate reference exclusion/inclusion for logging only
- review output artifacts

### 27.2 Operator Prompt Artifact

When runtime needs manual bridge input, it must emit `operator_prompt.json` with:

```ts
interface OperatorPrompt {
  promptId: Uuid;
  runId: Uuid;
  step: string;
  reason: string;
  requiredInputShape: Record<string, string>;
  blocking: boolean;
}
```

### 27.3 Non-Autonomous Rule

Human bridge mode must not change engine law.
It only fills execution gaps pending router/API automation.

## 28. Orchestration State Machine

### 28.1 State Transitions

Valid transitions:

- `created -> ingesting`
- `ingesting -> ingested | failed`
- `ingested -> classified | failed`
- `classified -> compare_pairs_built | failed`
- `compare_pairs_built -> pass1_complete | failed`
- `pass1_complete -> pass2_complete | failed`
- `pass2_complete -> rules_complete | failed`
- `rules_complete -> artifacts_built | failed`
- `artifacts_built -> validated | failed`
- `validated -> complete | failed`

No backward transitions except new run creation.

### 28.2 State Transition Validation

Each transition must require presence of prior-stage artifacts.

## 29. Artifact Contract

### 29.1 Required Artifact Filenames

Inside each run directory:

- `01-ingest-log.json`
- `02-provenance-ledger.json`
- `03-source-inventory.json`
- `04-classification-output.json`
- `05-comparison-result-set.json`
- `06-contradiction-log.json`
- `07-hole-log.json`
- `08-ambiguity-queue.json`
- `09-ask-list.json`
- `10-output-brief.md`
- `11-engineer-review-packet.md`

### 29.2 Optional Artifacts

- `12-operator-prompt.json`
- `13-pass1-raw-findings.json`
- `14-pass2-audit-findings.json`
- `15-validation-report.json`

### 29.3 Artifact Naming Gate

Artifact filenames must match exactly unless optional.
This avoids drift.

## 30. Output Brief Contract

### 30.1 Required Sections

`10-output-brief.md` must contain:
- case summary
- active pack
- run metadata
- source inventory summary
- contradiction summary
- hole summary
- ambiguity summary
- ask summary
- operator note on non-certification
- citations per item

### 30.2 Engineer Review Packet Contract

`11-engineer-review-packet.md` must contain:
- detailed findings grouped by severity
- all escalations
- citation references
- recommended asks
- deferred/operator notes

## 31. CLI Contract

### 31.1 Required Commands

- `cers init-case`
- `cers run-case`
- `cers validate-pack`
- `cers validate-run`
- `cers replay-run`

### 31.2 Example

    cers init-case --pack pack-california-highrise-v1 --title "demo case"
    cers run-case --case ./cases/demo-highrise --pack pack-california-highrise-v1

### 31.3 Deterministic Replay

`cers replay-run` must reproduce artifact outputs from same fixtures and pinned pack law.

## 32. Validation Gates

### 32.1 Gate Categories

- schema gate
- pack manifest gate
- artifact presence gate
- artifact filename gate
- state machine gate
- confidence range gate
- no-lane3-authority gate
- no-certification-language gate
- demo-exposure gate
- pack-mutation gate
- scope-change-log gate
- deterministic replay gate

### 32.2 No-Certification-Language Gate

Reject output if it includes phrases like:
- `approved`
- `certified by engine`
- `passes authority review`
- `this system certifies`

Allowed phrasing:
- `flagged`
- `requires engineer review`
- `evidence present`
- `missing artifact`
- `contradiction detected`

### 32.3 Confidence Range Gate

Reject any confidence value outside `[0,1]`.

### 32.4 Lane 3 Gate

Reject run if any emitted final finding cites a `live_candidate` source.

### 32.5 Demo-Exposure Gate

Reject any demo-export bundle containing:
- prompt chains
- internal reasoning traces
- internal-only rule-debug artifacts
- unredacted pack-law internals not required for review

### 32.6 Pack-Mutation Gate

Reject any pack manifest or runtime configuration that attempts to:
- redefine engine pipeline stages
- disable either model pass
- alter mandatory artifact outputs
- elevate Lane 3 to authoritative final evidence

### 32.7 Scope-Change-Log Gate

Reject implementation changes that expand Section 4.1 In Scope unless the change is logged in the build notes and explicitly owner-approved.

## 33. Deterministic Pseudocode

### 33.1 Main Run

```ts
async function runCase(input: RunCaseInput): Promise<RunResult> {
  const caseRecord = loadCase(input.casePath);
  const pack = loadAndValidatePack(input.packId);
  const run = createRun(caseRecord, pack);

  transition(run, "ingesting");
  const files = ingestFiles(caseRecord, run, pack);
  const sourceRefs = extractAndNormalize(files);
  transition(run, "ingested");

  const classified = classifySources(sourceRefs, pack);
  transition(run, "classified");

  const comparisonPairs = buildComparisonPairs(classified, pack);
  transition(run, "compare_pairs_built");

  const pass1 = await runPass1(classified, comparisonPairs, pack, run);
  transition(run, "pass1_complete");

  const pass2 = await runPass2(classified, comparisonPairs, pass1, pack, run);
  transition(run, "pass2_complete");

  const ruled = applyDeterministicRules(classified, comparisonPairs, pass1, pass2, pack, run);
  transition(run, "rules_complete");

  const asks = generateAsks(ruled.findings, pack);
  const artifacts = buildArtifacts(run, classified, ruled.findings, asks);
  transition(run, "artifacts_built");

  validateArtifacts(artifacts, run, pack);
  transition(run, "validated");

  finalizeRun(run, artifacts);
  transition(run, "complete");

  return { run, artifacts };
}
```

### 33.2 Ask Generation

```ts
function generateAsks(findings: Finding[], pack: PackManifest): Ask[] {
  return findings
    .filter(f => {
      if (f.findingClass === "HOLE" || f.findingClass === "AMBIGUITY" || f.findingClass === "UNSUPPORTED") return true;
      if (f.findingClass === "CONTRA") return f.escalationRequired || f.severity === "critical" || f.severity === "high";
      if (f.findingClass === "DIFF") return f.severity === "critical" || f.severity === "high" || f.confidenceClass === "interpretive";
      if (f.findingClass === "STALE") return Boolean(f.resolutionPath);
      return false;
    })
    .map(f => ({
      askId: uuid(),
      runId: f.runId,
      linkedFindingId: f.findingId,
      packId: f.packId,
      severity: f.severity,
      askType: deriveAskType(f),
      text: deriveAskText(f, pack),
      requiredForCleanOutput: f.escalationRequired || f.severity === "critical" || f.severity === "high",
    }));
}
```

## 34. Testing Requirements

### 34.1 Unit Tests Required

Must test:
- hash stability
- source lane precedence
- confidence band calculation
- finding-class constructors
- pack validation
- artifact filename validation
- no-certification-language validation
- state transition legality

### 34.2 Integration Tests Required

One integration test per pack:
- Pack v1 canonical case
- Pack v2 canonical case
- Pack v3 canonical case

One replay test:
- rerun same fixture and compare artifact hashes except timestamp fields

### 34.3 Snapshot Policy

Markdown artifacts may use normalized snapshots with timestamps stripped.

## 35. Failure Handling

### 35.1 Failure Artifact

Every failed run must emit `00-failure-log.json` containing:
- runId
- stage
- failureCode
- failureMessage
- stack summary if available
- safe operator next step

### 35.2 Failure Does Not Delete Artifacts

Partial artifacts stay on disk for audit.

## 36. Build Sequence for Builder

The builder shall implement in this order:

1. TS strict repo scaffold
2. base schemas and types
3. run/case records
4. ingest + hashing
5. source extraction + normalization
6. pack manifest loader + validator
7. document classification resolver
8. pass1 adapter
9. pass2 adapter
10. deterministic rules engine
11. finding merge
12. ask generation
13. artifact builders
14. validation gates
15. CLI commands
16. pack fixtures
17. integration tests
18. deterministic replay

No portal work before step 18 is green.

## 37. Known Holes, Diffs, and Best-Solves Log

### 37.1 Active Holes

None blocking at spec issue time.

### 37.2 Audit Resolution Log

- ADD-001 resolved by removing session-turn precedence from governing law.
- ADD-002 resolved — readiness metric approved by owner for implementation with mandatory label constraint per §21.2.
- HOLE-SPEC-001 resolved by defining `ClassMapRule`.
- HOLE-SPEC-002 resolved by defining `ExtractorHint`.
- HOLE-SPEC-003 resolved by defining `StandardVersionPolicy`.
- HOLE-SPEC-004 resolved by adding explicit escalation contract law.
- HOLE-SPEC-005 resolved by defining Compare as a distinct implementation unit.
- HOLE-SPEC-006 resolved by adding pack-mutation and scope-change gates.
- DIFF-SPEC-001 resolved by codifying assertion boundary law.
- DIFF-SPEC-002 resolved by adding seismic comparison requirement to Pack v1.
- DIFF-SPEC-003 resolved by adding manufacturer submittal vs tested condition to Pack v1.
- DIFF-SPEC-004 resolved by broadening ASK generation scope.
- DIFF-SPEC-005 resolved by setting `MAX_FILE_BYTES = 104857600` and `MAX_CASE_BYTES = 2147483648`.
- DIFF-SPEC-006 resolved by adding demo-exposure boundary and gate.
- DIFF-SPEC-007 resolved by explicitly accounting for Layer 4 covered vs deferred responsibilities.
- DIFF-SPEC-008 resolved by mapping blueprint stage names to spec runtime flow.
- DIFF-SPEC-009 resolved by requiring compliance certificate field vs plan or specification statement in Pack v1.

### 37.3 Remaining Best-Solves Log

- Engine-side archive handling remains reject-only in v1-2-2 because upload sandbox staging is blueprint law but explicitly deferred from this engine-first spec.
- OCR fallback is allowed but not required because deterministic extraction is prioritized and OCR is high-risk.

## 38. Completion Criteria

This spec is satisfied only when:

- the codebase passes `ci:gate`
- all three pack integration runs complete
- replay is deterministic
- emitted artifacts match naming and schema law
- no final findings cite Lane 3
- no output implies certification
- all findings include narrative description
- all pack manifests include standard/version policy and pack id/version

## 39. Final Spec Statement

This engineering spec defines the first deterministic build of CERS as a TypeScript strict, engine-first, three-pack, human-as-interface-first conformance runtime. The builder is expected to implement the full governed engine and runtime contract now, so later production work becomes polish, edge handling, and exposure-layer additions rather than a rewrite.
