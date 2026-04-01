import { randomUUID } from 'node:crypto';
import type { Finding, Ask } from '../types/index.js';
import type { PackManifest } from '../types/pack-manifest.js';

function deriveAskType(f: Finding): Ask['askType'] {
  if (f.findingClass === 'HOLE') return 'required_artifact';
  if (f.findingClass === 'UNSUPPORTED') return 'evidence_gap';
  if (f.findingClass === 'STALE') return 'authority_check';
  return 'clarification';
}

function deriveAskText(f: Finding, pack: PackManifest): string {
  switch (f.findingClass) {
    case 'HOLE':
      return `Missing required artifact for pack ${pack.packId}: ${f.narrativeDescription}`;
    case 'AMBIGUITY':
      return `Engineer review required — ambiguous condition: ${f.narrativeDescription}`;
    case 'UNSUPPORTED':
      return `No evidence chain found — provide supporting documentation: ${f.narrativeDescription}`;
    case 'CONTRA':
      return `Contradiction requires resolution before clean output: ${f.narrativeDescription}`;
    case 'DIFF':
      return `Conflicting values require governing-value confirmation: ${f.narrativeDescription}`;
    case 'STALE':
      return f.resolutionPath !== undefined
        ? `Update to current version per pack policy: ${f.resolutionPath}`
        : `Stale standard reference — verify current allowed version: ${f.narrativeDescription}`;
    default:
      return f.narrativeDescription;
  }
}

// Per spec §33.2 ask generation filter rules
function shouldGenerateAsk(f: Finding): boolean {
  if (f.findingClass === 'HOLE') return true;
  if (f.findingClass === 'AMBIGUITY') return true;
  if (f.findingClass === 'UNSUPPORTED') return true;
  if (f.findingClass === 'CONTRA') {
    return f.escalationRequired || f.severity === 'critical' || f.severity === 'high';
  }
  if (f.findingClass === 'DIFF') {
    return (
      f.severity === 'critical' ||
      f.severity === 'high' ||
      f.confidenceClass === 'interpretive'
    );
  }
  if (f.findingClass === 'STALE') return f.resolutionPath !== undefined;
  return false;
}

export function generateAsks(findings: Finding[], pack: PackManifest): Ask[] {
  return findings
    .filter(shouldGenerateAsk)
    .map((f) => ({
      askId: randomUUID(),
      runId: f.runId,
      linkedFindingId: f.findingId,
      packId: f.packId,
      severity: f.severity,
      askType: deriveAskType(f),
      text: deriveAskText(f, pack),
      requiredForCleanOutput:
        f.escalationRequired || f.severity === 'critical' || f.severity === 'high',
    }));
}
