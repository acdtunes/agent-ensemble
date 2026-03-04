import { describe, it, expect } from 'vitest';
import type {
  ArchivedFeature,
  ArchiveError,
  RestoreError,
} from '../types.js';
import { createFeatureId } from '../types.js';

describe('ArchivedFeature', () => {
  it('should have featureId, name, and archivedAt fields', () => {
    const result = createFeatureId('test-feature');
    if (!result.ok) throw new Error('Invalid feature ID');

    const archived: ArchivedFeature = {
      featureId: result.value,
      name: 'Test Feature',
      archivedAt: '2026-03-04T10:00:00Z',
    };

    expect(archived.featureId).toBe('test-feature');
    expect(archived.name).toBe('Test Feature');
    expect(archived.archivedAt).toBe('2026-03-04T10:00:00Z');
  });

  it('should be readonly', () => {
    const result = createFeatureId('immutable-feature');
    if (!result.ok) throw new Error('Invalid feature ID');

    const archived: ArchivedFeature = {
      featureId: result.value,
      name: 'Immutable',
      archivedAt: '2026-03-04T10:00:00Z',
    };

    // TypeScript will prevent mutation at compile time
    // Runtime check: object should be structurally correct
    expect(Object.keys(archived)).toEqual(['featureId', 'name', 'archivedAt']);
  });
});

describe('ArchiveError', () => {
  it('should represent feature not found error', () => {
    const result = createFeatureId('missing');
    if (!result.ok) throw new Error('Invalid feature ID');

    const error: ArchiveError = {
      type: 'feature_not_found',
      featureId: result.value,
    };

    expect(error.type).toBe('feature_not_found');
    expect(error.featureId).toBe('missing');
  });

  it('should represent already archived error', () => {
    const result = createFeatureId('already-done');
    if (!result.ok) throw new Error('Invalid feature ID');

    const error: ArchiveError = {
      type: 'already_archived',
      featureId: result.value,
    };

    expect(error.type).toBe('already_archived');
    expect(error.featureId).toBe('already-done');
  });

  it('should represent invalid feature ID error', () => {
    const error: ArchiveError = {
      type: 'invalid_feature_id',
      message: 'Invalid feature ID: INVALID!',
    };

    expect(error.type).toBe('invalid_feature_id');
    expect(error.message).toContain('Invalid');
  });

  it('should represent IO error', () => {
    const error: ArchiveError = {
      type: 'io_error',
      message: 'Failed to move directory',
    };

    expect(error.type).toBe('io_error');
    expect(error.message).toBe('Failed to move directory');
  });
});

describe('RestoreError', () => {
  it('should represent feature not found in archive', () => {
    const result = createFeatureId('not-archived');
    if (!result.ok) throw new Error('Invalid feature ID');

    const error: RestoreError = {
      type: 'feature_not_found',
      featureId: result.value,
    };

    expect(error.type).toBe('feature_not_found');
    expect(error.featureId).toBe('not-archived');
  });

  it('should represent conflict with existing active feature', () => {
    const result = createFeatureId('duplicate');
    if (!result.ok) throw new Error('Invalid feature ID');

    const error: RestoreError = {
      type: 'already_exists',
      featureId: result.value,
    };

    expect(error.type).toBe('already_exists');
    expect(error.featureId).toBe('duplicate');
  });

  it('should represent invalid feature ID error', () => {
    const error: RestoreError = {
      type: 'invalid_feature_id',
      message: 'Invalid feature ID: BAD_ID',
    };

    expect(error.type).toBe('invalid_feature_id');
    expect(error.message).toContain('Invalid');
  });

  it('should represent IO error', () => {
    const error: RestoreError = {
      type: 'io_error',
      message: 'Permission denied',
    };

    expect(error.type).toBe('io_error');
    expect(error.message).toBe('Permission denied');
  });
});

describe('Discriminated union exhaustiveness', () => {
  it('ArchiveError can be narrowed by type field', () => {
    const result = createFeatureId('test');
    if (!result.ok) throw new Error('Invalid feature ID');

    const errors: ArchiveError[] = [
      { type: 'feature_not_found', featureId: result.value },
      { type: 'already_archived', featureId: result.value },
      { type: 'invalid_feature_id', message: 'bad' },
      { type: 'io_error', message: 'fail' },
    ];

    const messages = errors.map((e) => {
      switch (e.type) {
        case 'feature_not_found':
          return `Not found: ${e.featureId}`;
        case 'already_archived':
          return `Already archived: ${e.featureId}`;
        case 'invalid_feature_id':
          return e.message;
        case 'io_error':
          return e.message;
      }
    });

    expect(messages).toHaveLength(4);
  });

  it('RestoreError can be narrowed by type field', () => {
    const result = createFeatureId('test');
    if (!result.ok) throw new Error('Invalid feature ID');

    const errors: RestoreError[] = [
      { type: 'feature_not_found', featureId: result.value },
      { type: 'already_exists', featureId: result.value },
      { type: 'invalid_feature_id', message: 'bad' },
      { type: 'io_error', message: 'fail' },
    ];

    const messages = errors.map((e) => {
      switch (e.type) {
        case 'feature_not_found':
          return `Not found: ${e.featureId}`;
        case 'already_exists':
          return `Already exists: ${e.featureId}`;
        case 'invalid_feature_id':
          return e.message;
        case 'io_error':
          return e.message;
      }
    });

    expect(messages).toHaveLength(4);
  });
});
