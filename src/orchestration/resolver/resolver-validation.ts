/**
 * Resolver types and input validation — ext-spec §10.10, §11.3
 *
 * Centralises input validation before any resolver path runs.
 * Resolution must occur before created->ingesting state transition.
 */

import type { EffectivePackResolutionInput } from '../../types/effective-pack.js';
import { validateGoverningAsOfDate } from './component-effective-date-selector.js';
import { ResolverError } from './tier-path-builder.js';

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Validate operator-supplied resolution inputs before any resolution path runs.
 * Throws ResolverError on any violation.
 */
export function validateResolutionInput(input: EffectivePackResolutionInput): void {
  if (!input.packId || (input.packId as string).length === 0) {
    throw new ResolverError('ERR_RESOLUTION_INPUT_INVALID', 'packId is required');
  }
  if (!input.trackFamilyId || (input.trackFamilyId as string).length === 0) {
    throw new ResolverError('ERR_RESOLUTION_INPUT_INVALID', 'trackFamilyId is required');
  }
  if (!input.jurisdictionFamilyId || input.jurisdictionFamilyId.length === 0) {
    throw new ResolverError('ERR_RESOLUTION_INPUT_INVALID', 'jurisdictionFamilyId is required');
  }
  if (!input.jurisdictionId || input.jurisdictionId.length === 0) {
    throw new ResolverError('ERR_RESOLUTION_INPUT_INVALID', 'jurisdictionId is required');
  }
  if (!input.operatorId || input.operatorId.length === 0) {
    throw new ResolverError('ERR_RESOLUTION_INPUT_INVALID', 'operatorId is required');
  }
  if (!input.caseId || input.caseId.length === 0) {
    throw new ResolverError('ERR_RESOLUTION_INPUT_INVALID', 'caseId is required');
  }
  if (!input.runId || input.runId.length === 0) {
    throw new ResolverError('ERR_RESOLUTION_INPUT_INVALID', 'runId is required');
  }

  // governingAsOfDate format and future-date rule
  validateGoverningAsOfDate(input.governingAsOfDate, todayIsoDate());

  // Mode-specific field checks
  if (input.mode === 'replay' && !input.replaySourceRunId) {
    throw new ResolverError(
      'ERR_RESOLUTION_INPUT_INVALID',
      'replaySourceRunId is required for replay mode',
    );
  }
}
