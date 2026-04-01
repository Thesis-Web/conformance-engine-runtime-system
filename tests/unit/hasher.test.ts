import { describe, it, expect } from 'vitest';
import {
  hashFile,
  isBlockedExtension,
  MAX_FILE_BYTES,
  MAX_CASE_BYTES,
  BLOCKED_EXTENSIONS,
} from '../../src/core/hasher.js';

describe('Hasher (spec §13)', () => {
  it('returns 64-char hex', () => {
    expect(hashFile(new Uint8Array([1, 2, 3]))).toMatch(/^[0-9a-f]{64}$/);
  });
  it('is deterministic', () => {
    const b = new Uint8Array([1, 2, 3, 4, 5]);
    expect(hashFile(b)).toBe(hashFile(b));
  });
  it('blocks executables case-insensitively', () => {
    expect(isBlockedExtension('.exe')).toBe(true);
    expect(isBlockedExtension('.EXE')).toBe(true);
    expect(isBlockedExtension('.sh')).toBe(true);
    expect(isBlockedExtension('.mjs')).toBe(true);
    expect(isBlockedExtension('.ps1')).toBe(true);
    expect(isBlockedExtension('.cmd')).toBe(true);
  });
  it('allows safe extensions', () => {
    expect(isBlockedExtension('.pdf')).toBe(false);
    expect(isBlockedExtension('.txt')).toBe(false);
  });
  it('enforces spec §13.5 size limits', () => {
    expect(MAX_FILE_BYTES).toBe(104857600);
    expect(MAX_CASE_BYTES).toBe(2147483648);
  });
  it('BLOCKED_EXTENSIONS contains all required entries', () => {
    for (const ext of ['.exe', '.bat', '.sh', '.mjs', '.ps1', '.cmd']) {
      expect(BLOCKED_EXTENSIONS.has(ext)).toBe(true);
    }
  });
});
