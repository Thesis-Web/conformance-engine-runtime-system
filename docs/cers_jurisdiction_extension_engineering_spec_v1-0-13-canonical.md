
# Conformance Engine Runtime System
# Jurisdiction / Effective-Pack Extension Engineering Spec v1-0-13

## 1. Purpose

This engineering spec translates the approved jurisdiction / effective-pack extension blueprint into deterministic build law for the next additive extension build of Conformance Engine Runtime System (CERS).

This spec exists to let the builder implement the extension line by line without inventing architecture during build. It governs the additive Layer 3 composition system and additive Layer 4 effective-pack resolution system required to select exactly one governed effective pack context for a case before engine execution.

This spec does **not** redesign Layer 1 core-engine law or Layer 2 runtime-contract law except where the extension blueprint explicitly requires a reconciled additive change, and that change must be logged.

The extension exists to do only these things:

- resolve exactly one governed effective pack context for a case/run
- do so deterministically and replayably
- preserve engine compatibility by presenting a `PackManifest`-compatible result at the Layer 1 boundary
- support variable-depth jurisdiction hierarchies
- support effective-date-aware pack composition
- support lawful reuse of precomputed effective packs
- preserve custody, replay, and release-adjacent metadata around the resolved pack context

## 2. Governing Precedence

Precedence for this extension build is fixed:

1. `conformance-engine-blueprint-v1-2-2.md`
2. `conformance-engine-engineering-spec-v1-2-2.md`
3. `cers_jurisdiction_extension_blueprint_v1-0-5-canonical.md`
4. this extension engineering spec
5. approved extension audit logs
6. implementation details

Resolution rules:

- base blueprint governs if base blueprint and base engineering spec conflict
- extension blueprint governs extension scope and additive extension law
- this spec governs extension implementation law only
- no builder may silently mutate base law or extension law by convenience

## 3. Logged Reconciliations, Blockers, and Best-Solves

### 3.1 DIFF-EXT-BASE-001 | Open PackId Reconciliation

The base engineering spec hardcodes `PackId` as a closed union of three California-named identifiers.
The extension blueprint explicitly rejects that ceiling and requires `PackId` to become an open governed identifier model.

This is a real controlled diff.

Canonical reconciliation:

- Layer 1 engine behavior remains unchanged
- Layer 1 engine function signatures continue to consume `PackManifest`
- `PackId` is redefined at the shared type layer as a governed string type with validation law, not a closed union ceiling
- the three California base identifiers remain preserved as **legacy governed constants**
- no builder may remove legacy California identifiers
- no builder may introduce a new closed union ceiling for `PackId`

This reconciliation is additive extension law and is not optional.

### 3.2 HOLE-v103-005 | nominalTrackPackId Supersession

`nominalTrackPackId` is superseded.

Supersession law:

- no extension-path type, schema, fixture, or function may introduce `nominalTrackPackId` as an active field
- migration notes may mention it only as a historical transition artifact
- resolver selection narrows on `packId` + `trackFamilyId`
- no builder may implement both models in parallel

### 3.3 Base-Law Preservation Rule

Except for §3.1 and fields explicitly required by the extension blueprint, the extension must preserve:

- Layer 1 ingest -> normalize -> classify -> compare -> flag -> ask -> emit law
- two-pass chain requirement
- source lanes
- finding taxonomy
- assertion boundary
- artifact filenames and ordering
- CI order
- no-certification-language gate
- no-Lane3-authority gate
- thin-portal-last principle

### 3.4 BASE-BLOCKER-001 | Inherited pass2 Silent-Confirm Defect

Blueprint §30 identifies the unresolved pass2 silent-confirm defect in the base repo as a hard blocker before extension build begins.
The builder must verify this base defect is resolved before implementing any extension path that relies on two-pass finding quality.
If unresolved, extension build must pause and base repair must complete first.

### 3.5 BEST-SOLVE-001 | Deterministic Component Ordering

Blueprint §17.2 requires deterministic resolution but does not specify component sort order.
This spec defines the deterministic component ordering in §15.3.

Downstream affected surfaces:

- digest component-array ordering
- `EffectivePackId` derivation
- `componentProvenance` ordering
- replay determinism

### 3.6 BEST-SOLVE-002 | Effective-Pack displayName Composition

The blueprint does not specify `displayName` derivation for effective packs.
This spec composes it as `"{jurisdictionId} {trackFamilyId} effective pack"` unless later owner-approved law replaces it.

### 3.7 BEST-SOLVE-003 | Initial jurisdictionFamilyId Convention

The blueprint requires jurisdiction-family configuration but does not prescribe a format convention for `jurisdictionFamilyId`.
This spec defines lowercase underscore versioned identifiers and uses `us_state_local_v1` as the canonical initial Texas family identifier.


### 3.8 BEST-SOLVE-004 | Replay tierPath Pin Persistence

Blueprint §20 explicitly requires `tierPath` to be replay-persisted.
This spec persists `tierPath` directly on `RunRecordExtension` rather than inferring it only from `componentProvenance`.

Downstream affected surfaces:

- run-record schema extension
- replay validation
- state-transition validation
- California legacy regression through resolver

## 4. Build Scope


### 4.1 In Scope

This extension spec covers:

- open governed identifier handling for `PackId`
- `TrackFamilyId` type and validation law
- `JurisdictionTier` vocabulary and path rules
- `BaseStandardsModule`
- `JurisdictionFamilyConfig`
- `TierOverlay`
- `EffectivePackManifest`
- `EffectivePackId`
- effective-pack store records
- additive case/run schema extensions
- deterministic existing-case and new-case resolver behavior
- effective-date applicability math and overlap rejection
- composition digest math
- replay pinning for effective packs
- custody and release-adjacent fields required by blueprint
- validation and gate behavior for effective-pack resolution
- Texas-first implementation priority
- migration law for legacy California identifiers and regression fixtures
- repository placement for extension code, schemas, fixtures, and tests

### 4.2 Out of Scope

This extension spec does **not** cover:

- Layer 1 engine redesign
- Layer 2 finding taxonomy changes
- new artifact filename numbers
- CI order changes
- portal auth redesign
- cryptographic signature implementation
- tenant-isolation infrastructure
- full municipality self-publishing workflow
- K8s, queue, object-store, or hosting redesign
- direct SharePoint connector implementation
- broad international document vocabularies beyond hierarchy hooks
- code for Layer 5 UI beyond typed integration stubs if absolutely necessary

## 5. Repository Contract for the Extension

### 5.1 Required Additive Paths

The builder shall add extension code only in these canonical homes:

    /docs/
      cers_jurisdiction_extension_blueprint_v1-0-5-canonical.md
      jurisdiction-effective-pack-extension-engineering-spec-v1-0-13.md

    /src/packs/base-modules/
      base-standards-module.ts
      base-standards-loader.ts
      base-standards-validator.ts

    /src/packs/jurisdiction-families/
      jurisdiction-family-config.ts
      jurisdiction-family-loader.ts
      jurisdiction-family-validator.ts

    /src/packs/tier-overlays/
      tier-overlay.ts
      tier-overlay-loader.ts
      tier-overlay-validator.ts

    /src/packs/effective/
      effective-pack-manifest.ts
      effective-pack-composer.ts
      effective-pack-id.ts
      effective-pack-compatibility.ts
      effective-pack-store-types.ts

    /src/orchestration/resolver/
      resolve-effective-pack.ts
      resolver-types.ts
      resolver-validation.ts
      tier-path-builder.ts
      component-selection.ts
      overlap-detection.ts
      replay-resolution.ts

    /src/orchestration/effective-pack-store/
      effective-pack-store.ts
      effective-pack-store-memory.ts
      effective-pack-reuse.ts

    /src/types/
      identifiers.ts
      jurisdiction.ts
      effective-pack.ts
      extension-case-run.ts

    /src/validation/
      effective-pack-resolution-gate.ts

    /schemas/
      base-standards-module.schema.json
      jurisdiction-family-config.schema.json
      tier-overlay.schema.json
      effective-pack-manifest.schema.json
      effective-pack-store-record.schema.json
      effective-pack-resolution-result.schema.json

    /fixtures/
      /extension/
        /jurisdiction-families/
        /base-modules/
        /tier-overlays/
        /effective-pack-store/
        /cases/

    /tests/unit/
      effective-pack-id.test.ts
      tier-path-builder.test.ts
      component-selection.test.ts
      overlap-detection.test.ts
      effective-pack-composer.test.ts
      effective-pack-compatibility.test.ts
      effective-pack-reuse.test.ts
      identifier-validation.test.ts

    /tests/integration/
      effective-pack-resolution-texas-buildings.test.ts
      effective-pack-resolution-texas-appliance.test.ts
      effective-pack-resolution-texas-datacenter.test.ts
      effective-pack-replay.test.ts
      california-legacy-regression-through-resolver.test.ts

### 5.2 Existing Path Preservation

