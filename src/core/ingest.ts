import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { extname } from 'node:path';

import { hashFile, MAX_FILE_BYTES, MAX_CASE_BYTES, isBlockedExtension } from './hasher.js';
import type { IngestedFile } from '../types/index.js';
import type { SourceLane } from '../types/index.js';

export interface IngestInput {
  caseId: string;
  runId: string;
  filePath: string;
  sourceLane: SourceLane;
}

export interface IngestOutput {
  file: IngestedFile;
  rejectionReason?: string;
}

// DRIFT-001 fix: content-signature verification.
// Spec §13.2: "Observed extension is not authoritative. Acceptance is based
// on content/magic-signature or parser verification."
// Blueprint §16.2: hostile-ingest stance requires type verification by
// content/signature, not extension only.
//
// Each entry defines the magic bytes (at offset 0 unless noted) that
// positively identify a file type. Files whose observed extension claims
// one type but whose content signature matches a different type are rejected.

interface MagicSignature {
  /** Expected byte values at the given offset. undefined = any byte. */
  bytes: (number | undefined)[];
  offset: number;
  mimeType: string;
  label: string;
}

// Ordered: more specific signatures first.
const MAGIC_SIGNATURES: MagicSignature[] = [
  // PDF: %PDF
  {
    bytes: [0x25, 0x50, 0x44, 0x46],
    offset: 0,
    mimeType: 'application/pdf',
    label: 'pdf',
  },
  // DOCX / XLSX / ZIP: PK\x03\x04 — Open XML formats are ZIP containers
  {
    bytes: [0x50, 0x4b, 0x03, 0x04],
    offset: 0,
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    label: 'zip/docx',
  },
  // ELF executables (Linux binaries): \x7fELF
  {
    bytes: [0x7f, 0x45, 0x4c, 0x46],
    offset: 0,
    mimeType: 'application/x-executable',
    label: 'elf-executable',
  },
  // Windows PE executables: MZ
  {
    bytes: [0x4d, 0x5a],
    offset: 0,
    mimeType: 'application/x-executable',
    label: 'pe-executable',
  },
];

// MIME types that are never acceptable regardless of extension claim.
const BLOCKED_MIME_TYPES = new Set([
  'application/x-executable',
  'application/x-msdownload',
  'application/x-sh',
]);

const EXTENSION_TO_EXPECTED_MIME: Readonly<Record<string, string>> = {
  '.pdf': 'application/pdf',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.json': 'application/json',
  '.txt': 'text/plain',
  '.csv': 'text/csv',
  '.md': 'text/plain',
};

/**
 * Detect MIME type from content signature (magic bytes).
 * Returns null if no signature matches — caller falls back to text heuristic.
 */
function detectMimeFromSignature(bytes: Uint8Array): string | null {
  for (const sig of MAGIC_SIGNATURES) {
    if (bytes.length < sig.offset + sig.bytes.length) continue;
    const match = sig.bytes.every((b, i) => b === undefined || bytes[sig.offset + i] === b);
    if (match) return sig.mimeType;
  }
  return null;
}

/**
 * Heuristic: is this buffer consistent with UTF-8 / ASCII text?
 * Rejects buffers with null bytes or high density of non-printable bytes,
 * which strongly suggest binary content misrepresented as text.
 */
function looksLikeText(bytes: Uint8Array): boolean {
  if (bytes.length === 0) return true;
  const sample = bytes.slice(0, Math.min(512, bytes.length));
  let nonPrintable = 0;
  for (const b of sample) {
    // Allow: tab(9), LF(10), CR(13), space-tilde (32-126), common UTF-8 high bytes
    if (b === 0) return false; // null byte = binary
    if (b < 9 || (b > 13 && b < 32 && b !== 27)) nonPrintable++;
  }
  return nonPrintable / sample.length < 0.1;
}

/**
 * Determine the authoritative MIME type for accepted file types by content,
 * not by extension. Returns { mimeType, rejectionReason? }.
 *
 * Policy:
 *   1. Blocked extensions are rejected before reaching this function.
 *   2. Signature-identified binary types are checked first.
 *   3. If signature identifies a blocked type → reject.
 *   4. If signature identifies a known type that disagrees with observed
 *      extension → reject (extension spoofing).
 *   5. For text-extension files with no binary signature → verify text heuristic.
 *   6. JSON files: verify parseable as JSON (first non-whitespace is { or [).
 */
