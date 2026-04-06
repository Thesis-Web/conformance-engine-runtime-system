import type {
  JurisdictionFamilyConfig,
  RequiredTierHandlingRule,
} from '../../types/effective-pack.js';
import type { TrackFamilyId } from '../../types/identifiers.js';
import type { JurisdictionTier, TierPathEntry } from '../../types/jurisdiction.js';

export class ResolverError extends Error {
  public readonly code: string;

  public constructor(code: string, message: string) {
    super(message);
    this.name = 'ResolverError';
    this.code = code;
  }
}

function lookupRequiredTierHandling(
  family: JurisdictionFamilyConfig,
  trackFamilyId: TrackFamilyId,
): RequiredTierHandlingRule {
  const rule = family.requiredTierHandlingByTrack.find(
    (entry) => entry.trackFamilyId === trackFamilyId,
  );

  if (!rule) {
    throw new ResolverError(
      'ERR_REQUIRED_TIER_RULE_MISSING',
      `No required tier rule for trackFamilyId '${trackFamilyId}'`,
    );
  }

  return rule;
}

function buildTierEntry(
  tier: JurisdictionTier,
  jurisdictionId: string,
  municipalityId?: string,
): TierPathEntry | null {
  if (tier === 'supranational') {
    return null;
  }

  if (tier === 'national') {
    const nationalIdParts = jurisdictionId.split('-');
    const nationalId = nationalIdParts[0] ?? jurisdictionId;
    return { tierType: tier, tierId: nationalId };
  }

  if (tier === 'state_or_member_state') {
    return { tierType: tier, tierId: jurisdictionId };
  }

  if (tier === 'regional') {
    return null;
  }

  if (tier === 'municipal' || tier === 'local_authority') {
    if (!municipalityId) {
      return null;
    }

    return {
      tierType: tier,
      tierId: municipalityId,
      parentTierId: jurisdictionId,
    };
  }

  return null;
}

export function validateTierPath(
  path: TierPathEntry[],
  family: JurisdictionFamilyConfig,
  trackFamilyId: TrackFamilyId,
): TierPathEntry[] {
  const seen = new Set<string>();

  for (const entry of path) {
    const key = `${entry.tierType}:${entry.tierId}`;
    if (seen.has(key)) {
      throw new ResolverError('ERR_DUPLICATE_TIER_PATH_ENTRY', key);
    }
    seen.add(key);
  }

  const required = lookupRequiredTierHandling(family, trackFamilyId);
  for (const tier of required.requiredTiers) {
    if (!path.some((entry) => entry.tierType === tier)) {
      throw new ResolverError('ERR_REQUIRED_TIER_MISSING', `Missing required tier ${tier}`);
    }
  }

  return path;
}

export function buildTierPath(
  family: JurisdictionFamilyConfig,
  trackFamilyId: TrackFamilyId,
  jurisdictionId: string,
  municipalityId?: string,
): TierPathEntry[] {
  const path: TierPathEntry[] = family.tierOrder
    .map((tier) => buildTierEntry(tier, jurisdictionId, municipalityId))
    .filter((entry): entry is TierPathEntry => entry !== null);

  const requiresMunicipality = family.requiresMunicipalityByTrack[trackFamilyId] === true;
  if (requiresMunicipality && !municipalityId) {
    throw new ResolverError(
      'ERR_MUNICIPALITY_REQUIRED',
      `municipalityId is required for trackFamilyId '${trackFamilyId}'`,
    );
  }

  return validateTierPath(path, family, trackFamilyId);
}