The builder shall not relocate or rename base-law files unless separately approved.
Extension code must remain additive.

## 6. Implementation Choice and Strictness

### 6.1 Language and Runtime

This extension inherits the base implementation choice:

- TypeScript strict
- Node.js 20+
- NodeNext module resolution
- same repo toolchain and quality gates as base build

### 6.2 Strictness Requirements

The extension must honor base strictness rules:

- `strict: true`
- `noImplicitAny: true`
- `exactOptionalPropertyTypes: true`
- `noUncheckedIndexedAccess: true`
- `useUnknownInCatchVariables: true`
- `noImplicitOverride: true`
- `noFallthroughCasesInSwitch: true`

No `any` in extension production code except one isolated adapter boundary with narrowing comment if needed.

## 7. Extension Build Sequence

The builder shall implement the extension in this exact order:

1. open-identifier and vocabulary types
2. schema extensions for new governed types
3. additive case/run record extensions
4. base-standards-module loader + validator
5. jurisdiction-family-config loader + validator
6. tier-overlay loader + validator
7. tier-path builder
8. component effective-date selector
9. overlap conflict detector
10. effective-pack composer
11. effective-pack-id derivation
12. effective-pack compatibility checker
13. effective-pack store + lawful reuse
14. existing-case resolver path
15. new-case resolver path
16. replay resolution path
17. failure-path artifacts and bounded operator prompt law
18. effective-pack-resolution validation gate
19. extension fixtures
20. unit tests
21. integration tests
22. deterministic replay through resolver
23. California legacy regression through resolver

No portal-facing work is required to satisfy this spec.

## 8. Canonical Extension Runtime Flow

The extension runtime flow wraps the base runtime but does not replace it.

### 8.1 New-Case Flow

1. load case metadata
2. validate operator-supplied resolution inputs
3. load jurisdiction family config
4. build required `tierPath`
5. load candidate base standards modules by `trackFamilyId`
6. load candidate tier overlays by active `tierPath`
7. apply effective-date filtering
8. reject illegal active overlap
9. compose `EffectivePackManifest`
10. validate engine compatibility against `PackManifest`
11. derive stable `effectivePackId`
12. optionally reuse/store lawful precomputed result
13. persist replay pin fields to run
14. pass base `PackManifest` projection to Layer 1 engine
15. run base engine unchanged

### 8.2 Existing-Case Flow

1. load case metadata
2. load prior pinned effective-pack context
3. if run is not explicitly forked, reuse pinned context
4. validate pinned context still exists in store or can be reconstructed exactly from pinned components
5. reject if missing pin or digest mismatch
6. pass base `PackManifest` projection to Layer 1 engine
7. run base engine unchanged

### 8.3 Replay Flow

1. load replay source run
2. load replay-persisted effective-pack fields
3. reconstruct or fetch exact pinned effective pack
4. validate digest equality
5. reject on any mismatch
6. pass projected base `PackManifest` to Layer 1 engine
7. execute replay

## 9. Identifier and Vocabulary Law

## 9.1 Primitive Type Aliases

    type IsoDate = string;        // YYYY-MM-DD only
    type IsoDatetime = string;
    type Sha256Hex = string;
    type Uuid = string;
    type RelativePath = string;
    type NonEmptyString = string;

### 9.2 PackId

`PackId` is an open governed identifier type.

Type law:

```ts
type PackId = string & { readonly __brand: "PackId" };

interface PackIdValidationResult {
  valid: boolean;
  normalizedInput: string;
  isLegacyBypass: boolean;
  jurisdictionScope?: string;
  trackFamilySlug?: string;
  versionIndex?: string;
  rejectionReason?: string;
}
```

Validation law:

- non-empty
- lowercase only
- segments separated by hyphen
- must match canonical template:
  `pack-{jurisdiction-scope}-{track-family-slug}-v{n}`
- `{jurisdiction-scope}` must be ISO 3166-2-aligned where available or governed equivalent
- `{track-family-slug}` must correspond to governed `TrackFamilyId`, except for explicit legacy bypass values in §9.3
- `{n}` is an integer >= 1

Canonical regex pre-check:

```txt
^pack-[a-z0-9]+(?:-[a-z0-9]+)*-[a-z0-9]+(?:_[a-z0-9]+)*-v[1-9][0-9]*$
```

Mandatory law:
- the regex check is necessary but not sufficient
- a `validatePackId(id: string): PackIdValidationResult` function is required
- the validator must:
  1. run the regex pre-check
  2. check the legacy constant whitelist in §9.3 before semantic segmentation
  3. attempt deterministic segmentation by resolving `{jurisdiction-scope}` from a governed jurisdiction registry or governed fixture set
  4. verify the resolved `{track-family-slug}` maps to a governed `TrackFamilyId`
  5. return the resolved segments for audit and logging use

### 9.3 Legacy PackId Constants

The following legacy constants remain valid:

- `pack-california-highrise-v1`
- `pack-california-appliance-refrig-v2`
- `pack-california-datacenter-v3`

These remain lawful values for migration, fixtures, and regression continuity.

Legacy validation law:

```ts
const LEGACY_PACK_ID_WHITELIST = new Set<PackId>([
  "pack-california-highrise-v1" as PackId,
  "pack-california-appliance-refrig-v2" as PackId,
  "pack-california-datacenter-v3" as PackId,
]);
```

If an input `PackId` is in `LEGACY_PACK_ID_WHITELIST`, semantic slug-to-`TrackFamilyId` validation is bypassed and `isLegacyBypass = true` must be recorded in the validator result.

### 9.4 TrackFamilyId


`TrackFamilyId` is a governed extensible vocabulary.

Type law:

```ts
type TrackFamilyId = string & { readonly __brand: "TrackFamilyId" };
```

Initial governed values:

- `buildings`
- `appliance_refrigeration`
- `datacenter`

Validation law:
- lowercase
- underscore separator allowed
- non-empty
- must belong to approved vocabulary list loaded from extension constants in v1-0-13

### 9.5 JurisdictionTier

`JurisdictionTier` is a governed vocabulary with this initial approved set:

- `supranational`
- `national`
- `state_or_member_state`
- `regional`
- `municipal`
- `local_authority`

No additional values may be used without additive log and owner approval.

### 9.6 EffectivePackId

`EffectivePackId` is additive and distinct from `PackId`.

Type law:

```ts
type EffectivePackId = string & { readonly __brand: "EffectivePackId" };
```

Canonical structure:

`epack-{packId-sans-prefix}-{jurisdictionId-hash8}-{asOfDate}-{digest12}`

Builder rule:
- this is derived, not operator-authored
- same governed inputs must produce the same `EffectivePackId`

## 10. Core Extension Interfaces


### 10.1 BaseStandardsModule

```ts
interface BaseStandardsModule {
  baseModuleId: string;
  displayName: string;
  supportedTrackFamilies: TrackFamilyId[];
  corpus: CorpusEntry[];
  hierarchyFragments: HierarchyRule[];
  contradictionPatternFragments: ContradictionPattern[];
  versionIndex: string;
  effectiveFrom: IsoDate;
  effectiveTo?: IsoDate;
  ownershipPackId: PackId;
  provenance: {
    sourceOwner: string;
    sourceAuthority: "primary" | "secondary" | "reference";
    lineageRef: string;
    authoringRef?: string;
  };
}
```

Validation law:
- `effectiveTo`, if present, must be `>= effectiveFrom`
- all `supportedTrackFamilies` must be unique
- fragment arrays may be empty but must exist
- `ownershipPackId` must validate as governed `PackId`

### 10.2 RequiredTierHandlingRule

```ts
interface RequiredTierHandlingRule {
  trackFamilyId: TrackFamilyId;
  requiredTiers: JurisdictionTier[];
  maximumTier: JurisdictionTier;
  allowResolutionAtIntermediateTier: boolean;
}
```

### 10.3 AllowedTierReferenceRule

```ts
interface AllowedTierReferenceRule {
  trackFamilyId: TrackFamilyId;
  allowedTiers: JurisdictionTier[];
}
```

### 10.4 JurisdictionFamilyConfig

```ts
interface JurisdictionFamilyConfig {
  jurisdictionFamilyId: string;
  displayName: string;
  supportedTrackFamilies: TrackFamilyId[];
  tierOrder: JurisdictionTier[];
  requiresMunicipalityByTrack: Partial<Record<TrackFamilyId, boolean>>;
  requiredTierHandlingByTrack: RequiredTierHandlingRule[];
  allowedTierReferencesByTrack: AllowedTierReferenceRule[];
  referencedBaseStandardsModulesByTrack: Partial<Record<TrackFamilyId, string[]>>;
  referencedTierOverlaysByTrack: Partial<Record<TrackFamilyId, string[]>>;
  versionIndex: string;
  effectiveFrom: IsoDate;
  effectiveTo?: IsoDate;
}
```

Validation law:
- `jurisdictionFamilyId` must match:

