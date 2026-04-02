import { describe, it, expect } from 'vitest';
import {
  LANE_PRECEDENCE,
  higherAuthority,
  canEmitFindings,
} from '../../src/contract/source-lane.js';

describe('LANE_PRECEDENCE', () => {
  it('case_bound has highest authority (lowest precedence number)', () => {
    expect(LANE_PRECEDENCE['case_bound']).toBe(1);
  });

  it('curated_reference is secondary authority', () => {
    expect(LANE_PRECEDENCE['curated_reference']).toBe(2);
  });

  it('live_candidate has lowest authority', () => {
    expect(LANE_PRECEDENCE['live_candidate']).toBe(3);
  });

  it('precedence order is case_bound < curated_reference < live_candidate', () => {
    expect(LANE_PRECEDENCE['case_bound']).toBeLessThan(LANE_PRECEDENCE['curated_reference']);
    expect(LANE_PRECEDENCE['curated_reference']).toBeLessThan(LANE_PRECEDENCE['live_candidate']);
  });
});

describe('higherAuthority', () => {
  it('returns case_bound when compared to curated_reference', () => {
    expect(higherAuthority('case_bound', 'curated_reference')).toBe('case_bound');
  });

  it('returns case_bound when compared to live_candidate', () => {
    expect(higherAuthority('case_bound', 'live_candidate')).toBe('case_bound');
  });

  it('returns curated_reference when compared to live_candidate', () => {
    expect(higherAuthority('curated_reference', 'live_candidate')).toBe('curated_reference');
  });

  it('is symmetric — same result regardless of argument order', () => {
    expect(higherAuthority('curated_reference', 'case_bound')).toBe('case_bound');
    expect(higherAuthority('live_candidate', 'case_bound')).toBe('case_bound');
    expect(higherAuthority('live_candidate', 'curated_reference')).toBe('curated_reference');
  });

  it('returns the same lane when both are equal', () => {
    expect(higherAuthority('case_bound', 'case_bound')).toBe('case_bound');
    expect(higherAuthority('curated_reference', 'curated_reference')).toBe('curated_reference');
    expect(higherAuthority('live_candidate', 'live_candidate')).toBe('live_candidate');
  });
});

describe('canEmitFindings', () => {
  it('case_bound may emit findings — Lane 1', () => {
    expect(canEmitFindings('case_bound')).toBe(true);
  });

  it('curated_reference may emit findings — Lane 2', () => {
    expect(canEmitFindings('curated_reference')).toBe(true);
  });

  it('live_candidate must NOT emit findings — Lane 3 in POC mode', () => {
    expect(canEmitFindings('live_candidate')).toBe(false);
  });
});
