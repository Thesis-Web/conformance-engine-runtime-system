# Conformance Engine Runtime System
# Jurisdiction / Effective-Pack Extension Blueprint v1-0-5

## 1. Purpose

This blueprint defines the jurisdiction / effective-pack extension for Conformance Engine Runtime System (CERS).

The extension adds deterministic jurisdiction-aware and effective-date-aware pack resolution above the existing engine so the system can select exactly one governed effective pack context for a case before execution.

The extension is Texas-first in implementation priority. It is not Texas-only in law.

This blueprint is also written to tolerate later international expansion by introducing variable-depth jurisdiction tiers rather than a fixed U.S.-only state/municipality assumption.

The extension exists to solve these problems only:

- select exactly one governed effective pack context for a case
- do so deterministically and replayably
- keep the resolved result engine-compatible
- support additive jurisdiction, municipality, regional, and later supranational overlays
- avoid hidden Layer 1 or Layer 2 rewrites while the system scales

This extension is not a new engine, not a portal redesign, not a tenant platform, not a self-publishing governance portal, and not a replacement for the runtime contract.

## 2. Governing Precedence

Precedence for this extension is fixed:

1. Base blueprint law: `conformance-engine-blueprint-v1-2-2.md`
2. Base engineering law: `conformance-engine-engineering-spec-v1-2-2.md`
3. This extension blueprint
4. Later approved extension engineering spec
5. Approved extension audit logs
6. Implementation details

If this extension conflicts with the base blueprint or base spec, base blueprint wins unless the conflict is explicitly logged and owner-approved before canonization.

## 3. Logged Base-Law Adjustment

This blueprint intentionally introduces one owner-directed base-law adjustment.

### 3.1 DIFF-EXT-BASE-001 | PackId Unbaking

Base law currently hardcodes `PackId` as a closed union of three California-named values.
That was acceptable for the California-first base build. It is not the correct long-run architecture for a Texas-first fifty-state and later international resolver model.

The owner-directed adjustment is:

- `PackId` is no longer treated as a California-baked closed union ceiling
- `PackId` becomes an open governed pack identifier type
- the three California base values are preserved only as legacy identifiers for migration and replay continuity
- future jurisdictions, track families, and pack generations must not require base-engine rewrites or new closed-union edits

This is a real conflict with base engineering law and must be reflected in the later additive engineering spec and base-law reconciliation notes before implementation begins.

No downstream build work may canonize this change silently.

### 3.2 HOLE-v103-005 Resolution | nominalTrackPackId Supersession

`nominalTrackPackId` from v1-0-2 is superseded by the open `PackId` plus `TrackFamilyId` model introduced in this blueprint line.

The supersession law is fixed:

- no new extension-path schema, fixture, or record may introduce `nominalTrackPackId` as an active field
- migration notes may reference `nominalTrackPackId` only as a historical transition artifact from v1-0-2
- the resolver must narrow on `packId` plus `trackFamilyId`, not on a retained `nominalTrackPackId` field
- the later engineering spec must log this supersession explicitly so no builder implements both models in parallel

## 4. Product Thesis for the Extension

The base CERS thesis remains unchanged:

- one engine is built once
- one runtime contract governs the engine
- packs are additive
- orchestration binds reusable law to real cases
- the thin face stays thin

This extension adds these additive theses:

- one resolver chooses one effective pack context per run
- the resolver is deterministic and replayable
- the effective pack remains `PackManifest`-compatible at the engine boundary
- jurisdictional variability is carried in additive Layer 3 composition and Layer 4 resolution, not in Layer 1 rewrites
- jurisdiction hierarchy depth is variable by jurisdiction family, not fixed to one national model
- validated effective packs may be precomputed and reused when resolution inputs are identical

## 5. Extension Scope Boundary

### 5.1 Included in Extension Blueprint Scope

This extension blueprint defines:

- additive Layer 3 composition model for jurisdiction-aware packs
- additive Layer 4 effective-pack resolution behavior
- variable-depth jurisdiction-tier traversal law
- compatibility boundary between resolved effective pack and engine-facing `PackManifest`
- deterministic resolver law
- replay pinning law for resolved effective packs
- precomputed effective-pack reuse law
- operator-visible custody and release-adjacent boundary fields
- Texas-first implementation priority within a reusable scaling model
- municipality overlay and authoring law
- extension failure-path law
- extension validation / gate intent
- extension POC proof requirements

