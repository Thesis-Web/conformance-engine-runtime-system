/**
 * Effective-pack composer — ext-spec §10 / §15.3 / §8.1
 *
 * Composes a full EffectivePackManifest from:
 *   - selected base standards modules (ext-spec §15.1)
 *   - selected tier overlays (ext-spec §15.2)
 *   - resolution input and jurisdiction context
 *
 * Component ordering is deterministic per ext-spec §15.3:
 *   1. tierPath ascending specificity (resolvedTierPathIndex)
 *   2. component kind: base_module before tier_overlay
 *   3. effectiveFrom descending
 *   4. versionIndex descending
 *   5. stable lexical componentId
 *
 * Corpus deduplication: later components (higher specificity) override
 * corpus entries with the same corpusId from earlier components.
 *
 * displayName: "{jurisdictionId} {trackFamilyId} effective pack" per BEST-SOLVE-002.
 */

import { createHash } from 'node:crypto';
import { randomUUID } from 'node:crypto';
import type {
  BaseStandardsModule,
  ComponentProvenanceEntry,
  EffectivePackManifest,
  EffectivePackResolutionInput,
  IsoDate,
  TierOverlay,
} from '../../types/effective-pack.js';
import type { TierPathEntry } from '../../types/jurisdiction.js';
import type {
  PackManifest,
  CorpusEntry,
  HierarchyRule,
  ContradictionPattern,
} from '../../types/pack-manifest.js';
import type { Sha256Hex } from '../../types/primitives.js';

// ---------------------------------------------------------------------------
// Internal SelectedComponent shape (ext-spec §15.3)
// ---------------------------------------------------------------------------

interface SelectedComponent {
  raw: BaseStandardsModule | TierOverlay;
  componentKind: 'base_module' | 'tier_overlay';
  componentId: string;
  effectiveFrom: IsoDate;
  versionIndex: string;
  resolvedTierPathIndex: number; // -1 for base modules
}

function toSelectedComponent(
  component: BaseStandardsModule | TierOverlay,
  tierPath: TierPathEntry[],
): SelectedComponent {
  if ('baseModuleId' in component) {
    return {
      raw: component,
      componentKind: 'base_module',
      componentId: component.baseModuleId,
      effectiveFrom: component.effectiveFrom,
      versionIndex: component.versionIndex,
      resolvedTierPathIndex: -1,
    };
  }

  const tierIdx = tierPath.findIndex(
    (entry) => entry.tierType === component.tierType && entry.tierId === component.tierId,
  );

  return {
    raw: component,
    componentKind: 'tier_overlay',
    componentId: component.tierOverlayId,
    effectiveFrom: component.effectiveFrom,
    versionIndex: component.versionIndex,
    resolvedTierPathIndex: tierIdx,
  };
}

function compareTierSpecificity(a: SelectedComponent, b: SelectedComponent): number {
  return a.resolvedTierPathIndex - b.resolvedTierPathIndex;
}

function compareComponentKind(a: SelectedComponent, b: SelectedComponent): number {
  if (a.componentKind === b.componentKind) return 0;
  return a.componentKind === 'base_module' ? -1 : 1;
}

function compareDescending(a: string, b: string): number {
  if (a === b) return 0;
  return a > b ? -1 : 1;
}

function compareLexical(a: string, b: string): number {
  return a.localeCompare(b);
}

function sortSelectedComponents(components: SelectedComponent[]): SelectedComponent[] {
  return [...components].sort(
    (a, b) =>
      compareTierSpecificity(a, b) ||
      compareComponentKind(a, b) ||
      compareDescending(a.effectiveFrom, b.effectiveFrom) ||
      compareDescending(a.versionIndex, b.versionIndex) ||
      compareLexical(a.componentId, b.componentId),
  );
}

// ---------------------------------------------------------------------------
// Corpus deduplication — later (higher-specificity) entries win
// ---------------------------------------------------------------------------

function mergeCorpus(sorted: SelectedComponent[]): CorpusEntry[] {
  const merged = new Map<string, CorpusEntry>();
  for (const sc of sorted) {
    const fragments: CorpusEntry[] =
      'baseModuleId' in sc.raw ? [...sc.raw.corpus] : [...sc.raw.corpusFragments];
    for (const entry of fragments) {
      merged.set(entry.corpusId, entry);
    }
  }
  return Array.from(merged.values());
}

function mergeHierarchyConfig(sorted: SelectedComponent[]): HierarchyRule[] {
  const merged = new Map<string, HierarchyRule>();
  for (const sc of sorted) {
    const fragments: HierarchyRule[] =
      'baseModuleId' in sc.raw ? [...sc.raw.hierarchyFragments] : [...sc.raw.hierarchyFragments];
    for (const rule of fragments) {
      merged.set(rule.hierarchyId, rule);
    }
  }
  return Array.from(merged.values());
}

function mergeContradictionPatterns(sorted: SelectedComponent[]): ContradictionPattern[] {
  const merged = new Map<string, ContradictionPattern>();
  for (const sc of sorted) {
    const fragments: ContradictionPattern[] =
      'baseModuleId' in sc.raw
        ? [...sc.raw.contradictionPatternFragments]
        : [...sc.raw.contradictionPatternFragments];
    for (const pattern of fragments) {
      merged.set(pattern.patternId, pattern);
    }
  }
  return Array.from(merged.values());
}

