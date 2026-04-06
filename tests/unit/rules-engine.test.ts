import { describe, it, expect } from 'vitest';
import { applyDeterministicRules } from '../../src/contract/rules-engine.js';
import { loadPack } from '../../src/packs/pack-loader.js';
import type { SourceReference, ComparisonPair, RunRecord } from '../../src/types/index.js';
import { brandPackId } from '../../src/types/identifiers.js';

function makeRun(packId: string): RunRecord {
  return {
    runId: 'run-test',
    caseId: 'case-test',
    packId: packId as RunRecord['packId'],
    status: 'rules_complete',
    startedAt: new Date().toISOString(),
    engineVersion: '0.1.0',
    blueprintVersion: '1.2.2',
    specVersion: '1.2.2',
    operatorMode: 'manual_prompt_bridge',
    artifactRoot: '/tmp/test-run',
  };
}

function makeRef(id: string, text: string, docClass = 'TEST_REPORT'): SourceReference {
  return {
    sourceRefId: id,
    fileId: 'file-1',
    docClass: docClass as SourceReference['docClass'],
    chunkOrdinal: 0,
    text,
    normalizedText: text,
    metadata: { docClass },
  };
}

describe('DRIFT-004 fix — RULE-HOLE-001: per-pack case-minimum required classes', () => {
  it('emits HOLE for missing required class in pack-v1', () => {
    const pack = loadPack('fixtures/pack-v1/manifest.json');
    const run = makeRun(brandPackId('pack-california-highrise-v1'));
    // Only provide STD_REFERENCE — DESIGN_PLANS, TEST_REPORT, ENG_LETTER missing
    const sourceRefs = [makeRef('ref-1', 'Standard reference text', 'STD_REFERENCE')];
    const findings = applyDeterministicRules({ run, pairs: [], findings: [], pack, sourceRefs });
    const holes = findings.filter((f) => f.findingClass === 'HOLE');
    const holeClasses = holes.map((f) => f.tags[0]);
    expect(holeClasses).toContain('DESIGN_PLANS');
    expect(holeClasses).toContain('TEST_REPORT');
    expect(holeClasses).toContain('ENG_LETTER');
  });

  it('does NOT emit HOLE for absent FIELD_ANNOTATION when required minimums are present', () => {
    // FIELD_ANNOTATION is not in pack-v1 required minimums — only in one-of-optional
    const pack = loadPack('fixtures/pack-v1/manifest.json');
    const run = makeRun(brandPackId('pack-california-highrise-v1'));
    const sourceRefs = [
      makeRef('ref-1', 'Design plans text', 'DESIGN_PLANS'),
      makeRef('ref-2', 'Test report text', 'TEST_REPORT'),
      makeRef('ref-3', 'Engineering letter', 'ENG_LETTER'),
      makeRef('ref-4', 'Standard reference', 'STD_REFERENCE'),
      makeRef('ref-5', 'Compliance cert', 'COMPLIANCE_CERT'),
    ];
    const findings = applyDeterministicRules({ run, pairs: [], findings: [], pack, sourceRefs });
    const holes = findings.filter((f) => f.findingClass === 'HOLE');
    // FIELD_ANNOTATION absent but should not be a required HOLE (it is in supported, not required)
    const fieldAnnotHole = holes.find((f) => f.tags.includes('FIELD_ANNOTATION'));
    expect(fieldAnnotHole).toBeUndefined();
  });

  it('emits HOLE one-of-optional when none of COMPLIANCE_CERT/MFR_SUBMITTAL/FIELD_ANNOTATION present', () => {
    const pack = loadPack('fixtures/pack-v1/manifest.json');
    const run = makeRun(brandPackId('pack-california-highrise-v1'));
    const sourceRefs = [
      makeRef('ref-1', 'design plans', 'DESIGN_PLANS'),
      makeRef('ref-2', 'test report', 'TEST_REPORT'),
      makeRef('ref-3', 'eng letter', 'ENG_LETTER'),
      makeRef('ref-4', 'std reference', 'STD_REFERENCE'),
    ];
    const findings = applyDeterministicRules({ run, pairs: [], findings: [], pack, sourceRefs });
    const oneOfHole = findings.find((f) => f.tags.includes('one-of-optional'));
    expect(oneOfHole).toBeDefined();
    expect(oneOfHole?.findingClass).toBe('HOLE');
  });
});

