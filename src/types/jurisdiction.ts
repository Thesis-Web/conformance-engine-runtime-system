export type JurisdictionTier =
  | 'supranational'
  | 'national'
  | 'state_or_member_state'
  | 'regional'
  | 'municipal'
  | 'local_authority';

export interface TierPathEntry {
  tierType: JurisdictionTier;
  tierId: string;
  parentTierId?: string;
}

export const APPROVED_JURISDICTION_TIERS: JurisdictionTier[] = [
  'supranational',
  'national',
  'state_or_member_state',
  'regional',
  'municipal',
  'local_authority',
];

export const JURISDICTION_FAMILY_ID_REGEX = /^[a-z][a-z0-9_]*_v[1-9][0-9]*$/;

export function isJurisdictionTier(value: string): value is JurisdictionTier {
  return APPROVED_JURISDICTION_TIERS.includes(value as JurisdictionTier);
}

export function validateJurisdictionFamilyId(value: string): boolean {
  return JURISDICTION_FAMILY_ID_REGEX.test(value);
}
