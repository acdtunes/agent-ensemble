/**
 * Feature Discovery IO — integration tests
 *
 * Tests the IO adapter functions (scanFeatureDirsFs, loadFeatureArtifactsFs,
 * discoverFeaturesFs) against the real filesystem using temp directories.
 *
 * These are adapter/integration tests — no mocks, real I/O.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import yaml from 'js-yaml';
import { mkdtemp, rm, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { FeatureId } from '../../shared/types.js';
import { createFeatureId } from '../../shared/types.js';
import {
  scanFeatureDirsFs,
  loadFeatureArtifactsFs,
  discoverFeaturesFs,
} from '../feature-discovery.js';

// --- Test helpers ---

const makeFeatureId = (raw: string): FeatureId => {
  const result = createFeatureId(raw);
  if (!result.ok) throw new Error(`Invalid test feature ID: ${raw}`);
  return result.value;
};

const FEATURE_BASE = 'docs/feature';

const makeFeatureDir = async (projectPath: string, featureName: string): Promise<string> => {
  const featureDir = join(projectPath, FEATURE_BASE, featureName);
  await mkdir(featureDir, { recursive: true });
  return featureDir;
};

const validRoadmapYaml = (): string =>
  yaml.dump({
    schema_version: '1',
    summary: {
      total_steps: 2,
      total_layers: 1,
      max_parallelism: 2,
      requires_worktrees: false,
    },
    layers: [
      {
        layer: 1,
        parallel: true,
        use_worktrees: false,
        steps: [
          { step_id: '01-01', name: 'Step A', files_to_modify: ['a.ts'] },
          { step_id: '01-02', name: 'Step B', files_to_modify: ['b.ts'] },
        ],
      },
    ],
  });

const validExecutionLogYaml = (): string =>
  yaml.dump({
    schema_version: '1',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-03-01T12:00:00Z',
    plan_path: 'roadmap.yaml',
    current_layer: 1,
    summary: {
      total_steps: 2,
      total_layers: 1,
      completed: 1,
      failed: 0,
      in_progress: 1,
    },
    steps: {
      '01-01': {
        step_id: '01-01',
        name: 'Step A',
        layer: 1,
        status: 'approved',
        teammate_id: 'crafter-1',
        started_at: '2026-01-01T01:00:00Z',
        completed_at: '2026-01-01T02:00:00Z',
        review_attempts: 1,
        files_to_modify: ['a.ts'],
      },
      '01-02': {
        step_id: '01-02',
        name: 'Step B',
        layer: 1,
        status: 'in_progress',
        teammate_id: 'crafter-2',
        started_at: '2026-01-01T01:00:00Z',
        completed_at: null,
        review_attempts: 0,
        files_to_modify: ['b.ts'],
      },
    },
    teammates: {},
  });

const writeFeatureArtifacts = async (
  projectPath: string,
  featureName: string,
  options: { roadmap?: boolean; executionLog?: boolean } = { roadmap: true, executionLog: true },
): Promise<void> => {
  const featureDir = await makeFeatureDir(projectPath, featureName);
  if (options.roadmap) {
    await writeFile(join(featureDir, 'roadmap.yaml'), validRoadmapYaml(), 'utf-8');
  }
  if (options.executionLog) {
    await writeFile(join(featureDir, 'execution-log.yaml'), validExecutionLogYaml(), 'utf-8');
  }
};

// --- Temp directory management ---

let projectPath: string;

beforeEach(async () => {
  projectPath = await mkdtemp(join(tmpdir(), 'feature-discovery-io-'));
});

afterEach(async () => {
  await rm(projectPath, { recursive: true, force: true });
});

// =================================================================
// Acceptance: discoverFeaturesFs full pipeline
// =================================================================
describe('discoverFeaturesFs: full discovery pipeline (scan → load → derive)', () => {
  it('discovers all features with their summaries from a project directory', async () => {
    await writeFeatureArtifacts(projectPath, 'auth');
    await writeFeatureArtifacts(projectPath, 'card-redesign');

    const summaries = await discoverFeaturesFs(projectPath);

    expect(summaries).toHaveLength(2);
    const ids = summaries.map((s) => s.featureId as string).sort();
    expect(ids).toEqual(['auth', 'card-redesign']);

    const auth = summaries.find((s) => (s.featureId as string) === 'auth')!;
    expect(auth.hasRoadmap).toBe(true);
    expect(auth.hasExecutionLog).toBe(true);
    expect(auth.totalSteps).toBe(2);
    expect(auth.completed).toBe(1);
    expect(auth.inProgress).toBe(1);
  });

  it('returns empty list when docs/feature/ directory is missing', async () => {
    const summaries = await discoverFeaturesFs(projectPath);

    expect(summaries).toEqual([]);
  });

  it('discovers features with partial artifacts (roadmap only, state only)', async () => {
    await writeFeatureArtifacts(projectPath, 'roadmap-only', { roadmap: true, executionLog: false });
    await writeFeatureArtifacts(projectPath, 'state-only', { roadmap: false, executionLog: true });

    const summaries = await discoverFeaturesFs(projectPath);

    expect(summaries).toHaveLength(2);

    const roadmapOnly = summaries.find((s) => (s.featureId as string) === 'roadmap-only')!;
    expect(roadmapOnly.hasRoadmap).toBe(true);
    expect(roadmapOnly.hasExecutionLog).toBe(false);
    expect(roadmapOnly.totalSteps).toBe(2);
    expect(roadmapOnly.completed).toBe(0);

    const stateOnly = summaries.find((s) => (s.featureId as string) === 'state-only')!;
    expect(stateOnly.hasRoadmap).toBe(false);
    expect(stateOnly.hasExecutionLog).toBe(true);
    expect(stateOnly.totalSteps).toBe(0);
    expect(stateOnly.completed).toBe(1);
  });
});

// =================================================================
// scanFeatureDirsFs: reads feature subdirectories
// =================================================================
describe('scanFeatureDirsFs: reads feature subdirectories from project path', () => {
  it('returns feature IDs for valid feature directories', async () => {
    await makeFeatureDir(projectPath, 'auth');
    await makeFeatureDir(projectPath, 'multi-project');

    const featureIds = await scanFeatureDirsFs(projectPath);

    expect(featureIds).toHaveLength(2);
    const ids = [...featureIds].map((id) => id as string).sort();
    expect(ids).toEqual(['auth', 'multi-project']);
  });

  it('skips hidden directories and invalid slugs', async () => {
    await makeFeatureDir(projectPath, 'valid-feature');
    await makeFeatureDir(projectPath, '.hidden');
    await makeFeatureDir(projectPath, 'UPPERCASE');
    await makeFeatureDir(projectPath, '-leading-hyphen');

    const featureIds = await scanFeatureDirsFs(projectPath);

    expect(featureIds).toHaveLength(1);
    expect(featureIds[0] as string).toBe('valid-feature');
  });

  it('returns empty list when docs/feature/ does not exist', async () => {
    const featureIds = await scanFeatureDirsFs(projectPath);

    expect(featureIds).toEqual([]);
  });

  it('returns empty list when docs/feature/ has no subdirectories', async () => {
    await mkdir(join(projectPath, FEATURE_BASE), { recursive: true });
    // Write a file (not a directory) inside docs/feature/
    await writeFile(join(projectPath, FEATURE_BASE, 'readme.txt'), 'not a feature', 'utf-8');

    const featureIds = await scanFeatureDirsFs(projectPath);

    expect(featureIds).toEqual([]);
  });
});

// =================================================================
// loadFeatureArtifactsFs: reads YAML artifacts per feature
// =================================================================
describe('loadFeatureArtifactsFs: reads roadmap.yaml and execution-log.yaml per feature', () => {
  const featureId = makeFeatureId('auth');

  it('loads both artifacts when present', async () => {
    await writeFeatureArtifacts(projectPath, 'auth');

    const { plan, state } = await loadFeatureArtifactsFs(projectPath, featureId);

    expect(plan).not.toBeNull();
    expect(plan!.summary.total_steps).toBe(2);
    expect(state).not.toBeNull();
    expect(state!.summary.completed).toBe(1);
  });

  it('returns null plan when roadmap.yaml is missing', async () => {
    await writeFeatureArtifacts(projectPath, 'auth', { roadmap: false, executionLog: true });

    const { plan, state } = await loadFeatureArtifactsFs(projectPath, featureId);

    expect(plan).toBeNull();
    expect(state).not.toBeNull();
  });

  it('returns null state when execution-log.yaml is missing', async () => {
    await writeFeatureArtifacts(projectPath, 'auth', { roadmap: true, executionLog: false });

    const { plan, state } = await loadFeatureArtifactsFs(projectPath, featureId);

    expect(plan).not.toBeNull();
    expect(state).toBeNull();
  });

  it('returns null for both when feature directory has no YAML files', async () => {
    await makeFeatureDir(projectPath, 'auth');

    const { plan, state } = await loadFeatureArtifactsFs(projectPath, featureId);

    expect(plan).toBeNull();
    expect(state).toBeNull();
  });

  it('returns null for plan when roadmap.yaml has invalid YAML', async () => {
    const featureDir = await makeFeatureDir(projectPath, 'auth');
    await writeFile(join(featureDir, 'roadmap.yaml'), '{{invalid yaml', 'utf-8');
    await writeFile(join(featureDir, 'execution-log.yaml'), validExecutionLogYaml(), 'utf-8');

    const { plan, state } = await loadFeatureArtifactsFs(projectPath, featureId);

    expect(plan).toBeNull();
    expect(state).not.toBeNull();
  });
});
