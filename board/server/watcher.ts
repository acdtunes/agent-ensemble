import { watch } from 'chokidar';
import { readFile } from 'node:fs/promises';

export interface FileWatcher {
  readonly ready: Promise<void>;
  readonly close: () => Promise<void>;
}

export type OnChangeCallback = (content: string) => void;

const DEBOUNCE_MS = 100;

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
