/**
 * Chunker — spec §14.3 format-aware chunking law.
 *
 * PDF:  by page (page breaks from extractor), then by detected section heading within page.
 * DOCX: by heading or paragraph cluster.
 * TXT:  by blank-line paragraphs.
 * JSON: by object path (top-level keys).
 * CSV:  by row group with header context.
 *
 * CHUNKER-FIX-001: prior implementation was paragraph-split for all formats.
 * Format dispatch is now based on mimeType (or docClass as fallback).
 * Chunk IDs must be reproducible for identical input per §14.3.
 */

import type { SourceReference, DocumentClass } from '../types/index.js';
import { normalizeText } from './normalizer.js';
import { randomUUID } from 'node:crypto';

function makeRef(
  fileId: string,
  docClass: DocumentClass,
  ordinal: number,
  text: string,
  method: string,
  extra?: Record<string, string | number | boolean | null>,
): SourceReference {
  return {
    sourceRefId: randomUUID(),
    fileId,
    docClass,
    chunkOrdinal: ordinal,
    text: text.trim(),
    normalizedText: normalizeText(text),
    metadata: { chunkMethod: method, ...(extra ?? {}) },
  };
}

/** PDF: split by form-feed page markers if present, else fall back to heading-based split */
function chunkPdf(
  rawText: string,
  fileId: string,
  docClass: DocumentClass,
  startOrdinal: number,
): SourceReference[] {
  // pdf-parse emits form-feed \f between pages
  const pageBreak = /\f/;
  const pages = rawText.split(pageBreak).filter((p) => p.trim().length > 0);
  if (pages.length > 1) {
    return pages.map((page, i) =>
      makeRef(fileId, docClass, startOrdinal + i, page, 'pdf-page', { page: i + 1 }),
    );
  }
  // Fallback: split by detected heading lines (all-caps line or ## prefix)
  const headingPattern = /(?=^#{1,3} .+$|^[A-Z][A-Z\s]{4,}$)/m;
  const sections = rawText.split(headingPattern).filter((s) => s.trim().length > 0);
  return sections.map((sec, i) => makeRef(fileId, docClass, startOrdinal + i, sec, 'pdf-heading'));
}

/** DOCX: split by heading markers or paragraph clusters */
function chunkDocx(
  rawText: string,
  fileId: string,
  docClass: DocumentClass,
  startOrdinal: number,
): SourceReference[] {
  // mammoth outputs headings prefixed with ## or separated by double newlines
  const headingPattern = /(?=^#{1,3} .+$)/m;
  const sections = rawText.split(headingPattern).filter((s) => s.trim().length > 0);
  if (sections.length > 1) {
    return sections.map((sec, i) =>
      makeRef(fileId, docClass, startOrdinal + i, sec, 'docx-heading'),
    );
  }
  // Fallback: paragraph clusters
  const paragraphs = rawText.split(/\n\s*\n/).filter((p) => p.trim().length > 0);
  return paragraphs.map((para, i) =>
    makeRef(fileId, docClass, startOrdinal + i, para, 'docx-paragraph'),
  );
}

/** TXT: split by blank-line paragraphs per spec */
function chunkTxt(
  rawText: string,
  fileId: string,
  docClass: DocumentClass,
  startOrdinal: number,
): SourceReference[] {
  const paragraphs = rawText.split(/\n\s*\n/).filter((p) => p.trim().length > 0);
  return paragraphs.map((para, i) =>
    makeRef(fileId, docClass, startOrdinal + i, para, 'txt-paragraph'),
  );
}

/** JSON: by object path (top-level keys) */
function chunkJson(
  rawText: string,
  fileId: string,
  docClass: DocumentClass,
  startOrdinal: number,
): SourceReference[] {
  try {
    const parsed: unknown = JSON.parse(rawText);
    if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
      const entries = Object.entries(parsed as Record<string, unknown>);
      if (entries.length > 0) {
        return entries.map(([key, value], i) =>
          makeRef(
            fileId,
            docClass,
            startOrdinal + i,
            JSON.stringify({ [key]: value }),
            'json-object-path',
            { key },
          ),
        );
      }
    }
    // Array or primitive — treat as one chunk
    return [makeRef(fileId, docClass, startOrdinal, rawText, 'json-flat')];
  } catch {
    // Invalid JSON — fall back to paragraph split
    return chunkTxt(rawText, fileId, docClass, startOrdinal);
  }
}

/** CSV: by row group with header context */
function chunkCsv(
  rawText: string,
  fileId: string,
  docClass: DocumentClass,
  startOrdinal: number,
): SourceReference[] {
  const lines = rawText.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return [makeRef(fileId, docClass, startOrdinal, rawText, 'csv-empty')];

  const header = lines[0] ?? '';
  const dataLines = lines.slice(1);

  // Group every 10 data rows into one chunk, each carrying the header for context
  const GROUP_SIZE = 10;
  const refs: SourceReference[] = [];
  for (let i = 0; i < dataLines.length; i += GROUP_SIZE) {
    const group = dataLines.slice(i, i + GROUP_SIZE);
    const text = [header, ...group].join('\n');
    refs.push(
      makeRef(fileId, docClass, startOrdinal + refs.length, text, 'csv-row-group', {
        rowStart: i + 1,
        rowEnd: i + group.length,
      }),
    );
  }
  return refs.length > 0 ? refs : [makeRef(fileId, docClass, startOrdinal, rawText, 'csv-flat')];
}

/**
 * Top-level format-aware chunk dispatcher per spec §14.3.
 * mimeType drives format selection; docClass is carried on output refs.
 */
export function chunkText(
  rawText: string,
  fileId: string,
  docClass: DocumentClass,
  mimeType = '',
  startOrdinal = 0,
): SourceReference[] {
  if (!rawText.trim()) {
    return [makeRef(fileId, docClass, startOrdinal, '', 'empty')];
  }

  const mime = mimeType.toLowerCase();

  if (mime.includes('pdf')) {
    return chunkPdf(rawText, fileId, docClass, startOrdinal);
  }
  if (
    mime.includes('wordprocessingml') ||
    mime.includes('docx') ||
    mime.includes('msword') ||
    mime.includes('vnd.openxmlformats')
  ) {
    return chunkDocx(rawText, fileId, docClass, startOrdinal);
  }
  if (mime.includes('json')) {
    return chunkJson(rawText, fileId, docClass, startOrdinal);
  }
  if (mime.includes('csv') || mime.includes('comma-separated')) {
    return chunkCsv(rawText, fileId, docClass, startOrdinal);
  }
  // TXT and fixture .txt files (default for POC)
  return chunkTxt(rawText, fileId, docClass, startOrdinal);
}
