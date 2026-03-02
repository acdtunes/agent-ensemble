/**
 * Feature path resolver — pure functions for resolving feature paths.
 *
 * All functions are pure: projectPath + FeatureId → absolute path string.
 * No filesystem access, no side effects.
 */

import type { FeatureId } from '../shared/types.js';

const FEATURE_BASE = 'docs/feature';

export const resolveFeatureDir = (projectPath: string, featureId: FeatureId): string =>
  `${projectPath}/${FEATURE_BASE}/${featureId}`;

export const resolveFeatureRoadmap = (projectPath: string, featureId: FeatureId): string =>
  `${resolveFeatureDir(projectPath, featureId)}/roadmap.yaml`;

export const resolveFeatureExecutionLog = (projectPath: string, featureId: FeatureId): string =>
  `${resolveFeatureDir(projectPath, featureId)}/execution-log.yaml`;

export const resolveFeatureDocsRoot = (projectPath: string, featureId: FeatureId): string =>
  resolveFeatureDir(projectPath, featureId);
