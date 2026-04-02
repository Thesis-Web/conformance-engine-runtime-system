import { describe, it, expect } from 'vitest';
import { normalizeText, buildChunkId } from '../../src/core/normalizer.js';

describe('normalizeText', () => {
  it('lowercases all characters', () => {
    expect(normalizeText('HELLO WORLD')).toBe('hello world');
  });

  it('collapses multiple spaces to single space', () => {
    expect(normalizeText('foo  bar   baz')).toBe('foo bar baz');
  });

  it('trims leading and trailing whitespace', () => {
    expect(normalizeText('  hello  ')).toBe('hello');
  });

  it('collapses newlines and tabs into single space', () => {
    expect(normalizeText('line one\n\nline two\ttab')).toBe('line one line two tab');
  });

  it('returns empty string for blank input', () => {
    expect(normalizeText('   ')).toBe('');
  });

  it('is idempotent — normalizing twice gives same result', () => {
    const input = '  FIRE Rating:  2-Hour  Assembly  ';
    const once = normalizeText(input);
    const twice = normalizeText(once);
    expect(twice).toBe(once);
  });
});

describe('buildChunkId', () => {
  it('returns a non-empty hex string', () => {
    const id = buildChunkId('file-001', 0);
    expect(id).toMatch(/^[0-9a-f]{64}$/);
  });

  it('is deterministic for same inputs', () => {
    const a = buildChunkId('file-001', 3);
    const b = buildChunkId('file-001', 3);
    expect(a).toBe(b);
  });

  it('differs for different chunk ordinals', () => {
    const a = buildChunkId('file-001', 0);
    const b = buildChunkId('file-001', 1);
    expect(a).not.toBe(b);
  });

  it('differs for different file ids', () => {
    const a = buildChunkId('file-001', 0);
    const b = buildChunkId('file-002', 0);
    expect(a).not.toBe(b);
  });
});
