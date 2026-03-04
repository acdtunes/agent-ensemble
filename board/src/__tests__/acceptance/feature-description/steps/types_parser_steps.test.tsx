/**
 * Acceptance tests: Types and Parser for Feature Description
 *
 * Tests the data flow from roadmap.yaml through parser to FeatureSummary:
 *   - RoadmapMeta type includes description fields
 *   - Parser extracts descriptions from YAML
 *   - FeatureSummary carries descriptions for UI
 *
 * Driving port: Parser functions (validateRoadmapMeta, deriveFeatureSummary)
 *
 * Gherkin reference: milestone-1-types-parser.feature
 */

import { describe, it, expect } from 'vitest';
import {
  createRoadmapMeta,
  createRoadmapYamlWithDescriptions,
  LEGACY_ROADMAP_YAML,
  type RoadmapMetaWithDescription,
  type FeatureSummaryWithDescription,
} from './test-fixtures';
import type { FeatureId, FeatureSummary } from '../../../../../shared/types';

// Computed path prevents Vite from statically resolving import before file exists
const PARSER_PATH = ['..', '..', '..', '..', '..', 'server', 'parser'].join('/');

// =================================================================
// US-01: RoadmapMeta type includes description fields
// =================================================================

// Active - step 01-03: parser extracts short_description
describe('US-01 Scenario: RoadmapMeta type includes short_description field', () => {
  it('Given roadmap.yaml with short_description, When parser extracts, Then RoadmapMeta contains it', async () => {
    // Given a roadmap.yaml with short_description
    const yaml = createRoadmapYamlWithDescriptions('Brief feature summary');

    // When the parser extracts roadmap metadata
    const { parseRoadmapYaml } = await import(/* @vite-ignore */ PARSER_PATH);
    const result = parseRoadmapYaml(yaml);

    // Then RoadmapMeta contains short_description
    expect(result.ok).toBe(true);
    if (result.ok) {
      const meta = result.value.roadmap as RoadmapMetaWithDescription;
      expect(meta.short_description).toBe('Brief feature summary');
    }
  });
});

// Active - step 01-03: parser extracts description
describe('US-01 Scenario: RoadmapMeta type includes description field', () => {
  it('Given roadmap.yaml with description, When parser extracts, Then RoadmapMeta contains it', async () => {
    // Given a roadmap.yaml with description
    const yaml = createRoadmapYamlWithDescriptions(undefined, 'Detailed feature description for the board header');

    // When the parser extracts roadmap metadata
    const { parseRoadmapYaml } = await import(/* @vite-ignore */ PARSER_PATH);
    const result = parseRoadmapYaml(yaml);

    // Then RoadmapMeta contains description
    expect(result.ok).toBe(true);
    if (result.ok) {
      const meta = result.value.roadmap as RoadmapMetaWithDescription;
      expect(meta.description).toBe('Detailed feature description for the board header');
    }
  });
});

// Active - step 01-03: parser handles both descriptions
describe('US-01 Scenario: Parser handles both descriptions together', () => {
  it('Given roadmap.yaml with both fields, When parser extracts, Then both are in RoadmapMeta', async () => {
    // Given a roadmap.yaml with both descriptions
    const yaml = createRoadmapYamlWithDescriptions(
      'Brief summary',
      'Detailed explanation of the feature',
    );

    // When the parser extracts roadmap metadata
    const { parseRoadmapYaml } = await import(/* @vite-ignore */ PARSER_PATH);
    const result = parseRoadmapYaml(yaml);

    // Then RoadmapMeta contains both
    expect(result.ok).toBe(true);
    if (result.ok) {
      const meta = result.value.roadmap as RoadmapMetaWithDescription;
      expect(meta.short_description).toBe('Brief summary');
      expect(meta.description).toBe('Detailed explanation of the feature');
    }
  });
});

// =================================================================
// US-03: Backward compatibility
// =================================================================

// Active - step 01-03: backward compatibility
describe('US-03 Scenario: Parser handles roadmap without descriptions', () => {
  it('Given legacy roadmap.yaml, When parser extracts, Then descriptions are undefined', async () => {
    // Given a roadmap.yaml without description fields
    const yaml = LEGACY_ROADMAP_YAML;

    // When the parser extracts roadmap metadata
    const { parseRoadmapYaml } = await import(/* @vite-ignore */ PARSER_PATH);
    const result = parseRoadmapYaml(yaml);

    // Then RoadmapMeta has undefined descriptions
    expect(result.ok).toBe(true);
    if (result.ok) {
      const meta = result.value.roadmap as RoadmapMetaWithDescription;
      expect(meta.short_description).toBeUndefined();
      expect(meta.description).toBeUndefined();
    }
  });
});

