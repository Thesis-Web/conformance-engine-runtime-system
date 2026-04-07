import { z } from 'zod';
import type { Finding } from '../types/index.js';

// STUB-006: PackIdSchema updated to open string per DIFF-EXT-BASE-001.
// The original closed enum was spec-compliant for California-only builds
// but incompatible with the open identifier model introduced in extension step 1.
// Any non-empty string is a valid governed PackId; structural validity is
// enforced by validatePackId() in identifiers.ts at resolution time.
export const PackIdSchema = z.string().min(1);

export const RunStatusSchema = z.enum([
  'created',
  'ingesting',
  'ingested',
  'classified',
  'compare_pairs_built',
  'pass1_complete',
  'pass2_complete',
  'rules_complete',
  'artifacts_built',
  'validated',
  'complete',
  'failed',
]);

export const FindingClassSchema = z.enum([
  'DIFF',
  'HOLE',
  'CONTRA',
  'AMBIGUITY',
  'UNSUPPORTED',
  'STALE',
  'ASK',
]);

export const SeveritySchema = z.enum(['critical', 'high', 'medium', 'low', 'info']);

export const ConfidenceBandSchema = z.enum(['high', 'medium', 'low']);

export const ConfidenceClassSchema = z.enum(['deterministic', 'interpretive']);

export const FindingSchema = z.object({
  findingId: z.string(),
  runId: z.string(),
  packId: PackIdSchema,
  findingClass: FindingClassSchema,
  severity: SeveritySchema,
  confidenceClass: ConfidenceClassSchema,
  confidenceBand: ConfidenceBandSchema,
  extractionConfidence: z.number().min(0).max(1),
  classificationConfidence: z.number().min(0).max(1),
  contradictionConfidence: z.number().min(0).max(1),
  applicabilityConfidence: z.number().min(0).max(1),
  sourceAuthorityConfidence: z.number().min(0).max(1),
  sourceARefId: z.string(),
  sourceBRefId: z.string().optional(),
  escalationRequired: z.boolean(),
  narrativeDescription: z.string(),
  resolutionPath: z.string().optional(),
  askText: z.string().optional(),
  tags: z.array(z.string()),
  emittedBy: z.enum(['pass1', 'pass2', 'rules', 'merged']),
});

export function validateFinding(data: unknown): Finding {
  return FindingSchema.parse(data) as Finding;
}

/**
 * Validate a batch of findings using Zod.
 * Returns an array of error strings for any findings that fail validation.
 * Empty array means all findings are schema-compliant.
 * Used by the finding-schema gate in gates.ts.
 */
export function validateFindingBatch(findings: Finding[]): string[] {
  const errors: string[] = [];
  for (const [i, finding] of findings.entries()) {
    const result = FindingSchema.safeParse(finding);
    if (!result.success) {
      const issues = result.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`);
      errors.push(
        `findings[${i}] (${finding.findingId?.slice(0, 8) ?? '?'}): ${issues.join(', ')}`,
      );
    }
  }
  return errors;
}
