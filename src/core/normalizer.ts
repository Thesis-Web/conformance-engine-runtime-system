import { createHash } from 'node:crypto';

export interface ExtractionResult {
  fileId: string;
  method:
    | 'pdf-parse'
    | 'docx-parse'
    | 'text'
    | 'json'
    | 'csv'
    | 'ocr-fallback'
    | 'raw-utf8-stub'
    | 'pdf-extraction-failed'
    | 'docx-extraction-failed';
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
  return createHash('sha256').update(`${fileId}:${chunkOrdinal}`).digest('hex');
}