// Active - step 01-03: partial descriptions
describe('US-03 Scenario: Parser handles roadmap with only short_description', () => {
  it('Given roadmap with short_description only, When parser extracts, Then only short_description present', async () => {
    // Given a roadmap.yaml with short_description only
    const yaml = createRoadmapYamlWithDescriptions('Brief summary', undefined);

    // When the parser extracts roadmap metadata
    const { parseRoadmapYaml } = await import(/* @vite-ignore */ PARSER_PATH);
    const result = parseRoadmapYaml(yaml);

    // Then RoadmapMeta has short_description but not description
    expect(result.ok).toBe(true);
    if (result.ok) {
      const meta = result.value.roadmap as RoadmapMetaWithDescription;
      expect(meta.short_description).toBe('Brief summary');
      expect(meta.description).toBeUndefined();
    }
  });
});

// Active - step 01-03: partial descriptions
describe('US-03 Scenario: Parser handles roadmap with only description', () => {
  it('Given roadmap with description only, When parser extracts, Then only description present', async () => {
    // Given a roadmap.yaml with description only
    const yaml = createRoadmapYamlWithDescriptions(undefined, 'Detailed explanation');

    // When the parser extracts roadmap metadata
    const { parseRoadmapYaml } = await import(/* @vite-ignore */ PARSER_PATH);
    const result = parseRoadmapYaml(yaml);

    // Then RoadmapMeta has description but not short_description
    expect(result.ok).toBe(true);
    if (result.ok) {
      const meta = result.value.roadmap as RoadmapMetaWithDescription;
      expect(meta.short_description).toBeUndefined();
      expect(meta.description).toBe('Detailed explanation');
    }
  });
});

// =================================================================
// FeatureSummary derivation
// =================================================================

// Placeholder for deriveFeatureSummary function until implemented
const mockDeriveFeatureSummary = (
  featureId: string,
  roadmapMeta: RoadmapMetaWithDescription,
): FeatureSummaryWithDescription => ({
  featureId: featureId as FeatureId,
  name: featureId,
  hasRoadmap: true,
  hasExecutionLog: false,
  totalSteps: roadmapMeta.total_steps ?? 0,
  done: 0,
  inProgress: 0,
  currentLayer: 0,
  updatedAt: roadmapMeta.created_at ?? '',
  shortDescription: roadmapMeta.short_description,
  description: roadmapMeta.description,
});

// Step 01-02: FeatureSummary type extension - compile-time type assertion
describe('US-01 Scenario: FeatureSummary type includes description fields', () => {
  it('FeatureSummary type accepts shortDescription and description fields', () => {
    // Type assertion: FeatureSummary must accept optional description fields
    // This test validates the TYPE, not runtime behavior
    const summary: FeatureSummary = {
      featureId: 'test-feature' as FeatureId,
      name: 'Test Feature',
      hasRoadmap: true,
      hasExecutionLog: false,
      totalSteps: 10,
      done: 5,
      inProgress: 2,
      currentLayer: 1,
      updatedAt: '2026-03-01T00:00:00Z',
      shortDescription: 'Brief summary',
      description: 'Detailed explanation',
    };

    // Runtime assertions to validate type correctness
    expect(summary.shortDescription).toBe('Brief summary');
    expect(summary.description).toBe('Detailed explanation');
  });

  it('FeatureSummary type allows undefined descriptions (backward compatibility)', () => {
    // Backward compatibility: existing code without descriptions still compiles
    const legacySummary: FeatureSummary = {
      featureId: 'legacy-feature' as FeatureId,
      name: 'Legacy Feature',
      hasRoadmap: true,
      hasExecutionLog: false,
      totalSteps: 5,
      done: 3,
      inProgress: 1,
      currentLayer: 0,
      updatedAt: '2026-03-01T00:00:00Z',
      // No shortDescription or description - should compile
    };

    expect(legacySummary.shortDescription).toBeUndefined();
    expect(legacySummary.description).toBeUndefined();
  });
});

// @skip - deriveFeatureSummary not yet updated
describe.skip('US-01 Scenario: FeatureSummary carries description', () => {
  it('Given RoadmapMeta with description, When deriveFeatureSummary, Then description present', () => {
    // Given RoadmapMeta has description
    const meta = createRoadmapMeta({ description: 'Detailed explanation' });

    // When deriveFeatureSummary is called
    const summary = mockDeriveFeatureSummary('auth-system', meta);

    // Then FeatureSummary has description
    expect(summary.description).toBe('Detailed explanation');
  });
});

// @skip - deriveFeatureSummary not yet updated
describe.skip('US-03 Scenario: FeatureSummary handles missing descriptions', () => {
  it('Given RoadmapMeta without descriptions, When deriveFeatureSummary, Then both undefined', () => {
    // Given RoadmapMeta has no description fields
    const meta = createRoadmapMeta({});

    // When deriveFeatureSummary is called
    const summary = mockDeriveFeatureSummary('auth-system', meta);

    // Then FeatureSummary has undefined descriptions
    expect(summary.shortDescription).toBeUndefined();
    expect(summary.description).toBeUndefined();
  });
});
