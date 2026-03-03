/**
 * Feature discovery — pure core + IO adapters (unified roadmap).
 *
 * Pure core:
 *   deriveFeatureSummary: FeatureId × optional Roadmap → FeatureSummary
 *   isFeatureDir: directory name → boolean (valid feature directory?)
 *
 * IO adapters:
 *   scanFeatureDirsFs: projectPath → FeatureId[] (reads docs/feature/ subdirectories)
 *   loadFeatureRoadmapFs: projectPath × FeatureId → Roadmap | null (reads roadmap.yaml only)
 *   discoverFeaturesFs: projectPath → FeatureSummary[] (full discovery pipeline)
 */

import type { FeatureId, FeatureSummary, Roadmap } from '../shared/types.js';
import { createFeatureId } from '../shared/types.js';
import { computeRoadmapSummary } from './parser.js';

// =====================================================================
// Pure Core — no filesystem access, no side effects
// =====================================================================

const hasNonPendingStep = (roadmap: Roadmap): boolean =>
  roadmap.phases.some((phase) => phase.steps.some((step) => step.status !== 'pending'));

const countCompletedPhases = (roadmap: Roadmap): number =>
  roadmap.phases.filter((phase) =>
    phase.steps.length > 0 && phase.steps.every((step) => step.status === 'approved'),
  ).length;

const latestTimestamp = (roadmap: Roadmap): string => {
  const timestamps = roadmap.phases
    .flatMap((p) => p.steps)
    .flatMap((s) => [s.started_at, s.completed_at])
    .filter((t): t is string => t !== null);
  return timestamps.length > 0 ? timestamps.sort().at(-1)! : '';
};

export const deriveFeatureSummary = (
  featureId: FeatureId,
  roadmap: Roadmap | null,
): FeatureSummary => {
  if (roadmap === null) {
    return {
      featureId,
      name: featureId as string,
      hasRoadmap: false,
      hasExecutionLog: false,
      totalSteps: 0,
      completed: 0,
      inProgress: 0,
      failed: 0,
      currentLayer: 0,
      updatedAt: '',
    };
  }

  const summary = computeRoadmapSummary(roadmap);

  return {
    featureId,
    name: featureId as string,
    hasRoadmap: true,
    hasExecutionLog: hasNonPendingStep(roadmap),
    totalSteps: summary.total_steps,
    completed: summary.completed,
    inProgress: summary.in_progress,
    failed: summary.failed,
    currentLayer: countCompletedPhases(roadmap),
    updatedAt: latestTimestamp(roadmap),
  };
};

export const isFeatureDir = (name: string): boolean =>
  createFeatureId(name).ok;

// =====================================================================
// IO Adapters — side-effect shell for filesystem operations
// =====================================================================

import { readdir, readFile } from 'node:fs/promises';
import { resolveFeatureRoadmap } from './feature-path-resolver.js';
import { parseRoadmap } from './parser.js';

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

export const loadFeatureRoadmapFs = async (
  projectPath: string,
  featureId: FeatureId,
): Promise<Roadmap | null> => {
  const roadmapPath = resolveFeatureRoadmap(projectPath, featureId);
  const roadmapYaml = await readYamlFile(roadmapPath);

  if (roadmapYaml === null) return null;

  const result = parseRoadmap(roadmapYaml);
  return result.ok ? result.value : null;
};

export const discoverFeaturesFs = async (
  projectPath: string,
): Promise<readonly FeatureSummary[]> => {
  const featureIds = await scanFeatureDirsFs(projectPath);

  return Promise.all(
    featureIds.map(async (featureId) => {
      const roadmap = await loadFeatureRoadmapFs(projectPath, featureId);
      return deriveFeatureSummary(featureId, roadmap);
    }),
  );
};
