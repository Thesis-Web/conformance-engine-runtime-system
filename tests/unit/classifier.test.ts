import { describe, it, expect } from 'vitest';
import { classifyDocument } from '../../src/core/classifier.js';
import type { ClassMapRule } from '../../src/types/pack-manifest.js';

const SAMPLE_RULES: ClassMapRule[] = [
  {
    ruleId: 'r1',
    docClass: 'TEST_REPORT',
    matchCriteria: 'test-report',
    confidence: 0.95,
    priority: 1,
  },
  {
    ruleId: 'r2',
    docClass: 'ENG_LETTER',
    matchCriteria: 'eng-letter',
    confidence: 0.9,
    priority: 2,
  },
  {
    ruleId: 'r3',
    docClass: 'DESIGN_PLANS',
    matchCriteria: 'design',
    confidence: 0.85,
    priority: 3,
  },
  {
    ruleId: 'r4',
    docClass: 'MFR_SUBMITTAL',
    matchCriteria: 'submittal',
    confidence: 0.7,
    priority: 4,
  },
];

describe('classifyDocument', () => {
  it('operator override wins over all rules', () => {
    const result = classifyDocument({
      filename: 'test-report.pdf',
      contentSnippet: '',
      classMapRules: SAMPLE_RULES,
      operatorOverride: 'COMPLIANCE_CERT',
    });
    expect(result.docClass).toBe('COMPLIANCE_CERT');
    expect(result.source).toBe('operator_override');
    expect(result.confidence).toBe(1.0);
  });

  it('deterministic rule fires on filename match above confidence threshold', () => {
    const result = classifyDocument({
      filename: 'test-report.pdf',
      contentSnippet: '',
      classMapRules: SAMPLE_RULES,
    });
    expect(result.docClass).toBe('TEST_REPORT');
    expect(result.source).toBe('deterministic_rule');
    expect(result.escalated).toBe(false);
  });

  it('higher priority rule (lower number) wins when multiple rules match', () => {
    const result = classifyDocument({
      filename: 'test-report-design.pdf',
      contentSnippet: '',
      classMapRules: SAMPLE_RULES,
    });
    // priority 1 (test-report) < priority 3 (design)
    expect(result.docClass).toBe('TEST_REPORT');
  });

  it('rule below confidence threshold is skipped', () => {
    // submittal has confidence 0.70 which is below the 0.8 threshold
    const result = classifyDocument({
      filename: 'submittal.pdf',
      contentSnippet: '',
      classMapRules: SAMPLE_RULES,
    });
    // should not match because confidence < 0.8
    expect(result.docClass).not.toBe('MFR_SUBMITTAL');
  });

  it('falls back to pass1 suggestion when no rule matches', () => {
    const result = classifyDocument({
      filename: 'unknown-file.pdf',
      contentSnippet: '',
      classMapRules: SAMPLE_RULES,
      pass1Suggestion: 'STD_REFERENCE',
    });
    expect(result.docClass).toBe('STD_REFERENCE');
    expect(result.source).toBe('model_suggestion');
  });

  it('escalates when no rule and no suggestion matches', () => {
    const result = classifyDocument({
      filename: 'unknown-file.pdf',
      contentSnippet: '',
      classMapRules: SAMPLE_RULES,
    });
    expect(result.escalated).toBe(true);
    expect(result.source).toBe('escalated_unknown');
  });
});