### 5.2 Excluded from Extension Blueprint Scope

This extension blueprint does not define:

- direct Layer 1 engine redesign
- direct Layer 2 runtime contract redesign
- new finding taxonomy
- new artifact filename sequence
- new CI order
- portal auth redesign
- token-system redesign
- K8s, queues, object storage migration, or hosting topology changes
- self-publishing active-pack governance by municipalities or outside actors
- cryptographic signature implementation
- full tenant isolation infrastructure
- implementation code
- final field-by-field JSON schema syntax
- EU- or Asia-specific document vocabularies beyond the architectural hooks defined here

## 6. New Governed Types Scope

Only these new governed type families are in scope for this extension:

- `BaseStandardsModule`
- `JurisdictionFamilyConfig`
- `TierOverlay`
- `EffectivePackManifest`
- `EffectivePackId`

The following are governed vocabularies or support types used by those type families, not separate extension type families in their own right:

- `PackId` as the open governed identifier model reconciled under §3
- `TrackFamilyId`
- `JurisdictionTier`
- `tierPath`
- Layer 4 effective-pack store records

No broader pack-system rewrite is in scope.

## 7. Non-Mutation Law

This extension is valid only if it remains additive to Layer 3 and Layer 4, except for the owner-directed `PackId` base-law adjustment logged in §3.1.

The extension must not change:

- Layer 1 engine pipeline
- Layer 2 runtime contract law
- source-lane hierarchy
- finding taxonomy
- assertion boundary
- mandatory artifact filenames or order
- current CI gate order
- two-pass model chain requirement
- thin portal auth model
- token system
- base `PackManifest` contract presented to the engine
- base portability thesis

If the extension requires mutation of any item in this section beyond §3.1, the extension has drifted off law and must stop pending owner review.

## 8. Architectural Placement

The extension is placed in two additive layers only.

### 8.1 Layer 3A — Base Standards Module

A reusable standards module defines bounded standards and reference components that may be shared across jurisdictions or tracks.

A `BaseStandardsModule` must define at minimum:

- `baseModuleId`
- `displayName`
- `supportedTrackFamilies`
- bounded `corpus` entries
- bounded `hierarchyFragments` only where this blueprint allows them
- bounded `contradictionPatternFragments` only where this blueprint allows them
- `versionIndex`
- `effectiveFrom`
- optional `effectiveTo`
- `ownershipPackId`
- provenance metadata sufficient to trace source ownership and version lineage

### 8.2 Layer 3B — Jurisdiction Family Configuration

A jurisdiction family configuration defines the hierarchy model for a jurisdiction family.
Examples include U.S. state-based models, EU supranational-to-member-state models, or other national/regional/local structures.

A `JurisdictionFamilyConfig` must define at minimum:

- `jurisdictionFamilyId`
- `displayName`
- `supportedTrackFamilies`
- declared `tierOrder` using `JurisdictionTier` vocabulary
- `requiresMunicipalityByTrack` for jurisdiction families where municipality handling is a named governing requirement
- `requiredTierHandlingByTrack` as the generalized track-to-tier handling rule for variable-depth models
- `allowedTierReferencesByTrack`
- `referencedBaseStandardsModulesByTrack`
- `referencedTierOverlaysByTrack`
- `versionIndex`
- `effectiveFrom`
- optional `effectiveTo`

`requiresMunicipalityByTrack` remains required for U.S.-style municipality-sensitive families. `requiredTierHandlingByTrack` is the generalized replacement surface for non-U.S. and variable-depth models.

### 8.3 Layer 3C — Tier Overlays

Tier overlays define additive law at one or more governed tiers in the active hierarchy path.
A tier overlay may represent a state, province, member state, region, municipality, local authority, or other governed tier allowed by the active jurisdiction family.

A `TierOverlay` must define at minimum:

- `tierOverlayId`
- `tierType` using `JurisdictionTier` vocabulary
- `tierId`
- `parentTierId` where applicable
- `jurisdictionFamilyId`
- `jurisdictionId`
- `supportedTrackFamilies`
- additive `corpus` fragments
- additive `hierarchyFragments` only where this blueprint allows override
- additive `contradictionPatternFragments` only where this blueprint allows override
- `versionIndex`
- `effectiveFrom`
- optional `effectiveTo`
- provenance and ownership metadata sufficient to trace authoring source and approval path

### 8.4 Layer 3D — Effective Pack Manifest

An effective pack manifest is the fully resolved governed result produced from composition of base modules plus all applicable tier overlays for a specific nominal track and effective date.

An `EffectivePackManifest` must define at minimum:

- all base `PackManifest` fields required at the engine boundary
- `effectivePackId`
- `effectivePackVersion`
- `packId`
- `trackFamilyId`
- `jurisdictionFamilyId`
- `jurisdictionId`
- `tierPath`
- `municipalityId` where applicable
- `governingAsOfDate`
- `componentProvenance`
- `compositionDigest`
- `resolvedAt`
- `resolvedBy`
- `resolutionMethod`
- replay pinning metadata required by §20
- release and custody adjacency fields required by §21 and §22

### 8.5 Layer 4 Extension — Effective-Pack Resolver

A resolver in Layer 4 selects, validates, pins, and optionally reuses the active effective pack for a case before engine execution.

L3A, L3B, L3C, and L3D are internal composition stages inside existing Layer 3. They are not new top-level architectural layers. The base five-layer model remains unchanged.

## 9. Jurisdiction-Tier Law

### 9.1 Variable-Depth Tier Rule

The composition path is not fixed to three levels.
It is governed by the active jurisdiction family configuration.

Examples:

- U.S. state model: national reference -> state -> municipality/local authority -> effective pack
- EU model: supranational -> member state -> regional -> local authority -> effective pack
- other models: whatever tier chain the governed jurisdiction family law declares

### 9.2 JurisdictionTier Vocabulary

The extension introduces `JurisdictionTier` as a governed vocabulary used by resolver and composition law.
The initial tier vocabulary must support at minimum:

- `supranational`
- `national`
- `state_or_member_state`
- `regional`
- `municipal`
- `local_authority`

Additional tier values require additive approval.

### 9.3 Tier Traversal Rule

A resolver must traverse only the tiers declared by the active jurisdiction family configuration and must do so in a deterministic declared order.
No implementation may hardcode a U.S.-only assumption that all jurisdictions resolve by state plus municipality only.

### 9.4 jurisdictionFamilyId and jurisdictionId Relationship

`jurisdictionFamilyId` identifies the governing hierarchy model class, such as a U.S. state-based family, an EU supranational-to-member-state family, or another declared family model.

`jurisdictionId` identifies the concrete jurisdiction instance inside that family, such as `US-TX`, `US-CA`, `DE`, or `FR`.

The family defines how traversal works. The jurisdiction identifies which concrete law-space the case belongs to inside that family.

### 9.5 tierPath Type Rule

`tierPath` is an ordered array of tier identifiers traversed during resolution, listed from lower specificity to higher specificity in the active path.

Examples:

- `["US", "US-TX", "US-TX-HOUSTON"]`
- `["EU", "FR", "FR-IDF", "FR-PARIS"]`

The final element in `tierPath` is the highest-specificity tier reached for the active resolution path.

## 10. Compatibility and Identity Invariants

### 10.1 Hard Compatibility Rule

`EffectivePackManifest` must be a strict superset of `PackManifest`, not a replacement contract.

The engine-facing resolved manifest must remain fully compatible with the base `PackManifest` contract.

### 10.2 Engine Branching Prohibition

Layer 1 engine logic must not branch on extension-only fields.

The engine may consume the resolved effective pack only through `PackManifest`-compatible law already allowed by the base system.

### 10.2A Engine Typing Enforcement Law

The later engineering spec must enforce §10.2 in code by keeping Layer 1 function signatures typed to base `PackManifest`, not `EffectivePackManifest`.

`EffectivePackManifest` may be visible only in Layer 4 orchestration and extension validation surfaces where resolution, replay, compatibility, and composition checks occur.