```txt
^[a-z][a-z0-9_]*_v[1-9][0-9]*$
```

- canonical initial Texas family value is `us_state_local_v1`
- `tierOrder` must contain unique values
- `requiredTiers` must be subset of `tierOrder`
- `maximumTier` must appear in `tierOrder`
- string values in `referencedBaseStandardsModulesByTrack` are `baseModuleId` values and must exist in loaded module scope
- string values in `referencedTierOverlaysByTrack` are `tierOverlayId` values and must exist in loaded overlay scope
- `requiresMunicipalityByTrack[track] = true` implies `tierOrder` includes `municipal` or `local_authority`

### 10.5 TierPathEntry


```ts
interface TierPathEntry {
  tierType: JurisdictionTier;
  tierId: string;
  parentTierId?: string;
}
```

### 10.6 TierOverlay

```ts
interface TierOverlay {
  tierOverlayId: string;
  tierType: JurisdictionTier;
  tierId: string;
  parentTierId?: string;
  jurisdictionFamilyId: string;
  jurisdictionId: string;
  supportedTrackFamilies: TrackFamilyId[];
  corpusFragments: CorpusEntry[];
  hierarchyFragments: HierarchyRule[];
  contradictionPatternFragments: ContradictionPattern[];
  versionIndex: string;
  effectiveFrom: IsoDate;
  effectiveTo?: IsoDate;
  provenance: {
    sourceOwner: string;
    approvalPath: string;
    lineageRef: string;
    submittedBy?: string;
  };
  eligibilityBases?: Array<
    | "track_requires_municipality"
    | "municipality_adds_governing_standards"
    | "municipality_adds_hierarchy_or_contradiction_behavior"
    | "municipality_materially_changes_applicability"
  >;
  governanceLifecycle: "candidate" | "validated" | "approved" | "active" | "deprecated";
}
```

Validation law:
- `tierType` must be valid `JurisdictionTier`
- `governanceLifecycle` must be valid
- only overlays with lifecycle `active` may participate in composition
- `tierId` must be unique within `(jurisdictionFamilyId, tierType, versionIndex, effectiveFrom, effectiveTo)`
- `parentTierId` is required whenever `tierType` is not the first entry in active family `tierOrder`
- `eligibilityBases` must be non-empty when `tierType` is `municipal` or `local_authority`

### 10.7 ComponentProvenanceEntry

```ts
interface ComponentProvenanceEntry {
  componentKind: "base_module" | "tier_overlay";
  componentId: string;
  versionIndex: string;
  effectiveFrom: IsoDate;
  effectiveTo?: IsoDate;
  digest: Sha256Hex;
}
```

### 10.8 EffectivePackManifest

```ts
interface EffectivePackManifest extends PackManifest {
  effectivePackId: EffectivePackId;
  effectivePackVersion: string;
  packId: PackId;
  trackFamilyId: TrackFamilyId;
  jurisdictionFamilyId: string;
  jurisdictionId: string;
  tierPath: TierPathEntry[];
  municipalityId?: string;
  governingAsOfDate: IsoDate;
  componentProvenance: ComponentProvenanceEntry[];
  compositionDigest: Sha256Hex;
  resolvedAt: IsoDatetime;
  resolvedBy: string;
  resolutionReason?: string;
  resolutionMethod: "composed_fresh" | "reused_precomputed" | "replayed_pinned";
  replayPinned: boolean;
  replaySourceRunId?: Uuid;
  releaseState: "draft" | "in_review" | "released" | "superseded";
  reviewedBy?: string;
  releasedBy?: string;
  releasedAt?: IsoDatetime;
  reviewSignatureRef?: string;
  tenantId?: string;
  orgId?: string;
}
```

### 10.9 EffectivePackStoreRecord

```ts
interface EffectivePackStoreRecord {
  effectivePackId: EffectivePackId;
  compositionDigest: Sha256Hex;
  packId: PackId;
  trackFamilyId: TrackFamilyId;
  jurisdictionFamilyId: string;
  jurisdictionId: string;
  tierPath: TierPathEntry[];
  municipalityId?: string;
  governingAsOfDate: IsoDate;
  componentIds: string[];
  componentDigests: Sha256Hex[];
  storedAt: IsoDatetime;
  manifestPath: RelativePath;
  compatibilityValidated: boolean;
  replayValidated: boolean;
}
```

### 10.10 EffectivePackResolutionInput

```ts
interface EffectivePackResolutionInput {
  mode: "existing_case" | "new_case" | "replay";
  caseId: Uuid;
  runId: Uuid;
  packId: PackId;
  trackFamilyId: TrackFamilyId;
  jurisdictionFamilyId: string;
  jurisdictionId: string;
  governingAsOfDate: IsoDate;
  municipalityId?: string;
  tierPathOverride?: TierPathEntry[];
  explicitForkFromRunId?: Uuid;
  replaySourceRunId?: Uuid;
  operatorId: string;
}
```

Input note:
- `explicitForkFromRunId` is used only for explicit fork behavior in `existing_case` mode
- `replaySourceRunId` is used only in `replay` mode
- builders must not treat the two fields as interchangeable

### 10.11 EffectivePackResolutionResult

```ts
interface EffectivePackResolutionResult {
  resolved: boolean;
  effectivePackId?: EffectivePackId;
  manifestPath?: RelativePath;
  resolutionMethod?: "composed_fresh" | "reused_precomputed" | "replayed_pinned";
  rejectionCode?: string;
  rejectionReason?: string;
  emittedOperatorPrompt?: boolean;
}
```

## 11. Additive Case and Run Record Extensions

### 11.1 CaseRecord Extension

The extension adds these minimum fields to `CaseRecord`:

```ts
interface CaseRecordExtension {
  trackFamilyId: TrackFamilyId;
  jurisdictionFamilyId: string;
  jurisdictionId: string;
  municipalityId?: string;
  tenantId?: string;
  orgId?: string;
  uploadedBy: NonEmptyString;
  governingAsOfDate: IsoDate;
}
```

Rules:

- `packId` remains required on `CaseRecord`
- `governingAsOfDate` must be operator-supplied for new cases
- no default from wall-clock timestamps

### 11.2 RunRecord Extension

The extension adds these minimum fields to `RunRecord`:

```ts
interface RunRecordExtension {
  resolvedEffectivePackId?: EffectivePackId;
  resolvedAt?: IsoDatetime;
  resolvedBy?: string;
  reviewedBy?: string;
  governingAsOfDate?: IsoDate;
  releasedBy?: string;
  releasedAt?: IsoDatetime;
  reviewSignatureRef?: string;
  releaseState?: "draft" | "in_review" | "released" | "superseded";
  replaySourceRunId?: Uuid;
  compositionDigest?: Sha256Hex;
  componentDigests?: Sha256Hex[];
  tierPath?: TierPathEntry[];
}
```

Rules:
- these are additive
- run records created before resolution may omit them
- `releaseState` must be initialized to `draft` at run creation

### 11.3 Extension State-Machine Rule

Resolution occurs before base-engine ingest.
The effective pack must be resolved before the run transitions from `created` to `ingesting`.

Required resolved fields before `created -> ingesting`:

- `resolvedEffectivePackId`
- `resolvedAt`
- `resolvedBy`
- `governingAsOfDate`
- `compositionDigest`
- `componentDigests`
- `tierPath`

State-machine validation must reject `created -> ingesting` with `ERR_EFFECTIVE_PACK_NOT_RESOLVED` if any required resolved field is absent.

## 12. PackManifest Compatibility Boundary


### 12.1 Hard Rule

`EffectivePackManifest` is a strict superset of `PackManifest`.
It does not replace `PackManifest`.

### 12.2 Layer 1 Typing Enforcement

All Layer 1 function signatures must remain typed to base `PackManifest`, not `EffectivePackManifest`.

Builder rule:
- any function under `/src/core/` that accepts a manifest must use `PackManifest`
- extension-only fields may not become required Layer 1 inputs

### 12.3 Projection Law

Before the engine runs, the resolver must project `EffectivePackManifest` to a base `PackManifest` view.

Pseudocode:

```ts
function projectToBasePackManifest(effective: EffectivePackManifest): PackManifest {
  return {
    packId: effective.packId,
    versionIndex: effective.versionIndex,
    displayName: effective.displayName,
    jurisdiction: effective.jurisdiction,
    corpus: effective.corpus,
    classMap: effective.classMap,
    hierarchyConfig: effective.hierarchyConfig,
    contradictionPatterns: effective.contradictionPatterns,
    optionalExtractors: effective.optionalExtractors,
    standardVersionPolicy: effective.standardVersionPolicy,
    supportedDocumentClasses: effective.supportedDocumentClasses,
  };
}
```

### 12.4 Compatibility Validation

The compatibility checker must prove:

- all required `PackManifest` fields are present
- all base manifest arrays satisfy existing schema law
- no extension-only field is needed for Layer 1 execution
- projecting the effective manifest loses no data required by base engine behavior

