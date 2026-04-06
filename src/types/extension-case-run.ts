import type { EffectivePackId, TrackFamilyId } from './identifiers.js';
import type { TierPathEntry } from './jurisdiction.js';
import type { IsoDatetime, NonEmptyString, Sha256Hex, Uuid } from './primitives.js';
import type { IsoDate } from './effective-pack.js';

export interface CaseRecordExtension {
  trackFamilyId: TrackFamilyId;
  jurisdictionFamilyId: string;
  jurisdictionId: string;
  municipalityId?: string;
  tenantId?: string;
  orgId?: string;
  uploadedBy: NonEmptyString;
  governingAsOfDate: IsoDate;
}

export interface RunRecordExtension {
  resolvedEffectivePackId?: EffectivePackId;
  resolvedAt?: IsoDatetime;
  resolvedBy?: string;
  reviewedBy?: string;
  governingAsOfDate?: IsoDate;
  releasedBy?: string;
  releasedAt?: IsoDatetime;
  reviewSignatureRef?: string;
  releaseState?: 'draft' | 'in_review' | 'released' | 'superseded';
  replaySourceRunId?: Uuid;
  compositionDigest?: Sha256Hex;
  componentDigests?: Sha256Hex[];
  tierPath?: TierPathEntry[];
}
