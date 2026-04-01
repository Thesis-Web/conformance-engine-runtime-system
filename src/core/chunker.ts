import type { SourceReference, DocumentClass } from '../types/index.js';
import { normalizeText, buildChunkId } from './normalizer.js';
import { randomUUID } from 'node:crypto';

export function chunkText(
  rawText: string,
  fileId: string,
  docClass: DocumentClass,
  startOrdinal = 0,
): SourceReference[] {
  if (!rawText.trim()) {
    return [
      {
        sourceRefId: randomUUID(),
        fileId,
        docClass,
        chunkOrdinal: startOrdinal,
        text: '',
        normalizedText: '',
        metadata: { chunkMethod: 'empty' },
      },
    ];
  }
  const paragraphs = rawText.split(/\n\s*\n/);
  return paragraphs.map((chunk, index) => ({
    sourceRefId: randomUUID(),
    fileId,
    docClass,
    chunkOrdinal: startOrdinal + index,
    text: chunk.trim(),
    normalizedText: normalizeText(chunk),
    metadata: { chunkMethod: 'paragraph' },
  }));
}