`validateEffectivePackCompatibility(manifest)` implements this four-condition check and must throw `ERR_EFFECTIVE_PACK_COMPATIBILITY` when any condition fails.

## 13. GoverningAsOfDate Law

### 13.1 Format

`governingAsOfDate` must be `YYYY-MM-DD` only.

Regex:

```txt
^\d{4}-\d{2}-\d{2}$
```

### 13.2 Parse Validation

Use UTC date parsing without time component.
Any invalid calendar date rejects.

### 13.3 Future-Date Rule

Let:

- `D_input` = parsed governing date
- `D_now` = current system date in UTC, truncated to date

Reject if:

`D_input > D_now`

unless future planning is separately owner-approved in later law.

### 13.4 Effective-Date Applicability Test

A component is active on `D_asof` iff:

- `effectiveFrom <= D_asof`
- and (`effectiveTo` is absent or `D_asof <= effectiveTo`)

Mathematically:

```txt
active(component, D_asof) =
  (component.effectiveFrom <= D_asof)
  AND
  (component.effectiveTo is null OR D_asof <= component.effectiveTo)
```

## 14. Tier Path Law

### 14.1 Order Rule

`tierPath` must be ordered from lower specificity to higher specificity, matching the active family order.

Examples:

- `US -> US-TX -> US-TX-HOUSTON`
- `EU -> FR -> FR-IDF -> FR-PARIS`

### 14.2 Builder Algorithm

Pseudocode:

```ts
function buildTierPath(
  family: JurisdictionFamilyConfig,
  jurisdictionId: string,
  municipalityId: string | undefined,
  trackFamilyId: TrackFamilyId
): TierPathEntry[] {
  const requiresMunicipality = family.requiresMunicipalityByTrack[trackFamilyId] === true;
  if (requiresMunicipality && !municipalityId) {
    throw new ResolverError("ERR_MUNICIPALITY_REQUIRED", `Track ${trackFamilyId} requires municipalityId`);
  }

  const required = lookupRequiredTierHandling(family, trackFamilyId);
  const path: TierPathEntry[] = [];

  for (const tier of family.tierOrder) {
    const entry = resolveTierEntry(tier, jurisdictionId, municipalityId);
    if (!entry) {
      if (required.requiredTiers.includes(tier)) {
        throw new ResolverError("ERR_REQUIRED_TIER_MISSING", `Missing required tier ${tier}`);
      }
      continue;
    }
    path.push(entry);
    if (tier === required.maximumTier && required.allowResolutionAtIntermediateTier) {
      break;
    }
  }

  return validateTierPath(path, family, trackFamilyId);
}
```

### 14.3 Required Helper Pseudocode

```ts
function lookupRequiredTierHandling(
  family: JurisdictionFamilyConfig,
  trackFamilyId: TrackFamilyId
): RequiredTierHandlingRule {
  const rule = family.requiredTierHandlingByTrack.find(r => r.trackFamilyId === trackFamilyId);
  if (!rule) throw new ResolverError("ERR_REQUIRED_TIER_RULE_MISSING", `No tier handling rule for ${trackFamilyId}`);
  return rule;
}

function resolveTierEntry(
  tier: JurisdictionTier,
  jurisdictionId: string,
  municipalityId: string | undefined
): TierPathEntry | null {
  // Texas-first v1-0-13 implementation scope: national -> state_or_member_state -> municipal/local_authority.
  // Non-U.S. supranational/regional derivation remains additive future work under the same hierarchy law.
  if (tier === "national") {
    const parts = jurisdictionId.split("-");
    const country = parts[0] ?? jurisdictionId;
    return { tierType: tier, tierId: country };
  }

  if (tier === "state_or_member_state") {
    return { tierType: tier, tierId: jurisdictionId };
  }

  if (tier === "municipal" || tier === "local_authority") {
    if (!municipalityId) return null;
    return { tierType: tier, tierId: municipalityId, parentTierId: jurisdictionId };
  }

  return null;
}

function validateTierPath(
  path: TierPathEntry[],
  family: JurisdictionFamilyConfig,
  trackFamilyId: TrackFamilyId
): TierPathEntry[] {
  const seen = new Set<string>();
  for (const entry of path) {
    const key = `${entry.tierType}:${entry.tierId}`;
    if (seen.has(key)) throw new ResolverError("ERR_DUPLICATE_TIER_PATH_ENTRY", key);
    seen.add(key);
  }

  const required = lookupRequiredTierHandling(family, trackFamilyId);
  for (const tier of required.requiredTiers) {
    if (!path.some(entry => entry.tierType === tier)) {
      throw new ResolverError("ERR_REQUIRED_TIER_MISSING", `Missing required tier ${tier}`);
    }
  }

  return path;
}
```

### 14.4 Municipality Rule

If `requiresMunicipalityByTrack[trackFamilyId] = true`, then:
- `municipalityId` is mandatory
- the built `tierPath` must include `municipal` or `local_authority`
- absence is a hard resolution failure

## 15. Component Selection Law

### 15.1 Base Module Selection

Select candidate base modules where all are true:

- `trackFamilyId` is supported
- module id is referenced by active family for that track
- module is active on `governingAsOfDate`

Pseudocode:

```ts
function selectApplicableBaseModules(
  family: JurisdictionFamilyConfig,
  trackFamilyId: TrackFamilyId,
  governingAsOfDate: IsoDate,
  modules: BaseStandardsModule[]
): BaseStandardsModule[] {
  const referencedIds = new Set(family.referencedBaseStandardsModulesByTrack[trackFamilyId] ?? []);
  return modules
    .filter(module =>
      module.supportedTrackFamilies.includes(trackFamilyId) &&
      referencedIds.has(module.baseModuleId) &&
      isActiveOn(module, governingAsOfDate)
    );
}
```

### 15.2 Overlay Selection

Select candidate overlays where all are true:

- `trackFamilyId` is supported
- overlay `jurisdictionFamilyId` matches input
- overlay `jurisdictionId` is equal to or a prefix of the input `jurisdictionId` in governed hierarchy terms
- overlay `tierType` and `tierId` appear in active `tierPath`
- overlay lifecycle is `active`
- overlay is active on `governingAsOfDate`

Pseudocode:

```ts
function selectApplicableTierOverlays(
  family: JurisdictionFamilyConfig,
  tierPath: TierPathEntry[],
  input: EffectivePackResolutionInput,
  overlays: TierOverlay[]
): TierOverlay[] {
  const referencedIds = new Set(family.referencedTierOverlaysByTrack[input.trackFamilyId] ?? []);
  const tierKeys = new Set(tierPath.map(entry => `${entry.tierType}:${entry.tierId}`));

  return overlays
    .filter(overlay =>
      overlay.supportedTrackFamilies.includes(input.trackFamilyId) &&
      overlay.jurisdictionFamilyId === input.jurisdictionFamilyId &&
      (input.jurisdictionId === overlay.jurisdictionId || input.jurisdictionId.startsWith(overlay.jurisdictionId + "-")) &&
      tierKeys.has(`${overlay.tierType}:${overlay.tierId}`) &&
      overlay.governanceLifecycle === "active" &&
      referencedIds.has(overlay.tierOverlayId) &&
      isActiveOn(overlay, input.governingAsOfDate)
    );
}
```

### 15.3 Deterministic Ordering

All selected components must be sorted by:

1. `tierPath` order ascending specificity
2. component kind (`base_module` before `tier_overlay`)
3. `effectiveFrom` descending
4. `versionIndex` descending
5. stable lexical `componentId`

This ordering is used for digest derivation and repeatability.

Pseudocode:

```ts
function compareSelectedComponents(a: SelectedComponent, b: SelectedComponent): number {
  return (
    compareTierSpecificity(a, b) ||
    compareComponentKind(a, b) ||
    compareDescending(a.effectiveFrom, b.effectiveFrom) ||
    compareDescending(a.versionIndex, b.versionIndex) ||
    compareLexical(a.componentId, b.componentId)
  );
}
```

Required ordering helper law:

```ts
type SelectedComponent = {
  raw: BaseStandardsModule | TierOverlay;
  componentKind: "base_module" | "tier_overlay";
  componentId: string;
  effectiveFrom: IsoDate;
  versionIndex: string;
  resolvedTierPathIndex: number; // -1 for base modules
};

function toSelectedComponent(
  component: BaseStandardsModule | TierOverlay,
  tierPath: TierPathEntry[]
): SelectedComponent {
  if ("baseModuleId" in component) {
    return {
      raw: component,
      componentKind: "base_module",
      componentId: component.baseModuleId,
      effectiveFrom: component.effectiveFrom,
      versionIndex: component.versionIndex,
      resolvedTierPathIndex: -1,
    };
  }

  const tierIdx = tierPath.findIndex(
    entry => entry.tierType === component.tierType && entry.tierId === component.tierId
  );

  return {
    raw: component,
    componentKind: "tier_overlay",
    componentId: component.tierOverlayId,
    effectiveFrom: component.effectiveFrom,
    versionIndex: component.versionIndex,
    resolvedTierPathIndex: tierIdx,
  };
}

function compareTierSpecificity(a: SelectedComponent, b: SelectedComponent): number {
  return a.resolvedTierPathIndex - b.resolvedTierPathIndex;
}

function compareComponentKind(a: SelectedComponent, b: SelectedComponent): number {
  if (a.componentKind === b.componentKind) return 0;
  return a.componentKind === "base_module" ? -1 : 1;
}

function compareDescending(a: string, b: string): number {
  return a === b ? 0 : a > b ? -1 : 1;
}

function compareLexical(a: string, b: string): number {
  return a.localeCompare(b);
}
```

