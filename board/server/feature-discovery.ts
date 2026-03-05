/**
 * Feature discovery — pure core + IO adapters (unified roadmap).
 *
 * Pure core:
 *   deriveFeatureSummary: FeatureId × optional Roadmap → FeatureSummary
 *   isFeatureDir: directory name → boolean (valid feature directory?)
 *
 * IO adapters:
 *   scanFeatureDirsFs: projectPath → FeatureId[] (reads docs/feature/ subdirectories)
 *   findRoadmapPath: featureDir → RoadmapPathResult | null (v2.0.0 priority: deliver/roadmap.json > roadmap.json > roadmap.yaml)
 *   loadFeatureRoadmapFs: projectPath × FeatureId → FeatureRoadmap | null (multi-location with format)
 *   discoverFeaturesFs: projectPath → FeatureSummary[] (full discovery pipeline)
 */

import type { FeatureId, FeatureSummary, Roadmap, RoadmapFormat } from '../shared/types.js';
import { createFeatureId } from '../shared/types.js';
import { computeRoadmapSummary } from '../shared/types.js';

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
      done: 0,
      inProgress: 0,
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
    done: summary.done,
    inProgress: summary.in_progress,
    currentLayer: countCompletedPhases(roadmap),
    updatedAt: latestTimestamp(roadmap),
    shortDescription: roadmap.roadmap.short_description,
    description: roadmap.roadmap.description,
  };
};

export const isFeatureDir = (name: string): boolean =>
  createFeatureId(name).ok;

// =====================================================================
// Types for multi-location roadmap finding
// =====================================================================

export interface RoadmapPathResult {
  readonly path: string;
  readonly format: RoadmapFormat;
}

export interface FeatureRoadmap {
  readonly roadmap: Roadmap;
  readonly format: RoadmapFormat;
}

// =====================================================================
// IO Adapters — side-effect shell for filesystem operations
// =====================================================================

import { readdir, readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { parseRoadmap } from './parser.js';

const SCAN_DIRS = ['docs/feature', 'docs/ux', 'docs/requirements'] as const;

// Case-insensitive directory lookup - finds actual directory name on disk
const findActualDirName = async (
  parentPath: string,
  targetName: string,
): Promise<string | null> => {
  try {
    const entries = await readdir(parentPath, { withFileTypes: true });
    const match = entries.find(
      (e) => e.isDirectory() && e.name.toLowerCase() === targetName.toLowerCase(),
    );
    return match?.name ?? null;
  } catch {
    return null;
  }
};

// Resolve feature directory with case-insensitive lookup
const resolveFeatureDirFs = async (
  projectPath: string,
  featureId: FeatureId,
): Promise<string | null> => {
  for (const scanDir of SCAN_DIRS) {
    const parentPath = join(projectPath, scanDir);
    const actualName = await findActualDirName(parentPath, featureId as string);
    if (actualName !== null) {
      return join(parentPath, actualName);
    }
  }
  return null;
};

const readTextFile = async (path: string): Promise<string | null> => {
  try {
    return await readFile(path, 'utf-8');
  } catch {
    return null;
  }
};

const fileExists = async (path: string): Promise<boolean> => {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
};

// v2.0.0 priority order: deliver/roadmap.json > roadmap.json > roadmap.yaml
const ROADMAP_LOCATIONS: readonly { readonly relativePath: string; readonly format: RoadmapFormat }[] = [
  { relativePath: 'deliver/roadmap.json', format: 'json' },
  { relativePath: 'roadmap.json', format: 'json' },
  { relativePath: 'roadmap.yaml', format: 'yaml' },
];

export const findRoadmapPath = async (featureDir: string): Promise<RoadmapPathResult | null> => {
  for (const location of ROADMAP_LOCATIONS) {
    const fullPath = join(featureDir, location.relativePath);
    if (await fileExists(fullPath)) {
      return { path: fullPath, format: location.format };
    }
  }
  return null;
};

const scanSingleDir = async (
  dirPath: string,
): Promise<readonly FeatureId[]> => {
  let entries;
  try {
    entries = await readdir(dirPath, { withFileTypes: true });
  } catch {
    return [];
  }

  return entries
    .filter((entry) => entry.isDirectory() && isFeatureDir(entry.name.toLowerCase()))
    .map((entry) => createFeatureId(entry.name.toLowerCase()))
    .filter((result) => result.ok)
    .map((result) => result.value as FeatureId);
};

const deduplicateFeatureIds = (ids: readonly FeatureId[]): readonly FeatureId[] => {
  const seen = new Set<string>();
  return ids.filter((id) => {
    const key = id as string;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

export const scanFeatureDirsFs = async (
  projectPath: string,
): Promise<readonly FeatureId[]> => {
  const allIds = await Promise.all(
    SCAN_DIRS.map((dir) => scanSingleDir(join(projectPath, dir))),
  );

  return deduplicateFeatureIds(allIds.flat());
};

export const loadFeatureRoadmapFs = async (
  projectPath: string,
  featureId: FeatureId,
): Promise<FeatureRoadmap | null> => {
  const featureDir = await resolveFeatureDirFs(projectPath, featureId);
  if (featureDir === null) return null;

  const pathResult = await findRoadmapPath(featureDir);
  if (pathResult === null) return null;

  const content = await readTextFile(pathResult.path);
  if (content === null) return null;

  const result = parseRoadmap(content, pathResult.format);
  return result.ok ? { roadmap: result.value, format: pathResult.format } : null;
};

export const discoverFeaturesFs = async (
  projectPath: string,
): Promise<readonly FeatureSummary[]> => {
  const featureIds = await scanFeatureDirsFs(projectPath);

  return Promise.all(
    featureIds.map(async (featureId) => {
      const result = await loadFeatureRoadmapFs(projectPath, featureId);
      return deriveFeatureSummary(featureId, result?.roadmap ?? null);
    }),
  );
};