describe('DRIFT-003 fix — RULE-CONTRA-001: actual value comparison', () => {
  it('emits CONTRA when parameter values genuinely differ between two sources', () => {
    const pack = loadPack('fixtures/pack-v1/manifest.json');
    const run = makeRun(brandPackId('pack-california-highrise-v1'));

    const refA = makeRef('ref-a', 'Fire Rating: 2-hour', 'TEST_REPORT');
    const refB = makeRef('ref-b', 'Fire Rating: 1-hour', 'DESIGN_PLANS');

    const pair: ComparisonPair = {
      pairId: 'pair-1',
      runId: 'run-test',
      packId: brandPackId('pack-california-highrise-v1'),
      sourceARefId: 'ref-a',
      sourceBRefId: 'ref-b',
      comparisonType: 'parameter_match',
      parameterKey: 'fire_rating',
    };

    const findings = applyDeterministicRules({
      run,
      pairs: [pair],
      findings: [],
      pack,
      sourceRefs: [refA, refB],
    });

    const contra = findings.find(
      (f) => f.findingClass === 'CONTRA' && f.tags.includes('fire_rating'),
    );
    expect(contra).toBeDefined();
    expect(contra?.confidenceClass).toBe('deterministic');
    expect(contra?.severity).toBe('critical');
  });

  it('does NOT emit CONTRA when parameter values agree', () => {
    const pack = loadPack('fixtures/pack-v1/manifest.json');
    const run = makeRun(brandPackId('pack-california-highrise-v1'));

    const refA = makeRef('ref-a', 'Fire Rating: 2-hour', 'TEST_REPORT');
    const refB = makeRef('ref-b', 'Fire Rating: 2-hour', 'DESIGN_PLANS');

    const pair: ComparisonPair = {
      pairId: 'pair-1',
      runId: 'run-test',
      packId: brandPackId('pack-california-highrise-v1'),
      sourceARefId: 'ref-a',
      sourceBRefId: 'ref-b',
      comparisonType: 'parameter_match',
      parameterKey: 'fire_rating',
    };

    const findings = applyDeterministicRules({
      run,
      pairs: [pair],
      findings: [],
      pack,
      sourceRefs: [refA, refB],
    });

    const contra = findings.find(
      (f) => f.findingClass === 'CONTRA' && f.tags.includes('fire_rating'),
    );
    expect(contra).toBeUndefined();
  });

  it('emits AMBIGUITY (not CONTRA) when value cannot be extracted from source text', () => {
    const pack = loadPack('fixtures/pack-v1/manifest.json');
    const run = makeRun(brandPackId('pack-california-highrise-v1'));

    // Text does not contain the parameterKey in extractable form
    const refA = makeRef(
      'ref-a',
      'This document contains no fire rating information.',
      'TEST_REPORT',
    );
    const refB = makeRef('ref-b', 'Also no extractable rating here.', 'DESIGN_PLANS');

    const pair: ComparisonPair = {
      pairId: 'pair-1',
      runId: 'run-test',
      packId: brandPackId('pack-california-highrise-v1'),
      sourceARefId: 'ref-a',
      sourceBRefId: 'ref-b',
      comparisonType: 'parameter_match',
      parameterKey: 'fire_rating',
    };

    const findings = applyDeterministicRules({
      run,
      pairs: [pair],
      findings: [],
      pack,
      sourceRefs: [refA, refB],
    });

    const ambiguity = findings.find(
      (f) => f.findingClass === 'AMBIGUITY' && f.tags.includes('fire_rating'),
    );
    expect(ambiguity).toBeDefined();
    expect(ambiguity?.escalationRequired).toBe(true);
    expect(ambiguity?.confidenceClass).toBe('interpretive');

    const contra = findings.find(
      (f) => f.findingClass === 'CONTRA' && f.tags.includes('fire_rating'),
    );
    expect(contra).toBeUndefined();
  });
});
