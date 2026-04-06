import type {
  AllowedTierReferenceRule,
  JurisdictionFamilyConfig,
  RequiredTierHandlingRule,
} from '../../types/effective-pack.js';
import { validateTrackFamilyId } from '../../types/identifiers.js';
import { isJurisdictionTier } from '../../types/jurisdiction.js';

export interface JurisdictionFamilyConfigValidationResult {
  valid: boolean;
  errors: string[];
}

const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const JURISDICTION_FAMILY_ID_REGEX = /^[a-z][a-z0-9_]*_v[1-9][0-9]*$/;

function isIsoDate(value: string): boolean {
  return ISO_DATE_REGEX.test(value);
}

function validateRequiredTierHandlingRule(
  rule: RequiredTierHandlingRule,
  index: number,
  errors: string[],
): void {
  if (!validateTrackFamilyId(rule.trackFamilyId)) {
    errors.push(
      `requiredTierHandlingByTrack[${index}].trackFamilyId is invalid: ${rule.trackFamilyId}`,
    );
  }

  if (!Array.isArray(rule.requiredTiers) || rule.requiredTiers.length === 0) {
    errors.push(`requiredTierHandlingByTrack[${index}].requiredTiers is empty`);
  } else {
    rule.requiredTiers.forEach((tier, tierIndex) => {
      if (!isJurisdictionTier(tier)) {
        errors.push(
          `requiredTierHandlingByTrack[${index}].requiredTiers[${tierIndex}] is invalid: ${tier}`,
        );
      }
    });
  }

  if (!isJurisdictionTier(rule.maximumTier)) {
    errors.push(
      `requiredTierHandlingByTrack[${index}].maximumTier is invalid: ${rule.maximumTier}`,
    );
  }
}

function validateAllowedTierReferenceRule(
  rule: AllowedTierReferenceRule,
  index: number,
  errors: string[],
): void {
  if (!validateTrackFamilyId(rule.trackFamilyId)) {
    errors.push(
      `allowedTierReferencesByTrack[${index}].trackFamilyId is invalid: ${rule.trackFamilyId}`,
    );
  }

  if (!Array.isArray(rule.allowedTiers) || rule.allowedTiers.length === 0) {
    errors.push(`allowedTierReferencesByTrack[${index}].allowedTiers is empty`);
  } else {
    rule.allowedTiers.forEach((tier, tierIndex) => {
      if (!isJurisdictionTier(tier)) {
        errors.push(
          `allowedTierReferencesByTrack[${index}].allowedTiers[${tierIndex}] is invalid: ${tier}`,
        );
      }
    });
  }
}

export function validateJurisdictionFamilyConfig(
  config: JurisdictionFamilyConfig,
): JurisdictionFamilyConfigValidationResult {
  const errors: string[] = [];

  if (!config.jurisdictionFamilyId?.trim()) {
    errors.push('jurisdictionFamilyId is empty');
  } else if (!JURISDICTION_FAMILY_ID_REGEX.test(config.jurisdictionFamilyId)) {
    errors.push(`jurisdictionFamilyId is invalid: ${config.jurisdictionFamilyId}`);
  }

  if (!config.displayName?.trim()) {
    errors.push('displayName is empty');
  }

  if (!Array.isArray(config.supportedTrackFamilies) || config.supportedTrackFamilies.length === 0) {
    errors.push('supportedTrackFamilies is empty');
  } else {
    config.supportedTrackFamilies.forEach((trackFamilyId, index) => {
      if (!validateTrackFamilyId(trackFamilyId)) {
        errors.push(`supportedTrackFamilies[${index}] is invalid: ${trackFamilyId}`);
      }
    });
  }

  if (!Array.isArray(config.tierOrder) || config.tierOrder.length === 0) {
    errors.push('tierOrder is empty');
  } else {
    config.tierOrder.forEach((tier, index) => {
      if (!isJurisdictionTier(tier)) {
        errors.push(`tierOrder[${index}] is invalid: ${tier}`);
      }
    });
  }

  Object.entries(config.requiresMunicipalityByTrack).forEach(([trackFamilyId, value]) => {
    if (!validateTrackFamilyId(trackFamilyId)) {
      errors.push(`requiresMunicipalityByTrack key is invalid: ${trackFamilyId}`);
    }
    if (typeof value !== 'boolean') {
      errors.push(`requiresMunicipalityByTrack.${trackFamilyId} must be boolean`);
    }
  });

  config.requiredTierHandlingByTrack.forEach((rule, index) => {
    validateRequiredTierHandlingRule(rule, index, errors);
  });

  config.allowedTierReferencesByTrack.forEach((rule, index) => {
    validateAllowedTierReferenceRule(rule, index, errors);
  });

  Object.entries(config.referencedBaseStandardsModulesByTrack).forEach(
    ([trackFamilyId, moduleIds]) => {
      if (!validateTrackFamilyId(trackFamilyId)) {
        errors.push(`referencedBaseStandardsModulesByTrack key is invalid: ${trackFamilyId}`);
      }
      if (!Array.isArray(moduleIds)) {
        errors.push(`referencedBaseStandardsModulesByTrack.${trackFamilyId} must be an array`);
      }
    },
  );

  Object.entries(config.referencedTierOverlaysByTrack).forEach(([trackFamilyId, overlayIds]) => {
    if (!validateTrackFamilyId(trackFamilyId)) {
      errors.push(`referencedTierOverlaysByTrack key is invalid: ${trackFamilyId}`);
    }
    if (!Array.isArray(overlayIds)) {
      errors.push(`referencedTierOverlaysByTrack.${trackFamilyId} must be an array`);
    }
  });

  if (!config.versionIndex?.trim()) {
    errors.push('versionIndex is empty');
  }

  if (!isIsoDate(config.effectiveFrom)) {
    errors.push(`effectiveFrom is invalid: ${config.effectiveFrom}`);
  }

  if (config.effectiveTo !== undefined && !isIsoDate(config.effectiveTo)) {
    errors.push(`effectiveTo is invalid: ${config.effectiveTo}`);
  }

  if (
    config.effectiveTo !== undefined &&
    isIsoDate(config.effectiveFrom) &&
    isIsoDate(config.effectiveTo) &&
    config.effectiveTo < config.effectiveFrom
  ) {
    errors.push('effectiveTo is earlier than effectiveFrom');
  }

  return { valid: errors.length === 0, errors };
}

export function validateJurisdictionFamilyConfigs(
  configs: JurisdictionFamilyConfig[],
): JurisdictionFamilyConfigValidationResult {
  const errors: string[] = [];

  configs.forEach((config, index) => {
    const result = validateJurisdictionFamilyConfig(config);
    result.errors.forEach((error) => {
      errors.push(`jurisdictionFamilyConfigs[${index}]: ${error}`);
    });
  });

  return { valid: errors.length === 0, errors };
}
