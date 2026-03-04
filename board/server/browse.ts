import * as path from 'node:path';
import { readdir } from 'node:fs/promises';
import { homedir } from 'node:os';
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
  if (!browsePath) {
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
 * Filter raw directory entries to directories only, sorted alphabetically.
 *
 * Pure function — no filesystem access.
 */
export const filterDirectoryEntries = (
  entries: ReadonlyArray<DirEntry>,
): BrowseEntry[] =>
  entries
    .filter((entry) => entry.isDirectory)
    .map(({ name, path }) => ({ name, path }))
    .sort((a, b) => a.name.localeCompare(b.name));

/**
 * Read directory entries from the filesystem and return filtered browse entries.
 *
 * Effect function — performs filesystem IO.
 * Uses readdir({ withFileTypes: true }) to get Dirent objects directly,
 * avoiding separate stat calls that would fail on broken symlinks.
 */
export const listDirectories = async (
  dirPath: string,
): Promise<Result<BrowseEntry[], BrowseError>> => {
  try {
    const dirents = await readdir(dirPath, { withFileTypes: true });
    const entries: DirEntry[] = dirents.map((dirent) => ({
      name: dirent.name,
      path: path.join(dirPath, dirent.name),
      isDirectory: dirent.isDirectory(),
    }));
    return ok(filterDirectoryEntries(entries));
  } catch (error: unknown) {
    const nodeError = error as NodeJS.ErrnoException;
    if (nodeError.code === 'ENOENT') {
      return err({ type: 'not_found', path: dirPath });
    }
    if (nodeError.code === 'EACCES') {
      return err({ type: 'permission_denied', path: dirPath });
    }
    return err({ type: 'read_failed', message: nodeError.message ?? 'Unknown read error' });
  }
};

/**
 * Compute the parent directory, returning null for filesystem roots.
 *
 * Pure function — no filesystem access.
 */
export const computeParentPath = (dirPath: string): string | null => {
  const parent = path.dirname(dirPath);
  return parent === dirPath ? null : parent;
};

/**
 * Return the default browse path (user's home directory).
 */
export const defaultPath = (): string => homedir();
