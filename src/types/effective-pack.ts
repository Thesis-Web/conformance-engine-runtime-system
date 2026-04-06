import type { PackManifest } from './pack-manifest.js';
import type { EffectivePackId, PackId, TrackFamilyId } from './identifiers.js';
import type { JurisdictionTier, TierPathEntry } from './jurisdiction.js';
import type {
  CorpusEntry,
  HierarchyRule,
  ContradictionPattern,
  StandardVersionPolicy,
} from './pack-manifest.js';
import type { IsoDatetime, RelativePath, Sha256Hex, Uuid } from './primitives.js';

export type IsoDate = string;

export interface BaseStandardsModule {
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
    sourceAuthority: 'primary' | 'secondary' | 'reference';
    lineageRef: string;
    authoringRef?: string;
  };
}

export interface RequiredTierHandlingRule {
  trackFamilyId: TrackFamilyId;
  requiredTiers: JurisdictionTier[];
  maximumTier: JurisdictionTier;
  allowResolutionAtIntermediateTier: boolean;
}

export interface AllowedTierReferenceRule {
  trackFamilyId: TrackFamilyId;
  allowedTiers: JurisdictionTier[];
}

export interface JurisdictionFamilyConfig {
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

export interface TierOverlay {
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
    | 'track_requires_municipality'
    | 'municipality_adds_governing_standards'
    | 'municipality_adds_hierarchy_or_contradiction_behavior'
    | 'municipality_materially_changes_applicability'
  >;
  governanceLifecycle: 'candidate' | 'validated' | 'approved' | 'active' | 'deprecated';
}

export interface ComponentProvenanceEntry {
  componentKind: 'base_module' | 'tier_overlay';
  componentId: string;
  versionIndex: string;
  effectiveFrom: IsoDate;
  effectiveTo?: IsoDate;
  digest: Sha256Hex;
}

export interface EffectivePackManifest extends PackManifest {
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
  resolutionMethod: 'composed_fresh' | 'reused_precomputed' | 'replayed_pinned';
  replayPinned: boolean;
  replaySourceRunId?: Uuid;
  releaseState: 'draft' | 'in_review' | 'released' | 'superseded';
  reviewedBy?: string;
  releasedBy?: string;
  releasedAt?: IsoDatetime;
  reviewSignatureRef?: string;
  tenantId?: string;
  orgId?: string;
}

export interface EffectivePackStoreRecord {
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

export interface EffectivePackResolutionInput {
  mode: 'existing_case' | 'new_case' | 'replay';
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

export interface EffectivePackResolutionResult {
  resolved: boolean;
  effectivePackId?: EffectivePackId;
  manifestPath?: RelativePath;
  resolutionMethod?: 'composed_fresh' | 'reused_precomputed' | 'replayed_pinned';
  rejectionCode?: string;
  rejectionReason?: string;
  emittedOperatorPrompt?: boolean;
}
