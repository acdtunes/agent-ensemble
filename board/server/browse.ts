import * as path from 'node:path';
import type { Result, BrowseEntry, BrowseError, DirEntry } from '../shared/types.js';
import { ok, err } from '../shared/types.js';

/**
 * Validate an absolute path for directory browsing.
 * Security-critical: prevents path traversal and injection attacks.
 *
 * Pure function — no filesystem access.
 */
export const validateBrowsePath = (
  browsePath: string,
): Result<string, BrowseError> => {
  if (!browsePath || browsePath.length === 0) {
    return err({ type: 'invalid_path', message: 'Browse path is required' });
  }

  if (browsePath.includes('\0')) {
    return err({ type: 'invalid_path', message: 'Path contains null bytes' });
  }

  // Decode URL-encoded sequences before validation
  let decoded: string;
  try {
    decoded = decodeURIComponent(browsePath);
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

  if (!path.isAbsolute(decoded)) {
    return err({ type: 'invalid_path', message: 'Path must be absolute' });
  }

  return ok(path.resolve(decoded));
};

/**
 * Filter raw directory entries to only visible directories, sorted alphabetically.
 *
 * Pure function — no filesystem access.
 */
export const filterDirectoryEntries = (
  entries: ReadonlyArray<DirEntry>,
): BrowseEntry[] =>
  entries
    .filter((entry) => entry.isDirectory && !entry.name.startsWith('.'))
    .map(({ name, path }) => ({ name, path }))
    .sort((a, b) => a.name.localeCompare(b.name));