No Layer 1 function signature may require extension-only fields as inputs.

### 10.3 Exact Extension-Only Fields Allowed Beyond PackManifest

The extension-only field inventory allowed beyond `PackManifest` is fixed as follows:

- `effectivePackId`
- `effectivePackVersion`
- `trackFamilyId`
- `jurisdictionFamilyId`
- `jurisdictionId`
- `tierPath`
- `municipalityId`
- `governingAsOfDate`
- `resolvedAt`
- `resolvedBy`
- `resolutionReason`
- `resolutionMethod`
- `componentProvenance`
- `compositionDigest`
- `replayPinned`
- `replaySourceRunId`
- `releaseState`
- `reviewedBy`
- `releasedBy`
- `releasedAt`
- `reviewSignatureRef`
- `tenantId`
- `orgId`

No additional extension-only fields may be introduced in the engineering spec without an additive log and owner approval.

## 11. Identity Model

### 11.1 Open PackId Rule

`PackId` is an open governed identifier type.
It must not be implemented as a hardcoded closed union ceiling.

### 11.2 Legacy California Identifier Rule

The three California base identifiers are preserved as legacy identifiers for migration, replay continuity, fixture continuity, and law-traceability.
They are not the ceiling of the identifier space.

### 11.3 TrackFamilyId Rule

The extension introduces `TrackFamilyId` as a separately governed extensible vocabulary.
Track family identity is a Layer 3 governance concern, not a Layer 1 engine concern.

The initial track-family vocabulary must support at minimum:

- `buildings`
- `appliance_refrigeration`
- `datacenter`

Additional track families are additive and must not require engine rewrites.

### 11.4 Pack Identifier Structure Rule

The engineering spec must define a structured canonical `PackId` naming convention.
It must be open to new jurisdictions and new track families without requiring base-engine edits.

The blueprint naming template is:

`pack-{jurisdiction-scope}-{track-family-slug}-v{n}`

Where:

- `jurisdiction-scope` uses an ISO 3166-2-aligned or equivalently governed slug where available
- `track-family-slug` is derived from governed `TrackFamilyId` vocabulary
- `v{n}` is the governed pack lineage version segment

The structure must encode at minimum:

- jurisdiction family or jurisdiction scope
- nominal track family
- pack lineage or version

### 11.5 EffectivePackId Rule

`EffectivePackId` is the resolved identity of one composed effective pack.
It is additive and distinct from `PackId`.

`EffectivePackId` must be stable for identical resolved inputs and must be pinned into replay law.

## 12. Repository Placement Law

The extension type families belong under Layer 3 and Layer 4 homes already established by base law.

The canonical repository placement is:

- `/src/packs/base-modules/`
- `/src/packs/jurisdiction-families/`
- `/src/packs/tier-overlays/`
- `/src/packs/effective/`
- `/src/orchestration/resolver/`
- `/src/orchestration/effective-pack-store/`
- `/schemas/` for additive schemas and schema extensions
- `/tests/unit/` and `/tests/integration/` for extension coverage

The engineering spec must name the exact files and schema surfaces.

## 13. Tier Overlay Law

### 13.1 Overlay Rule

Tier overlays are additive.
They must not replace base modules silently.

### 13.2 Municipality Rule

Municipality handling is not universal.
It is required only where the active jurisdiction family and active track family demand it or where a municipality materially changes governing applicability.

### 13.3 Overlay Eligibility Rule

A municipality or local authority receives its own overlay only when at least one is true:

- the active track requires municipality handling by governing law
- the municipality adds governing standards or requirements beyond the higher tier
- the municipality adds allowed hierarchy or contradiction behavior under this blueprint
- the municipality materially changes applicability for the active track

## 14. Corpus Composition Law

When base modules and tier overlays are composed into one `EffectivePackManifest`, the composition law is fixed.

### 14.1 Duplicate-Key Rule

Duplicate corpus entries are detected by the following canonical composition key: `citationKey` when present, else `corpusId`.
This key is blueprint law and must not be redefined silently in the engineering spec.

### 14.2 Precedence Rule

