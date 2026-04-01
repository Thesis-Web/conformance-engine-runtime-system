import { createHash } from 'node:crypto';

export const MAX_FILE_BYTES = 104857600;
export const MAX_CASE_BYTES = 2147483648;

export const BLOCKED_EXTENSIONS: ReadonlySet<string> = new Set<string>([
  '.exe',
  '.bat',
  '.sh',
  '.mjs',
  '.ps1',
  '.cmd',
]);

export function hashFile(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex');
}

export function isBlockedExtension(ext: string): boolean {
  return BLOCKED_EXTENSIONS.has(ext.toLowerCase());
}
