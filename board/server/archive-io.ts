/**
 * Archive IO — filesystem adapter for archive operations
 *
 * IO adapters (effect boundary):
 *   moveToArchiveFs: (sourcePath, destPath) → Result<void, ArchiveIOError>
 *   ensureArchiveDirFs: (archiveDir) → Result<void, ArchiveIOError>
 *   scanArchiveDirFs: (archiveDir) → Result<ArchivedFeatureEntry[], ArchiveIOError>
 *
 * All functions isolate side effects. Domain logic remains pure.
 */

import { mkdir, rename, readdir, stat } from 'node:fs/promises';
import { dirname } from 'node:path';
import type { Result } from '../shared/types.js';
import { ok, err, createFeatureId } from '../shared/types.js';

// =====================================================================
// Types — archive-specific error union and result types
// =====================================================================

export type ArchiveIOError =
  | { readonly type: 'source_not_found'; readonly path: string }
  | { readonly type: 'destination_exists'; readonly path: string }
  | { readonly type: 'permission_denied'; readonly path: string }
  | { readonly type: 'io_error'; readonly message: string };

export interface ArchivedFeatureEntry {
  readonly featureId: string;
  readonly archivedAt: string;
}

// =====================================================================
// Pure helpers — no side effects
// =====================================================================

const isValidFeatureDir = (name: string): boolean =>
  !name.startsWith('.') && createFeatureId(name).ok;

const formatTimestamp = (date: Date): string => date.toISOString();

// =====================================================================
// IO Adapters — side-effect boundary
// =====================================================================

/**
 * Ensures archive directory exists, creating it if missing.
 * Creates parent directories recursively if needed.
 */
export const ensureArchiveDirFs = async (
  archiveDir: string,
): Promise<Result<void, ArchiveIOError>> => {
  try {
    await mkdir(archiveDir, { recursive: true });
    return ok(undefined);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return err({ type: 'io_error', message });
  }
};

/**
 * Moves directory atomically from source to destination.
 * Creates parent directories for destination if needed.
 *
 * Returns error if:
 * - Source does not exist (source_not_found)
 * - Destination already exists (destination_exists)
 */
export const moveToArchiveFs = async (
  sourcePath: string,
  destPath: string,
): Promise<Result<void, ArchiveIOError>> => {
  // Check source exists
  try {
    const sourceStat = await stat(sourcePath);
    if (!sourceStat.isDirectory()) {
      return err({ type: 'source_not_found', path: sourcePath });
    }
  } catch {
    return err({ type: 'source_not_found', path: sourcePath });
  }

  // Check destination does not exist
  try {
    await stat(destPath);
    return err({ type: 'destination_exists', path: destPath });
  } catch {
    // Destination not existing is expected
  }

  // Ensure parent directory exists
  try {
    await mkdir(dirname(destPath), { recursive: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return err({ type: 'io_error', message });
  }

  // Atomic move
  try {
    await rename(sourcePath, destPath);
    return ok(undefined);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return err({ type: 'io_error', message });
  }
};

/**
 * Scans archive directory for archived features.
 * Returns list of entries with feature IDs and archive timestamps.
 *
 * - Skips files (only directories)
 * - Skips hidden directories (starting with .)
 * - Skips invalid feature ID slugs
 * - Uses directory mtime as archivedAt timestamp
 * - Sorted by archivedAt descending (most recent first)
 */
export const scanArchiveDirFs = async (
  archiveDir: string,
): Promise<Result<readonly ArchivedFeatureEntry[], ArchiveIOError>> => {
  // Check if archive directory exists
  try {
    await stat(archiveDir);
  } catch {
    // Directory doesn't exist — return empty list (not an error)
    return ok([]);
  }

  // Read directory entries
  let entries;
  try {
    entries = await readdir(archiveDir, { withFileTypes: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return err({ type: 'io_error', message });
  }

  // Filter to valid feature directories and collect timestamps
  const featureEntries: Array<{ featureId: string; archivedAt: Date }> = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (!isValidFeatureDir(entry.name)) continue;

    try {
      const featurePath = `${archiveDir}/${entry.name}`;
      const featureStat = await stat(featurePath);
      featureEntries.push({
        featureId: entry.name,
        archivedAt: featureStat.mtime,
      });
    } catch {
      // Skip entries we can't stat
      continue;
    }
  }

  // Sort by archivedAt descending (most recent first)
  featureEntries.sort((a, b) => b.archivedAt.getTime() - a.archivedAt.getTime());

  // Map to output format
  const result: ArchivedFeatureEntry[] = featureEntries.map((entry) => ({
    featureId: entry.featureId,
    archivedAt: formatTimestamp(entry.archivedAt),
  }));

  return ok(result);
};