function verifyContent(
  bytes: Uint8Array,
  extensionObserved: string,
): { mimeType: string; rejectionReason?: string } {
  const expectedMime = EXTENSION_TO_EXPECTED_MIME[extensionObserved];
  const signatureMime = detectMimeFromSignature(bytes);

  // Blocked binary signature regardless of extension
  if (signatureMime !== null && BLOCKED_MIME_TYPES.has(signatureMime)) {
    return {
      mimeType: signatureMime,
      rejectionReason: `Content signature identifies file as blocked binary type (${signatureMime}). Extension claimed: ${extensionObserved}.`,
    };
  }

  // PDF claimed — verify signature
  if (extensionObserved === '.pdf') {
    if (signatureMime === 'application/pdf') {
      return { mimeType: 'application/pdf' };
    }
    return {
      mimeType: signatureMime ?? 'application/octet-stream',
      rejectionReason: `File claims .pdf extension but content signature does not match PDF (%PDF). Possible spoofing or corruption.`,
    };
  }

  // DOCX claimed — verify ZIP/PK signature (DOCX is a ZIP container)
  if (extensionObserved === '.docx') {
    if (
      signatureMime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ) {
      return {
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      };
    }
    return {
      mimeType: signatureMime ?? 'application/octet-stream',
      rejectionReason: `File claims .docx extension but content signature does not match DOCX/ZIP (PK\\x03\\x04). Possible spoofing or corruption.`,
    };
  }

  // JSON claimed — verify first non-whitespace character
  if (extensionObserved === '.json') {
    const text = Buffer.from(bytes).toString('utf8').trimStart();
    if (text.startsWith('{') || text.startsWith('[')) {
      return { mimeType: 'application/json' };
    }
    return {
      mimeType: 'text/plain',
      rejectionReason: `File claims .json extension but content does not begin with '{' or '['. Not valid JSON structure.`,
    };
  }

  // Text-family extensions (.txt, .csv, .md) — verify text heuristic
  if (extensionObserved === '.txt' || extensionObserved === '.csv' || extensionObserved === '.md') {
    // If a binary signature was found inside a claimed text file — reject
    if (signatureMime !== null && signatureMime !== 'text/plain') {
      return {
        mimeType: signatureMime,
        rejectionReason: `File claims ${extensionObserved} extension but content signature matches binary type (${signatureMime}). Possible spoofing.`,
      };
    }
    if (!looksLikeText(bytes)) {
      return {
        mimeType: 'application/octet-stream',
        rejectionReason: `File claims ${extensionObserved} extension but content appears binary (null bytes or high non-printable density).`,
      };
    }
    const mimeMap: Record<string, string> = {
      '.txt': 'text/plain',
      '.csv': 'text/csv',
      '.md': 'text/plain',
    };
    return { mimeType: mimeMap[extensionObserved] ?? 'text/plain' };
  }

  // Unknown extension — if a binary signature was found, reject
  if (signatureMime !== null && BLOCKED_MIME_TYPES.has(signatureMime)) {
    return {
      mimeType: signatureMime,
      rejectionReason: `Content signature identifies blocked binary type (${signatureMime}).`,
    };
  }

  // Unknown extension, no blocked signature — allow with observed-extension MIME
  return { mimeType: expectedMime ?? 'application/octet-stream' };
}

function baseFilename(filePath: string): string {
  return filePath.split(/[/\\]/).pop() ?? filePath;
}

export function ingestFile(input: IngestInput): IngestOutput {
  const bytes = readFileSync(input.filePath);
  const uint8 = new Uint8Array(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const byteCount = bytes.byteLength;
  const extensionObserved = extname(input.filePath).toLowerCase();
  const ingestedAt = new Date().toISOString();
  const originalFilename = baseFilename(input.filePath);
  const storedPath = input.filePath;

  // Step 1: block by extension (spec §13.3)
  if (isBlockedExtension(extensionObserved)) {
    return {
      file: {
        fileId: randomUUID(),
        caseId: input.caseId,
        runId: input.runId,
        originalFilename,
        storedPath,
        mimeTypeDetected: 'application/octet-stream',
        extensionObserved,
        sha256: '',
        byteCount,
        sourceLane: input.sourceLane,
        contentAccepted: false,
        rejectionReason: `Blocked extension: ${extensionObserved}`,
        ingestedAt,
      },
      rejectionReason: `Blocked extension: ${extensionObserved}`,
    };
  }

  // Step 2: size limit (spec §13.5)
  if (byteCount > MAX_FILE_BYTES) {
    return {
      file: {
        fileId: randomUUID(),
        caseId: input.caseId,
        runId: input.runId,
        originalFilename,
        storedPath,
        mimeTypeDetected: 'application/octet-stream',
        extensionObserved,
        sha256: '',
        byteCount,
        sourceLane: input.sourceLane,
        contentAccepted: false,
        rejectionReason: `File size ${byteCount} exceeds MAX_FILE_BYTES`,
        ingestedAt,
      },
      rejectionReason: `File size ${byteCount} exceeds MAX_FILE_BYTES`,
    };
  }

  // Step 3: DRIFT-001 fix — content-signature verification (spec §13.2)
  const { mimeType: mimeTypeDetected, rejectionReason: contentRejection } = verifyContent(
    uint8,
    extensionObserved,
  );

  if (contentRejection) {
    return {
      file: {
        fileId: randomUUID(),
        caseId: input.caseId,
        runId: input.runId,
        originalFilename,
        storedPath,
        mimeTypeDetected,
        extensionObserved,
        sha256: '',
        byteCount,
        sourceLane: input.sourceLane,
        contentAccepted: false,
        rejectionReason: contentRejection,
        ingestedAt,
      },
      rejectionReason: contentRejection,
    };
  }

  // Step 4: hash accepted content (spec §13.6)
  const sha256 = hashFile(uint8);

  return {
    file: {
      fileId: randomUUID(),
      caseId: input.caseId,
      runId: input.runId,
      originalFilename,
      storedPath,
      mimeTypeDetected,
      extensionObserved,
      sha256,
      byteCount,
      sourceLane: input.sourceLane,
      contentAccepted: true,
      ingestedAt,
    },
  };
}

export function validateCaseSize(files: IngestedFile[]): boolean {
  const total = files.reduce((sum, f) => sum + f.byteCount, 0);
  return total <= MAX_CASE_BYTES;
}
