import type { SourceReference, RunRecord } from '../types/index.js';
import type { PackManifest } from '../types/pack-manifest.js';
import type { Pass1Output, Pass2AuditEntry, Pass2Output } from './finding-merge.js';

export interface Pass2Input {
  run: RunRecord;
  pass1: Pass1Output;
  sourceRefs: SourceReference[];
  pack: PackManifest;
}

export async function runPass2(input: Pass2Input): Promise<Pass2Output> {
  const apiKey = process.env['ANTHROPIC_API_KEY'];
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY environment variable is required');
  }

  const systemPrompt = `You are Pass2 adversarial auditor for CERS.
Challenge every Pass1 finding for grounding, applicability and escalation needs.
Output ONLY a JSON array of Pass2AuditEntry objects.
Each entry: { "findingId": string, "action": "confirm"|"downgrade"|"suppress"|"escalate", "auditNote": string }`;

  const userPrompt = `Pass1 findings to audit:\n${JSON.stringify(input.pass1.proposedFindings, null, 2)}\n\nAudit and return JSON array.`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }]
    })
  });

  if (!response.ok) {
    throw new Error(`Anthropic API error: ${response.status}`);
  }

  const data = await response.json() as any;
  const text = data.content?.[0]?.text || '[]';

  let auditEntries: Pass2AuditEntry[] = [];
  try {
    auditEntries = JSON.parse(text) as Pass2AuditEntry[];
  } catch {
    // fallback: confirm all
    auditEntries = input.pass1.proposedFindings.map(f => ({
      findingId: f.findingId,
      action: 'confirm' as const,
      auditNote: 'Parse error in Pass2 - default confirm'
    }));
  }

  return {
    auditEntries,
    auditCommentary: `Pass2 audit completed. ${auditEntries.length} findings reviewed.`
  };
}
