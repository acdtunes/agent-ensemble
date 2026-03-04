/**
 * Tests for featureStatusFilter — status-based filtering and count computation.
 *
 * Pure function tests — validates filtering logic independently.
 * Test Budget: 3 behaviors × 2 = 6 max unit tests
 */

import { describe, it, expect } from 'vitest';
import {
  filterFeaturesByStatus,
  computeStatusFilterCounts,
  buildStatusFilterOptions,
} from '../utils/featureStatusFilter';
import type { FeatureSummary, FeatureId } from '../../shared/types';

const makeFeature = (
  name: string,
  overrides: Partial<FeatureSummary> = {},
): FeatureSummary => ({
  featureId: name.toLowerCase().replace(/\s+/g, '-') as FeatureId,
  name,
  hasRoadmap: true,
  hasExecutionLog: false,
  totalSteps: 5,
  done: 2,
  inProgress: 1,
  currentLayer: 1,
  updatedAt: '2026-03-01T00:00:00Z',
  ...overrides,
});

// Active: inProgress > 0 OR done > 0 (but not all done)
const activeFeature = (name: string) =>
  makeFeature(name, { hasRoadmap: true, totalSteps: 5, done: 2, inProgress: 1 });

// Planned: hasRoadmap && totalSteps > 0 && done === 0 && inProgress === 0
const plannedFeature = (name: string) =>
  makeFeature(name, { hasRoadmap: true, totalSteps: 5, done: 0, inProgress: 0 });

// Completed: totalSteps > 0 && done === totalSteps
const completedFeature = (name: string) =>
  makeFeature(name, { hasRoadmap: true, totalSteps: 5, done: 5, inProgress: 0 });

// No Roadmap: hasRoadmap === false
const noRoadmapFeature = (name: string) =>
  makeFeature(name, { hasRoadmap: false, totalSteps: 0, done: 0, inProgress: 0 });

const testFeatures: readonly FeatureSummary[] = [
  activeFeature('Auth'),
  activeFeature('Dashboard'),
  plannedFeature('Profile'),
  completedFeature('Login'),
  noRoadmapFeature('Docs'),
];

describe('filterFeaturesByStatus', () => {
  // --- Behavior 1: 'all' returns all features ---
  it('returns all features when status is "all"', () => {
    const result = filterFeaturesByStatus(testFeatures, 'all');
    expect(result).toHaveLength(5);
    expect(result).toEqual(testFeatures);
  });

  // --- Behavior 2: Filters by specific status ---
  it.each([
    ['active', ['Auth', 'Dashboard']],
    ['planned', ['Profile']],
    ['completed', ['Login']],
  ] as const)('filters to only "%s" features', (status, expectedNames) => {
    const result = filterFeaturesByStatus(testFeatures, status);
    const resultNames = result.map((f) => f.name);
    expect(resultNames).toEqual(expectedNames);
  });
});

describe('computeStatusFilterCounts', () => {
  // --- Behavior 3: Computes counts correctly ---
  it('computes counts for each status', () => {
    const counts = computeStatusFilterCounts(testFeatures);

    expect(counts).toEqual({
      all: 5,
      active: 2,
      planned: 1,
      completed: 1,
    });
  });

  it('handles empty feature list', () => {
    const counts = computeStatusFilterCounts([]);

    expect(counts).toEqual({
      all: 0,
      active: 0,
      planned: 0,
      completed: 0,
    });
  });
});

describe('buildStatusFilterOptions', () => {
  it('builds options with labels and counts', () => {
    const options = buildStatusFilterOptions(testFeatures);

    expect(options).toEqual([
      { value: 'all', label: 'All', count: 5 },
      { value: 'active', label: 'Active', count: 2 },
      { value: 'planned', label: 'Planned', count: 1 },
      { value: 'completed', label: 'Completed', count: 1 },
    ]);
  });
});
