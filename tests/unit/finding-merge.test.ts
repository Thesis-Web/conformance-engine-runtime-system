import { describe, it, expect } from 'vitest';
import { mergeFindingSets } from '../../src/core/finding-merge.js';
import type { Finding } from '../../src/types/index.js';
import { brandPackId } from '../../src/types/identifiers.js';

function makeFinding(overrides: Partial<Finding> = {}): Finding {
  return {
    findingId: 'finding-001',
    runId: 'run-001',
    packId: brandPackId('pack-california-highrise-v1'),
    findingClass: 'DIFF',
    severity: 'medium',
    confidenceClass: 'deterministic',
    confidenceBand: 'high',
    extractionConfidence: 0.9,
    classificationConfidence: 0.9,
    contradictionConfidence: 0.9,
    applicabilityConfidence: 0.9,
    sourceAuthorityConfidence: 0.9,
    sourceARefId: 'ref-001',
    escalationRequired: false,
    narrativeDescription: 'Test finding',
    tags: [],
    emittedBy: 'pass1',
    ...overrides,
  };
}

describe('mergeFindingSets', () => {
  it('includes pass1 findings when no pass2 audit entries', () => {
    const f = makeFinding({ findingId: 'f1' });
    const result = mergeFindingSets(
      { findings: [f], extractionNotes: [] },
      { auditEntries: [], auditCommentary: '' },
      { findings: [] },
    );
    expect(result.findings.some((r) => r.findingId === 'f1')).toBe(true);
  });

  it('pass2 suppress action removes a pass1 finding', () => {
    const f = makeFinding({ findingId: 'f1' });
    const result = mergeFindingSets(
      { findings: [f], extractionNotes: [] },
      {
        auditEntries: [{ findingId: 'f1', action: 'suppress', auditNote: 'unsupported claim' }],
        auditCommentary: '',
      },
      { findings: [] },
    );
    expect(result.findings.some((r) => r.findingId === 'f1')).toBe(false);
    expect(result.suppressedCount).toBe(1);
  });

  it('pass2 escalate action sets escalationRequired true', () => {
    const f = makeFinding({ findingId: 'f1', escalationRequired: false });
    const result = mergeFindingSets(
      { findings: [f], extractionNotes: [] },
      {
        auditEntries: [
          { findingId: 'f1', action: 'escalate', forceEscalation: true, auditNote: 'needs review' },
        ],
        auditCommentary: '',
      },
      { findings: [] },
    );
    const merged = result.findings.find((r) => r.findingId === 'f1');
    expect(merged?.escalationRequired).toBe(true);
    expect(result.escalatedCount).toBe(1);
  });

  it('pass2 downgrade updates confidenceBand', () => {
    const f = makeFinding({ findingId: 'f1', confidenceBand: 'high' });
    const result = mergeFindingSets(
      { findings: [f], extractionNotes: [] },
      {
        auditEntries: [
          {
            findingId: 'f1',
            action: 'downgrade',
            revisedConfidenceBand: 'low',
            auditNote: 'weak grounds',
          },
        ],
        auditCommentary: '',
      },
      { findings: [] },
    );
    const merged = result.findings.find((r) => r.findingId === 'f1');
    expect(merged?.confidenceBand).toBe('low');
  });

  it('rules findings take precedence — rules finding replaces pass1 finding with same id', () => {
    const pass1Finding = makeFinding({ findingId: 'f1', severity: 'low', emittedBy: 'pass1' });
    const rulesFinding = makeFinding({ findingId: 'f1', severity: 'critical', emittedBy: 'rules' });
    const result = mergeFindingSets(
      { findings: [pass1Finding], extractionNotes: [] },
      { auditEntries: [], auditCommentary: '' },
      { findings: [rulesFinding] },
    );
    const merged = result.findings.find((r) => r.findingId === 'f1');
    expect(merged?.severity).toBe('critical');
    expect(merged?.emittedBy).toBe('rules');
  });

  it('rules findings with new ids are included alongside pass1', () => {
    const f1 = makeFinding({ findingId: 'f1', emittedBy: 'pass1' });
    const ruleF = makeFinding({ findingId: 'f2', emittedBy: 'rules', findingClass: 'HOLE' });
    const result = mergeFindingSets(
      { findings: [f1], extractionNotes: [] },
      { auditEntries: [], auditCommentary: '' },
      { findings: [ruleF] },
    );
    expect(result.findings.some((r) => r.findingId === 'f1')).toBe(true);
    expect(result.findings.some((r) => r.findingId === 'f2')).toBe(true);
  });
});
