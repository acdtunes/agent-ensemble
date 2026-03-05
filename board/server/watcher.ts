import { watch, type FSWatcher } from 'chokidar';
import { readFile } from 'node:fs/promises';
import { join, basename, dirname } from 'node:path';
import type { RoadmapFormat } from '../shared/types.js';

export interface FileWatcher {
  readonly ready: Promise<void>;
  readonly close: () => Promise<void>;
}

export type OnChangeCallback = (content: string) => void;

// =====================================================================
// Roadmap watcher types — multi-location watching with format detection
// =====================================================================

export interface RoadmapChangeEvent {
  readonly content: string;
  readonly format: RoadmapFormat;
  readonly path: string;
}

export type OnRoadmapChangeCallback = (event: RoadmapChangeEvent) => void;

export interface RoadmapWatcher {
  readonly ready: Promise<void>;
  readonly close: () => Promise<void>;
}

// =====================================================================
// Constants
// =====================================================================

const DEBOUNCE_MS = 100;

// Roadmap file patterns with format detection (v2.0.0 priority order)
const ROADMAP_PATTERNS: readonly { readonly relativePath: string; readonly format: RoadmapFormat }[] = [
  { relativePath: 'deliver/roadmap.json', format: 'json' },
  { relativePath: 'roadmap.json', format: 'json' },
  { relativePath: 'roadmap.yaml', format: 'yaml' },
];

export const createFileWatcher = (
  filePath: string,
  onChange: OnChangeCallback,
): FileWatcher => {
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;

  const handleChange = (): void => {
    if (debounceTimer !== null) {
      clearTimeout(debounceTimer);
    }

    debounceTimer = setTimeout(async () => {
      debounceTimer = null;
      try {
        const content = await readFile(filePath, 'utf-8');
        onChange(content);
      } catch {
        // File may be mid-write or deleted — skip this event
      }
    }, DEBOUNCE_MS);
  };

  const watcher = watch(filePath, {
    persistent: true,
    awaitWriteFinish: false,
    ignoreInitial: true,
  });

  watcher.on('change', handleChange);

  const ready = new Promise<void>((resolve) => {
    watcher.on('ready', resolve);
  });

  const close = async (): Promise<void> => {
    if (debounceTimer !== null) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }
    await watcher.close();
  };

  return { ready, close };
};

// =====================================================================
// Multi-location roadmap watcher — watches all roadmap file locations
// =====================================================================

const detectFormatFromPath = (filePath: string): RoadmapFormat => {
  const fileName = basename(filePath);
  return fileName.endsWith('.json') ? 'json' : 'yaml';
};

const isRoadmapFile = (filePath: string, featureDir: string): boolean => {
  for (const pattern of ROADMAP_PATTERNS) {
    const expectedPath = join(featureDir, pattern.relativePath);
    if (filePath === expectedPath) return true;
  }
  return false;
};

export const createRoadmapWatcher = (
  featureDir: string,
  onChange: OnRoadmapChangeCallback,
): RoadmapWatcher => {
  const watchers: FSWatcher[] = [];
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  let pendingPath: string | null = null;

  const handleChange = (changedPath: string): void => {
    if (!isRoadmapFile(changedPath, featureDir)) return;

    pendingPath = changedPath;

    if (debounceTimer !== null) {
      clearTimeout(debounceTimer);
    }

    debounceTimer = setTimeout(async () => {
      debounceTimer = null;
      const pathToRead = pendingPath;
      pendingPath = null;

      if (pathToRead === null) return;

      try {
        const content = await readFile(pathToRead, 'utf-8');
        const format = detectFormatFromPath(pathToRead);
        onChange({ content, format, path: pathToRead });
      } catch {
        // File may be mid-write or deleted — skip this event
      }
    }, DEBOUNCE_MS);
  };

  // Watch the feature directory for any changes (shallow depth for deliver/)
  const mainWatcher = watch(featureDir, {
    persistent: true,
    awaitWriteFinish: false,
    ignoreInitial: true,
    depth: 1, // Watch immediate children and deliver/ subdirectory
  });

  mainWatcher.on('change', handleChange);
  mainWatcher.on('add', handleChange);

  watchers.push(mainWatcher);

  const ready = new Promise<void>((resolve) => {
    mainWatcher.on('ready', resolve);
  });

  const close = async (): Promise<void> => {
    if (debounceTimer !== null) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }
    pendingPath = null;
    await Promise.all(watchers.map((w) => w.close()));
  };

  return { ready, close };
};
