import { describe, it, expect } from 'vitest';
import {
  noCertificationLanguageGate,
  confidenceRangeGate,
  FORBIDDEN_CERT_PHRASES,
  REQUIRED_ARTIFACT_NAMES,
} from '../../src/validation/gates.js';

describe('Validation Gates (spec §32)', () => {
  it('rejects forbidden phrase: approved', () => {
    const r = noCertificationLanguageGate('This is approved by the engine');
    expect(r.passed).toBe(false);
    expect(r.errors.length).toBeGreaterThan(0);
  });
  it('rejects: this system certifies', () => {
    const r = noCertificationLanguageGate('this system certifies compliance');
    expect(r.passed).toBe(false);
  });
  it('allows safe language', () => {
    expect(noCertificationLanguageGate('flagged for engineer review').passed).toBe(true);
    expect(noCertificationLanguageGate('contradiction detected').passed).toBe(true);
  });
  it('FORBIDDEN_CERT_PHRASES has exactly 4 entries', () => {
    expect(FORBIDDEN_CERT_PHRASES.length).toBe(4);
    expect(FORBIDDEN_CERT_PHRASES).toContain('approved');
    expect(FORBIDDEN_CERT_PHRASES).toContain('this system certifies');
  });
  it('REQUIRED_ARTIFACT_NAMES has 11 entries per spec §29.1', () => {
    expect(REQUIRED_ARTIFACT_NAMES.length).toBe(11);
    expect(REQUIRED_ARTIFACT_NAMES[0]).toBe('01-ingest-log.json');
    expect(REQUIRED_ARTIFACT_NAMES[10]).toBe('11-engineer-review-packet.md');
  });
  it('confidenceRangeGate passes empty findings', () => {
    expect(confidenceRangeGate([]).passed).toBe(true);
  });
});
