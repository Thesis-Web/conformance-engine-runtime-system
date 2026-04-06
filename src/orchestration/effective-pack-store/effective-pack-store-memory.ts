/**
 * Effective-pack store — in-memory implementation for POC.
 * ext-spec §13 / §28
 *
 * Persists EffectivePackStoreRecord entries indexed by effectivePackId.
 * Production implementations would write to managed Postgres or object store;
 * this POC implementation keeps records in a module-scoped Map.
 *
 * Lawful reuse (ext-spec §13): a stored effective pack may be reused only when
 * exact input identity matches — same packId, jurisdictionId, governingAsOfDate,
 * compositionDigest. Any mismatch requires fresh composition.
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

export function clearStore(): void {
  store.clear();
}

export function listStoreKeys(): EffectivePackId[] {
  return Array.from(store.keys()) as EffectivePackId[];
}

export function storeSize(): number {
  return store.size;
}
