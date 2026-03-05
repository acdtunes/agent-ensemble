/**
 * Roadmap watcher — integration tests for multi-location roadmap file watching.
 *
 * Tests the createRoadmapWatcher function which watches:
 * - deliver/roadmap.json (highest priority)
 * - roadmap.json
 * - roadmap.yaml (lowest priority)
 *
 * Events include the detected format (json/yaml).
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, writeFile, rm, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import type { RoadmapFormat } from '../../shared/types.js';
import { createRoadmapWatcher, type RoadmapChangeEvent } from '../watcher.js';

const delay = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

describe('createRoadmapWatcher', () => {
  let featureDir: string;

  beforeEach(async () => {
    featureDir = await mkdtemp(join(tmpdir(), 'roadmap-watcher-test-'));
  });

  afterEach(async () => {
    await rm(featureDir, { recursive: true, force: true });
  });

  // =================================================================
  // Acceptance: Watcher detects changes in all roadmap file locations
  // =================================================================
  describe('multi-location watching', () => {
    it('should emit change event with format when roadmap.yaml is modified', async () => {
      // Setup: create initial roadmap.yaml
      await writeFile(join(featureDir, 'roadmap.yaml'), 'phases: []');

      const events: RoadmapChangeEvent[] = [];
      const watcher = createRoadmapWatcher(featureDir, (event) => {
        events.push(event);
      });

      await watcher.ready;

      // Modify the file
      await writeFile(join(featureDir, 'roadmap.yaml'), 'phases: []\nupdated: true');

      await delay(300);
      await watcher.close();

      expect(events.length).toBeGreaterThanOrEqual(1);
      expect(events[events.length - 1].format).toBe('yaml');
      expect(events[events.length - 1].content).toContain('updated: true');
    });

    it('should emit change event with format when roadmap.json is modified', async () => {
      // Setup: create initial roadmap.json
      await writeFile(join(featureDir, 'roadmap.json'), '{"phases":[]}');

      const events: RoadmapChangeEvent[] = [];
      const watcher = createRoadmapWatcher(featureDir, (event) => {
        events.push(event);
      });

      await watcher.ready;

      // Modify the file
      await writeFile(join(featureDir, 'roadmap.json'), '{"phases":[],"updated":true}');

      await delay(300);
      await watcher.close();

      expect(events.length).toBeGreaterThanOrEqual(1);
      expect(events[events.length - 1].format).toBe('json');
      expect(events[events.length - 1].content).toContain('"updated":true');
    });

    it('should emit change event with format when deliver/roadmap.json is modified', async () => {
      // Setup: create deliver directory and roadmap.json
      const deliverDir = join(featureDir, 'deliver');
      await mkdir(deliverDir, { recursive: true });
      await writeFile(join(deliverDir, 'roadmap.json'), '{"phases":[]}');

      const events: RoadmapChangeEvent[] = [];
      const watcher = createRoadmapWatcher(featureDir, (event) => {
        events.push(event);
      });

      await watcher.ready;

      // Modify the file
      await writeFile(join(deliverDir, 'roadmap.json'), '{"phases":[],"updated":true}');

      await delay(300);
      await watcher.close();

      expect(events.length).toBeGreaterThanOrEqual(1);
      expect(events[events.length - 1].format).toBe('json');
      expect(events[events.length - 1].content).toContain('"updated":true');
    });
  });

  // =================================================================
  // Behavior: Watcher handles files that don't exist initially
  // =================================================================
  describe('file creation handling', () => {
    it('should emit change event when roadmap file is created after watcher starts', async () => {
      const events: RoadmapChangeEvent[] = [];
      const watcher = createRoadmapWatcher(featureDir, (event) => {
        events.push(event);
      });

      await watcher.ready;

      // Create the file after watcher is ready
      await writeFile(join(featureDir, 'roadmap.yaml'), 'phases: []');

      await delay(300);
      await watcher.close();

      expect(events.length).toBeGreaterThanOrEqual(1);
      expect(events[events.length - 1].format).toBe('yaml');
    });
  });

  // =================================================================
  // Behavior: Watcher debounces rapid changes
  // =================================================================
  describe('debouncing', () => {
    it('should debounce rapid successive writes', async () => {
      await writeFile(join(featureDir, 'roadmap.yaml'), 'initial: true');

      const events: RoadmapChangeEvent[] = [];
      const watcher = createRoadmapWatcher(featureDir, (event) => {
        events.push(event);
      });

      await watcher.ready;

      // Rapid writes
      await writeFile(join(featureDir, 'roadmap.yaml'), 'write-1');
      await delay(20);
      await writeFile(join(featureDir, 'roadmap.yaml'), 'write-2');
      await delay(20);
      await writeFile(join(featureDir, 'roadmap.yaml'), 'write-3');

      await delay(300);
      await watcher.close();

      // Should collapse rapid writes
      expect(events.length).toBeLessThanOrEqual(2);
      expect(events[events.length - 1].content).toBe('write-3');
    });
  });

  // =================================================================
  // Behavior: Clean resource cleanup
  // =================================================================
  describe('cleanup', () => {
    it('should clean up watcher resources on close', async () => {
      await writeFile(join(featureDir, 'roadmap.yaml'), 'initial: true');

      const events: RoadmapChangeEvent[] = [];
      const watcher = createRoadmapWatcher(featureDir, (event) => {
        events.push(event);
      });

      await watcher.ready;

      await writeFile(join(featureDir, 'roadmap.yaml'), 'before-close');
      await delay(300);
      expect(events.length).toBeGreaterThanOrEqual(1);

      const countBeforeClose = events.length;
      await watcher.close();

      // After close, writing should not trigger callbacks
      await writeFile(join(featureDir, 'roadmap.yaml'), 'after-close');
      await delay(300);

      expect(events.length).toBe(countBeforeClose);
    });
  });
});
