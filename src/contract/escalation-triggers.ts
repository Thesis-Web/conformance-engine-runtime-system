import type { Finding } from '../types/index.js';

export const ESC_TRIGGERS = {
  ESC_001: {
    id: 'ESC-001',
    condition: 'finding is interpretive rather than deterministic',
    detect: (f: Finding) => f.confidenceClass === 'interpretive',
  },
  ESC_002: {
    id: 'ESC-002',
    condition: 'authoritative sources conflict without hierarchy resolution',
    detect: (f: Finding) => f.findingClass === 'CONTRA' && f.confidenceClass === 'deterministic',
  },
  ESC_003: {
    id: 'ESC-003',
    condition: 'candidate live source may affect finding',
    detect: (f: Finding) => f.tags.includes('live_candidate_ref'),
  },
  ESC_004: {
    id: 'ESC-004',
    condition: 'incomplete context blocks reliable classification',
    detect: (f: Finding) =>
      f.findingClass === 'AMBIGUITY' && f.narrativeDescription.includes('classification'),
  },
  ESC_005: {
    id: 'ESC-005',
    condition: 'annotation/comment may materially affect conformance',
    detect: (f: Finding) => f.findingClass === 'AMBIGUITY' && f.tags.includes('FIELD_ANNOTATION'),
  },
} as const;

export function applyEscalationTriggers(findings: Finding[]): Finding[] {
  return findings.map((f) => {
    const triggered: string[] = [];
    for (const t of Object.values(ESC_TRIGGERS)) {
      if (t.detect(f)) triggered.push(t.id);
    }
    if (triggered.length > 0) {
      f.escalationRequired = true;
      triggered.forEach((id) => {
        if (!f.tags.includes(id)) f.tags.push(id);
      });
    }
    return f;
  });
}