// ---------------------------------------------------------------------------
// Component digest (SHA-256 of stable JSON serialisation)
// ---------------------------------------------------------------------------

function digestComponent(component: BaseStandardsModule | TierOverlay): Sha256Hex {
  const stable = JSON.stringify(component, Object.keys(component).sort());
  return createHash('sha256').update(stable, 'utf8').digest('hex') as Sha256Hex;
}

// ---------------------------------------------------------------------------
// Composition digest — ext-spec §15.3 / §28
// Stable hash over sorted component digests + governing context.
// ---------------------------------------------------------------------------

function deriveCompositionDigest(
  sortedComponents: SelectedComponent[],
  input: EffectivePackResolutionInput,
): Sha256Hex {
  const componentDigests = sortedComponents.map((sc) => digestComponent(sc.raw));
  const payload = JSON.stringify({
    packId: input.packId,
    jurisdictionId: input.jurisdictionId,
    governingAsOfDate: input.governingAsOfDate,
    componentDigests,
  });
  return createHash('sha256').update(payload, 'utf8').digest('hex') as Sha256Hex;
}

// ---------------------------------------------------------------------------
// Public compose function
// ---------------------------------------------------------------------------

export interface ComposeEffectivePackInput {
  baseModules: BaseStandardsModule[];
  overlays: TierOverlay[];
  tierPath: TierPathEntry[];
  resolutionInput: EffectivePackResolutionInput;
  basePackManifest: PackManifest;
  resolvedBy: string;
  resolutionMethod: 'composed_fresh' | 'reused_precomputed' | 'replayed_pinned';
  replaySourceRunId?: string;
}

/**
 * Compose a governed EffectivePackManifest from selected components.
 * Returns the manifest ready for compatibility validation and EffectivePackId derivation.
 */
export function composeEffectivePack(input: ComposeEffectivePackInput): {
  manifest: Omit<EffectivePackManifest, 'effectivePackId'>;
  componentDigests: Sha256Hex[];
  compositionDigest: Sha256Hex;
} {
  const {
    baseModules,
    overlays,
    tierPath,
    resolutionInput,
    basePackManifest,
    resolvedBy,
    resolutionMethod,
  } = input;

  // Wrap everything into SelectedComponent for uniform sorting
  const allSelected: SelectedComponent[] = [
    ...baseModules.map((m) => toSelectedComponent(m, tierPath)),
    ...overlays.map((o) => toSelectedComponent(o, tierPath)),
  ];

  const sorted = sortSelectedComponents(allSelected);

  // Merge corpus, hierarchy, contradiction patterns using sorted order
  const mergedCorpus = mergeCorpus(sorted);
  const mergedHierarchy = mergeHierarchyConfig(sorted);
  const mergedContradictions = mergeContradictionPatterns(sorted);

  // Component provenance
  const componentProvenance: ComponentProvenanceEntry[] = sorted.map((sc) => {
    const entry: ComponentProvenanceEntry = {
      componentKind: sc.componentKind,
      componentId: sc.componentId,
      versionIndex: sc.versionIndex,
      effectiveFrom: sc.effectiveFrom,
      digest: digestComponent(sc.raw),
    };
    if (sc.raw.effectiveTo !== undefined) {
      entry.effectiveTo = sc.raw.effectiveTo;
    }
    return entry;
  });

  const componentDigests = componentProvenance.map((cp) => cp.digest);

  const compositionDigest = deriveCompositionDigest(sorted, resolutionInput);

  // displayName per BEST-SOLVE-002
  const displayName = `${resolutionInput.jurisdictionId} ${resolutionInput.trackFamilyId} effective pack`;

  const now = new Date().toISOString();

  const manifest: Omit<EffectivePackManifest, 'effectivePackId'> = {
    // Base PackManifest fields — pass-through from base pack, overlaid with merged fragments
    packId: resolutionInput.packId,
    versionIndex: basePackManifest.versionIndex,
    displayName,
    jurisdiction: basePackManifest.jurisdiction,
    corpus: mergedCorpus.length > 0 ? mergedCorpus : basePackManifest.corpus,
    classMap: basePackManifest.classMap,
    hierarchyConfig:
      mergedHierarchy.length > 0 ? mergedHierarchy : basePackManifest.hierarchyConfig,
    contradictionPatterns:
      mergedContradictions.length > 0
        ? mergedContradictions
        : basePackManifest.contradictionPatterns,
    optionalExtractors: basePackManifest.optionalExtractors,
    standardVersionPolicy: basePackManifest.standardVersionPolicy,
    supportedDocumentClasses: basePackManifest.supportedDocumentClasses,

    // Extension fields
    effectivePackVersion: randomUUID(),
    trackFamilyId: resolutionInput.trackFamilyId,
    jurisdictionFamilyId: resolutionInput.jurisdictionFamilyId,
    jurisdictionId: resolutionInput.jurisdictionId,
    tierPath,
    governingAsOfDate: resolutionInput.governingAsOfDate,
    componentProvenance,
    compositionDigest,
    resolvedAt: now,
    resolvedBy,
    resolutionMethod,
    replayPinned: resolutionMethod === 'replayed_pinned',
    releaseState: 'draft',
    ...(resolutionInput.municipalityId !== undefined && {
      municipalityId: resolutionInput.municipalityId,
    }),
    ...(input.replaySourceRunId !== undefined && { replaySourceRunId: input.replaySourceRunId }),
  };

  return { manifest, componentDigests, compositionDigest };
}