## 16. Overlap and Conflict Detection

### 16.1 Illegal Active Overlap

For any component family keyed by:

- component kind
- track family
- jurisdiction family
- tier type
- tier id

there must not exist two active components on the same `governingAsOfDate` unless the extension blueprint explicitly allows coexistence.

`versionIndex` is a lineage label and is not part of the coexistence key.

Mathematically, for components `a` and `b`:

```txt
overlap(a,b) =
  max(a.effectiveFrom, b.effectiveFrom) <= min(a.effectiveTo_or_inf, b.effectiveTo_or_inf)
```

If `overlap(a,b)` and same coexistence key, reject.

Pseudocode:

```ts
function detectIllegalOverlap(
  baseModules: BaseStandardsModule[],
  overlays: TierOverlay[],
  governingAsOfDate: IsoDate
): void {
  const components = [...baseModules, ...overlays].filter(component => isActiveOn(component, governingAsOfDate));
  const grouped = new Map<string, Array<BaseStandardsModule | TierOverlay>>();

  for (const component of components) {
    const key = deriveCoexistenceKey(component);
    const bucket = grouped.get(key) ?? [];
    bucket.push(component);
    grouped.set(key, bucket);
  }

  for (const [key, bucket] of grouped.entries()) {
    for (let i = 0; i < bucket.length; i += 1) {
      for (let j = i + 1; j < bucket.length; j += 1) {
        const a = bucket[i];
        const b = bucket[j];
        if (a !== undefined && b !== undefined && dateRangesOverlap(a, b)) {
          throw new ResolverError("ERR_EFFECTIVE_DATE_OVERLAP", `Illegal active overlap for ${key}`);
        }
      }
    }
  }
}

function deriveCoexistenceKey(component: BaseStandardsModule | TierOverlay): string {
  if ("baseModuleId" in component) {
    return `base_module|${component.baseModuleId}`;
  }
  return `tier_overlay|${component.jurisdictionFamilyId}|${component.tierType}|${component.tierId}`;
}

function dateRangesOverlap(
  a: BaseStandardsModule | TierOverlay,
  b: BaseStandardsModule | TierOverlay
): boolean {
  const latestStart = a.effectiveFrom > b.effectiveFrom ? a.effectiveFrom : b.effectiveFrom;
  const aEnd = a.effectiveTo ?? "9999-12-31";
  const bEnd = b.effectiveTo ?? "9999-12-31";
  const earliestEnd = aEnd < bEnd ? aEnd : bEnd;
  return latestStart <= earliestEnd;
}
```

### 16.2 Corpus Duplicate Rule

Duplicate corpus items are keyed by:

- `citationKey` when present
- else `corpusId`

If duplicate keys occur:
- prefer the higher-specificity tier component only when override is explicitly allowed
- otherwise reject composition with `ERR_CORPUS_CONFLICT`

### 16.3 Hierarchy and Contradiction Fragment Override Rule

Override is lawful only where extension blueprint allows it.
Absent explicit allowance:
- merge additively
- reject direct same-id conflict

## 17. Composition Law

### 17.1 EffectivePackManifest Construction

The composer builds:

- base `PackManifest` fields
- extension-only fields
- merged corpus
- merged hierarchy config
- merged contradiction patterns
- inherited optional extractors
- standard version policy
- component provenance
- digest and identity

Pseudocode:

```ts
function composeEffectivePack(
  input: EffectivePackResolutionInput,
  family: JurisdictionFamilyConfig,
  tierPath: TierPathEntry[],
  baseModules: BaseStandardsModule[],
  overlays: TierOverlay[],
  compositionDigest: Sha256Hex
): EffectivePackManifest {
  const selectedComponents = [...baseModules, ...overlays]
    .map(component => toSelectedComponent(component, tierPath))
    .sort(compareSelectedComponents);

  // Callers pass raw baseModules and overlays.
  // composeEffectivePack derives its own sorted SelectedComponent[] internally.
  // This sort is intentional and idempotent for identical inputs, and matches the digest ordering law.
  const rawComponents = selectedComponents.map(component => component.raw);
  const mergedCorpus = mergeCorpusFromComponents(rawComponents);
  const mergedHierarchy = mergeHierarchyFragments(rawComponents);
  const mergedPatterns = mergeContradictionFragments(rawComponents);
  const optionalExtractors = deriveOptionalExtractors(input.packId, input.trackFamilyId);
  const standardVersionPolicy = deriveStandardVersionPolicy(input.packId, input.trackFamilyId);

  const digestInput = buildDigestInput(input, tierPath, selectedComponents);
  const effectivePackId = deriveEffectivePackId(digestInput, compositionDigest);

  return {
    ...deriveBaseManifestFields(input, mergedCorpus, mergedHierarchy, mergedPatterns, optionalExtractors, standardVersionPolicy),
    effectivePackId,
    effectivePackVersion: "1",
    packId: input.packId,
    trackFamilyId: input.trackFamilyId,
    jurisdictionFamilyId: input.jurisdictionFamilyId,
    jurisdictionId: input.jurisdictionId,
    tierPath,
    municipalityId: input.municipalityId,
    governingAsOfDate: input.governingAsOfDate,
    componentProvenance: buildComponentProvenance(selectedComponents),
    compositionDigest,
    resolvedAt: nowIsoDatetime(),
    resolvedBy: input.operatorId,
    resolutionMethod: "composed_fresh",
    replayPinned: false,
    releaseState: "draft",
  };
}
```

### 17.2 Manifest Derivation Rules

- `packId` is the nominal pack identifier provided by case/run input
- `trackFamilyId` is carried explicitly
- `displayName` may be composed as:
  `"{jurisdictionId} {trackFamilyId} effective pack"`
- `jurisdiction` remains a base compatible display/jurisdiction field, typically `jurisdictionId`

### 17.3 Component Provenance Order

`componentProvenance` must preserve the same sorted order used in component selection.

### 17.4 Required Merge and Composition Helper Pseudocode

The following helpers are required minimum executable behavior under anti-stub law:

```ts
function mergeCorpusFromComponents(components: Array<BaseStandardsModule | TierOverlay>): CorpusEntry[] {
  const byKey = new Map<string, CorpusEntry>();

  for (const component of components) {
    const entries = "baseModuleId" in component ? component.corpus : component.corpusFragments;
    for (const entry of entries) {
      const key = entry.citationKey || entry.corpusId;
      const existing = byKey.get(key);
      if (!existing) {
        byKey.set(key, entry);
        continue;
      }
      if (stableJsonStringify(existing) !== stableJsonStringify(entry)) {
        throw new ResolverError("ERR_CORPUS_CONFLICT", key);
      }
    }
  }

  return Array.from(byKey.values());
}

function buildDigestInput(
  input: EffectivePackResolutionInput,
  tierPath: TierPathEntry[],
  components: SelectedComponent[]
): DigestInput {
  return {
    packId: input.packId,
    trackFamilyId: input.trackFamilyId,
    jurisdictionFamilyId: input.jurisdictionFamilyId,
    jurisdictionId: input.jurisdictionId,
    municipalityId: input.municipalityId,
    governingAsOfDate: input.governingAsOfDate,
    tierPath,
    components: components.map(component => ({
      kind: component.componentKind,
      id: component.componentId,
      versionIndex: component.raw.versionIndex,
      effectiveFrom: component.raw.effectiveFrom,
      effectiveTo: component.raw.effectiveTo,
      digest: sha256Utf8(stableJsonStringify(component.raw)),
    })),
  };
}

function buildComponentProvenance(components: SelectedComponent[]): ComponentProvenanceEntry[] {
  return components.map(component => ({
    componentKind: component.componentKind,
    componentId: component.componentId,
    versionIndex: component.raw.versionIndex,
    effectiveFrom: component.raw.effectiveFrom,
    effectiveTo: component.raw.effectiveTo,
    digest: sha256Utf8(stableJsonStringify(component.raw)),
  }));
}
```