Higher-specificity overlays override lower-specificity overlays only where blueprint and later engineering-spec law explicitly allow override. Specificity is determined by `tierPath` position per §9.5, with later elements being higher-specificity than earlier elements in the active path.
Otherwise composition remains additive and conflicting entries must raise governed failure or escalation.

### 14.3 Ownership Rule

`ownershipPackId` on inherited corpus entries remains the originating source owner and must not be rewritten to the resolved effective pack identifier.

### 14.4 Incompatibility Rule

If two composed corpus fragments cannot coexist under composition law, the resolver must reject the composition and emit failure-path artifacts defined by this blueprint.

## 15. Precomputed Effective-Pack Law

### 15.1 Reuse Rule

A validated effective pack may be stored and reused when all governing resolution inputs are identical.

### 15.2 Recomposition Rule

A resolver must recompose rather than reuse when any governing input changes, including:

- jurisdiction family
- jurisdiction
- tier path
- municipality or local authority where applicable
- track family
- governingAsOfDate
- applicable component versions
- any overlay or module participating in the prior composition digest

### 15.3 Validation Rule

A stored effective pack is not reusable unless its compatibility, composition, and replay law remain valid.

### 15.4 Layer Placement Rule

The effective-pack store belongs to Layer 4 orchestration.
It is not a new architecture layer.

## 16. Resolver Operating Modes

The resolver supports two operating modes.

### 16.1 Existing-Case Mode

Inputs may include a case identifier or case number.
Resolver behavior must:

- hydrate prior case context
- reuse pinned resolved effective pack unless the case is explicitly forked
- preserve replay determinism

### 16.2 New-Case Mode

Inputs must include at minimum:

- `packId` as the canonical nominal pack identifier
- `trackFamilyId`
- `jurisdictionFamilyId`
- `jurisdictionId`
- `governingAsOfDate`
- municipality or local-authority identifier where required by the active tier path

Resolver behavior must:

- narrow candidate modules and overlays deterministically
- either resolve exactly one effective pack or reject / route bounded choice under governed law

## 17. Deterministic Selection Law

Selection law and validation law are distinct surfaces.

### 17.1 Selection Inputs

Selection must consider only governed inputs:

- `packId`
- `trackFamilyId`
- `jurisdictionFamilyId`
- `jurisdictionId`
- `tierPath` where already known
- `municipalityId` or local-authority identifier where required
- `governingAsOfDate`
- replay pin when replay path is active

### 17.2 Determinism Rule

Same governed inputs must produce the same `effectivePackId`.
Latest version is not the rule.
Effective-date applicability is the rule.

### 17.3 No-Match Rule

If no lawful effective pack can be resolved, the run must reject and emit failure-path artifacts.

### 17.4 Multi-Match Rule

If more than one lawful effective pack remains after deterministic narrowing, the resolver may only:

- reject the run with explicit failure-path artifacts, or
- emit a bounded operator choice artifact when blueprint law explicitly permits that choice

No silent nearest-match, heuristic pick, or latest-version convenience rule is allowed.

## 18. Validation Law

Validation must prove:

- component version ranges are valid
- effective-date applicability is valid
- overlay compatibility is valid
- no illegal active overlap remains
- resolved manifest remains `PackManifest`-compatible
- replay pin exists and matches where replay path is active
- stored effective-pack reuse is lawful if reuse path is taken

## 19. GoverningAsOfDate Law

### 19.1 Source Rule

For new cases, `governingAsOfDate` must be operator-supplied.
No silent default from timestamps is allowed.

### 19.2 Format Rule

The engineering spec must treat it as date-only in `YYYY-MM-DD` form unless later owner-approved law broadens that.

### 19.3 Validation Rule

Invalid values must reject.
Future dates must reject unless later owner-approved track law explicitly permits future-cycle planning.

### 19.4 Replay Rule

Replay uses the pinned historical `governingAsOfDate`.
It must not silently substitute the current date.

## 20. Replay and Pinning Law

Historical runs must remain pinned to the exact resolved effective pack used at runtime.
No retroactive mutation is allowed.

Replay-persisted fields must include at minimum:

