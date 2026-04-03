import { readFileSync } from 'node:fs';
import { extname } from 'node:path';

import type { ExtractionResult } from './normalizer.js';

// STUB-001 fix: real PDF and DOCX extraction replacing raw-utf8-stub.
// Spec §14: "PDF text extraction may use deterministic parser output.
// DOCX extraction must preserve paragraph ordering."

const SUPPORTED_EXTENSIONS = new Set(['.pdf', '.docx', '.txt', '.md', '.json', '.csv']);

type PdfParseFn = (buf: Buffer) => Promise<{ text: string; numpages: number }>;

async function extractPdf(filePath: string): Promise<{ text: string; pageCount: number }> {
  const buffer = readFileSync(filePath);
  // pdf-parse ESM exports the function directly; CJS wraps it under .default.
  // Route through unknown to satisfy strictness before narrowing.
  const pdfModule: unknown = await import('pdf-parse');
  let pdfParse: PdfParseFn;
  if (typeof pdfModule === 'function') {
    pdfParse = pdfModule as PdfParseFn;
  } else if (
    typeof pdfModule === 'object' &&
    pdfModule !== null &&
    'default' in pdfModule &&
    typeof (pdfModule as Record<string, unknown>)['default'] === 'function'
  ) {
    pdfParse = (pdfModule as Record<string, unknown>)['default'] as PdfParseFn;
  } else {
    pdfParse = pdfModule as PdfParseFn;
  }
  const result = await pdfParse(buffer);
  return { text: result.text, pageCount: result.numpages };
}

async function extractDocx(filePath: string): Promise<{ text: string }> {
  const buffer = readFileSync(filePath);
  const mammoth = await import('mammoth');
  const result = await mammoth.extractRawText({ buffer });
  return { text: result.value };
}

export async function extractText(filePath: string, fileId: string): Promise<ExtractionResult> {
  const ext = extname(filePath).toLowerCase();
  const warnings: string[] = [];

  if (!SUPPORTED_EXTENSIONS.has(ext)) {
    warnings.push(`unsupported extension ${ext}, using raw text fallback`);
  }

  if (ext === '.pdf') {
    try {
      const { text, pageCount } = await extractPdf(filePath);
      return {
        fileId,
        method: 'pdf-parse',
        parserVersion: 'pdf-parse@1.x',
        rawText: text,
        pageCount,
        usedOcrFallback: false,
        warnings,
      };
    } catch (err) {
      warnings.push(`pdf-parse failed: ${String(err)} — falling back to raw-utf8`);
      return {
        fileId,
        method: 'raw-utf8-stub',
        parserVersion: 'fallback',
        rawText: readFileSync(filePath, 'utf-8'),
        usedOcrFallback: false,
        warnings,
      };
    }
  }

  if (ext === '.docx') {
    try {
      const { text } = await extractDocx(filePath);
      return {
        fileId,
        method: 'docx-parse',
        parserVersion: 'mammoth@1.x',
        rawText: text,
        usedOcrFallback: false,
        warnings,
      };
    } catch (err) {
      warnings.push(`mammoth failed: ${String(err)} — falling back to raw-utf8`);
      return {
        fileId,
        method: 'raw-utf8-stub',
        parserVersion: 'fallback',
        rawText: readFileSync(filePath, 'utf-8'),
        usedOcrFallback: false,
        warnings,
      };
    }
  }

  if (ext === '.json') {
    return {
      fileId,
      method: 'json',
      parserVersion: 'node-built-in',
      rawText: readFileSync(filePath, 'utf-8'),
      usedOcrFallback: false,
      warnings,
    };
  }

  if (ext === '.csv') {
    return {
      fileId,
      method: 'csv',
      parserVersion: 'node-built-in',
      rawText: readFileSync(filePath, 'utf-8'),
      usedOcrFallback: false,
      warnings,
    };
  }

  return {
    fileId,
    method: 'text',
    parserVersion: 'node-built-in',
    rawText: readFileSync(filePath, 'utf-8'),
    usedOcrFallback: false,
    warnings,
  };
}
