export type PackId = string & { readonly __brand: 'PackId' };
export type TrackFamilyId = string & { readonly __brand: 'TrackFamilyId' };
export type EffectivePackId = string & { readonly __brand: 'EffectivePackId' };

export interface PackIdValidationResult {
  valid: boolean;
  normalizedInput: string;
  isLegacyBypass: boolean;
  jurisdictionScope?: string;
  trackFamilySlug?: string;
  versionIndex?: string;
  rejectionReason?: string;
}

export const APPROVED_TRACK_FAMILY_IDS = [
  'buildings',
  'appliance_refrigeration',
  'datacenter',
] as const;

export const GOVERNED_JURISDICTION_SCOPES = ['us-tx', 'us-ca'] as const;

export const LEGACY_PACK_ID_VALUES = [
  'pack-california-highrise-v1',
  'pack-california-appliance-refrig-v2',
  'pack-california-datacenter-v3',
] as const;

export const LEGACY_PACK_ID_WHITELIST = new Set<PackId>(
  LEGACY_PACK_ID_VALUES.map((value) => value as PackId),
);

const PACK_ID_REGEX = /^pack-[a-z0-9]+(?:-[a-z0-9]+)*-[a-z0-9]+(?:_[a-z0-9]+)*-v[1-9][0-9]*$/;
const VERSION_SEGMENT_REGEX = /-v([1-9][0-9]*)$/;

export function brandPackId(value: string): PackId {
  return value as PackId;
}

export function brandTrackFamilyId(value: string): TrackFamilyId {
  return value as TrackFamilyId;
}

export function brandEffectivePackId(value: string): EffectivePackId {
  return value as EffectivePackId;
}

export function isTrackFamilyId(value: string): value is TrackFamilyId {
  return APPROVED_TRACK_FAMILY_IDS.includes(value as (typeof APPROVED_TRACK_FAMILY_IDS)[number]);
}

export function validateTrackFamilyId(value: string): value is TrackFamilyId {
  return /^[a-z][a-z0-9_]*$/.test(value) && isTrackFamilyId(value);
}

export function validatePackId(input: string): PackIdValidationResult {
  const normalizedInput = input.trim().toLowerCase();

  if (normalizedInput.length === 0) {
    return {
      valid: false,
      normalizedInput,
      isLegacyBypass: false,
      rejectionReason: 'PackId must be non-empty',
    };
  }

  if (LEGACY_PACK_ID_WHITELIST.has(normalizedInput as PackId)) {
    return {
      valid: true,
      normalizedInput,
      isLegacyBypass: true,
    };
  }

  if (!PACK_ID_REGEX.test(normalizedInput)) {
    return {
      valid: false,
      normalizedInput,
      isLegacyBypass: false,
      rejectionReason: 'PackId failed canonical regex pre-check',
    };
  }

  const versionMatch = normalizedInput.match(VERSION_SEGMENT_REGEX);
  if (!versionMatch) {
    return {
      valid: false,
      normalizedInput,
      isLegacyBypass: false,
      rejectionReason: 'PackId missing version segment',
    };
  }

  const versionIndex = versionMatch[1];
  if (versionIndex === undefined) {
    return {
      valid: false,
      normalizedInput,
      isLegacyBypass: false,
      rejectionReason: 'PackId version segment could not be parsed',
    };
  }

  const withoutPrefix = normalizedInput.slice('pack-'.length);
  const body = withoutPrefix.slice(0, withoutPrefix.length - `-v${versionIndex}`.length);

  const trackCandidates = [...APPROVED_TRACK_FAMILY_IDS].sort((a, b) => b.length - a.length);
  for (const trackFamilySlug of trackCandidates) {
    const suffix = `-${trackFamilySlug}`;
    if (!body.endsWith(suffix)) continue;

    const jurisdictionScope = body.slice(0, body.length - suffix.length);
    if (
      !GOVERNED_JURISDICTION_SCOPES.includes(
        jurisdictionScope as (typeof GOVERNED_JURISDICTION_SCOPES)[number],
      )
    ) {
      return {
        valid: false,
        normalizedInput,
        isLegacyBypass: false,
        trackFamilySlug,
        versionIndex,
        rejectionReason: `Unknown jurisdiction scope '${jurisdictionScope}'`,
      };
    }

    return {
      valid: true,
      normalizedInput,
      isLegacyBypass: false,
      jurisdictionScope,
      trackFamilySlug,
      versionIndex,
    };
  }

  return {
    valid: false,
    normalizedInput,
    isLegacyBypass: false,
    versionIndex,
    rejectionReason: 'PackId track-family slug did not map to governed TrackFamilyId vocabulary',
  };
}
