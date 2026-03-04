/**
 * Unit tests: RoadmapMeta description fields
 *
 * Verifies RoadmapMeta type accepts optional description fields.
 * Port-to-port: tests through type system (compile-time verification).
 */

import { describe, it, expect } from 'vitest';
import type { RoadmapMeta } from '../../../shared/types';

describe('RoadmapMeta description fields', () => {
  it('accepts short_description field', () => {
    // Given a RoadmapMeta object with short_description
    const meta: RoadmapMeta = {
      project_id: 'test',
      short_description: 'Brief summary',
    };

    // Then it compiles and contains the value
    expect(meta.short_description).toBe('Brief summary');
  });

  it('accepts description field', () => {
    // Given a RoadmapMeta object with description
    const meta: RoadmapMeta = {
      project_id: 'test',
      description: 'Detailed explanation of the feature',
    };

    // Then it compiles and contains the value
    expect(meta.description).toBe('Detailed explanation of the feature');
  });

  it('accepts both description fields together', () => {
    // Given a RoadmapMeta object with both fields
    const meta: RoadmapMeta = {
      project_id: 'test',
      short_description: 'Brief',
      description: 'Detailed',
    };

    // Then both are accessible
    expect(meta.short_description).toBe('Brief');
    expect(meta.description).toBe('Detailed');
  });

  it('remains backward compatible without descriptions', () => {
    // Given a RoadmapMeta object without description fields
    const meta: RoadmapMeta = {
      project_id: 'test',
      created_at: '2026-03-01',
    };

    // Then it compiles and descriptions are undefined
    expect(meta.short_description).toBeUndefined();
    expect(meta.description).toBeUndefined();
  });
});
