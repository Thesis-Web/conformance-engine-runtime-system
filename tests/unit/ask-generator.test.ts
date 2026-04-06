import { describe, it, expect } from 'vitest';
import { generateAsks } from '../../src/core/ask-generator.js';
import type { Finding } from '../../src/types/index.js';
import type { PackManifest } from '../../src/types/pack-manifest.js';
import { brandPackId } from '../../src/types/identifiers.js';

function makeFinding(overrides: Partial<Finding> = {}): Finding {
  return {
    findingId: 'finding-001',
    runId: 'run-001',
    packId: brandPackId('pack-california-highrise-v1'),
    findingClass: 'HOLE',
    severity: 'high',
    confidenceClass: 'deterministic',
    confidenceBand: 'high',
    extractionConfidence: 0.9,
    classificationConfidence: 0.9,
    contradictionConfidence: 0.9,
    applicabilityConfidence: 0.9,
    sourceAuthorityConfidence: 0.9,
    sourceARefId: 'ref-001',
    escalationRequired: false,
    narrativeDescription: 'Missing test report',
    tags: [],
    emittedBy: 'rules',
    ...overrides,
  };
}

const STUB_PACK = {
  packId: brandPackId('pack-california-highrise-v1'),
} as unknown as PackManifest;

describe('generateAsks', () => {
  it('generates an ask for every HOLE finding', () => {
    const f = makeFinding({ findingClass: 'HOLE' });
    const asks = generateAsks([f], STUB_PACK);
    expect(asks.length).toBe(1);
    expect(asks[0]!.askType).toBe('required_artifact');
    expect(asks[0]!.linkedFindingId).toBe(f.findingId);
  });

  it('generates an ask for every AMBIGUITY finding', () => {
    const f = makeFinding({ findingClass: 'AMBIGUITY' });
    const asks = generateAsks([f], STUB_PACK);
    expect(asks.length).toBe(1);
    expect(asks[0]!.askType).toBe('clarification');
  });

  it('generates an ask for every UNSUPPORTED finding', () => {
    const f = makeFinding({ findingClass: 'UNSUPPORTED' });
    const asks = generateAsks([f], STUB_PACK);
    expect(asks.length).toBe(1);
    expect(asks[0]!.askType).toBe('evidence_gap');
  });

  it('generates ask for CONTRA with escalationRequired=true', () => {
    const f = makeFinding({ findingClass: 'CONTRA', escalationRequired: true });
    const asks = generateAsks([f], STUB_PACK);
    expect(asks.length).toBe(1);
  });

  it('generates ask for CONTRA with critical severity', () => {
    const f = makeFinding({
      findingClass: 'CONTRA',
      severity: 'critical',
      escalationRequired: false,
    });
    const asks = generateAsks([f], STUB_PACK);
    expect(asks.length).toBe(1);
  });

  it('does NOT generate ask for CONTRA with low severity and no escalation', () => {
    const f = makeFinding({ findingClass: 'CONTRA', severity: 'low', escalationRequired: false });
    const asks = generateAsks([f], STUB_PACK);
    expect(asks.length).toBe(0);
  });

  it('generates ask for DIFF with interpretive confidenceClass', () => {
    const f = makeFinding({
      findingClass: 'DIFF',
      confidenceClass: 'interpretive',
      severity: 'low',
    });
    const asks = generateAsks([f], STUB_PACK);
    expect(asks.length).toBe(1);
  });

  it('generates ask for STALE when resolutionPath is set', () => {
    const f = makeFinding({ findingClass: 'STALE', resolutionPath: 'Update to Title-24-2022' });
    const asks = generateAsks([f], STUB_PACK);
    expect(asks.length).toBe(1);
    expect(asks[0]!.askType).toBe('authority_check');
  });

  it('does NOT generate ask for STALE without resolutionPath', () => {
    const f = makeFinding({ findingClass: 'STALE' });
    const asks = generateAsks([f], STUB_PACK);
    expect(asks.length).toBe(0);
  });

  it('ask severity mirrors the linked finding severity', () => {
    const f = makeFinding({ findingClass: 'HOLE', severity: 'critical' });
    const asks = generateAsks([f], STUB_PACK);
    expect(asks[0]!.severity).toBe('critical');
  });

  it('ask requiredForCleanOutput is true when escalationRequired or severity critical/high', () => {
    const f = makeFinding({
      findingClass: 'HOLE',
      severity: 'critical',
      escalationRequired: false,
    });
    const asks = generateAsks([f], STUB_PACK);
    expect(asks[0]!.requiredForCleanOutput).toBe(true);
  });

  it('returns empty array for no findings', () => {
    const asks = generateAsks([], STUB_PACK);
    expect(asks).toHaveLength(0);
  });
});
