/**
 * Directory watcher — integration tests
 *
 * Tests the IO adapter function (createDirectoryWatcher) against the real
 * filesystem using temp directories.
 *
 * Watches docs/feature/, docs/ux/, docs/requirements/ for subdirectory changes.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createDirectoryWatcher, type DirectoryChangeEvent } from '../directory-watcher.js';

const delay = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

describe('createDirectoryWatcher', () => {
  let projectPath: string;

  beforeEach(async () => {
    projectPath = await mkdtemp(join(tmpdir(), 'dir-watcher-test-'));
    // Create the scan directories
    await mkdir(join(projectPath, 'docs/feature'), { recursive: true });
    await mkdir(join(projectPath, 'docs/ux'), { recursive: true });
    await mkdir(join(projectPath, 'docs/requirements'), { recursive: true });
  });

  afterEach(async () => {
    await rm(projectPath, { recursive: true, force: true });
  });

  it('should emit addDir event when a new feature directory is created', async () => {
    const events: DirectoryChangeEvent[] = [];
    const watcher = createDirectoryWatcher(projectPath, (event) => {
      events.push(event);
    });

    await watcher.ready;

    // Create a new feature directory
    await mkdir(join(projectPath, 'docs/feature/auth'));

    // Wait for debounce + processing
    await delay(400);

    await watcher.close();

    expect(events.length).toBeGreaterThanOrEqual(1);
    const addEvents = events.filter((e) => e.type === 'addDir');
    expect(addEvents.some((e) => e.name === 'auth')).toBe(true);
  });

  it('should emit unlinkDir event when a feature directory is deleted', async () => {
    // Create a directory first
    await mkdir(join(projectPath, 'docs/feature/to-delete'));

    const events: DirectoryChangeEvent[] = [];
    const watcher = createDirectoryWatcher(projectPath, (event) => {
      events.push(event);
    });

    await watcher.ready;

    // Delete the directory
    await rm(join(projectPath, 'docs/feature/to-delete'), { recursive: true });

    // Wait for debounce + processing
    await delay(400);

    await watcher.close();

    expect(events.length).toBeGreaterThanOrEqual(1);
    const unlinkEvents = events.filter((e) => e.type === 'unlinkDir');
    expect(unlinkEvents.some((e) => e.name === 'to-delete')).toBe(true);
  });

  it('should debounce rapid directory changes', async () => {
    const events: DirectoryChangeEvent[] = [];
    const watcher = createDirectoryWatcher(projectPath, (event) => {
      events.push(event);
    });

    await watcher.ready;

    // Rapid directory creations
    await mkdir(join(projectPath, 'docs/feature/feature-1'));
    await delay(20);
    await mkdir(join(projectPath, 'docs/feature/feature-2'));
    await delay(20);
    await mkdir(join(projectPath, 'docs/feature/feature-3'));

    // Wait for debounce to settle
    await delay(500);

    await watcher.close();

    // All three should be captured (debounce batches events, doesn't drop them)
    const addEvents = events.filter((e) => e.type === 'addDir');
    const names = addEvents.map((e) => e.name).sort();
    expect(names).toContain('feature-1');
    expect(names).toContain('feature-2');
    expect(names).toContain('feature-3');
  });

  it('should watch all three scan directories', async () => {
    const events: DirectoryChangeEvent[] = [];
    const watcher = createDirectoryWatcher(projectPath, (event) => {
      events.push(event);
    });

    await watcher.ready;

    // Create directories in each scan location
    await mkdir(join(projectPath, 'docs/feature/from-feature'));
    await mkdir(join(projectPath, 'docs/ux/from-ux'));
    await mkdir(join(projectPath, 'docs/requirements/from-requirements'));

    // Wait for debounce + processing
    await delay(500);

    await watcher.close();

    const addEvents = events.filter((e) => e.type === 'addDir');
    const names = addEvents.map((e) => e.name).sort();
    expect(names).toContain('from-feature');
    expect(names).toContain('from-ux');
    expect(names).toContain('from-requirements');
  });

  it('should only detect immediate subdirectories (depth 1)', async () => {
    const events: DirectoryChangeEvent[] = [];
    const watcher = createDirectoryWatcher(projectPath, (event) => {
      events.push(event);
    });

    await watcher.ready;

    // Create a feature directory with nested subdirectories
    await mkdir(join(projectPath, 'docs/feature/auth'));
    await delay(400); // Increased to ensure watcher captures auth before nested
    await mkdir(join(projectPath, 'docs/feature/auth/nested'));

    // Wait for processing
    await delay(400);

    await watcher.close();

    const addEvents = events.filter((e) => e.type === 'addDir');
    const names = addEvents.map((e) => e.name);
    expect(names).toContain('auth');
    // 'nested' should not be detected as a feature directory
    expect(names).not.toContain('nested');
  });

  it('should filter out invalid feature directory names', async () => {
    const events: DirectoryChangeEvent[] = [];
    const watcher = createDirectoryWatcher(projectPath, (event) => {
      events.push(event);
    });

    await watcher.ready;

    // Create valid and invalid directories
    await mkdir(join(projectPath, 'docs/feature/valid-feature'));
    await mkdir(join(projectPath, 'docs/feature/.hidden'));
    await mkdir(join(projectPath, 'docs/feature/UPPERCASE'));

    // Wait for processing
    await delay(400);

    await watcher.close();

    const addEvents = events.filter((e) => e.type === 'addDir');
    const names = addEvents.map((e) => e.name);
    expect(names).toContain('valid-feature');
    expect(names).not.toContain('.hidden');
    expect(names).not.toContain('UPPERCASE');
  });

  it('should clean up watcher resources on close', async () => {
    const events: DirectoryChangeEvent[] = [];
    const watcher = createDirectoryWatcher(projectPath, (event) => {
      events.push(event);
    });

    await watcher.ready;

    // Verify callback works before closing
    await mkdir(join(projectPath, 'docs/feature/before-close'));
    await delay(400);
    expect(events.length).toBeGreaterThanOrEqual(1);

    const countBeforeClose = events.length;
    await watcher.close();

    // After close, creating directories should not trigger callbacks
    await mkdir(join(projectPath, 'docs/feature/after-close'));
    await delay(400);

    expect(events.length).toBe(countBeforeClose);
  });

  it('should handle missing scan directories gracefully', async () => {
    // Remove one of the scan directories
    await rm(join(projectPath, 'docs/ux'), { recursive: true });

    const events: DirectoryChangeEvent[] = [];
    const watcher = createDirectoryWatcher(projectPath, (event) => {
      events.push(event);
    });

    await watcher.ready;

    // Should still work for existing directories
    await mkdir(join(projectPath, 'docs/feature/works'));

    await delay(400);

    await watcher.close();

    const addEvents = events.filter((e) => e.type === 'addDir');
    expect(addEvents.some((e) => e.name === 'works')).toBe(true);
  });
});