- `effectivePackId`
- `packId`
- `trackFamilyId`
- `jurisdictionFamilyId`
- `jurisdictionId`
- `tierPath`
- `municipalityId` where applicable
- `governingAsOfDate`
- `resolvedAt`
- `componentProvenance`
- `compositionDigest`
- `replaySourceRunId` when replay or fork-from-run flow is used

## 21. Case and Run Record Law

### 21.1 CaseRecord Rule

`CaseRecord.packId` remains required.
Unlike the earlier workaround drafts, it is not a California-named compatibility anchor.
It is the canonical nominal pack identifier for the case.

### 21.2 Additive Case Fields

Case-level additive fields must include at minimum:

- `trackFamilyId`
- `jurisdictionFamilyId`
- `jurisdictionId`
- `municipalityId` where applicable
- `tenantId` or `orgId`
- `uploadedBy`
- `governingAsOfDate`

### 21.3 RunRecord Rule

Run-level additive fields must include at minimum:

- `resolvedEffectivePackId`
- `resolvedAt`
- `resolvedBy`
- `reviewedBy`
- `governingAsOfDate`
- `releasedBy`
- `releasedAt`
- `reviewSignatureRef`
- `releaseState`
- `replaySourceRunId` where applicable

## 22. Release and Governance State Law

Run-level release state and pack-governance lifecycle are separate enums.
They must not be collapsed into one field.

### 22.1 Run-Level Release State

The initial run-level release state vocabulary is:

- `draft`
- `in_review`
- `released`
- `superseded`

### 22.2 Pack Governance Lifecycle

The initial pack governance lifecycle vocabulary is:

- `candidate`
- `validated`
- `approved`
- `active`
- `deprecated`

## 23. Failure-Path Law

The extension failure-path law is fixed for these scenarios at minimum:

- no-match resolution
- multi-match resolution
- municipality / local-authority requirement missing
- effective-date overlap conflict
- incompatible overlay composition
- missing pinned effective pack at replay
- invalid fixture promotion
- effective-pack-resolution gate failure

### 23.1 Artifact Rule

Hard failures must emit `00-failure-log.json`.
Bounded operator choice must emit `12-operator-prompt.json`.
No new artifact filenames may be introduced by this extension without owner approval.

### 23.2 Success-Path Prohibition

No failure path may be left as a success-path-only description in the engineering spec.
Each failure surface must have executable artifact, fail-vs-escalate, and operator-prompt law.

## 24. Anti-Stub Law

A contract is not considered implemented merely because a type, manifest field, or gate name exists.
The engineering spec must define the minimum executable behavior proving the contract is real.

This anti-stub obligation applies at minimum to:

- `BaseStandardsModule`
- `JurisdictionFamilyConfig`
- `TierOverlay`
- `EffectivePackManifest`
- `EffectivePackId`
- resolver selection logic
- effective-pack validation gate
- effective-pack store reuse law

## 25. Validation / Gate Intent

One new required gate is introduced:

- `effective-pack-resolution`

The gate must prove behavior, not existence.

At minimum it must prove:

- exactly one effective pack resolves for valid inputs
- zero resolves fail explicitly
- multiple resolves reject or route bounded choice explicitly
- replay uses the pinned resolved effective pack
- resolved manifest remains `PackManifest`-compatible
- stored effective-pack reuse obeys composition-digest and replay law
- base California regression runs remain unaffected by extension resolution behavior

The later engineering spec must also log additive injection of this gate into the gate runner.

## 26. Fixture Promotion Law

Existing fixtures must be promotable into the new identifier and resolution model.
They must be extended, not discarded.

Promotion law must preserve:

- existing `PackManifest` fields
- existing `versionIndex` semantics
- additive effective-date fields as distinct from `versionIndex`
- replay continuity for existing California fixtures
- schema-extension timing so strict schema gates do not fail promoted fixtures

The later engineering spec must explicitly name schema-extension scope for:

- pack-manifest schema
- run-record schema
- case-record schema

## 27. Texas Municipality Handling and Scale Rule

Texas is handled as one jurisdiction family with additive tier overlays, not as one fully separate engine or one full standalone pack per municipality.

The canonical strategy is:

