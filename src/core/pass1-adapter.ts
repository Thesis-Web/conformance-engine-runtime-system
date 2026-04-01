import type { SourceReference, Finding, RunRecord } from '../types/index.js';
import type { PackManifest } from '../types/pack-manifest.js';
import { randomUUID } from 'node:crypto';

export interface Pass1Input {
  run: RunRecord;
  sourceRefs: SourceReference[];
  pack: PackManifest;
}

export interface Pass1RawOutput {
  proposedFindings: Finding[];
  extractionNotes: string[];
}

export async function runPass1(input: Pass1Input): Promise<Pass1RawOutput> {
  const apiKey = process.env['ANTHROPIC_API_KEY'];
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY environment variable is required');
  }

  const systemPrompt = `You are Pass1 extractor for CERS conformance engine.
Pack: ${input.pack.packId}
Jurisdiction: ${input.pack.jurisdiction}

Extract entities, relationships and generate initial findings.
Output ONLY a valid JSON array of Finding objects.
Never use words: approved, certified, certifies, passes authority review, certification.
Each finding must have all required fields with emittedBy set to "pass1" later.
Use narrativeDescription that is clear and source-cited.`;

  const truncatedRefs = input.sourceRefs.slice(0, 10);
  const userPrompt = `Source references for review:\n${JSON.stringify(truncatedRefs, null, 2)}\n\nReturn findings as JSON array.`;

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

  if (!response.ok) {
    throw new Error(`Anthropic API error: ${response.status}`);
  }

  const data = (await response.json()) as any;
  const text = data.content?.[0]?.text || '[]';

  try {
    const rawFindings = JSON.parse(text) as any[];
    const proposedFindings: Finding[] = rawFindings.map((f: any) => ({
      findingId: f.findingId || randomUUID(),
      runId: input.run.runId,
      packId: input.pack.packId,
      findingClass: f.findingClass || 'DIFF',
      severity: f.severity || 'medium',
      confidenceClass: f.confidenceClass || 'interpretive',
      confidenceBand: f.confidenceBand || 'medium',
      extractionConfidence: f.extractionConfidence ?? 0.7,
      classificationConfidence: f.classificationConfidence ?? 0.7,
      contradictionConfidence: f.contradictionConfidence ?? 0.5,
      applicabilityConfidence: f.applicabilityConfidence ?? 0.7,
      sourceAuthorityConfidence: f.sourceAuthorityConfidence ?? 0.7,
      sourceARefId: f.sourceARefId || '',
      sourceBRefId: f.sourceBRefId,
      escalationRequired: f.escalationRequired ?? false,
      narrativeDescription: f.narrativeDescription || 'No description provided by model',
      resolutionPath: f.resolutionPath,
      askText: f.askText,
      tags: Array.isArray(f.tags) ? f.tags : [],
      emittedBy: 'pass1',
    }));

    return {
      proposedFindings,
      extractionNotes: ['Pass1 completed via Claude Sonnet'],
    };
  } catch (e) {
    return {
      proposedFindings: [],
      extractionNotes: [`Parse error in Pass1: ${(e as Error).message}`],
    };
  }
}
