/**
 * Component selection — ext-spec §15
 *
 * Wraps base-module and tier-overlay selection into a single surface
 * consumed by resolver paths. Delegates to the canonical selector
 * already built in component-effective-date-selector.ts.
 *
 * Also responsible for running overlap detection before composition.
 */

import type {
  BaseStandardsModule,
  EffectivePackResolutionInput,
  JurisdictionFamilyConfig,
  TierOverlay,
} from '../../types/effective-pack.js';
import type { TierPathEntry } from '../../types/jurisdiction.js';
import {
  selectApplicableBaseModules,
  selectApplicableTierOverlays,
} from './component-effective-date-selector.js';
import { detectIllegalOverlap } from './overlap-conflict-detector.js';
import { ResolverError } from './tier-path-builder.js';

export interface SelectedComponents {
  baseModules: BaseStandardsModule[];
  overlays: TierOverlay[];
}

/**
 * Select and validate all components for a new-case composition.
 * Runs overlap detection before returning.
 * Throws ResolverError if no base modules found (cannot compose empty pack).
 */
export function selectComponents(
  family: JurisdictionFamilyConfig,
  tierPath: TierPathEntry[],
  input: EffectivePackResolutionInput,
  allModules: BaseStandardsModule[],
  allOverlays: TierOverlay[],
): SelectedComponents {
  const baseModules = selectApplicableBaseModules(
    family,
    input.trackFamilyId,
    input.governingAsOfDate,
    allModules,
  );

  if (baseModules.length === 0) {
    throw new ResolverError(
      'ERR_NO_BASE_MODULES',
      `No active base standards modules found for trackFamilyId '${input.trackFamilyId}' on date '${input.governingAsOfDate}'`,
    );
  }

  const overlays = selectApplicableTierOverlays(family, tierPath, input, allOverlays);

  // Run overlap detection before proceeding to composition
  detectIllegalOverlap(baseModules, overlays, input.governingAsOfDate);

  return { baseModules, overlays };
}