1. define one Texas jurisdiction-family configuration
2. define Texas nominal pack identifiers for the track families actually in scope
3. define municipality or local-authority overlays only where law or material divergence requires them
4. compose effective packs from reusable base modules plus Texas tier overlays
5. resolve and pin exactly one effective pack per case/run

### 27.1 Build-on-Demand Rule

Do not pre-author every Texas municipality.
Author municipality overlays on demand by legal divergence, active case demand, and market priority.

### 27.2 Overlay Authoring Boundary

Overlay authoring may be performed by:

- owner/operator
- approved delegate under owner governance
- municipality or local-authority contributor through governed submission workflow

No outside actor may self-publish directly into active runtime.
All such overlays must pass validation, compatibility, composition, anti-stub, and governance approval before activation.

### 27.3 Three Initial Texas Track Families

The Texas-first implementation must begin with the three track families already in scope:

- `buildings`
- `appliance_refrigeration`
- `datacenter`

Additional Texas track families are allowed additively later and must not require engine rewrites.

## 28. International Tolerance Hook

The architecture must tolerate later non-U.S. expansion without requiring a new engine.

### 28.1 Same-Engine Rule

The default assumption is same engine, same runtime contract, different pack and jurisdiction-family law.
Different engines are not the default answer.

### 28.2 New-Engine Threshold

A new engine is justified only if later owner-approved law determines that the target jurisdiction family requires a materially different runtime contract or comparison semantics that cannot remain `PackManifest`-compatible.

That threshold must be explicit and logged.
It must not be guessed early.

### 28.3 What Is Added Now

This blueprint adds only the tolerance hooks needed now:

- variable-depth jurisdiction tiers
- open `PackId`
- extensible `TrackFamilyId`
- jurisdiction family configuration
- effective-pack store / reuse law

It does not add region-specific document vocabularies or separate engines prematurely.

## 29. Required Proof and Test Surfaces

The later engineering spec must require tests for at minimum:

- resolver existing-case reuse
- resolver new-case deterministic resolution
- municipality-required behavior
- effective-date boundary selection
- overlap conflict rejection
- replay uses pinned resolved effective pack
- resolved manifest remains `PackManifest`-compatible
- effective-pack-resolution gate behavior
- stored effective-pack reuse validity
- California regression behavior through the extended resolver path

Test locations belong under `/tests/unit/` and `/tests/integration/`.

## 30. Blockers Versus Repair-Tail Law

Hard blockers before extension build begins include:

- unresolved `PackId` base-law reconciliation
- unresolved effective-pack compatibility boundary
- unresolved replay determinism
- unresolved resolver determinism
- missing effective-pack-resolution gate
- unresolved pass2 silent-confirm defect in the base repo

Allowed repair-tail items inside spec or build window include:

- fixture normalization
- MIME/type handling hardening around extension inputs
- operator prompt ergonomics
- wording cleanup in logs and artifacts
- gate-runner injection details once gate law is already fixed

## 31. Canonical Next Step

The next document after this blueprint is the additive engineering spec.

That engineering spec must translate this blueprint into deterministic build law, including:

- structured `PackId` naming law
- `TrackFamilyId` vocabulary handling
- `JurisdictionFamilyConfig` schema
- `JurisdictionTier` handling
- exact schema extensions for case/run/pack records
- resolver algorithm
- effective-pack store algorithm
- failure and escalation rules
- gate implementation
- migration path from legacy California identifiers

## 32. Final Blueprint Statement

This jurisdiction / effective-pack extension blueprint defines a Texas-first, state-additive, internationally-tolerant Layer 3 and Layer 4 extension for CERS.

It keeps the engine stable, keeps the runtime contract stable, opens `PackId` into a governed identifier model, separates `TrackFamilyId` from pack identity, adds variable-depth jurisdiction tiers, and resolves effective packs through additive overlays rather than separate engines per municipality or per state.

Texas municipality handling is additive-by-overlay, not one standalone pack per city.
International expansion is tolerated through jurisdiction-family and tier-depth law, not by prematurely forking engines.
The extension’s job is to resolve, pin, validate, reuse where lawful, and preserve governed pack context — not to rewrite the engine.