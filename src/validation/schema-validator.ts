import { z } from 'zod';
import type { Finding } from '../types/index.js';

export const PackIdSchema = z.enum([
  'pack-california-highrise-v1',
  'pack-california-appliance-refrig-v2',
  'pack-california-datacenter-v3',
]);

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

export function validateFinding(data: unknown): import('../types/index.js').Finding {
  return FindingSchema.parse(data) as Finding;
}
