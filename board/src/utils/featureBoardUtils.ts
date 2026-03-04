import type { FeatureSummary } from '../../shared/types';

// --- Filter features to board-capable only (has roadmap) ---

export const filterBoardCapableFeatures = (
  features: readonly FeatureSummary[],
): readonly FeatureSummary[] =>
  features.filter(f => f.hasRoadmap);

// --- URL builders ---

export const buildFeatureBoardUrl = (projectId: string, featureId: string): string =>
  `#/projects/${projectId}/features/${featureId}/board`;

export const buildFeatureDocsUrl = (projectId: string, featureId: string): string =>
  `#/projects/${projectId}/features/${featureId}/docs`;
