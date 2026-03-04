/**
 * Directory watcher — watches feature directories for changes.
 *
 * Pure core:
 *   isValidFeatureDirectory: validates directory name as valid feature slug
 *   extractDirectoryName: extracts directory name from path
 *
 * IO adapter:
 *   createDirectoryWatcher: watches SCAN_DIRS for subdirectory add/remove
 */

import { watch, type FSWatcher } from 'chokidar';
import { join, basename, dirname } from 'node:path';
import { isFeatureDir } from './feature-discovery.js';

// =====================================================================
// Types
// =====================================================================

export type DirectoryChangeType = 'addDir' | 'unlinkDir';

export interface DirectoryChangeEvent {
  readonly type: DirectoryChangeType;
  readonly name: string;
  readonly path: string;
  readonly scanDir: string;
}

export interface DirectoryWatcher {
  readonly ready: Promise<void>;
  readonly close: () => Promise<void>;
}

export type OnDirectoryChangeCallback = (event: DirectoryChangeEvent) => void;

// =====================================================================
// Pure Core
// =====================================================================

const SCAN_DIRS = ['docs/feature', 'docs/ux', 'docs/requirements'] as const;

const DEBOUNCE_MS = 200;

/**
 * Checks if a path represents an immediate subdirectory of a scan directory.
 * Returns the scan directory if valid, null otherwise.
 */
const getParentScanDir = (
  projectPath: string,
  changedPath: string,
): string | null => {
  for (const scanDir of SCAN_DIRS) {
    const scanDirPath = join(projectPath, scanDir);
    const parentDir = dirname(changedPath);
    if (parentDir === scanDirPath) {
      return scanDir;
    }
  }
  return null;
};

/**
 * Creates a directory change event from a raw chokidar event.
 * Returns null if the path is not a valid feature directory.
 */
const createDirectoryChangeEvent = (
  projectPath: string,
  changedPath: string,
  type: DirectoryChangeType,
): DirectoryChangeEvent | null => {
  const scanDir = getParentScanDir(projectPath, changedPath);
  if (scanDir === null) return null;

  const name = basename(changedPath);
  if (!isFeatureDir(name)) return null;

  return {
    type,
    name,
    path: changedPath,
    scanDir,
  };
};

// =====================================================================
// IO Adapter
// =====================================================================

export const createDirectoryWatcher = (
  projectPath: string,
  onChange: OnDirectoryChangeCallback,
): DirectoryWatcher => {
  const watchers: FSWatcher[] = [];
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  let pendingEvents: DirectoryChangeEvent[] = [];

  const flushEvents = (): void => {
    if (pendingEvents.length === 0) return;

    // Deduplicate events by path + type
    const seen = new Set<string>();
    const uniqueEvents = pendingEvents.filter((event) => {
      const key = `${event.type}:${event.path}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    pendingEvents = [];

    for (const event of uniqueEvents) {
      onChange(event);
    }
  };

  const scheduleFlush = (): void => {
    if (debounceTimer !== null) {
      clearTimeout(debounceTimer);
    }
    debounceTimer = setTimeout(() => {
      debounceTimer = null;
      flushEvents();
    }, DEBOUNCE_MS);
  };

  const handleEvent = (changedPath: string, type: DirectoryChangeType): void => {
    const event = createDirectoryChangeEvent(projectPath, changedPath, type);
    if (event !== null) {
      pendingEvents.push(event);
      scheduleFlush();
    }
  };

  // Watch each scan directory
  const watchPromises: Promise<void>[] = [];

  for (const scanDir of SCAN_DIRS) {
    const scanDirPath = join(projectPath, scanDir);

    const watcher = watch(scanDirPath, {
      persistent: true,
      ignoreInitial: true,
      depth: 0, // Only watch immediate children
      awaitWriteFinish: false,
    });

    watcher.on('addDir', (path) => handleEvent(path, 'addDir'));
    watcher.on('unlinkDir', (path) => handleEvent(path, 'unlinkDir'));

    const readyPromise = new Promise<void>((resolve) => {
      watcher.on('ready', resolve);
      // Also resolve on error to avoid hanging if directory doesn't exist
      watcher.on('error', () => resolve());
    });

    watchPromises.push(readyPromise);
    watchers.push(watcher);
  }

  const ready = Promise.all(watchPromises).then(() => {});

  const close = async (): Promise<void> => {
    if (debounceTimer !== null) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }
    pendingEvents = [];
    await Promise.all(watchers.map((watcher) => watcher.close()));
  };

  return { ready, close };
};
