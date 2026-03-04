/**
 * Archive IO — integration tests for filesystem operations
 *
 * Tests the IO adapter functions (moveToArchiveFs, ensureArchiveDirFs,
 * scanArchiveDirFs) against the real filesystem using temp directories.
 *
 * Port signatures:
 *   moveToArchiveFs: (sourcePath, destPath) → Result<void, ArchiveIOError>
 *   ensureArchiveDirFs: (archiveDir) → Result<void, ArchiveIOError>
 *   scanArchiveDirFs: (archiveDir) → Result<ArchivedFeatureEntry[], ArchiveIOError>
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, mkdir, writeFile, readdir, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  moveToArchiveFs,
  ensureArchiveDirFs,
  scanArchiveDirFs,
  type ArchivedFeatureEntry,
  type ArchiveIOError,
} from '../archive-io.js';

// --- Temp directory management ---

let tempDir: string;

beforeEach(async () => {
  tempDir = await mkdtemp(join(tmpdir(), 'archive-io-'));
});

afterEach(async () => {
  await rm(tempDir, { recursive: true, force: true });
});

// --- Test helpers ---

const makeFeatureDir = async (name: string): Promise<string> => {
  const featureDir = join(tempDir, 'docs/feature', name);
  await mkdir(featureDir, { recursive: true });
  await writeFile(join(featureDir, 'roadmap.yaml'), 'phases: []', 'utf-8');
  return featureDir;
};

const makeArchiveDir = async (): Promise<string> => {
  const archiveDir = join(tempDir, 'docs/archive');
  await mkdir(archiveDir, { recursive: true });
  return archiveDir;
};

const makeArchivedFeature = async (
  archiveDir: string,
  name: string,
  timestampOffset = 0,
): Promise<string> => {
  const featureDir = join(archiveDir, name);
  await mkdir(featureDir, { recursive: true });
  await writeFile(join(featureDir, 'roadmap.yaml'), 'phases: []', 'utf-8');
  // Touch files to set mtime for sorting tests
  const targetTime = new Date(Date.now() - timestampOffset);
  const { utimes } = await import('node:fs/promises');
  await utimes(featureDir, targetTime, targetTime);
  return featureDir;
};

const directoryExists = async (path: string): Promise<boolean> => {
  try {
    const stats = await stat(path);
    return stats.isDirectory();
  } catch {
    return false;
  }
};

// =================================================================
// ensureArchiveDirFs: creates archive directory if missing
// =================================================================
describe('ensureArchiveDirFs: creates archive directory if missing', () => {
  it('creates archive directory when it does not exist', async () => {
    const archiveDir = join(tempDir, 'docs/archive');

    const result = await ensureArchiveDirFs(archiveDir);

    expect(result.ok).toBe(true);
    expect(await directoryExists(archiveDir)).toBe(true);
  });

  it('succeeds when archive directory already exists', async () => {
    const archiveDir = await makeArchiveDir();

    const result = await ensureArchiveDirFs(archiveDir);

    expect(result.ok).toBe(true);
    expect(await directoryExists(archiveDir)).toBe(true);
  });

  it('creates nested parent directories if needed', async () => {
    const archiveDir = join(tempDir, 'deep/nested/docs/archive');

    const result = await ensureArchiveDirFs(archiveDir);

    expect(result.ok).toBe(true);
    expect(await directoryExists(archiveDir)).toBe(true);
  });
});

// =================================================================
// moveToArchiveFs: moves directory atomically
// =================================================================
describe('moveToArchiveFs: moves directory atomically', () => {
  it('moves feature directory to archive location', async () => {
    const sourceDir = await makeFeatureDir('auth');
    const archiveDir = await makeArchiveDir();
    const destDir = join(archiveDir, 'auth');

    const result = await moveToArchiveFs(sourceDir, destDir);

    expect(result.ok).toBe(true);
    expect(await directoryExists(sourceDir)).toBe(false);
    expect(await directoryExists(destDir)).toBe(true);
  });

  it('preserves directory contents after move', async () => {
    const sourceDir = await makeFeatureDir('billing');
    const archiveDir = await makeArchiveDir();
    const destDir = join(archiveDir, 'billing');

    await moveToArchiveFs(sourceDir, destDir);

    const entries = await readdir(destDir);
    expect(entries).toContain('roadmap.yaml');
  });

  it('returns error when source directory does not exist', async () => {
    const sourceDir = join(tempDir, 'docs/feature/nonexistent');
    const archiveDir = await makeArchiveDir();
    const destDir = join(archiveDir, 'nonexistent');

    const result = await moveToArchiveFs(sourceDir, destDir);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.type).toBe('source_not_found');
    }
  });

  it('returns error when destination already exists', async () => {
    const sourceDir = await makeFeatureDir('duplicate');
    const archiveDir = await makeArchiveDir();
    const destDir = await makeArchivedFeature(archiveDir, 'duplicate');

    const result = await moveToArchiveFs(sourceDir, destDir);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.type).toBe('destination_exists');
    }
  });

  it('creates parent directories for destination if needed', async () => {
    const sourceDir = await makeFeatureDir('new-feature');
    const destDir = join(tempDir, 'nonexistent/archive/new-feature');

    const result = await moveToArchiveFs(sourceDir, destDir);

    expect(result.ok).toBe(true);
    expect(await directoryExists(destDir)).toBe(true);
  });
});

// =================================================================
// scanArchiveDirFs: lists archived features with timestamps
// =================================================================
describe('scanArchiveDirFs: lists archived features with timestamps', () => {
  it('returns empty list when archive directory does not exist', async () => {
    const archiveDir = join(tempDir, 'docs/archive');

    const result = await scanArchiveDirFs(archiveDir);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toEqual([]);
    }
  });

  it('returns empty list when archive directory is empty', async () => {
    const archiveDir = await makeArchiveDir();

    const result = await scanArchiveDirFs(archiveDir);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toEqual([]);
    }
  });

  it('lists archived features with feature IDs', async () => {
    const archiveDir = await makeArchiveDir();
    await makeArchivedFeature(archiveDir, 'auth');
    await makeArchivedFeature(archiveDir, 'billing');

    const result = await scanArchiveDirFs(archiveDir);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toHaveLength(2);
      const ids = result.value.map((e) => e.featureId).sort();
      expect(ids).toEqual(['auth', 'billing']);
    }
  });

  it('includes archivedAt timestamp from directory mtime', async () => {
    const archiveDir = await makeArchiveDir();
    await makeArchivedFeature(archiveDir, 'auth');

    const result = await scanArchiveDirFs(archiveDir);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toHaveLength(1);
      expect(result.value[0].archivedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    }
  });

  it('skips files in archive directory (only directories)', async () => {
    const archiveDir = await makeArchiveDir();
    await makeArchivedFeature(archiveDir, 'auth');
    await writeFile(join(archiveDir, 'readme.txt'), 'not a feature', 'utf-8');

    const result = await scanArchiveDirFs(archiveDir);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toHaveLength(1);
      expect(result.value[0].featureId).toBe('auth');
    }
  });

  it('skips hidden directories', async () => {
    const archiveDir = await makeArchiveDir();
    await makeArchivedFeature(archiveDir, 'auth');
    await makeArchivedFeature(archiveDir, '.hidden');

    const result = await scanArchiveDirFs(archiveDir);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toHaveLength(1);
      expect(result.value[0].featureId).toBe('auth');
    }
  });

  it('skips invalid feature ID slugs', async () => {
    const archiveDir = await makeArchiveDir();
    await makeArchivedFeature(archiveDir, 'valid-feature');
    await makeArchivedFeature(archiveDir, 'UPPERCASE');
    await makeArchivedFeature(archiveDir, '-leading-hyphen');

    const result = await scanArchiveDirFs(archiveDir);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toHaveLength(1);
      expect(result.value[0].featureId).toBe('valid-feature');
    }
  });

  it('returns features sorted by archivedAt descending (most recent first)', async () => {
    const archiveDir = await makeArchiveDir();
    // Create with different timestamps: auth is oldest, billing is newest
    await makeArchivedFeature(archiveDir, 'auth', 3000);
    await makeArchivedFeature(archiveDir, 'billing', 1000);
    await makeArchivedFeature(archiveDir, 'payments', 2000);

    const result = await scanArchiveDirFs(archiveDir);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toHaveLength(3);
      // Most recent first: billing (1000ms ago), payments (2000ms ago), auth (3000ms ago)
      expect(result.value[0].featureId).toBe('billing');
      expect(result.value[1].featureId).toBe('payments');
      expect(result.value[2].featureId).toBe('auth');
    }
  });
});
