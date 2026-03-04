import type { FeatureSummary } from '../../shared/types';
import { classifyFeatureDisplayState, type FeatureDisplayState } from '../components/FeatureCard';

// --- Types ---

export type StatusFilterValue = 'all' | FeatureDisplayState;

export interface StatusFilterOption {
  readonly value: StatusFilterValue;
  readonly label: string;
  readonly count: number;
}

// --- Constants ---

export const STATUS_FILTER_VALUES: readonly StatusFilterValue[] = [
  'all',
  'active',
  'planned',
  'completed',
];

const STATUS_FILTER_LABELS: Record<StatusFilterValue, string> = {
  all: 'All',
  active: 'Active',
  planned: 'Planned',
  completed: 'Completed',
};

// --- Pure functions ---

/**
 * Filters features by status. 'all' returns all features with roadmaps.
 * Note: 'no-roadmap' features are excluded from status filtering.
 */
export const filterFeaturesByStatus = (
  features: readonly FeatureSummary[],
  status: StatusFilterValue,
): readonly FeatureSummary[] => {
  if (status === 'all') {
    return features;
  }

  return features.filter((feature) => {
    const displayState = classifyFeatureDisplayState(feature);
    return displayState === status;
  });
};

/**
 * Computes counts for each status filter option based on given features.
 */
export const computeStatusFilterCounts = (
  features: readonly FeatureSummary[],
): Record<StatusFilterValue, number> => {
  const counts: Record<StatusFilterValue, number> = {
    all: features.length,
    active: 0,
    planned: 0,
    completed: 0,
  };

  for (const feature of features) {
    const state = classifyFeatureDisplayState(feature);
    if (state !== null) {
      counts[state]++;
    }
  }

  return counts;
};

/**
 * Builds status filter options with labels and counts.
 */
export const buildStatusFilterOptions = (
  features: readonly FeatureSummary[],
): readonly StatusFilterOption[] => {
  const counts = computeStatusFilterCounts(features);

  return STATUS_FILTER_VALUES.map((value) => ({
    value,
    label: STATUS_FILTER_LABELS[value],
    count: counts[value],
  }));
};
