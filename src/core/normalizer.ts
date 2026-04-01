import { createHash } from 'node:crypto';

export interface ExtractionResult {
  fileId: string;
  method: 'pdf-parse' | 'docx-parse' | 'text' | 'json' | 'csv' | 'ocr-fallback';
  parserVersion: string;
  pageCount?: number;
  usedOcrFallback: boolean;
  warnings: string[];
  rawText: string;
}

export interface ChunkResult {
  chunkId: string;
  fileId: string;
  chunkOrdinal: number;
  text: string;
  normalizedText: string;
  pageStart?: number;
  pageEnd?: number;
  sectionLabel?: string;
}

export function normalizeText(raw: string): string {
  return raw.toLowerCase().replace(/\s+/g, ' ').trim();
}

export function buildChunkId(fileId: string, chunkOrdinal: number): string {
  const input = `${fileId}:${chunkOrdinal}`;
  return createHash('sha256').update(input).digest('hex');
}