Additive helper note:
- digest helpers `sha256Utf8` and `stableJsonStringify` must conform to the serialization law in §18.1; implementations that deviate from §18.1 law will produce digests incompatible with replay validation.
- `mergeHierarchyFragments` deduplicates by `hierarchyId`. If two fragments share the same `hierarchyId` and differ in content, reject with `ERR_HIERARCHY_CONFLICT`.
- `mergeContradictionFragments` deduplicates by `patternId`. If two fragments share the same `patternId` and differ in content, reject with `ERR_CONTRADICTION_PATTERN_CONFLICT`.
- `deriveOptionalExtractors`, `deriveStandardVersionPolicy`, and `deriveBaseManifestFields` follow the same deterministic additive pattern as `mergeCorpusFromComponents` but without duplicate-key conflict rejection unless explicitly required elsewhere in this spec.
- override behavior for duplicate corpus keys is deferred until a future spec version explicitly names lawful higher-specificity override cases. v1-0-11 rejects all duplicate-key conflicts.
- `effectivePackVersion` is set to `"1"` for all freshly composed effective packs in v1-0-13. It is a composition-output schema version marker, not a recomposition counter.
- `nowIsoDatetime()` returns `new Date().toISOString()` in UTC.

## 18. Composition Digest and EffectivePackId Math

### 18.1 Canonical Serialization

Digest input object:

```ts
interface DigestInput {
  packId: PackId;
  trackFamilyId: TrackFamilyId;
  jurisdictionFamilyId: string;
  jurisdictionId: string;
  municipalityId?: string;
  governingAsOfDate: IsoDate;
  tierPath: TierPathEntry[];
  components: Array<{
    kind: "base_module" | "tier_overlay";
    id: string;
    versionIndex: string;
    effectiveFrom: IsoDate;
    effectiveTo?: IsoDate;
    digest: Sha256Hex;
  }>;
}
```

Serialization law:

- `stableJsonStringify` must use alphabetically sorted object-key order at all nesting levels
- fields with `undefined` values must be omitted, not serialized as `null`
- array ordering must be preserved exactly as provided
- UTF-8 bytes are the hash input encoding
- implementation must use `fast-json-stable-stringify` or an owner-approved equivalent
- `sha256Utf8` must use Node `crypto.createHash("sha256")` with UTF-8 input and hex output

### 18.2 Composition Digest

```ts
function computeCompositionDigest(input: DigestInput): Sha256Hex {
  const json = stableJsonStringify(input);
  return sha256Utf8(json);
}
```

### 18.3 EffectivePackId Derivation

```ts
function deriveEffectivePackId(input: DigestInput, digest: Sha256Hex): EffectivePackId {
  const packSuffix = input.packId.replace(/^pack-/, "");
  const jurisdictionHash = sha256Utf8(input.jurisdictionId).slice(0, 8);
  const digestShort = digest.slice(0, 12);
  return brandEffectivePackId(
    `epack-${packSuffix}-${jurisdictionHash}-${input.governingAsOfDate}-${digestShort}`
  );
}

function brandEffectivePackId(id: string): EffectivePackId {
  return id as EffectivePackId;
}
```

Same `DigestInput` must produce same digest and same `EffectivePackId`.

## 19. Effective-Pack Store and Reuse Law


### 19.1 Reuse Preconditions

A stored effective pack is reusable iff all are true:

- same `packId`
- same `trackFamilyId`
- same `jurisdictionFamilyId`
- same `jurisdictionId`
- same `municipalityId` or both absent
- same ordered `tierPath`
- same `governingAsOfDate`
- same `compositionDigest`
- compatibility was validated
- replay validity flag remains true

### 19.2 Fresh Compose Requirement

Recompose if **any** governing input or component digest differs.

### 19.3 Store Key

The store lookup key is the tuple:

```txt
(packId, trackFamilyId, jurisdictionFamilyId, jurisdictionId, municipalityId|null, governingAsOfDate, compositionDigest)
```

### 19.4 Storage Law

The store must persist:
- manifest path
- digest
- component ids/digests
- compatibility status
- replay validation status

### 19.5 Store Interface

```ts
interface EffectivePackStore {
  lookup(
    packId: PackId,
    trackFamilyId: TrackFamilyId,
    jurisdictionFamilyId: string,
    jurisdictionId: string,
    municipalityId: string | null,
    governingAsOfDate: IsoDate,
    compositionDigest: Sha256Hex
  ): EffectivePackStoreRecord | null;

  lookupByEffectivePackId(effectivePackId: EffectivePackId): EffectivePackStoreRecord | null;
  save(record: EffectivePackStoreRecord): void;
  loadManifest(effectivePackId: EffectivePackId): EffectivePackManifest | null;
}
```

POC loader law:
- `loadStore()` returns the singleton in-memory implementation from `effective-pack-store-memory.ts`
- `loadBaseModules()` loads all typed fixture modules from `/fixtures/extension/base-modules/`
- `loadTierOverlays()` loads all typed fixture overlays from `/fixtures/extension/tier-overlays/`
- `loadJurisdictionFamilyConfig(jurisdictionFamilyId, governingAsOfDate)` loads `/fixtures/extension/jurisdiction-families/{jurisdictionFamilyId}.json` and returns the parsed `JurisdictionFamilyConfig`
- `loadCaseRecord(caseId)` reads the `CaseRecord` for the given id from the active case store and throws `ERR_PINNED_EFFECTIVE_PACK_MISSING` if absent.
- `loadRunRecord(runId)` reads the `RunRecord` for the given id from the active run store and throws `ERR_PINNED_EFFECTIVE_PACK_MISSING` if absent.
- `loadLatestRunForCase(caseId)` reads the most recently created `RunRecord` associated with the given case and throws `ERR_PINNED_EFFECTIVE_PACK_MISSING` if no run exists.
- for POC, only one config version per `jurisdictionFamilyId` is assumed active; if multiple versions exist, select the one where `effectiveFrom <= governingAsOfDate` and `effectiveTo` is absent or `governingAsOfDate <= effectiveTo`
- throw `ERR_GOVERNING_DATE_INVALID` if no matching jurisdiction-family config is active on `governingAsOfDate`
- selection and filtering occur downstream in §15.1 and §15.2, not in the loader functions

### 19.6 Store Pseudocode

```ts
function findReusableEffectivePack(
  store: EffectivePackStore,
  query: DigestInput,
  digest: Sha256Hex
): EffectivePackStoreRecord | null {
  const hit = store.lookup(query.packId, query.trackFamilyId, query.jurisdictionFamilyId, query.jurisdictionId, query.municipalityId ?? null, query.governingAsOfDate, digest);
  if (!hit) return null;
  if (!hit.compatibilityValidated) return null;
  if (!hit.replayValidated) return null;
  return hit;
}
```

## 20. Resolver Law

### 20.1 Existing-Case Mode

If mode is `existing_case`:

- hydrate prior case context
- if no explicit fork is requested, reuse the pinned effective pack
- if pinned record is missing or invalid, reject with `ERR_PINNED_EFFECTIVE_PACK_MISSING`
- do not silently select a newer pack or newer components

### 20.2 New-Case Mode

Inputs required:
- `packId`
- `trackFamilyId`
- `jurisdictionFamilyId`
- `jurisdictionId`
- `governingAsOfDate`
- municipality/local authority id where required

Resolution must:
- narrow candidates deterministically
- resolve exactly one lawful effective pack or reject

### 20.3 Replay Mode

Replay must use:
- pinned run values
- exact digest match
- exact `EffectivePackId` match

### 20.4 No-Match and Multi-Match

No-match:
- reject
- emit `00-failure-log.json`

Multi-match:
- default reject
- bounded operator choice is allowed only if future pack law explicitly permits it
- in v1-0-13, no pack explicitly permits multi-match operator selection, so reject

### 20.5 Main Resolver Pseudocode

