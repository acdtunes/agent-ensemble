/**
 * Feature Discovery IO — integration tests (unified roadmap)
 *
 * Tests the IO adapter functions (scanFeatureDirsFs, loadFeatureRoadmapFs,
 * discoverFeaturesFs) against the real filesystem using temp directories.
 *
 * Feature discovery reads only roadmap.yaml (not execution-log.yaml).
 * FeatureSummary is derived from Roadmap via computeRoadmapSummary.
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
  loadFeatureRoadmapFs,
  discoverFeaturesFs,
} from '../feature-discovery.js';

// --- Test helpers ---

const makeFeatureId = (raw: string): FeatureId => {
  const result = createFeatureId(raw);
  if (!result.ok) throw new Error(`Invalid test feature ID: ${raw}`);
  return result.value;
};

const FEATURE_BASE = 'docs/feature';
const UX_BASE = 'docs/ux';
const REQUIREMENTS_BASE = 'docs/requirements';

const makeDirIn = async (projectPath: string, base: string, featureName: string): Promise<string> => {
  const featureDir = join(projectPath, base, featureName);
  await mkdir(featureDir, { recursive: true });
  return featureDir;
};

const makeFeatureDir = async (projectPath: string, featureName: string): Promise<string> =>
  makeDirIn(projectPath, FEATURE_BASE, featureName);

const makeUxDir = async (projectPath: string, featureName: string): Promise<string> =>
  makeDirIn(projectPath, UX_BASE, featureName);

const makeRequirementsDir = async (projectPath: string, featureName: string): Promise<string> =>
  makeDirIn(projectPath, REQUIREMENTS_BASE, featureName);

const unifiedRoadmapYaml = (opts?: { withActivity?: boolean }): string =>
  yaml.dump({
    roadmap: {
      project_id: 'test-project',
      created_at: '2026-01-01T00:00:00Z',
      total_steps: 2,
      phases: 1,
    },
    phases: [{
      id: '01',
      name: 'Phase 1',
      steps: [
        {
          id: '01-01',
          name: 'Step A',
          files_to_modify: ['a.ts'],
          deps: [],
          criteria: ['AC1'],
          ...(opts?.withActivity ? {
            status: 'approved',
            teammate_id: 'crafter-1',
            started_at: '2026-01-01T01:00:00Z',
            completed_at: '2026-01-01T02:00:00Z',
            review_attempts: 1,
          } : {}),
        },
        {
          id: '01-02',
          name: 'Step B',
          files_to_modify: ['b.ts'],
          deps: ['01-01'],
          criteria: ['AC2'],
          ...(opts?.withActivity ? {
            status: 'in_progress',
            teammate_id: 'crafter-2',
            started_at: '2026-01-01T03:00:00Z',
          } : {}),
        },
      ],
    }],
  });

const writeFeatureRoadmap = async (
  projectPath: string,
  featureName: string,
  opts?: { withActivity?: boolean },
): Promise<void> => {
  const featureDir = await makeFeatureDir(projectPath, featureName);
  await writeFile(join(featureDir, 'roadmap.yaml'), unifiedRoadmapYaml(opts), 'utf-8');
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
// Acceptance: discoverFeaturesFs full pipeline (roadmap-only)
// =================================================================
describe('discoverFeaturesFs: full discovery pipeline (scan → loadRoadmap → derive)', () => {
  it('discovers features with correct metrics from unified roadmap', async () => {
    await writeFeatureRoadmap(projectPath, 'auth', { withActivity: true });
    await writeFeatureRoadmap(projectPath, 'card-redesign', { withActivity: true });

    const summaries = await discoverFeaturesFs(projectPath);

    expect(summaries).toHaveLength(2);
    const ids = summaries.map((s) => s.featureId as string).sort();
    expect(ids).toEqual(['auth', 'card-redesign']);

    const auth = summaries.find((s) => (s.featureId as string) === 'auth')!;
    expect(auth.hasRoadmap).toBe(true);
    expect(auth.hasExecutionLog).toBe(true);
    expect(auth.totalSteps).toBe(2);
    expect(auth.done).toBe(1);
    expect(auth.inProgress).toBe(1);
  });

  it('returns empty list when docs/feature/ directory is missing', async () => {
    const summaries = await discoverFeaturesFs(projectPath);

    expect(summaries).toEqual([]);
  });

  it('discovers features without roadmap.yaml with zero counts', async () => {
    await makeFeatureDir(projectPath, 'no-roadmap');
    await writeFeatureRoadmap(projectPath, 'has-roadmap');

    const summaries = await discoverFeaturesFs(projectPath);

    expect(summaries).toHaveLength(2);

    const noRoadmap = summaries.find((s) => (s.featureId as string) === 'no-roadmap')!;
    expect(noRoadmap.hasRoadmap).toBe(false);
    expect(noRoadmap.hasExecutionLog).toBe(false);
    expect(noRoadmap.totalSteps).toBe(0);
    expect(noRoadmap.done).toBe(0);

    const hasRoadmap = summaries.find((s) => (s.featureId as string) === 'has-roadmap')!;
    expect(hasRoadmap.hasRoadmap).toBe(true);
    expect(hasRoadmap.totalSteps).toBe(2);
  });

  it('all-pending roadmap shows hasExecutionLog false', async () => {
    await writeFeatureRoadmap(projectPath, 'pending-feature');

    const summaries = await discoverFeaturesFs(projectPath);

    expect(summaries).toHaveLength(1);
    expect(summaries[0].hasExecutionLog).toBe(false);
    expect(summaries[0].totalSteps).toBe(2);
    expect(summaries[0].done).toBe(0);
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
    await writeFile(join(projectPath, FEATURE_BASE, 'readme.txt'), 'not a feature', 'utf-8');

    const featureIds = await scanFeatureDirsFs(projectPath);

    expect(featureIds).toEqual([]);
  });

  it('scans docs/ux/ and docs/requirements/ in addition to docs/feature/', async () => {
    await makeFeatureDir(projectPath, 'auth');
    await makeUxDir(projectPath, 'onboarding');
    await makeRequirementsDir(projectPath, 'billing');

    const featureIds = await scanFeatureDirsFs(projectPath);

    const ids = [...featureIds].map((id) => id as string).sort();
    expect(ids).toEqual(['auth', 'billing', 'onboarding']);
  });

  it('deduplicates feature IDs found in multiple directories', async () => {
    await makeFeatureDir(projectPath, 'auth');
    await makeUxDir(projectPath, 'auth');
    await makeRequirementsDir(projectPath, 'auth');

    const featureIds = await scanFeatureDirsFs(projectPath);

    expect(featureIds).toHaveLength(1);
    expect(featureIds[0] as string).toBe('auth');
  });

  it('silently skips missing scan directories', async () => {
    // Only docs/feature/ exists, docs/ux/ and docs/requirements/ do not
    await makeFeatureDir(projectPath, 'auth');

    const featureIds = await scanFeatureDirsFs(projectPath);

    expect(featureIds).toHaveLength(1);
    expect(featureIds[0] as string).toBe('auth');
  });

  it('skips invalid directory names across all scan directories', async () => {
    await makeFeatureDir(projectPath, 'valid-feature');
    await makeUxDir(projectPath, '.hidden');
    await makeRequirementsDir(projectPath, 'UPPERCASE');

    const featureIds = await scanFeatureDirsFs(projectPath);

    expect(featureIds).toHaveLength(1);
    expect(featureIds[0] as string).toBe('valid-feature');
  });
});

// =================================================================
// discoverFeaturesFs: features from ux/requirements have hasRoadmap false
// =================================================================
describe('discoverFeaturesFs: multi-directory discovery', () => {
  it('features discovered only from docs/ux/ or docs/requirements/ return hasRoadmap false', async () => {
    await writeFeatureRoadmap(projectPath, 'auth', { withActivity: true });
    await makeUxDir(projectPath, 'onboarding');
    await makeRequirementsDir(projectPath, 'billing');

    const summaries = await discoverFeaturesFs(projectPath);

    expect(summaries).toHaveLength(3);

    const auth = summaries.find((s) => (s.featureId as string) === 'auth')!;
    expect(auth.hasRoadmap).toBe(true);

    const onboarding = summaries.find((s) => (s.featureId as string) === 'onboarding')!;
    expect(onboarding.hasRoadmap).toBe(false);
    expect(onboarding.totalSteps).toBe(0);

    const billing = summaries.find((s) => (s.featureId as string) === 'billing')!;
    expect(billing.hasRoadmap).toBe(false);
    expect(billing.totalSteps).toBe(0);
  });
});

// =================================================================
// loadFeatureRoadmapFs: reads roadmap.yaml per feature
// =================================================================
describe('loadFeatureRoadmapFs: reads roadmap.yaml and parses as Roadmap', () => {
  const featureId = makeFeatureId('auth');

  it('loads and parses roadmap when present', async () => {
    await writeFeatureRoadmap(projectPath, 'auth', { withActivity: true });

    const roadmap = await loadFeatureRoadmapFs(projectPath, featureId);

    expect(roadmap).not.toBeNull();
    expect(roadmap!.phases).toHaveLength(1);
    expect(roadmap!.phases[0].steps).toHaveLength(2);
    expect(roadmap!.phases[0].steps[0].status).toBe('approved');
  });

  it('returns null when roadmap.yaml is missing', async () => {
    await makeFeatureDir(projectPath, 'auth');

    const roadmap = await loadFeatureRoadmapFs(projectPath, featureId);

    expect(roadmap).toBeNull();
  });

  it('returns null when roadmap.yaml has invalid YAML', async () => {
    const featureDir = await makeFeatureDir(projectPath, 'auth');
    await writeFile(join(featureDir, 'roadmap.yaml'), '{{invalid yaml', 'utf-8');

    const roadmap = await loadFeatureRoadmapFs(projectPath, featureId);

    expect(roadmap).toBeNull();
  });
});
