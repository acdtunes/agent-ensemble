import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createFileWatcher } from '../watcher.js';

describe('createFileWatcher', () => {
  let tempDir: string;
  let filePath: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'watcher-test-'));
    filePath = join(tempDir, 'state.yaml');
    await writeFile(filePath, 'initial: true');
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('should emit change event when file is modified', async () => {
    const changes: string[] = [];
    const watcher = createFileWatcher(filePath, (content) => {
      changes.push(content);
    });

    // Wait for watcher to be ready
    await watcher.ready;

    // Modify the file
    await writeFile(filePath, 'updated: true');

    // Wait for debounce + processing
    await delay(300);

    await watcher.close();

    expect(changes.length).toBeGreaterThanOrEqual(1);
    expect(changes[changes.length - 1]).toBe('updated: true');
  });

  it('should emit change event within 200ms of file modification', async () => {
    let changeTimestamp: number | null = null;
    const watcher = createFileWatcher(filePath, () => {
      changeTimestamp = Date.now();
    });

    await watcher.ready;

    const writeTimestamp = Date.now();
    await writeFile(filePath, 'timing: test');

    // Wait for the event to fire
    await delay(300);

    await watcher.close();

    expect(changeTimestamp).not.toBeNull();
    const elapsed = changeTimestamp! - writeTimestamp;
    expect(elapsed).toBeLessThan(200);
  });

  it('should debounce rapid successive writes into single event', async () => {
    const changes: string[] = [];
    const watcher = createFileWatcher(filePath, (content) => {
      changes.push(content);
    });

    await watcher.ready;

    // Rapid successive writes (faster than debounce window)
    await writeFile(filePath, 'write-1');
    await delay(20);
    await writeFile(filePath, 'write-2');
    await delay(20);
    await writeFile(filePath, 'write-3');

    // Wait for debounce to settle
    await delay(300);

    await watcher.close();

    // Debounce should collapse rapid writes — at most 2 events
    // (the first write may trigger before debounce kicks in, plus the final settled write)
    expect(changes.length).toBeLessThanOrEqual(2);
    // The last received content should be the final write
    expect(changes[changes.length - 1]).toBe('write-3');
  });

  it('should clean up watcher resources on close', async () => {
    const changes: string[] = [];
    const watcher = createFileWatcher(filePath, (content) => {
      changes.push(content);
    });
    await watcher.ready;

    // Verify the callback works before closing
    await writeFile(filePath, 'before-close');
    await delay(300);
    expect(changes.length).toBeGreaterThanOrEqual(1);

    const countBeforeClose = changes.length;
    await watcher.close();

    // After close, writing should not trigger callbacks
    await writeFile(filePath, 'after-close');
    await delay(300);

    expect(changes.length).toBe(countBeforeClose);
  });
});

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
