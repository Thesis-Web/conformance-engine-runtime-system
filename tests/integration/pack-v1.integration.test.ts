import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { loadPack, packExists } from '../../src/packs/pack-loader.js';
import { validatePack } from '../../src/packs/pack-validator.js';
import { classifyDocument } from '../../src/core/classifier.js';
import { hashFile } from '../../src/core/hasher.js';
import { runCase } from '../../src/orchestration/run-orchestrator.js';
import { REQUIRED_ARTIFACT_NAMES } from '../../src/validation/gates.js';

describe('pack-v1 integration (spec §26, §34.2)', () => {
  it('loads manifest', () => {
    const manifest = loadPack('fixtures/pack-v1/manifest.json');
    expect(manifest.packId).toBe('pack-california-highrise-v1');
  });

  it('validates manifest', () => {
    const manifest = loadPack('fixtures/pack-v1/manifest.json');
    const result = validatePack(manifest);
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('classifies canonical filename', () => {
    const manifest = loadPack('fixtures/pack-v1/manifest.json');
    const result = classifyDocument({
      filename: 'compliance_cert_2024.pdf',
      contentSnippet: 'certificate of compliance for design phase',
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
    expect(packExists('fixtures/pack-v1/manifest.json')).toBe(true);
  });

  // INCOMPLETE-004 fix: spec §34.2 requires one integration test per pack
  // that exercises runCase() end-to-end through the full runtime flow.
  describe('runCase() end-to-end (spec §34.2)', () => {
    let tempDir: string;

    beforeEach(() => {
      tempDir = mkdtempSync(join(tmpdir(), 'cers-v1-'));
    });

    afterEach(() => {
      rmSync(tempDir, { recursive: true, force: true });
    });

    it('completes with all 11 artifacts, passes all required gates', async () => {
      const sourceRoot = resolve('tests/fixtures/pack-v1-case/sources');
      const caseRecord = {
        caseId: 'test-v1-fixture',
        packId: 'pack-california-highrise-v1',
        title: 'Pack v1 Integration Test',
        createdAt: new Date().toISOString(),
        createdBy: 'test',
        actorMode: 'human_interface_first',
        sourceRoot,
      };
      writeFileSync(join(tempDir, 'case.json'), JSON.stringify(caseRecord, null, 2));

      const result = await runCase({
        casePath: tempDir,
        packManifestPath: resolve('fixtures/pack-v1/manifest.json'),
      });

      // Run must reach complete status
      expect(result.run.status).toBe('complete');

      // All 11 required artifacts must be present
      for (const name of REQUIRED_ARTIFACT_NAMES) {
        expect(existsSync(join(result.artifactRoot, name)), `missing artifact: ${name}`).toBe(true);
      }

      // No Lane 3 sources in final findings
      const lane3Fail = result.gateResults.find(
        (g) => g.gateName === 'no-lane3-authority' && !g.passed,
      );
      expect(lane3Fail).toBeUndefined();

      // No certification language in output
      const certFail = result.gateResults.find(
        (g) => g.gateName === 'no-certification-language' && !g.passed,
      );
      expect(certFail).toBeUndefined();

      // No required gate failures (enforceGates would throw, but assert here too)
      const requiredFails = result.gateResults.filter(
        (g) => !g.passed && g.gateName !== 'scope-change-log',
      );
      expect(requiredFails).toHaveLength(0);
    }, 30000);
  });
});
