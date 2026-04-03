import { describe, it, expect } from 'vitest';
import { writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ingestFile } from '../../src/core/ingest.js';

function tempDir(): string {
  return mkdtempSync(join(tmpdir(), 'cers-ingest-'));
}

describe('ingest — content-signature verification (DRIFT-001, spec §13.2)', () => {
  it('accepts a valid .txt file', () => {
    const dir = tempDir();
    try {
      const path = join(dir, 'sample.txt');
      writeFileSync(path, 'Hello world — plain text content');
      const out = ingestFile({
        caseId: 'c1',
        runId: 'r1',
        filePath: path,
        sourceLane: 'case_bound',
      });
      expect(out.file.contentAccepted).toBe(true);
      expect(out.file.mimeTypeDetected).toBe('text/plain');
      expect(out.file.sha256).toMatch(/^[0-9a-f]{64}$/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('accepts a valid .json file', () => {
    const dir = tempDir();
    try {
      const path = join(dir, 'data.json');
      writeFileSync(path, JSON.stringify({ key: 'value' }));
      const out = ingestFile({
        caseId: 'c1',
        runId: 'r1',
        filePath: path,
        sourceLane: 'case_bound',
      });
      expect(out.file.contentAccepted).toBe(true);
      expect(out.file.mimeTypeDetected).toBe('application/json');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('rejects a .json file whose content is not JSON structure', () => {
    const dir = tempDir();
    try {
      const path = join(dir, 'bad.json');
      writeFileSync(path, 'this is not json at all');
      const out = ingestFile({
        caseId: 'c1',
        runId: 'r1',
        filePath: path,
        sourceLane: 'case_bound',
      });
      expect(out.file.contentAccepted).toBe(false);
      expect(out.file.rejectionReason).toMatch(/json/i);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('rejects a .txt file containing a PE binary signature (MZ)', () => {
    const dir = tempDir();
    try {
      const path = join(dir, 'sneaky.txt');
      // MZ header — Windows PE executable signature
      const mz = Buffer.from([0x4d, 0x5a, 0x90, 0x00, 0x03, 0x00]);
      writeFileSync(path, mz);
      const out = ingestFile({
        caseId: 'c1',
        runId: 'r1',
        filePath: path,
        sourceLane: 'case_bound',
      });
      expect(out.file.contentAccepted).toBe(false);
      expect(out.file.rejectionReason).toBeDefined();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('rejects a .pdf file that does not start with %PDF', () => {
    const dir = tempDir();
    try {
      const path = join(dir, 'fake.pdf');
      writeFileSync(path, 'this is not a pdf file at all');
      const out = ingestFile({
        caseId: 'c1',
        runId: 'r1',
        filePath: path,
        sourceLane: 'case_bound',
      });
      expect(out.file.contentAccepted).toBe(false);
      expect(out.file.rejectionReason).toMatch(/pdf/i);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('rejects a blocked extension (.sh)', () => {
    const dir = tempDir();
    try {
      const path = join(dir, 'run.sh');
      writeFileSync(path, '#!/bin/bash\necho hello');
      const out = ingestFile({
        caseId: 'c1',
        runId: 'r1',
        filePath: path,
        sourceLane: 'case_bound',
      });
      expect(out.file.contentAccepted).toBe(false);
      expect(out.file.rejectionReason).toMatch(/blocked/i);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('rejects a .txt file containing null bytes (binary masquerading as text)', () => {
    const dir = tempDir();
    try {
      const path = join(dir, 'binary.txt');
      const buf = Buffer.alloc(20, 0); // all null bytes
      writeFileSync(path, buf);
      const out = ingestFile({
        caseId: 'c1',
        runId: 'r1',
        filePath: path,
        sourceLane: 'case_bound',
      });
      expect(out.file.contentAccepted).toBe(false);
      expect(out.file.rejectionReason).toBeDefined();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