```ts
async function resolveEffectivePack(input: EffectivePackResolutionInput): Promise<EffectivePackResolutionResult> {
  validateResolutionInput(input);

  if (input.mode === "existing_case") {
    return resolveExistingCase(input);
  }

  if (input.mode === "replay") {
    return resolveReplay(input);
  }

  const family = loadJurisdictionFamilyConfig(input.jurisdictionFamilyId, input.governingAsOfDate);
  const tierPath = input.tierPathOverride ?? buildTierPath(family, input.jurisdictionId, input.municipalityId, input.trackFamilyId);

  const referencedBaseModuleIds = family.referencedBaseStandardsModulesByTrack[input.trackFamilyId] ?? [];
  const baseModules = selectApplicableBaseModules(family, input.trackFamilyId, input.governingAsOfDate, loadBaseModules());
  if (referencedBaseModuleIds.length > 0 && baseModules.length === 0) {
    throw new ResolverError("ERR_BASE_MODULE_MISSING", `No active base modules found for ${input.trackFamilyId}`);
  }

  const referencedOverlayIds = family.referencedTierOverlaysByTrack[input.trackFamilyId] ?? [];
  const overlays = selectApplicableTierOverlays(family, tierPath, input, loadTierOverlays());
  if (referencedOverlayIds.length > 0 && overlays.length === 0) {
    throw new ResolverError("ERR_OVERLAY_NOT_FOUND", `No active tier overlays found for ${input.trackFamilyId}`);
  }

  detectIllegalOverlap(baseModules, overlays, input.governingAsOfDate);

  const sortedComponents = [...baseModules, ...overlays]
    .map(component => toSelectedComponent(component, tierPath))
    .sort(compareSelectedComponents);

  const digestInput = buildDigestInput(input, tierPath, sortedComponents);
  const compositionDigest = computeCompositionDigest(digestInput);
  const componentDigests = digestInput.components.map(component => component.digest);

  const store = loadStore();
  const reusable = findReusableEffectivePack(store, digestInput, compositionDigest);

  if (reusable) {
    const manifest = store.loadManifest(reusable.effectivePackId);
    if (!manifest) {
      throw new ResolverError("ERR_PINNED_EFFECTIVE_PACK_MISSING", reusable.effectivePackId);
    }
    validateEffectivePackCompatibility(manifest);
    persistRunResolutionFields(input.runId, manifest, compositionDigest, componentDigests);
    return success(manifest, "reused_precomputed");
  }

  const manifest = composeEffectivePack(input, family, tierPath, baseModules, overlays, compositionDigest);
  validateEffectivePackCompatibility(manifest);
  persistEffectivePack(manifest);
  persistStoreRecord(manifest);
  persistRunResolutionFields(input.runId, manifest, compositionDigest, componentDigests);

  return success(manifest, "composed_fresh");
}
```

### 20.6 Existing-Case Resolver Pseudocode

```ts
async function resolveExistingCase(input: EffectivePackResolutionInput): Promise<EffectivePackResolutionResult> {
  const caseRecord = loadCaseRecord(input.caseId);
  const priorRun = loadLatestRunForCase(caseRecord.caseId);

  if (input.explicitForkFromRunId) {
    return resolveEffectivePack({
      ...input,
      mode: "new_case",
    });
  }

  if (!priorRun.resolvedEffectivePackId) {
    throw new ResolverError("ERR_PINNED_EFFECTIVE_PACK_MISSING", "Missing resolvedEffectivePackId on prior run");
  }

  const store = loadStore();
  const record = store.lookupByEffectivePackId(priorRun.resolvedEffectivePackId);
  if (!record) {
    throw new ResolverError("ERR_PINNED_EFFECTIVE_PACK_MISSING", priorRun.resolvedEffectivePackId);
  }

  const manifest = store.loadManifest(record.effectivePackId);
  if (!manifest) {
    throw new ResolverError("ERR_PINNED_EFFECTIVE_PACK_MISSING", record.effectivePackId);
  }

  validateEffectivePackCompatibility(manifest);
  validatePinnedRunAgainstStore(priorRun, record);

  persistRunResolutionFields(input.runId, manifest, record.compositionDigest, record.componentDigests);
  return success(manifest, "reused_precomputed");
}
```

### 20.7 Replay Resolver Pseudocode

```ts
async function resolveReplay(input: EffectivePackResolutionInput): Promise<EffectivePackResolutionResult> {
  if (!input.replaySourceRunId) {
    throw new ResolverError("ERR_REPLAY_SOURCE_RUN_REQUIRED", "Replay mode requires explicit source run id");
  }

  const sourceRun = loadRunRecord(input.replaySourceRunId);
  if (!sourceRun.resolvedEffectivePackId) {
    throw new ResolverError("ERR_PINNED_EFFECTIVE_PACK_MISSING", "Replay source run missing resolvedEffectivePackId");
  }

  const store = loadStore();
  const record = store.lookupByEffectivePackId(sourceRun.resolvedEffectivePackId);
  if (!record) {
    throw new ResolverError("ERR_PINNED_EFFECTIVE_PACK_MISSING", sourceRun.resolvedEffectivePackId);
  }

  const manifest = store.loadManifest(record.effectivePackId);
  if (!manifest) {
    throw new ResolverError("ERR_PINNED_EFFECTIVE_PACK_MISSING", record.effectivePackId);
  }

  validatePinnedRunAgainstStore(sourceRun, record);
  validateEffectivePackCompatibility(manifest);

  persistRunResolutionFields(input.runId, manifest, record.compositionDigest, record.componentDigests);
  return success(manifest, "replayed_pinned");
}
```

### 20.8 Persistence Helper Definitions

```ts
function persistEffectivePack(manifest: EffectivePackManifest): void {
  // writes manifest JSON to disk at {artifactRoot}/effective-packs/{effectivePackId}.json
}

function persistStoreRecord(manifest: EffectivePackManifest): void {
  // builds EffectivePackStoreRecord from manifest and calls store.save(record)
}

function persistRunResolutionFields(
  runId: Uuid,
  manifest: EffectivePackManifest,
  compositionDigest: Sha256Hex,
  componentDigests: Sha256Hex[]
): void {
  // writes resolvedEffectivePackId, resolvedAt, resolvedBy, governingAsOfDate, compositionDigest, componentDigests, and tierPath to RunRecord
}
```

### 20.9 Minor Resolver Helpers

```ts
function isActiveOn(component: { effectiveFrom: IsoDate; effectiveTo?: IsoDate }, date: IsoDate): boolean {
  return component.effectiveFrom <= date && (component.effectiveTo === undefined || date <= component.effectiveTo);
}

function validateResolutionInput(input: EffectivePackResolutionInput): void {
  // Scope note: this helper enforces mode-specific completeness only.
  // Field-level format validation for governingAsOfDate occurs in loader law §19.5.
  // PackId format validation occurs via validatePackId §9.2.
  if (input.mode === "replay" && !input.replaySourceRunId) {
    throw new ResolverError("ERR_REPLAY_SOURCE_RUN_REQUIRED", "Replay mode requires replaySourceRunId");
  }
}

function success(
  manifest: EffectivePackManifest,
  method: "composed_fresh" | "reused_precomputed" | "replayed_pinned"
): EffectivePackResolutionResult {
  return {
    resolved: true,
    effectivePackId: manifest.effectivePackId,
    resolutionMethod: method,
  };
}
```


## 21. Failure-Path Law

### 21.1 Minimum Failure Codes

The extension must implement these codes at minimum:

- `ERR_REQUIRED_TIER_MISSING`
- `ERR_REQUIRED_TIER_RULE_MISSING`
- `ERR_DUPLICATE_TIER_PATH_ENTRY`
- `ERR_MUNICIPALITY_REQUIRED`
- `ERR_GOVERNING_DATE_INVALID`
- `ERR_GOVERNING_DATE_FUTURE`
- `ERR_BASE_MODULE_MISSING`
- `ERR_OVERLAY_NOT_FOUND`
- `ERR_EFFECTIVE_DATE_OVERLAP`
- `ERR_CORPUS_CONFLICT`
- `ERR_HIERARCHY_CONFLICT`
- `ERR_CONTRADICTION_PATTERN_CONFLICT`
- `ERR_EFFECTIVE_PACK_COMPATIBILITY`
- `ERR_PINNED_EFFECTIVE_PACK_MISSING`
- `ERR_REPLAY_SOURCE_RUN_REQUIRED`
- `ERR_REPLAY_DIGEST_MISMATCH`
- `ERR_EFFECTIVE_PACK_NOT_RESOLVED`
- `ERR_MULTI_MATCH`
- `ERR_NO_MATCH`
- `ERR_EFFECTIVE_PACK_GATE_FAILED`
- `ERR_INVALID_FIXTURE_PROMOTION`

Reserved-code note:
- `ERR_MULTI_MATCH` and `ERR_NO_MATCH` are reserved for future resolver modes that may produce true multi-candidate or zero-candidate effective-pack outcomes before composition.
- v1-0-13 uses a single deterministic composition path; these codes remain canonical inventory values even if not exercised by the POC fixture set.

### 21.2 Artifact Rule

Hard failure emits `00-failure-log.json`.

Optional bounded operator choice may emit `12-operator-prompt.json`, but v1-0-13 does not define any lawful multi-match choice path, so builder should expect rejection-first behavior.

### 21.3 Failure Log Fields

```ts
interface EffectivePackFailureLog {
  runId: Uuid;
  caseId: Uuid;
  stage: "effective_pack_resolution";
  failureCode: string;
  failureMessage: string;
  resolutionInputSnapshot: {
    packId: PackId;
    trackFamilyId: TrackFamilyId;
    jurisdictionFamilyId: string;
    jurisdictionId: string;
    municipalityId?: string;
    governingAsOfDate: IsoDate;
  };
  safeOperatorNextStep: string;
}
```

## 22. Release and Governance State Law

### 22.1 Run-Level Release State

Initial vocabulary:
- `draft`
- `in_review`
- `released`
- `superseded`

### 22.2 Pack Governance Lifecycle

Initial vocabulary:
- `candidate`
- `validated`
- `approved`
- `active`
- `deprecated`

