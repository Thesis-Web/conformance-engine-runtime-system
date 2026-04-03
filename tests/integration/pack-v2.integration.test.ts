import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { loadPack, packExists } from '../../src/packs/pack-loader.js';
import { validatePack } from '../../src/packs/pack-validator.js';
import { classifyDocument } from '../../src/core/classifier.js';
import { runCase } from '../../src/orchestration/run-orchestrator.js';
import { REQUIRED_ARTIFACT_NAMES } from '../../src/validation/gates.js';

describe('pack-v2 integration (spec §26, §34.2)', () => {
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

  it('classifies spec sheet filename', () => {
    const manifest = loadPack('fixtures/pack-v2/manifest.json');
    const result = classifyDocument({
      filename: 'product_spec_sheet_cru2000.pdf',
      contentSnippet: 'rated efficiency COP test procedure manufacturer',
      classMapRules: manifest.classMap,
    });
    expect(result).toBeDefined();
    expect(result.docClass).toBeTruthy();
  });

  it('packExists returns true for fixture', () => {
    expect(packExists('fixtures/pack-v2/manifest.json')).toBe(true);
  });

  // INCOMPLETE-004 fix: spec §34.2
  describe('runCase() end-to-end (spec §34.2)', () => {
    let tempDir: string;

    beforeEach(() => {
      tempDir = mkdtempSync(join(tmpdir(), 'cers-v2-'));
    });

    afterEach(() => {
      rmSync(tempDir, { recursive: true, force: true });
    });

    it('completes with all 11 artifacts, passes all required gates', async () => {
      const sourceRoot = resolve('tests/fixtures/pack-v2-case/sources');
      const caseRecord = {
        caseId: 'test-v2-fixture',
        packId: 'pack-california-appliance-refrig-v2',
        title: 'Pack v2 Integration Test',
        createdAt: new Date().toISOString(),
        createdBy: 'test',
        actorMode: 'human_interface_first',
        sourceRoot,
      };
      writeFileSync(join(tempDir, 'case.json'), JSON.stringify(caseRecord, null, 2));

      const result = await runCase({
        casePath: tempDir,
        packManifestPath: resolve('fixtures/pack-v2/manifest.json'),
      });

      expect(result.run.status).toBe('complete');

      for (const name of REQUIRED_ARTIFACT_NAMES) {
        expect(existsSync(join(result.artifactRoot, name)), `missing artifact: ${name}`).toBe(true);
      }

      const lane3Fail = result.gateResults.find(
        (g) => g.gateName === 'no-lane3-authority' && !g.passed,
      );
      expect(lane3Fail).toBeUndefined();

      const certFail = result.gateResults.find(
        (g) => g.gateName === 'no-certification-language' && !g.passed,
      );
      expect(certFail).toBeUndefined();

      const requiredFails = result.gateResults.filter(
        (g) => !g.passed && g.gateName !== 'scope-change-log',
      );
      expect(requiredFails).toHaveLength(0);
    }, 30000);
  });
});
