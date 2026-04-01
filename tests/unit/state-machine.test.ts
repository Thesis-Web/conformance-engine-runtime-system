import { describe, it, expect } from 'vitest';
import {
  transition,
  isTerminal,
  VALID_TRANSITIONS,
} from '../../src/orchestration/state-machine.js';

describe('State Machine (spec §28)', () => {
  it('allows valid transition: created → ingesting', () => {
    expect(() => transition('created', 'ingesting')).not.toThrow();
  });
  it('rejects invalid transition', () => {
    expect(() => transition('created', 'complete')).toThrow(/invalid transition/i);
  });
  it('rejects backward transitions from terminal states', () => {
    expect(() => transition('complete', 'ingesting')).toThrow(/invalid transition/i);
    expect(() => transition('failed', 'ingesting')).toThrow(/invalid transition/i);
  });
  it('isTerminal correct', () => {
    expect(isTerminal('complete')).toBe(true);
    expect(isTerminal('failed')).toBe(true);
    expect(isTerminal('ingesting')).toBe(false);
  });
  it('VALID_TRANSITIONS structure matches spec §28.1', () => {
    expect(VALID_TRANSITIONS['created']).toContain('ingesting');
    expect(VALID_TRANSITIONS['validated']).toContain('complete');
    expect(VALID_TRANSITIONS['validated']).toContain('failed');
  });
});
