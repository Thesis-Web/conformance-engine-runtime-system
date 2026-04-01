import { randomUUID } from 'node:crypto';
import { readFileSync, statSync } from 'node:fs';
import { extname } from 'node:path';

import { hashFile, MAX_FILE_BYTES, MAX_CASE_BYTES, isBlockedExtension } from './hasher.js';
import type { IngestedFile, SourceLane } from '../types/index.js';

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

function detectMimeType(extension: string): string {
  switch (extension) {
    case '.pdf':
      return 'application/pdf';
    case '.docx':
      return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    case '.json':
      return 'application/json';
    case '.txt':
      return 'text/plain';
    case '.csv':
      return 'text/csv';
    default:
      return 'application/octet-stream';
  }
}

export function ingestFile(input: IngestInput): IngestOutput {
  const stats = statSync(input.filePath);
  const bytes = readFileSync(input.filePath);
  const byteCount = bytes.byteLength;
  const extensionObserved = extname(input.filePath).toLowerCase();
  const mimeTypeDetected = detectMimeType(extensionObserved);
  const ingestedAt = new Date().toISOString();
  const storedPath = input.filePath;
  const originalFilename = input.filePath.split(/[\\/]/).pop() ?? input.filePath;

  if (byteCount > MAX_FILE_BYTES) {
    const file: IngestedFile = {
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
      rejectionReason: 'exceeds MAX_FILE_BYTES',
      ingestedAt,
    };

    return {
      file,
      rejectionReason: 'exceeds MAX_FILE_BYTES',
    };
  }

  if (isBlockedExtension(extensionObserved)) {
    const file: IngestedFile = {
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
      rejectionReason: 'blocked extension',
      ingestedAt,
    };

    return {
      file,
      rejectionReason: 'blocked extension',
    };
  }

  const sha256 = hashFile(bytes);

  const file: IngestedFile = {
    fileId: randomUUID(),
    caseId: input.caseId,
    runId: input.runId,
    originalFilename,
    storedPath,
    mimeTypeDetected,
    extensionObserved,
    sha256,
    byteCount: stats.size,
    sourceLane: input.sourceLane,
    contentAccepted: true,
    ingestedAt,
  };

  return { file };
}

export function validateCaseSize(files: IngestedFile[]): boolean {
  let totalBytes = 0;

  for (const file of files) {
    if (file.contentAccepted) {
      totalBytes += file.byteCount;
    }
  }

  return totalBytes <= MAX_CASE_BYTES;
}
