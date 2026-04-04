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
  // PASS2-FIX-001: API key check is inside the try block so that a missing key
  // flows through the internal escalation fallback rather than throwing before
  // the catch. Previously, a pre-try throw was caught by the orchestrator's outer
  // try/catch which set auditEntries:[] — leaving pass1 findings unescalated through
  // the merge. Per spec §9.6 and §16.2: ALL pass2 failures must route findings to
  // engineer review, not silently pass them through without escalation.
  const systemPrompt = `You are Pass2 adversarial auditor for CERS. Output ONLY a JSON array of Pass2AuditEntry objects. Each: { "findingId": string, "action": "confirm"|"downgrade"|"suppress"|"escalate", "auditNote": string }`;
  const userPrompt = `Audit these findings:\n${JSON.stringify(input.pass1.findings, null, 2)}\n\nReturn JSON array.`;
  try {
    const apiKey = process.env['ANTHROPIC_API_KEY'];
    if (!apiKey) throw new Error('ANTHROPIC_API_KEY environment variable is required');

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
    // All failures — including missing API key, fetch errors, parse errors — flow here.
    // Per spec §9.6 and §16.2: pass2 failure must escalate all findings to engineer review.
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
