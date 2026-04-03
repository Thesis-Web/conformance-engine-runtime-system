import { readFileSync } from 'node:fs';
import { extname } from 'node:path';

import type { ExtractionResult } from './normalizer.js';

type ExtractMethod = ExtractionResult['method'];

const EXT_METHOD_MAP: Readonly<Record<string, ExtractMethod>> = {
  '.pdf': 'raw-utf8-stub',
  '.docx': 'raw-utf8-stub',
  '.txt': 'text',
  '.md': 'text',
  '.json': 'json',
  '.csv': 'csv',
};

const SUPPORTED_EXTENSIONS = new Set(Object.keys(EXT_METHOD_MAP));

export function extractText(filePath: string, fileId: string): ExtractionResult {
  const ext = extname(filePath).toLowerCase();
  const warnings: string[] = [];

  if (!SUPPORTED_EXTENSIONS.has(ext)) {
    warnings.push('unsupported extension, using raw text fallback');
  }

  const method: ExtractMethod = EXT_METHOD_MAP[ext] ?? 'text';
  const rawText = readFileSync(filePath, 'utf-8');

  return {
    fileId,
    method,
    parserVersion: '0.1.0-stub',
    rawText,
    usedOcrFallback: false,
    warnings,
  };
}
