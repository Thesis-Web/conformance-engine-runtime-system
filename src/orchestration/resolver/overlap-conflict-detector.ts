import type { BaseStandardsModule, TierOverlay } from '../../types/effective-pack.js';
import type { IsoDate } from '../../types/effective-pack.js';

import { ResolverError } from './tier-path-builder.js';
import { isActiveOn } from './component-effective-date-selector.js';

export type ResolvedComponent = BaseStandardsModule | TierOverlay;

export function dateRangesOverlap(a: ResolvedComponent, b: ResolvedComponent): boolean {
  const latestStart = a.effectiveFrom > b.effectiveFrom ? a.effectiveFrom : b.effectiveFrom;
  const aEnd = a.effectiveTo ?? '9999-12-31';
  const bEnd = b.effectiveTo ?? '9999-12-31';
  const earliestEnd = aEnd < bEnd ? aEnd : bEnd;
  return latestStart <= earliestEnd;
}

export function deriveCoexistenceKey(component: ResolvedComponent): string {
  if ('baseModuleId' in component) {
    return `base_module|${component.baseModuleId}`;
  }

  return `tier_overlay|${component.jurisdictionFamilyId}|${component.tierType}|${component.tierId}`;
}

export function detectIllegalOverlap(
  baseModules: BaseStandardsModule[],
  overlays: TierOverlay[],
  governingAsOfDate: IsoDate,
): void {
  const components: ResolvedComponent[] = [...baseModules, ...overlays].filter((component) =>
    isActiveOn(component, governingAsOfDate),
  );
  const grouped = new Map<string, ResolvedComponent[]>();

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
          throw new ResolverError(
            'ERR_EFFECTIVE_DATE_OVERLAP',
            `Illegal active overlap for ${key}`,
          );
        }
      }
    }
  }
}
