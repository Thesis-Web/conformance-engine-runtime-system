/**
 * California legacy regression through resolver — ext-spec §25.1
 * Canonical split from effective-pack-resolution.integration.test.ts
 *
 * Proves:
 *  - runCase() with NO resolution bundle still works for CA packs (legacy bypass)
 *  - loadPack() for pack-v1, pack-v2, pack-v3 manifests returns valid PackManifest
 *  - Layer 1 receives PackManifest correctly without going through resolver
 *    (verified by run.status === 'complete' and all 11 artifacts present)
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { loadPack } from '../../src/packs/pack-loader.js';
import { validatePack } from '../../src/packs/pack-validator.js';
import { runCase } from '../../src/orchestration/run-orchestrator.js';
import { REQUIRED_ARTIFACT_NAMES } from '../../src/validation/gates.js';
import { mkdtempSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

describe('California legacy regression through resolver — ext-spec §25.1', () => {
  describe('loadPack direct — CA manifests load and validate without resolver', () => {
    it('pack-v1 (highrise) loads and validates', () => {
      const manifest = loadPack('fixtures/pack-v1/manifest.json');
      expect(manifest.packId).toBe('pack-california-highrise-v1');
      expect(manifest.jurisdiction).toBeTruthy();
      const result = validatePack(manifest);
      expect(result.valid).toBe(true);
    });

    it('pack-v2 (appliance) loads and validates', () => {
      const manifest = loadPack('fixtures/pack-v2/manifest.json');
      expect(manifest.packId).toBe('pack-california-appliance-refrig-v2');
      expect(manifest.jurisdiction).toBeTruthy();
      const result = validatePack(manifest);
      expect(result.valid).toBe(true);
    });

    it('pack-v3 (datacenter) loads and validates', () => {
      const manifest = loadPack('fixtures/pack-v3/manifest.json');
      expect(manifest.packId).toBe('pack-california-datacenter-v3');
      expect(manifest.jurisdiction).toBeTruthy();
      const result = validatePack(manifest);
      expect(result.valid).toBe(true);
    });
  });

  describe('runCase() legacy path — no resolution bundle — pack-v1', () => {
    let tempDir: string;

    beforeEach(() => {
      tempDir = mkdtempSync(join(tmpdir(), 'cers-ca-legacy-'));
    });

    afterEach(() => {
      rmSync(tempDir, { recursive: true, force: true });
    });

    it('runCase completes with all 11 artifacts — no resolution bundle required', async () => {
      const sourceRoot = resolve('tests/fixtures/pack-v1-case/sources');
      const caseRecord = {
        caseId: 'test-ca-legacy-v1',
        packId: 'pack-california-highrise-v1',
        title: 'CA Legacy Regression Test',
        createdAt: new Date().toISOString(),
        createdBy: 'test',
        actorMode: 'human_interface_first',
        sourceRoot,
      };
      writeFileSync(join(tempDir, 'case.json'), JSON.stringify(caseRecord, null, 2));

      // No resolution field — legacy loadPack() path
      const result = await runCase({
        casePath: tempDir,
        packManifestPath: resolve('fixtures/pack-v1/manifest.json'),
      });

      // Layer 1 must have received PackManifest correctly — proven by complete status
      expect(result.run.status).toBe('complete');

      // All 11 artifacts must be present — Layer 1 ran fully
      for (const name of REQUIRED_ARTIFACT_NAMES) {
        expect(existsSync(join(result.artifactRoot, name)), `missing artifact: ${name}`).toBe(true);
      }

      // No lane 3 authority violations
      const lane3Fail = result.gateResults.find(
        (g) => g.gateName === 'no-lane3-authority' && !g.passed,
      );
      expect(lane3Fail).toBeUndefined();

      // No certification language
      const certFail = result.gateResults.find(
        (g) => g.gateName === 'no-certification-language' && !g.passed,
      );
      expect(certFail).toBeUndefined();
    }, 30000);
  });
});
