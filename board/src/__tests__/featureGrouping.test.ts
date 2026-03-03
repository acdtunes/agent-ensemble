/**
 * Tests for groupFeaturesByStatus — groups and sorts features for display.
 *
 * Driving port: groupFeaturesByStatus pure function
 * Acceptance criteria:
 * - Features grouped in order: Active > Planned > Completed > No Roadmap
 * - Features sorted alphabetically (case-insensitive) within each group
 * - Function returns grouped structure with group name and feature count
 * - Sorting is deterministic across calls
 *
 * Test Budget: 4 behaviors × 2 = 8 max unit tests
 */

import { describe, it, expect } from 'vitest';
import type { FeatureSummary, FeatureId } from '../../shared/types';
import { groupFeaturesByStatus, type FeatureGroup, GROUP_ORDER } from '../utils/featureGrouping';

// --- Fixtures ---

const makeFeature = (
  name: string,
  overrides: Partial<FeatureSummary> = {},
): FeatureSummary => ({
  featureId: name.toLowerCase().replace(/\s+/g, '-') as FeatureId,
  name,
  hasRoadmap: true,
  hasExecutionLog: false,
  totalSteps: 5,
  done: 0,
  inProgress: 0,
  currentLayer: 0,
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

// =============================================================
// GROUP_ORDER — ordered array of group keys
// =============================================================

describe('GROUP_ORDER', () => {
  it('contains exactly 4 groups in display order', () => {
    expect(GROUP_ORDER).toEqual(['active', 'planned', 'completed', 'no-roadmap']);
  });
});

// =============================================================
// groupFeaturesByStatus — main grouping function
// =============================================================

describe('groupFeaturesByStatus', () => {
  // --- Behavior 1: Correct group ordering ---
  it('returns groups in order: Active > Planned > Completed > No Roadmap', () => {
    const features = [
      noRoadmapFeature('Z-Docs'),
      completedFeature('Y-Done'),
      plannedFeature('X-New'),
      activeFeature('W-Work'),
    ];

    const result = groupFeaturesByStatus(features);
    const groupKeys = result.map((g) => g.key);

    expect(groupKeys).toEqual(['active', 'planned', 'completed', 'no-roadmap']);
  });

  // --- Behavior 2: Alphabetical sorting within groups (case-insensitive) ---
  it('sorts features alphabetically (case-insensitive) within each group', () => {
    const features = [
      activeFeature('zebra'),
      activeFeature('Alpha'),
      activeFeature('BETA'),
    ];

    const result = groupFeaturesByStatus(features);
    const activeGroup = result.find((g) => g.key === 'active');
    const names = activeGroup?.features.map((f) => f.name);

    expect(names).toEqual(['Alpha', 'BETA', 'zebra']);
  });

  // --- Behavior 3: Returns grouped structure with name and count ---
  it('returns each group with key, displayName, and correct feature count', () => {
    const features = [
      activeFeature('A'),
      activeFeature('B'),
      plannedFeature('C'),
    ];

    const result = groupFeaturesByStatus(features);
    const activeGroup = result.find((g) => g.key === 'active');
    const plannedGroup = result.find((g) => g.key === 'planned');

    expect(activeGroup).toEqual({
      key: 'active',
      displayName: 'Active',
      features: expect.any(Array),
    });
    expect(activeGroup?.features).toHaveLength(2);
    expect(plannedGroup?.features).toHaveLength(1);
  });

  // --- Behavior 4: Deterministic sorting ---
  it('produces identical output across multiple calls (deterministic)', () => {
    const features = [
      activeFeature('B'),
      plannedFeature('A'),
      completedFeature('C'),
      noRoadmapFeature('D'),
    ];

    const result1 = groupFeaturesByStatus(features);
    const result2 = groupFeaturesByStatus(features);
    const result3 = groupFeaturesByStatus([...features].reverse());

    expect(result1).toEqual(result2);
    expect(result1).toEqual(result3);
  });

  // --- Edge cases ---
  it('returns empty groups when no features match a status', () => {
    const features = [activeFeature('Only Active')];

    const result = groupFeaturesByStatus(features);

    expect(result).toHaveLength(4);
    expect(result.find((g) => g.key === 'planned')?.features).toHaveLength(0);
    expect(result.find((g) => g.key === 'completed')?.features).toHaveLength(0);
    expect(result.find((g) => g.key === 'no-roadmap')?.features).toHaveLength(0);
  });

  it('returns all empty groups when input array is empty', () => {
    const result = groupFeaturesByStatus([]);

    expect(result).toHaveLength(4);
    for (const group of result) {
      expect(group.features).toHaveLength(0);
    }
  });
});
