import * as path from 'node:path';
import { readFile } from 'node:fs/promises';
import type { Result, DocContentError } from '../shared/types.js';
import { ok, err } from '../shared/types.js';

/**
 * Validate a relative document path against a docs root directory.
 * Security-critical: prevents path traversal attacks.
 *
 * Pure function — no filesystem access.
 */
export const validateDocPath = (
  docsRoot: string,
  relativePath: string,
): Result<string, DocContentError> => {
  if (!relativePath || relativePath.length === 0) {
    return err({ type: 'invalid_path', message: 'Document path is required' });
  }

  if (relativePath.includes('\0')) {
    return err({ type: 'invalid_path', message: 'Path contains null bytes' });
  }

  if (path.isAbsolute(relativePath)) {
    return err({ type: 'invalid_path', message: 'Absolute paths are not allowed' });
  }

  // Decode URL-encoded sequences before validation — catch malformed encodings
  let decoded: string;
  try {
    decoded = decodeURIComponent(relativePath);
  } catch {
    return err({ type: 'invalid_path', message: 'Invalid URL encoding' });
  }

  // Check null bytes after decoding (catches encoded %00)
  if (decoded.includes('\0')) {
    return err({ type: 'invalid_path', message: 'Path contains null bytes' });
  }

  // Check for traversal sequences after decoding
  if (decoded.includes('..')) {
    return err({ type: 'invalid_path', message: 'Path traversal is not allowed' });
  }

  // Resolve the full path and verify it stays within docsRoot
  const resolvedRoot = path.resolve(docsRoot);
  const resolvedFull = path.resolve(docsRoot, path.normalize(decoded));

  if (!resolvedFull.startsWith(resolvedRoot + path.sep) && resolvedFull !== resolvedRoot) {
    return err({ type: 'invalid_path', message: 'Path resolves outside docs root' });
  }

  return ok(resolvedFull);
};

/**
 * Read file content from a validated absolute path.
 *
 * Effect function — performs filesystem IO.
 * Expects the output of validateDocPath (resolved absolute path).
 */
export const readDocContent = async (
  validatedPath: string,
): Promise<Result<string, DocContentError>> => {
  try {
    const content = await readFile(validatedPath, 'utf-8');
    return ok(content);
  } catch (error: unknown) {
    const nodeError = error as NodeJS.ErrnoException;
    if (nodeError.code === 'ENOENT') {
      return err({ type: 'not_found', path: validatedPath });
    }
    return err({ type: 'read_failed', message: nodeError.message ?? 'Unknown read error' });
  }
};