These must remain distinct fields.

## 23. Validation Gates

### 23.1 New Required Gate

The extension adds one new required gate:

- `effective-pack-resolution`

### 23.2 CI Order Preservation

Base CI order must remain unchanged.
No new top-level gate step may be inserted.

Canonical enforcement:
- `ci:gate` step 7 (`pack:validate`) must invoke `validatePacksWithExtension()` instead of the base-only validator
- `ci:gate` step 4 (`test:integration`) covers the extension integration tests through Vitest
- no new step numbers are added
- gate-runner injection details remain additive under the existing order

### 23.3 effective-pack-resolution Gate Must Prove

- exactly one effective pack resolves for valid inputs
- zero resolves fail explicitly
- replay uses pinned effective pack
- resolved manifest remains `PackManifest`-compatible
- reuse obeys digest law
- illegal overlap rejects
- missing municipality rejects where required
- California legacy regression remains unaffected

### 23.4 Additional Extension Validation Gates

The builder shall add these extension-specific checks:

- `open-packid-validation`
- `tier-path-order`
- `effective-date-window`
- `component-overlap`
- `effective-pack-compatibility`
- `effective-pack-reuse-law`
- `replay-pin-law`
- `release-state-separation`

## 24. Schema Law

### 24.1 New JSON Schemas

The builder shall export strict schemas for:

- `BaseStandardsModule`
- `JurisdictionFamilyConfig`
- `TierOverlay`
- `EffectivePackManifest`
- `EffectivePackStoreRecord`
- `EffectivePackResolutionResult`

### 24.2 Existing Schema Extensions

The builder must extend these existing schemas before integration tests run and before promoted fixtures are validated:

- `case-record.schema.json`
- `run-record.schema.json`
- `pack-manifest.schema.json`

Extension scope:

- `case-record.schema.json` must add all fields from `CaseRecordExtension` as additive optional properties
- `run-record.schema.json` must add all fields from `RunRecordExtension` as additive optional properties
- `pack-manifest.schema.json` remains the base-engine schema and must not be extended with effective-pack-only fields; `EffectivePackManifest` has its own separate schema

Existing records without extension fields remain valid.
Unknown top-level fields remain rejected unless explicitly added to schema.

### 24.3 Unknown Field Policy

Unknown top-level fields are rejected.
Extension points must remain under explicit `metadata` objects only where allowed.

## 25. Migration Law

### 25.1 Legacy California Continuity

Existing California packs and fixtures remain lawful.

### 25.2 Migration Rule

Migration does **not** rename or invalidate:
- legacy California `PackId` constants
- base fixtures
- base replay records

Instead, migration adds:
- open `PackId` validator
- extension resolver path
- projection from effective manifest to base manifest

### 25.3 California Regression Through Resolver

A California legacy pack must be able to run through the resolver path and still project into a valid base `PackManifest` without changing Layer 1 engine behavior.

### 25.4 California Fixture Promotion Procedure

Existing California fixture files are promoted by extension, not replacement.

Promotion procedure:

1. add extension fields to legacy case/run fixture JSON using pinned representative values
2. preserve original base `PackManifest` fields and original `versionIndex`
3. require operator-supplied `governingAsOfDate` if the source fixture does not already carry one
4. fail with `ERR_GOVERNING_DATE_INVALID` if a legacy case is submitted through the resolver without a governed date
5. California regression tests must use promoted fixture data, not raw pre-extension fixture data

Representative pinned values for promoted fixtures:

- pack v1 -> `trackFamilyId: "buildings"`
- pack v2 -> `trackFamilyId: "appliance_refrigeration"`
- pack v3 -> `trackFamilyId: "datacenter"`
- `jurisdictionFamilyId: "us_state_local_v1"` for U.S.-style regression routing fixtures
- `governingAsOfDate` must be an explicit pinned date in the fixture, not inferred from wall clock

## 26. Texas-First Implementation Priority

### 26.1 Required Initial Jurisdiction Family

The first extension fixtures must include one Texas U.S.-style family configuration.

Canonical id:

- `us_state_local_v1`

### 26.2 Required Initial Texas Nominal PackIds

The first extension fixtures must include at minimum:

- `pack-us-tx-buildings-v1`
- `pack-us-tx-appliance_refrigeration-v1`
- `pack-us-tx-datacenter-v1`

### 26.3 Municipality Overlay Strategy

Do not author all Texas municipalities.
Author only:
- none where not required
- a bounded sample overlay set sufficient to prove law
- at least one municipality-required track test if family config requires it

### 26.4 Overlay Eligibility Validation

A municipality or local-authority overlay is lawful only when at least one of the following eligibility bases is declared and validated:

1. the active track requires municipality handling by governing law
2. the municipality adds governing standards or requirements beyond the higher tier
3. the municipality adds allowed hierarchy or contradiction behavior under extension law
4. the municipality materially changes applicability for the active track

Every municipality or local-authority overlay fixture must declare its eligibility basis in provenance or an equivalent governance record.
The overlay validator must reject any municipality or local-authority overlay that declares no eligibility basis.

## 27. Fixtures and Test Surfaces

### 27.1 Minimum Fixture Set

The builder must provide:

- one jurisdiction family config fixture for Texas-first U.S.-style hierarchy
- three Texas nominal pack fixtures, one per initial track family
- at least one municipality overlay fixture
- at least one non-municipal overlay fixture
- one precomputed effective-pack store fixture
- California legacy regression fixtures

### 27.2 Unit Tests Required

- `PackId` validator accepts legacy and open values
- invalid `PackId` rejects
- `TrackFamilyId` validator rejects unknown values
- `governingAsOfDate` format rejects invalid/future dates
- `tierPath` order is deterministic
- overlap detector rejects illegal windows
- duplicate corpus handling obeys override law
- digest derivation is stable
- `EffectivePackId` derivation is stable
- compatibility projection returns valid `PackManifest`
- reuse only happens on exact input identity
- effective-date boundary selection:
  - `effectiveFrom === governingAsOfDate` is active
  - `effectiveTo === governingAsOfDate` is active
  - `effectiveTo === governingAsOfDate - 1 day` is inactive

### 27.3 Integration Tests Required

- Texas buildings resolution
- Texas appliance resolution
- Texas datacenter resolution
- replay uses pinned effective pack
- California legacy regression through resolver
- no-match rejection
- municipality-required rejection
- overlap conflict rejection

## 28. Deterministic Replay Law

Replay is valid only when:

```txt
stored.effectivePackId == pinned.resolvedEffectivePackId
AND
stored.compositionDigest == pinned.compositionDigest
AND
stored.componentDigests == pinned.componentDigests
```

Pseudocode:

```ts
function validatePinnedRunAgainstStore(
  run: RunRecord & RunRecordExtension,
  stored: EffectivePackStoreRecord
): void {
  if (run.resolvedEffectivePackId !== stored.effectivePackId) {
    throw new ResolverError("ERR_REPLAY_DIGEST_MISMATCH", "EffectivePackId mismatch");
  }
  if (run.compositionDigest !== stored.compositionDigest) {
    throw new ResolverError("ERR_REPLAY_DIGEST_MISMATCH", "Composition digest mismatch");
  }
  if (!arraysEqual(run.componentDigests ?? [], stored.componentDigests)) {
    throw new ResolverError("ERR_REPLAY_DIGEST_MISMATCH", "Component digest mismatch");
  }
}

function arraysEqual(a: Sha256Hex[], b: Sha256Hex[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}
```

Any mismatch rejects.

## 29. Builder Pseudocode for Gate Injection

```ts
async function validatePacksWithExtension(): Promise<void> {
  validateBasePackManifests();
  validateBaseStandardsModules();
  validateJurisdictionFamilyConfigs();
  validateTierOverlays();
  validateEffectivePackResolutionFixtures();
}
```

## 30. Completion Criteria

This extension spec is satisfied only when all are true:

- extension schemas validate
- existing case/run schemas are extended before promoted fixtures enter validation
- open `PackId` law is implemented without breaking legacy California values
- all new governed types exist and validate
- exactly one effective pack resolves for valid fixtures
- no-match and overlap fail explicitly
- replay pinning is deterministic
- base Layer 1 signatures remain typed to `PackManifest`
- California regression through resolver passes
- CI order remains unchanged
- effective-pack-resolution gate passes
- no new artifact numbering was introduced
- inherited base pass2 silent-confirm blocker is confirmed resolved before extension build proceeds

## 31. Final Spec Statement

This extension engineering spec defines the additive jurisdiction / effective-pack extension for CERS as a Layer 3 composition and Layer 4 resolution system that opens `PackId` into a governed identifier model, adds `TrackFamilyId`, adds variable-depth jurisdiction tiers, composes effective packs by effective date and tier overlays, preserves engine compatibility through `PackManifest` projection, pins replay to exact resolved contexts, and permits lawful reuse of precomputed effective packs without rewriting Layer 1 or Layer 2.
