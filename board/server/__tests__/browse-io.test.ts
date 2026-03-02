/**
 * Server-side tests: Browse IO adapter (filesystem shell)
 *
 * Driving port: listDirectories, defaultPath (server IO adapter)
 * Validates: filesystem read, error mapping, composition with filterDirectoryEntries
 *
 * Integration tests — uses real temp directories for filesystem interaction.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, mkdir, writeFile, rm, chmod, symlink } from 'node:fs/promises';
import { tmpdir, homedir } from 'node:os';
import * as path from 'node:path';
import { listDirectories, defaultPath } from '../browse.js';

// =================================================================
// Acceptance: listDirectories reads real filesystem and returns filtered entries
// =================================================================
describe('listDirectories: reads filesystem and returns filtered directory entries', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(path.join(tmpdir(), 'browse-io-'));
    await mkdir(path.join(tempDir, 'alpha'));
    await mkdir(path.join(tempDir, '.hidden'));
    await mkdir(path.join(tempDir, 'zebra'));
    await writeFile(path.join(tempDir, 'readme.md'), 'hello');
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true });
  });

  it('returns sorted non-hidden directories from a valid path', async () => {
    const result = await listDirectories(tempDir);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toEqual([
        { name: 'alpha', path: path.join(tempDir, 'alpha') },
        { name: 'zebra', path: path.join(tempDir, 'zebra') },
      ]);
    }
  });

  it('succeeds even when directory contains a broken symlink', async () => {
    // Create a symlink pointing to a non-existent target (broken symlink)
    await symlink(
      path.join(tempDir, 'nonexistent-target'),
      path.join(tempDir, 'broken-link'),
    );

    const result = await listDirectories(tempDir);

    expect(result.ok).toBe(true);
    if (result.ok) {
      // Broken symlink should be silently skipped; valid dirs remain
      expect(result.value).toEqual([
        { name: 'alpha', path: path.join(tempDir, 'alpha') },
        { name: 'zebra', path: path.join(tempDir, 'zebra') },
      ]);
    }
  });

  it('returns empty array for directory with no visible subdirectories', async () => {
    const emptyDir = await mkdtemp(path.join(tmpdir(), 'browse-io-empty-'));

    try {
      const result = await listDirectories(emptyDir);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toEqual([]);
      }
    } finally {
      await rm(emptyDir, { recursive: true });
    }
  });
});

// =================================================================
// listDirectories: maps filesystem errors to BrowseError
// =================================================================
describe('listDirectories: maps filesystem errors to BrowseError', () => {
  it('returns not_found for non-existent directory', async () => {
    const result = await listDirectories('/tmp/definitely-does-not-exist-browse-io-test');

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.type).toBe('not_found');
    }
  });

  it('returns permission_denied for inaccessible directory', async () => {
    // Skip if running as root (chmod won't restrict root)
    if (process.getuid?.() === 0) return;

    const restrictedDir = await mkdtemp(path.join(tmpdir(), 'browse-io-noaccess-'));

    try {
      await chmod(restrictedDir, 0o000);
      const result = await listDirectories(restrictedDir);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('permission_denied');
      }
    } finally {
      await chmod(restrictedDir, 0o755);
      await rm(restrictedDir, { recursive: true });
    }
  });

  it('returns read_failed for a file path instead of directory', async () => {
    const tempFile = path.join(tmpdir(), 'browse-io-test-file-' + Date.now());
    await writeFile(tempFile, 'not a directory');

    try {
      const result = await listDirectories(tempFile);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('read_failed');
      }
    } finally {
      await rm(tempFile);
    }
  });
});

// =================================================================
// defaultPath: returns home directory
// =================================================================
describe('defaultPath: returns home directory value', () => {
  it('returns the same value as os.homedir()', () => {
    const result = defaultPath();

    expect(result).toBe(homedir());
  });

  it('returns an absolute path', () => {
    const result = defaultPath();

    expect(path.isAbsolute(result)).toBe(true);
  });
});
