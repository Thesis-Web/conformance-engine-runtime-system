import type { DocumentClass } from '../types/index.js';
import type { ClassMapRule } from '../types/pack-manifest.js';

export interface ClassificationInputs {
  filename: string;
  contentSnippet: string;
  classMapRules: ClassMapRule[];
  operatorOverride?: DocumentClass;
  pass1Suggestion?: DocumentClass;
  pass2Audit?: DocumentClass;
}

export interface ClassificationResult {
  docClass: DocumentClass | null;
  confidence: number;
  source: 'operator_override' | 'deterministic_rule' | 'model_suggestion' | 'escalated_unknown';
  escalated: boolean;
}

export function classifyDocument(input: ClassificationInputs): ClassificationResult {
  if (input.operatorOverride !== undefined) {
    return {
      docClass: input.operatorOverride,
      confidence: 1.0,
      source: 'operator_override',
      escalated: false,
    };
  }

  const lc = input.filename.toLowerCase();
  for (const rule of input.classMapRules.slice().sort((a, b) => a.priority - b.priority)) {
    if (lc.includes(rule.matchCriteria.toLowerCase()) && rule.confidence >= 0.8) {
      return {
        docClass: rule.docClass,
        confidence: rule.confidence,
        source: 'deterministic_rule',
        escalated: false,
      };
    }
  }

  if (input.pass1Suggestion !== undefined) {
    return {
      docClass: input.pass1Suggestion,
      confidence: 0.6,
      source: 'model_suggestion',
      escalated: false,
    };
  }

  // §15.2 step 6: unresolved class becomes an escalation item.
  // CLASSIFIER-FIX-001: must NOT silently assign a default class (was SPEC_SHEET).
  // null docClass signals the orchestrator to route this file to the ambiguity queue.
  // The calling code in run-orchestrator must handle null and skip comparison-pair
  // construction for unresolved files, emitting an AMBIGUITY finding instead.
  return {
    docClass: null,
    confidence: 0.0,
    source: 'escalated_unknown',
    escalated: true,
  };
}
