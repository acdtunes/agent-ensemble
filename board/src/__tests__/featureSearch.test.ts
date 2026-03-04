/**
 * Tests for filterFeaturesBySearch — case-insensitive substring matching.
 *
 * Pure function test — validates filtering logic independently.
 * Test Budget: 3 behaviors × 2 = 6 max unit tests
 */

import { describe, it, expect } from 'vitest';
import { filterFeaturesBySearch } from '../utils/featureSearch';
import type { FeatureSummary, FeatureId } from '../../shared/types';

const makeFeature = (name: string): FeatureSummary => ({
  featureId: name.toLowerCase().replace(/\s+/g, '-') as FeatureId,
  name,
  hasRoadmap: true,
  hasExecutionLog: false,
  totalSteps: 5,
  done: 2,
  inProgress: 1,
  currentLayer: 1,
  updatedAt: '2026-03-01T00:00:00Z',
});

const testFeatures: readonly FeatureSummary[] = [
  makeFeature('Authentication'),
  makeFeature('Dashboard'),
  makeFeature('User Profile'),
  makeFeature('Login'),
  makeFeature('Settings'),
];

describe('filterFeaturesBySearch', () => {
  // --- Behavior 1: Empty search returns all features ---
  it.each([
    ['', testFeatures.length],
    ['   ', testFeatures.length],
  ])('returns all features when search term is "%s"', (searchTerm, expectedCount) => {
    const result = filterFeaturesBySearch(testFeatures, searchTerm);
    expect(result).toHaveLength(expectedCount);
    expect(result).toEqual(testFeatures);
  });

  // --- Behavior 2: Case-insensitive substring matching ---
  it.each([
    ['auth', ['Authentication']],
    ['AUTH', ['Authentication']],
    ['Auth', ['Authentication']],
    ['aUtH', ['Authentication']],
    ['dash', ['Dashboard']],
    ['user', ['User Profile']],
    ['profile', ['User Profile']],
    ['log', ['Login']],
    ['set', ['Settings']],
  ])('filters case-insensitively: "%s" matches %j', (searchTerm, expectedNames) => {
    const result = filterFeaturesBySearch(testFeatures, searchTerm);
    const resultNames = result.map((f) => f.name);
    expect(resultNames).toEqual(expectedNames);
  });

  // --- Behavior 3: No matches returns empty array ---
  it('returns empty array when no features match', () => {
    const result = filterFeaturesBySearch(testFeatures, 'nonexistent-xyz');
    expect(result).toEqual([]);
    expect(result).toHaveLength(0);
  });

  // --- Edge case: Multiple matches ---
  it('returns multiple features when search matches several', () => {
    const result = filterFeaturesBySearch(testFeatures, 'a');
    const resultNames = result.map((f) => f.name);
    // 'a' appears in: Authentication, Dashboard (Login has no 'a')
    expect(resultNames).toEqual(['Authentication', 'Dashboard']);
  });
});
