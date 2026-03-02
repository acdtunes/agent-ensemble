/**
 * Manifest Store IO — integration tests
 *
 * Tests the IO adapter functions (loadManifest, saveManifest, ensureManifestDir)
 * against the real filesystem using temp directories for isolation.
 *
 * These are adapter/integration tests — no mocks, real I/O.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, readFile, writeFile, stat, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { ProjectManifest, ProjectId } from '../../shared/types.js';
import { createProjectId, createFeatureId } from '../../shared/types.js';
import {
  loadManifest,
  saveManifest,
  ensureManifestDir,
  emptyManifest,
} from '../manifest-store.js';

// --- Test helpers ---

const makeProjectId = (raw: string): ProjectId => {
  const result = createProjectId(raw);
  if (!result.ok) throw new Error(`Invalid test project ID: ${raw}`);
  return result.value;
};

const PROJECT_ID = makeProjectId('test-project');

const makeValidManifest = (): ProjectManifest => {
  const featureId = createFeatureId('auth');
  if (!featureId.ok) throw new Error('Invalid test feature ID');
  return {
    projectId: PROJECT_ID,
    features: [{
      featureId: featureId.value,
      name: 'Authentication',
      roadmapPath: 'docs/feature/auth/roadmap.yaml',
      executionLogPath: 'docs/feature/auth/execution-log.yaml',
      docsRoot: 'docs/feature/auth',
    }],
  };
};

// --- Temp directory management ---

let tempDir: string;

beforeEach(async () => {
  tempDir = await mkdtemp(join(tmpdir(), 'manifest-io-'));
});

afterEach(async () => {
  await rm(tempDir, { recursive: true, force: true });
});

// =================================================================
// Acceptance: full IO lifecycle (ensure dir → save → load → verify)
// =================================================================
describe('Manifest IO: full lifecycle (ensure dir → save → load → verify)', () => {
  it('creates directory, saves manifest, loads and validates it', async () => {
    const manifestDir = join(tempDir, '.nwave');
    const manifestPath = join(manifestDir, 'manifest.json');
    const manifest = makeValidManifest();

    // Given the manifest directory does not exist yet
    // When we ensure the directory
    const dirResult = await ensureManifestDir(manifestDir);
    expect(dirResult.ok).toBe(true);

    // And save a manifest
    const saveResult = await saveManifest(manifestPath, manifest);
    expect(saveResult.ok).toBe(true);

    // Then loading it returns the same data
    const loadResult = await loadManifest(manifestPath, PROJECT_ID);
    expect(loadResult.ok).toBe(true);
    if (!loadResult.ok) return;
    expect(loadResult.value.projectId).toBe(PROJECT_ID);
    expect(loadResult.value.features).toHaveLength(1);
    expect(loadResult.value.features[0].name).toBe('Authentication');
  });

  it('returns empty manifest when file does not exist (first-use)', async () => {
    const manifestPath = join(tempDir, 'nonexistent', 'manifest.json');

    const result = await loadManifest(manifestPath, PROJECT_ID);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.projectId).toBe(PROJECT_ID);
    expect(result.value.features).toHaveLength(0);
  });
});

// =================================================================
// ensureManifestDir: creates directory if missing
// =================================================================
describe('ensureManifestDir: creates directory if missing', () => {
  it('creates a new directory', async () => {
    const dirPath = join(tempDir, 'new-dir');

    const result = await ensureManifestDir(dirPath);

    expect(result.ok).toBe(true);
    const stats = await stat(dirPath);
    expect(stats.isDirectory()).toBe(true);
  });

  it('succeeds when directory already exists (idempotent)', async () => {
    const dirPath = join(tempDir, 'existing-dir');
    await mkdir(dirPath);

    const result = await ensureManifestDir(dirPath);

    expect(result.ok).toBe(true);
    const stats = await stat(dirPath);
    expect(stats.isDirectory()).toBe(true);
  });

  it('creates nested directories', async () => {
    const dirPath = join(tempDir, 'a', 'b', 'c');

    const result = await ensureManifestDir(dirPath);

    expect(result.ok).toBe(true);
    const stats = await stat(dirPath);
    expect(stats.isDirectory()).toBe(true);
  });
});

// =================================================================
// loadManifest: reads and validates JSON from disk
// =================================================================
describe('loadManifest: reads and validates JSON from disk', () => {
  it('loads a valid manifest file', async () => {
    const manifest = makeValidManifest();
    const filePath = join(tempDir, 'manifest.json');
    await writeFile(filePath, JSON.stringify(manifest), 'utf-8');

    const result = await loadManifest(filePath, PROJECT_ID);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.projectId).toBe(PROJECT_ID);
    expect(result.value.features).toHaveLength(1);
  });

  it('returns empty manifest when file does not exist', async () => {
    const filePath = join(tempDir, 'missing.json');

    const result = await loadManifest(filePath, PROJECT_ID);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toEqual(emptyManifest(PROJECT_ID));
  });

  it('returns io_error for invalid JSON', async () => {
    const filePath = join(tempDir, 'bad.json');
    await writeFile(filePath, '{ not valid json }}}', 'utf-8');

    const result = await loadManifest(filePath, PROJECT_ID);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.type).toBe('io_error');
  });

  it('returns invalid_manifest for valid JSON but invalid schema', async () => {
    const filePath = join(tempDir, 'bad-schema.json');
    await writeFile(filePath, JSON.stringify({ wrong: 'shape' }), 'utf-8');

    const result = await loadManifest(filePath, PROJECT_ID);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.type).toBe('invalid_manifest');
  });
});

// =================================================================
// saveManifest: writes manifest atomically
// =================================================================
describe('saveManifest: writes manifest atomically', () => {
  it('writes valid JSON to disk', async () => {
    const manifest = makeValidManifest();
    const filePath = join(tempDir, 'manifest.json');

    const result = await saveManifest(filePath, manifest);

    expect(result.ok).toBe(true);
    const raw = await readFile(filePath, 'utf-8');
    const parsed = JSON.parse(raw);
    expect(parsed.projectId).toBe('test-project');
    expect(parsed.features).toHaveLength(1);
  });

  it('overwrites existing file', async () => {
    const filePath = join(tempDir, 'manifest.json');
    await writeFile(filePath, '{"old": "data"}', 'utf-8');

    const manifest = makeValidManifest();
    const result = await saveManifest(filePath, manifest);

    expect(result.ok).toBe(true);
    const raw = await readFile(filePath, 'utf-8');
    const parsed = JSON.parse(raw);
    expect(parsed.projectId).toBe('test-project');
  });

  it('produces pretty-printed JSON', async () => {
    const manifest = makeValidManifest();
    const filePath = join(tempDir, 'manifest.json');

    await saveManifest(filePath, manifest);

    const raw = await readFile(filePath, 'utf-8');
    expect(raw).toContain('\n'); // pretty-printed has newlines
  });

  it('writes empty manifest correctly', async () => {
    const manifest = emptyManifest(PROJECT_ID);
    const filePath = join(tempDir, 'manifest.json');

    const result = await saveManifest(filePath, manifest);

    expect(result.ok).toBe(true);
    const raw = await readFile(filePath, 'utf-8');
    const parsed = JSON.parse(raw);
    expect(parsed.features).toEqual([]);
  });
});
