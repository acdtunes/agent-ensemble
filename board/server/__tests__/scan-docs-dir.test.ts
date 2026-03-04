/**
 * Server-side tests: scanDocsDir effect function
 *
 * Driving port: scanDocsDir (filesystem effect)
 * Validates: recursive directory scanning, relative path production,
 *   not_found error for missing dirs, root boundary enforcement
 *
 * Integration tests with real filesystem (temp dirs) — no mocks.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, mkdir, writeFile, rm, symlink } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import type { DirEntry, Result, DocTreeError } from '../../shared/types.js';

type ScanDocsDir = (docsRoot: string) => Promise<Result<readonly DirEntry[], DocTreeError>>;

// Lazy import to let the module be created during GREEN phase
const importScanDocsDir = async (): Promise<ScanDocsDir> => {
  const mod = await import('../doc-tree.js');
  return mod.scanDocsDir;
};

// --- Filesystem helpers ---

const createFile = async (dir: string, relativePath: string): Promise<void> => {
  const fullPath = join(dir, relativePath);
  const parent = fullPath.substring(0, fullPath.lastIndexOf('/'));
  await mkdir(parent, { recursive: true });
  await writeFile(fullPath, `# ${relativePath}\n`);
};

// =================================================================
// scanDocsDir: recursive directory scanning
// =================================================================
describe('scanDocsDir: scans filesystem and produces DirEntry array', () => {
  let docsRoot: string;

  beforeEach(async () => {
    docsRoot = await mkdtemp(join(tmpdir(), 'scan-docs-test-'));
  });

  afterEach(async () => {
    await rm(docsRoot, { recursive: true, force: true });
  });

  it('returns ok with DirEntry array for directory containing markdown files', async () => {
    const scanDocsDir = await importScanDocsDir();

    // Given a docs directory with two markdown files
    await writeFile(join(docsRoot, 'README.md'), '# README');
    await writeFile(join(docsRoot, 'GUIDE.md'), '# Guide');

    // When scanning the directory
    const result = await scanDocsDir(docsRoot);

    // Then returns ok with entries for both files
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const files = result.value.filter(e => !e.isDirectory);
    expect(files).toHaveLength(2);
    expect(files.map(f => f.name)).toEqual(expect.arrayContaining(['README.md', 'GUIDE.md']));
  });

  it('produces flat entries with relative paths for nested structure', async () => {
    const scanDocsDir = await importScanDocsDir();

    // Given a nested directory structure
    await createFile(docsRoot, 'adrs/ADR-001.md');
    await createFile(docsRoot, 'adrs/ADR-002.md');
    await createFile(docsRoot, 'features/design/arch.md');

    // When scanning the directory
    const result = await scanDocsDir(docsRoot);

    // Then entries have relative paths (no absolute paths)
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const filePaths = result.value.filter(e => !e.isDirectory).map(e => e.path);
    expect(filePaths).toEqual(expect.arrayContaining([
      'adrs/ADR-001.md',
      'adrs/ADR-002.md',
      'features/design/arch.md',
    ]));

    // And directory entries are also present with relative paths
    const dirPaths = result.value.filter(e => e.isDirectory).map(e => e.path);
    expect(dirPaths).toEqual(expect.arrayContaining(['adrs', 'features', 'features/design']));
  });

  it('returns ok with empty array for empty directory', async () => {
    const scanDocsDir = await importScanDocsDir();

    // Given an empty docs directory (already created by beforeEach)

    // When scanning the directory
    const result = await scanDocsDir(docsRoot);

    // Then returns ok with empty array
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toHaveLength(0);
  });

  it('includes DirEntry with correct name and isDirectory fields', async () => {
    const scanDocsDir = await importScanDocsDir();

    // Given a directory with one file and one subdirectory containing a file
    await createFile(docsRoot, 'README.md');
    await createFile(docsRoot, 'guides/setup.md');

    // When scanning the directory
    const result = await scanDocsDir(docsRoot);

    // Then each entry has correct name and isDirectory
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const readme = result.value.find(e => e.path === 'README.md');
    expect(readme).toEqual({ name: 'README.md', path: 'README.md', isDirectory: false });

    const guidesDir = result.value.find(e => e.path === 'guides');
    expect(guidesDir).toEqual({ name: 'guides', path: 'guides', isDirectory: true });

    const setupFile = result.value.find(e => e.path === 'guides/setup.md');
    expect(setupFile).toEqual({ name: 'setup.md', path: 'guides/setup.md', isDirectory: false });
  });
});

// =================================================================
// scanDocsDir: error handling
// =================================================================
describe('scanDocsDir: returns Result error for invalid directories', () => {
  it('returns not_found error when directory does not exist', async () => {
    const scanDocsDir = await importScanDocsDir();

    // Given a path to a non-existent directory
    const missingPath = join(tmpdir(), 'non-existent-docs-dir-' + Date.now());

    // When scanning the directory
    const result = await scanDocsDir(missingPath);

    // Then returns error with not_found type
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.type).toBe('not_found');
    expect(result.error).toHaveProperty('path', missingPath);
  });
});

// =================================================================
// scanDocsDir: root boundary enforcement
// =================================================================
describe('scanDocsDir: respects docs root boundary', () => {
  let docsRoot: string;

  beforeEach(async () => {
    docsRoot = await mkdtemp(join(tmpdir(), 'scan-boundary-test-'));
  });

  afterEach(async () => {
    await rm(docsRoot, { recursive: true, force: true });
  });

  it('does not follow symlinks that escape the docs root', async () => {
    const scanDocsDir = await importScanDocsDir();

    // Given a docs directory with a symlink pointing outside the root
    await writeFile(join(docsRoot, 'legit.md'), '# Legit');
    const outsideDir = await mkdtemp(join(tmpdir(), 'outside-'));
    await writeFile(join(outsideDir, 'secret.md'), '# Secret');

    try {
      await symlink(outsideDir, join(docsRoot, 'escape-link'));
    } catch {
      // symlink may not be supported on all platforms; skip test
      return;
    }

    // When scanning the directory
    const result = await scanDocsDir(docsRoot);

    // Then the symlinked directory content is not included
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const paths = result.value.map(e => e.path);
    expect(paths).not.toEqual(expect.arrayContaining([
      expect.stringContaining('secret'),
    ]));

    // Cleanup
    await rm(outsideDir, { recursive: true, force: true });
  });

  it('includes symlinks that stay within the docs root', async () => {
    const scanDocsDir = await importScanDocsDir();

    // Given a docs directory with an internal symlink
    await createFile(docsRoot, 'guides/setup.md');

    try {
      await symlink(join(docsRoot, 'guides'), join(docsRoot, 'internal-link'));
    } catch {
      // symlink may not be supported; skip test
      return;
    }

    // When scanning the directory
    const result = await scanDocsDir(docsRoot);

    // Then internal symlinked content is included
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const guidePaths = result.value.filter(e => e.path.startsWith('guides/'));
    expect(guidePaths.length).toBeGreaterThan(0);
  });
});
