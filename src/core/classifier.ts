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
  docClass: DocumentClass;
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
  return { docClass: 'SPEC_SHEET', confidence: 0.0, source: 'escalated_unknown', escalated: true };
}
