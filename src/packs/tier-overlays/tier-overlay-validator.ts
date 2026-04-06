import type { TierOverlay } from '../../types/effective-pack.js';
import { validateTrackFamilyId } from '../../types/identifiers.js';
import { isJurisdictionTier } from '../../types/jurisdiction.js';

export interface TierOverlayValidationResult {
  valid: boolean;
  errors: string[];
}

const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function isIsoDate(value: string): boolean {
  return ISO_DATE_REGEX.test(value);
}

function requiresEligibilityBasis(overlay: TierOverlay): boolean {
  return overlay.tierType === 'municipal' || overlay.tierType === 'local_authority';
}

export function validateTierOverlay(overlay: TierOverlay): TierOverlayValidationResult {
  const errors: string[] = [];

  if (!overlay.tierOverlayId?.trim()) {
    errors.push('tierOverlayId is empty');
  }

  if (!isJurisdictionTier(overlay.tierType)) {
    errors.push(`tierType is invalid: ${overlay.tierType}`);
  }

  if (!overlay.tierId?.trim()) {
    errors.push('tierId is empty');
  }

  if (!overlay.jurisdictionFamilyId?.trim()) {
    errors.push('jurisdictionFamilyId is empty');
  }

  if (!overlay.jurisdictionId?.trim()) {
    errors.push('jurisdictionId is empty');
  }

  if (
    !Array.isArray(overlay.supportedTrackFamilies) ||
    overlay.supportedTrackFamilies.length === 0
  ) {
    errors.push('supportedTrackFamilies is empty');
  } else {
    overlay.supportedTrackFamilies.forEach((trackFamilyId, index) => {
      if (!validateTrackFamilyId(trackFamilyId)) {
        errors.push(`supportedTrackFamilies[${index}] is invalid: ${trackFamilyId}`);
      }
    });
  }

  if (!Array.isArray(overlay.corpusFragments)) {
    errors.push('corpusFragments must be an array');
  }

  if (!Array.isArray(overlay.hierarchyFragments)) {
    errors.push('hierarchyFragments must be an array');
  }

  if (!Array.isArray(overlay.contradictionPatternFragments)) {
    errors.push('contradictionPatternFragments must be an array');
  }

  if (!overlay.versionIndex?.trim()) {
    errors.push('versionIndex is empty');
  }

  if (!isIsoDate(overlay.effectiveFrom)) {
    errors.push(`effectiveFrom is invalid: ${overlay.effectiveFrom}`);
  }

  if (overlay.effectiveTo !== undefined && !isIsoDate(overlay.effectiveTo)) {
    errors.push(`effectiveTo is invalid: ${overlay.effectiveTo}`);
  }

  if (
    overlay.effectiveTo !== undefined &&
    isIsoDate(overlay.effectiveFrom) &&
    isIsoDate(overlay.effectiveTo) &&
    overlay.effectiveTo < overlay.effectiveFrom
  ) {
    errors.push('effectiveTo is earlier than effectiveFrom');
  }

  if (!overlay.provenance) {
    errors.push('provenance is missing');
  } else {
    if (!overlay.provenance.sourceOwner?.trim()) {
      errors.push('provenance.sourceOwner is empty');
    }
    if (!overlay.provenance.approvalPath?.trim()) {
      errors.push('provenance.approvalPath is empty');
    }
    if (!overlay.provenance.lineageRef?.trim()) {
      errors.push('provenance.lineageRef is empty');
    }
  }

  if (
    !['candidate', 'validated', 'approved', 'active', 'deprecated'].includes(
      overlay.governanceLifecycle,
    )
  ) {
    errors.push(`governanceLifecycle is invalid: ${String(overlay.governanceLifecycle)}`);
  }

  if (requiresEligibilityBasis(overlay)) {
    if (!Array.isArray(overlay.eligibilityBases) || overlay.eligibilityBases.length === 0) {
      errors.push('eligibilityBases is required for municipal/local_authority overlays');
    }
  }

  if (Array.isArray(overlay.eligibilityBases)) {
    overlay.eligibilityBases.forEach((basis, index) => {
      if (
        ![
          'track_requires_municipality',
          'municipality_adds_governing_standards',
          'municipality_adds_hierarchy_or_contradiction_behavior',
          'municipality_materially_changes_applicability',
        ].includes(basis)
      ) {
        errors.push(`eligibilityBases[${index}] is invalid: ${basis}`);
      }
    });
  }

  return { valid: errors.length === 0, errors };
}

export function validateTierOverlays(overlays: TierOverlay[]): TierOverlayValidationResult {
  const errors: string[] = [];

  overlays.forEach((overlay, index) => {
    const result = validateTierOverlay(overlay);
    result.errors.forEach((error) => {
      errors.push(`tierOverlays[${index}]: ${error}`);
    });
  });

  return { valid: errors.length === 0, errors };
}
