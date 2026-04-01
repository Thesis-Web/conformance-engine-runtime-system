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

const MIME_MAP: Readonly<Record<string, string>> = {
  '.pdf': 'application/pdf',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.json': 'application/json',
  '.txt': 'text/plain',
  '.csv': 'text/csv',
};

function detectMimeType(ext: string): string {
  return MIME_MAP[ext] ?? 'application/octet-stream';
}

function baseFilename(filePath: string): string {
  return filePath.split(/[\\/]/).pop() ?? filePath;
}

export function ingestFile(input: IngestInput): IngestOutput {
  const bytes = readFileSync(input.filePath);
  const byteCount = bytes.byteLength;
  const extensionObserved = extname(input.filePath).toLowerCase();
  const mimeTypeDetected = detectMimeType(extensionObserved);
  const ingestedAt = new Date().toISOString();
  const originalFilename = baseFilename(input.filePath);
  const storedPath = input.filePath;

  const base: Omit<IngestedFile, 'sha256' | 'contentAccepted'> = {
    fileId: randomUUID(),
    caseId: input.caseId,
    runId: input.runId,
    originalFilename,
    storedPath,
    mimeTypeDetected,
    extensionObserved,
    byteCount,
    sourceLane: input.sourceLane,
    ingestedAt,
  };

  if (byteCount > MAX_FILE_BYTES) {
    return {
      file: { ...base, sha256: '', contentAccepted: false, rejectionReason: 'exceeds MAX_FILE_BYTES' },
      rejectionReason: 'exceeds MAX_FILE_BYTES',
    };
  }

  if (isBlockedExtension(extensionObserved)) {
    return {
      file: { ...base, sha256: '', contentAccepted: false, rejectionReason: 'blocked extension' },
      rejectionReason: 'blocked extension',
    };
  }

  const sha256 = hashFile(bytes);
  return { file: { ...base, sha256, contentAccepted: true } };
}

export function validateCaseSize(files: IngestedFile[]): boolean {
  const total = files
    .filter((f) => f.contentAccepted)
    .reduce((sum, f) => sum + f.byteCount, 0);
  return total <= MAX_CASE_BYTES;
}
