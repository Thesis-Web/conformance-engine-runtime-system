import { describe, it, expect, afterEach } from 'vitest';
import { emitOperatorPrompt } from '../../src/artifacts/artifact-builder.js';
import { mkdirSync, rmSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';

const tmpDirs: string[] = [];

function makeTmpDir(): string {
  const dir = join(tmpdir(), `cers-op-prompt-${randomUUID()}`);
  mkdirSync(dir, { recursive: true });
  tmpDirs.push(dir);
  return dir;
}

afterEach(() => {
  for (const dir of tmpDirs.splice(0, tmpDirs.length)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

describe('emitOperatorPrompt — §27.2', () => {
  it('writes 12-operator-prompt.json to artifactRoot', () => {
    const dir = makeTmpDir();
    emitOperatorPrompt({
      runId: 'run-001',
      step: 'post-merge-escalation-review',
      reason: '2 findings require engineer review',
      requiredInputShape: { reviewedFindingIds: 'string', engineerDecision: 'string' },
      blocking: true,
      artifactRoot: dir,
    });
    expect(existsSync(join(dir, '12-operator-prompt.json'))).toBe(true);
  });

  it('emitted JSON contains all required §27.2 fields', () => {
    const dir = makeTmpDir();
    const runId = randomUUID();
    emitOperatorPrompt({
      runId,
      step: 'test-step',
      reason: 'test reason',
      requiredInputShape: { key: 'value shape' },
      blocking: false,
      artifactRoot: dir,
    });
    const raw = readFileSync(join(dir, '12-operator-prompt.json'), 'utf8');
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    expect(parsed['promptId']).toMatch(/^[0-9a-f-]{36}$/);
    expect(parsed['runId']).toBe(runId);
    expect(parsed['step']).toBe('test-step');
    expect(parsed['reason']).toBe('test reason');
    expect(parsed['blocking']).toBe(false);
    expect(parsed['requiredInputShape']).toEqual({ key: 'value shape' });
  });

  it('returns the OperatorPrompt with a unique promptId each call', () => {
    const dir1 = makeTmpDir();
    const dir2 = makeTmpDir();
    const p1 = emitOperatorPrompt({
      runId: 'r1',
      step: 's',
      reason: 'r',
      requiredInputShape: {},
      blocking: true,
      artifactRoot: dir1,
    });
    const p2 = emitOperatorPrompt({
      runId: 'r2',
      step: 's',
      reason: 'r',
      requiredInputShape: {},
      blocking: true,
      artifactRoot: dir2,
    });
    expect(p1.promptId).not.toBe(p2.promptId);
  });

  it('blocking=true is preserved in output', () => {
    const dir = makeTmpDir();
    const prompt = emitOperatorPrompt({
      runId: 'r',
      step: 's',
      reason: 'r',
      requiredInputShape: {},
      blocking: true,
      artifactRoot: dir,
    });
    expect(prompt.blocking).toBe(true);
  });
});
