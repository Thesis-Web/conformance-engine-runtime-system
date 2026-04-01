import type { Finding } from '../types/index.js';

export interface Pass1Output {
  findings: Finding[];
  extractionNotes: string[];
}

export interface Pass2AuditEntry {
  findingId: string;
  action: 'confirm' | 'downgrade' | 'suppress' | 'escalate' | 'split';
  revisedConfidenceBand?: Finding['confidenceBand'];
  revisedConfidenceClass?: Finding['confidenceClass'];
  forceEscalation?: boolean;
  auditNote: string;
}

export interface Pass2Output {
  auditEntries: Pass2AuditEntry[];
  auditCommentary: string;
}

export interface RulesOutput {
  findings: Finding[];
}

export interface MergedFindingSet {
  findings: Finding[];
  suppressedCount: number;
  escalatedCount: number;
}

// Per spec §16.3 deterministic merge rules:
// - pass2 may suppress unsupported pass1 claims
// - pass2 may downgrade confidence or force escalation
// - pass2 cannot directly emit final findings without merge
// - rules pass has final say where blueprint/runtime law is explicit
export function mergeFindingSets(
  pass1: Pass1Output,
  pass2: Pass2Output,
  rules: RulesOutput,
): MergedFindingSet {
  const auditMap = new Map<string, Pass2AuditEntry>();
  for (const entry of pass2.auditEntries) {
    auditMap.set(entry.findingId, entry);
  }

  let suppressedCount = 0;
  let escalatedCount = 0;

  const rulesIds = new Set(rules.findings.map((f) => f.findingId));

  // Apply pass2 audit to pass1 findings
  const mergedFromPass1: Finding[] = [];
  for (const finding of pass1.findings) {
    // Rules pass findings override pass1/pass2 for same findingId
    if (rulesIds.has(finding.findingId)) {
      continue;
    }

    const audit = auditMap.get(finding.findingId);
    if (audit === undefined) {
      mergedFromPass1.push({ ...finding, emittedBy: 'merged' });
      continue;
    }

    if (audit.action === 'suppress') {
      suppressedCount++;
      continue;
    }

    const updated: Finding = {
      ...finding,
      emittedBy: 'merged',
      ...(audit.revisedConfidenceBand !== undefined
        ? { confidenceBand: audit.revisedConfidenceBand }
        : {}),
      ...(audit.revisedConfidenceClass !== undefined
        ? { confidenceClass: audit.revisedConfidenceClass }
        : {}),
      ...(audit.forceEscalation === true ? { escalationRequired: true } : {}),
    };

    if (audit.forceEscalation === true) {
      escalatedCount++;
    }

    mergedFromPass1.push(updated);
  }

  // Rules findings always included, marked as emittedBy:'rules'
  const ruleFindings = rules.findings.map((f) => ({ ...f, emittedBy: 'rules' as const }));

  return {
    findings: [...mergedFromPass1, ...ruleFindings],
    suppressedCount,
    escalatedCount,
  };
}
