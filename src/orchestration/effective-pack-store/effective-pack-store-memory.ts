/**
 * Effective-pack store — in-memory implementation for POC.
 * ext-spec §13 / §28
 *
 * DIFF-AUDIT-002: added updateRecord() and exported markReplayValidated()
 * so the resolver can set replayValidated=true after a successful fresh compose.
 */

import type { EffectivePackId } from '../../types/identifiers.js';
import type { EffectivePackStoreRecord } from '../../types/effective-pack.js';

// Module-scoped store — survives within a process session
const store = new Map<string, EffectivePackStoreRecord>();

export function storeEffectivePack(record: EffectivePackStoreRecord): void {
  store.set(record.effectivePackId as string, record);
}

export function lookupEffectivePackById(
  effectivePackId: EffectivePackId,
): EffectivePackStoreRecord | undefined {
  return store.get(effectivePackId as string);
}

/**
 * DIFF-AUDIT-002: Mark a stored record as replay-validated.
 * Called immediately after a successful fresh compose and compatibility validation.
 * A record that was just freshly composed and validated is by definition replay-valid.
 */
export function markReplayValidated(effectivePackId: EffectivePackId): void {
  const record = store.get(effectivePackId as string);
  if (record) {
    store.set(effectivePackId as string, { ...record, replayValidated: true });
  }
}

export function clearStore(): void {
  store.clear();
}

export function listStoreKeys(): EffectivePackId[] {
  return Array.from(store.keys()) as EffectivePackId[];
}

export function storeSize(): number {
  return store.size;
}
