import type {
  BaseStandardsModule,
  EffectivePackResolutionInput,
  JurisdictionFamilyConfig,
  TierOverlay,
} from '../../types/effective-pack.js';
import type { IsoDate } from '../../types/effective-pack.js';
import type { TierPathEntry } from '../../types/jurisdiction.js';

import { ResolverError } from './tier-path-builder.js';

const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export function isActiveOn(
  component: { effectiveFrom: IsoDate; effectiveTo?: IsoDate },
  date: IsoDate,
): boolean {
  return (
    component.effectiveFrom <= date &&
    (component.effectiveTo === undefined || date <= component.effectiveTo)
  );
}

export function validateGoverningAsOfDate(governingAsOfDate: IsoDate, today: IsoDate): void {
  if (!ISO_DATE_REGEX.test(governingAsOfDate)) {
    throw new ResolverError(
      'ERR_GOVERNING_DATE_INVALID',
      `governingAsOfDate is invalid: ${governingAsOfDate}`,
    );
  }

  if (governingAsOfDate > today) {
    throw new ResolverError(
      'ERR_GOVERNING_DATE_FUTURE',
      `governingAsOfDate is in the future: ${governingAsOfDate}`,
    );
  }
}

export function selectApplicableBaseModules(
  family: JurisdictionFamilyConfig,
  trackFamilyId: EffectivePackResolutionInput['trackFamilyId'],
  governingAsOfDate: IsoDate,
  modules: BaseStandardsModule[],
): BaseStandardsModule[] {
  const referencedIds = new Set(family.referencedBaseStandardsModulesByTrack[trackFamilyId] ?? []);

  return modules.filter(
    (module) =>
      module.supportedTrackFamilies.includes(trackFamilyId) &&
      referencedIds.has(module.baseModuleId) &&
      isActiveOn(module, governingAsOfDate),
  );
}

export function selectApplicableTierOverlays(
  family: JurisdictionFamilyConfig,
  tierPath: TierPathEntry[],
  input: EffectivePackResolutionInput,
  overlays: TierOverlay[],
): TierOverlay[] {
  const referencedIds = new Set(family.referencedTierOverlaysByTrack[input.trackFamilyId] ?? []);
  const tierKeys = new Set(tierPath.map((entry) => `${entry.tierType}:${entry.tierId}`));

  return overlays.filter((overlay) => {
    const overlayTierKey = `${overlay.tierType}:${overlay.tierId}`;

    return (
      overlay.supportedTrackFamilies.includes(input.trackFamilyId) &&
      overlay.jurisdictionFamilyId === input.jurisdictionFamilyId &&
      referencedIds.has(overlay.tierOverlayId) &&
      tierKeys.has(overlayTierKey) &&
      overlay.governanceLifecycle === 'active' &&
      isActiveOn(overlay, input.governingAsOfDate)
    );
  });
}
