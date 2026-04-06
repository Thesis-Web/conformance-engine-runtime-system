import type { BaseStandardsModule } from '../../types/effective-pack.js';
import { validatePackId, validateTrackFamilyId } from '../../types/identifiers.js';

export interface BaseStandardsModuleValidationResult {
  valid: boolean;
  errors: string[];
}

const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function isIsoDate(value: string): boolean {
  return ISO_DATE_REGEX.test(value);
}

export function validateBaseStandardsModule(
  module: BaseStandardsModule,
): BaseStandardsModuleValidationResult {
  const errors: string[] = [];

  if (!module.baseModuleId?.trim()) {
    errors.push('baseModuleId is empty');
  }

  if (!module.displayName?.trim()) {
    errors.push('displayName is empty');
  }

  if (!Array.isArray(module.supportedTrackFamilies) || module.supportedTrackFamilies.length === 0) {
    errors.push('supportedTrackFamilies is empty');
  } else {
    module.supportedTrackFamilies.forEach((trackFamilyId, index) => {
      if (!validateTrackFamilyId(trackFamilyId)) {
        errors.push(`supportedTrackFamilies[${index}] is invalid: ${trackFamilyId}`);
      }
    });
  }

  if (!Array.isArray(module.corpus)) {
    errors.push('corpus must be an array');
  }

  if (!Array.isArray(module.hierarchyFragments)) {
    errors.push('hierarchyFragments must be an array');
  }

  if (!Array.isArray(module.contradictionPatternFragments)) {
    errors.push('contradictionPatternFragments must be an array');
  }

  if (!module.versionIndex?.trim()) {
    errors.push('versionIndex is empty');
  }

  if (!isIsoDate(module.effectiveFrom)) {
    errors.push(`effectiveFrom is invalid: ${module.effectiveFrom}`);
  }

  if (module.effectiveTo !== undefined && !isIsoDate(module.effectiveTo)) {
    errors.push(`effectiveTo is invalid: ${module.effectiveTo}`);
  }

  if (
    module.effectiveTo !== undefined &&
    isIsoDate(module.effectiveFrom) &&
    isIsoDate(module.effectiveTo) &&
    module.effectiveTo < module.effectiveFrom
  ) {
    errors.push('effectiveTo is earlier than effectiveFrom');
  }

  const ownershipPackIdResult = validatePackId(module.ownershipPackId);
  if (!ownershipPackIdResult.valid) {
    errors.push(`ownershipPackId is invalid: ${ownershipPackIdResult.rejectionReason}`);
  }

  if (!module.provenance) {
    errors.push('provenance is missing');
  } else {
    if (!module.provenance.sourceOwner?.trim()) {
      errors.push('provenance.sourceOwner is empty');
    }
    if (!['primary', 'secondary', 'reference'].includes(module.provenance.sourceAuthority)) {
      errors.push(
        `provenance.sourceAuthority is invalid: ${String(module.provenance.sourceAuthority)}`,
      );
    }
    if (!module.provenance.lineageRef?.trim()) {
      errors.push('provenance.lineageRef is empty');
    }
  }

  return { valid: errors.length === 0, errors };
}

export function validateBaseStandardsModules(
  modules: BaseStandardsModule[],
): BaseStandardsModuleValidationResult {
  const errors: string[] = [];

  modules.forEach((module, index) => {
    const result = validateBaseStandardsModule(module);
    result.errors.forEach((error) => {
      errors.push(`baseModules[${index}]: ${error}`);
    });
  });

  return { valid: errors.length === 0, errors };
}
