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
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY environment variable is required');
  const systemPrompt = `You are Pass2 adversarial auditor for CERS. Output ONLY a JSON array of Pass2AuditEntry objects. Each: { "findingId": string, "action": "confirm"|"downgrade"|"suppress"|"escalate", "auditNote": string }`;
  const userPrompt = `Audit these findings:\n${JSON.stringify(input.pass1.findings, null, 2)}\n\nReturn JSON array.`;
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      }),
    });
    const data = (await response.json()) as { content: Array<{ type: string; text: string }> };
    const text = data.content
      .filter((c) => c.type === 'text')
      .map((c) => c.text)
      .join('');
    const entries = JSON.parse(text.replace(/```json|```/g, '').trim()) as Pass2AuditEntry[];
    return { auditEntries: entries, auditCommentary: `${entries.length} findings reviewed.` };
  } catch (err) {
    // DIFF-AUDIT-002 fix: pass2 error must escalate findings, not silently confirm them.
    // Silent confirm disabled the adversarial audit pass on any API outage.
    // Per §9.6 and §16.2: pass2 failure routes all findings to engineer review.
    return {
      auditEntries: input.pass1.findings.map((f) => ({
        findingId: f.findingId,
        action: 'escalate' as const,
        forceEscalation: true,
        auditNote: `pass2 unavailable — auto-escalated for engineer review. Error: ${String(err)}`,
      })),
      auditCommentary: `pass2 error: ${String(err)} — all findings escalated per §9.6`,
    };
  }
}
