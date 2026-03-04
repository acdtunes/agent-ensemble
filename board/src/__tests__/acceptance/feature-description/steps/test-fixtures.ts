/**
 * Test fixtures for feature-description acceptance tests
 *
 * Pure functions that create test data for description display scenarios.
 */

import type { FeatureId, RoadmapMeta, Roadmap } from '../../../../../shared/types';

// --- Extended RoadmapMeta with description fields (not yet in types.ts) ---

export interface RoadmapMetaWithDescription extends RoadmapMeta {
  readonly short_description?: string;
  readonly description?: string;
}

// --- Extended FeatureSummary with description fields (not yet in types.ts) ---

export interface FeatureSummaryWithDescription {
  readonly featureId: FeatureId;
  readonly name: string;
  readonly hasRoadmap: boolean;
  readonly hasExecutionLog: boolean;
  readonly totalSteps: number;
  readonly done: number;
  readonly inProgress: number;
  readonly currentLayer: number;
  readonly updatedAt: string;
  readonly shortDescription?: string;
  readonly description?: string;
}

// --- RoadmapMeta fixture builder ---

export const createRoadmapMeta = (
  overrides?: Partial<RoadmapMetaWithDescription>,
): RoadmapMetaWithDescription => ({
  project_id: 'test-project',
  created_at: '2026-03-01T00:00:00Z',
  total_steps: 5,
  phases: 2,
  ...overrides,
});

// --- FeatureSummary fixture builder ---

export const createFeatureSummary = (
  featureId: string,
  overrides?: Partial<FeatureSummaryWithDescription>,
): FeatureSummaryWithDescription => ({
  featureId: featureId as FeatureId,
  name: featureId,
  hasRoadmap: true,
  hasExecutionLog: false,
  totalSteps: 10,
  done: 5,
  inProgress: 2,
  currentLayer: 1,
  updatedAt: '2026-03-01T10:00:00.000Z',
  ...overrides,
});

// --- Feature with descriptions ---

export const createFeatureWithDescriptions = (
  featureId: string,
  shortDescription?: string,
  description?: string,
): FeatureSummaryWithDescription =>
  createFeatureSummary(featureId, {
    shortDescription,
    description,
  });

// --- Feature without descriptions (backward compatibility) ---

export const createLegacyFeature = (
  featureId: string,
): FeatureSummaryWithDescription =>
  createFeatureSummary(featureId, {
    shortDescription: undefined,
    description: undefined,
  });

// --- Roadmap with description metadata ---

export const createRoadmapWithDescriptions = (
  shortDescription?: string,
  description?: string,
): Roadmap & { roadmap: RoadmapMetaWithDescription } => ({
  roadmap: createRoadmapMeta({
    short_description: shortDescription,
    description: description,
  }),
  phases: [
    {
      id: 'phase-01',
      name: 'Setup',
      steps: [
        {
          id: '01-01',
          name: 'Initialize',
          files_to_modify: [],
          dependencies: [],
          criteria: [],
          status: 'approved',
          teammate_id: null,
          started_at: null,
          completed_at: null,
          review_attempts: 0,
        },
      ],
    },
  ],
});

// --- Legacy roadmap without description fields ---

export const createLegacyRoadmap = (): Roadmap => ({
  roadmap: {
    project_id: 'test-project',
    created_at: '2026-03-01T00:00:00Z',
    total_steps: 1,
    phases: 1,
  },
  phases: [
    {
      id: 'phase-01',
      name: 'Setup',
      steps: [
        {
          id: '01-01',
          name: 'Initialize',
          files_to_modify: [],
          dependencies: [],
          criteria: [],
          status: 'pending',
          teammate_id: null,
          started_at: null,
          completed_at: null,
          review_attempts: 0,
        },
      ],
    },
  ],
});

// --- YAML string fixtures for parser tests ---

export const createRoadmapYamlWithDescriptions = (
  shortDescription?: string,
  description?: string,
): string => {
  const lines = [
    'roadmap:',
    '  project_id: test-project',
    '  created_at: "2026-03-01T00:00:00Z"',
  ];

  if (shortDescription !== undefined) {
    lines.push(`  short_description: "${shortDescription}"`);
  }

  if (description !== undefined) {
    lines.push(`  description: "${description}"`);
  }

  lines.push(
    'phases:',
    '  - id: phase-01',
    '    name: Setup',
    '    steps:',
    '      - id: "01-01"',
    '        name: Initialize',
    '        status: pending',
  );

  return lines.join('\n');
};

export const LEGACY_ROADMAP_YAML = `
roadmap:
  project_id: test-project
  created_at: "2026-03-01T00:00:00Z"
phases:
  - id: phase-01
    name: Setup
    steps:
      - id: "01-01"
        name: Initialize
        status: pending
`;

// --- Long description for truncation tests ---

export const LONG_DESCRIPTION =
  'This is a very long description that exceeds the available space on the card and should be truncated with an ellipsis to maintain visual consistency across all feature cards in the grid layout';

// --- Special character descriptions for escaping tests ---

export const SPECIAL_CHARS_SHORT = 'Handles OAuth2 & JWT tokens';
export const SPECIAL_CHARS_LONG = 'Supports <script> tags are escaped & quotes "work"';
