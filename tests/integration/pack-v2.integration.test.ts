import { describe, it, expect } from 'vitest';
import { loadPack, packExists } from '../../src/packs/pack-loader.js';
import { validatePack } from '../../src/packs/pack-validator.js';
import { classifyDocument } from '../../src/core/classifier.js';
import { hashFile } from '../../src/core/hasher.js';

describe('pack-v2 integration (spec §26)', () => {
  it('loads manifest', () => {
    const manifest = loadPack('fixtures/pack-v2/manifest.json');
    expect(manifest.packId).toBe('pack-california-appliance-refrig-v2');
  });

  it('validates manifest', () => {
    const manifest = loadPack('fixtures/pack-v2/manifest.json');
    const result = validatePack(manifest);
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('classifies canonical filename', () => {
    const manifest = loadPack('fixtures/pack-v2/manifest.json');
    const result = classifyDocument({
      filename: 'spec_sheet_product.pdf',
      contentSnippet: 'manufacturer specification sheet and product details',
      classMapRules: manifest.classMap,
    });
    expect(result).toBeDefined();
    expect(result.docClass).toBeTruthy();
  });

  it('hashFile works', () => {
    const hash = hashFile(new Uint8Array([1, 2, 3]));
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('packExists returns true for fixture', () => {
    expect(packExists('fixtures/pack-v2/manifest.json')).toBe(true);
  });
});
