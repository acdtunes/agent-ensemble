/**
 * Test fixtures for feature-archive acceptance tests
 *
 * Pure functions that create test data for archive/restore scenarios.
 */

import type { FeatureId } from '../../../../shared/types';

// --- ArchivedFeature fixture ---

export interface ArchivedFeatureFixture {
  readonly featureId: FeatureId;
  readonly name: string;
  readonly archivedAt: string;
}

export const createArchivedFeature = (
  featureId: string,
  archivedAt: string = '2026-03-01T10:30:00.000Z',
): ArchivedFeatureFixture => ({
  featureId: featureId as FeatureId,
  name: featureId,
  archivedAt,
});

// --- Multiple archived features ---

export const createArchivedFeatures = (count: number): readonly ArchivedFeatureFixture[] =>
  Array.from({ length: count }, (_, i) =>
    createArchivedFeature(`archived-feature-${i + 1}`, `2026-03-0${i + 1}T10:00:00.000Z`),
  );

// --- Feature card props fixture ---

export interface FeatureCardPropsFixture {
  readonly featureId: string;
  readonly name: string;
  readonly hasRoadmap: boolean;
  readonly totalSteps: number;
  readonly done: number;
  readonly inProgress: number;
}

export const createActiveFeature = (
  featureId: string,
  opts: { totalSteps?: number; done?: number; inProgress?: number } = {},
): FeatureCardPropsFixture => ({
  featureId,
  name: featureId,
  hasRoadmap: true,
  totalSteps: opts.totalSteps ?? 10,
  done: opts.done ?? 5,
  inProgress: opts.inProgress ?? 2,
});

// --- Confirmation dialog content ---

export const createConfirmationContent = (featureName: string) => ({
  title: 'Archive Feature?',
  message: `Are you sure you want to archive "${featureName}"?`,
  description: 'The feature will be moved to the archive and can be restored later.',
  confirmLabel: 'Archive',
  cancelLabel: 'Cancel',
});

// --- Error messages ---

export const ERROR_MESSAGES = {
  featureNotFound: (featureId: string) => `Feature '${featureId}' not found`,
  alreadyArchived: (featureId: string) => `Feature '${featureId}' is already archived`,
  alreadyExists: (featureId: string) => `Feature '${featureId}' already exists in active features`,
  archiveFailed: (reason: string) => `Failed to archive: ${reason}`,
  restoreFailed: (reason: string) => `Failed to restore: ${reason}`,
} as const;
