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
  if (input.operatorOverride) {
    return {
      docClass: input.operatorOverride,
      confidence: 1.0,
      source: 'operator_override',
      escalated: false
    };
  }

  const matchingRules = input.classMapRules.filter(rule =>
    input.filename.toLowerCase().includes(rule.matchCriteria.toLowerCase()) ||
    input.contentSnippet.toLowerCase().includes(rule.matchCriteria.toLowerCase())
  );

  if (matchingRules.length > 0) {
    const bestRule = matchingRules.reduce((prev, current) =>
      (current.priority ?? 0) > (prev.priority ?? 0) ? current : prev
    );
    if (bestRule.confidence >= 0.8) {
      return {
        docClass: bestRule.docClass,
        confidence: bestRule.confidence,
        source: 'deterministic_rule',
        escalated: false
      };
    }
  }

  if (input.pass1Suggestion) {
    return {
      docClass: input.pass1Suggestion,
      confidence: 0.6,
      source: 'model_suggestion',
      escalated: false
    };
  }

  return {
    docClass: 'SPEC_SHEET',
    confidence: 0.0,
    source: 'escalated_unknown',
    escalated: true
  };
}
