/**
 * Feature discovery — pure core + IO adapters.
 *
 * Pure core:
 *   deriveFeatureSummary: FeatureId × optional plan × optional state → FeatureSummary
 *   isFeatureDir: directory name → boolean (valid feature directory?)
 *
 * IO adapters:
 *   scanFeatureDirsFs: projectPath → FeatureId[] (reads docs/feature/ subdirectories)
 *   loadFeatureArtifactsFs: projectPath × FeatureId → { plan, state } (reads YAML artifacts)
 *   discoverFeaturesFs: projectPath → FeatureSummary[] (full discovery pipeline)
 */

import type { FeatureId, FeatureSummary, ExecutionPlan, DeliveryState } from '../shared/types.js';
import { createFeatureId } from '../shared/types.js';

// =====================================================================
// Pure Core — no filesystem access, no side effects
// =====================================================================

export const deriveFeatureSummary = (
  featureId: FeatureId,
  plan: ExecutionPlan | null,
  state: DeliveryState | null,
): FeatureSummary => ({
  featureId,
  name: featureId as string,
  hasRoadmap: plan !== null,
  hasExecutionLog: state !== null,
  totalSteps: plan?.summary.total_steps ?? 0,
  completed: state?.summary.completed ?? 0,
  inProgress: state?.summary.in_progress ?? 0,
  failed: state?.summary.failed ?? 0,
  currentLayer: state?.current_layer ?? 0,
  updatedAt: state?.updated_at ?? '',
});

export const isFeatureDir = (name: string): boolean =>
  createFeatureId(name).ok;

// =====================================================================
// IO Adapters — side-effect shell for filesystem operations
// =====================================================================

import { readdir, readFile } from 'node:fs/promises';
import { resolveFeatureRoadmap, resolveFeatureExecutionLog } from './feature-path-resolver.js';
import { parsePlanYaml, parseStateYaml } from './parser.js';

const FEATURE_BASE = 'docs/feature';

const readYamlFile = async (path: string): Promise<string | null> => {
  try {
    return await readFile(path, 'utf-8');
  } catch {
    return null;
  }
};

export const scanFeatureDirsFs = async (
  projectPath: string,
): Promise<readonly FeatureId[]> => {
  const featureRoot = `${projectPath}/${FEATURE_BASE}`;

  let entries;
  try {
    entries = await readdir(featureRoot, { withFileTypes: true });
  } catch {
    return [];
  }

  return entries
    .filter((entry) => entry.isDirectory() && isFeatureDir(entry.name))
    .map((entry) => createFeatureId(entry.name))
    .filter((result) => result.ok)
    .map((result) => result.value as FeatureId);
};

export const loadFeatureArtifactsFs = async (
  projectPath: string,
  featureId: FeatureId,
): Promise<{ readonly plan: ExecutionPlan | null; readonly state: DeliveryState | null }> => {
  const roadmapPath = resolveFeatureRoadmap(projectPath, featureId);
  const executionLogPath = resolveFeatureExecutionLog(projectPath, featureId);

  const [roadmapYaml, executionLogYaml] = await Promise.all([
    readYamlFile(roadmapPath),
    readYamlFile(executionLogPath),
  ]);

  const planResult = roadmapYaml !== null ? parsePlanYaml(roadmapYaml) : null;
  const stateResult = executionLogYaml !== null ? parseStateYaml(executionLogYaml) : null;

  return {
    plan: planResult !== null && planResult.ok ? planResult.value : null,
    state: stateResult !== null && stateResult.ok ? stateResult.value : null,
  };
};

export const discoverFeaturesFs = async (
  projectPath: string,
): Promise<readonly FeatureSummary[]> => {
  const featureIds = await scanFeatureDirsFs(projectPath);

  return Promise.all(
    featureIds.map(async (featureId) => {
      const { plan, state } = await loadFeatureArtifactsFs(projectPath, featureId);
      return deriveFeatureSummary(featureId, plan, state);
    }),
  );
};
