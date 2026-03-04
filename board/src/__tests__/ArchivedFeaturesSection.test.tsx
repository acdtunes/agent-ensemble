/**
 * Unit tests: ArchivedFeaturesSection
 *
 * Tests the collapsible section for displaying archived features:
 *   - Section collapsed by default
 *   - Header shows archived count
 *   - Expand/collapse toggle
 *   - Lists features with restore button and timestamp
 *   - Hidden when empty
 *
 * Driving port: React component rendered via props
 */

import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { ArchivedFeaturesSection } from '../components/ArchivedFeaturesSection';
import type { ArchivedFeature, FeatureId } from '../../shared/types';

afterEach(cleanup);

// --- Pure helpers ---

const createArchivedFeature = (
  featureId: string,
  name: string,
  archivedAt: string,
): ArchivedFeature => ({
  featureId: featureId as FeatureId,
  name,
  archivedAt,
});

const renderSection = (
  overrides: Partial<Parameters<typeof ArchivedFeaturesSection>[0]> = {},
) =>
  render(
    <ArchivedFeaturesSection
      archivedFeatures={overrides.archivedFeatures ?? []}
      onRestore={overrides.onRestore ?? vi.fn()}
      restoringFeatureId={overrides.restoringFeatureId ?? null}
    />,
  );

// --- Acceptance: Section hidden when empty ---

describe('ArchivedFeaturesSection', () => {
  describe('when no features are archived', () => {
    it('renders nothing', () => {
      const { container } = renderSection({ archivedFeatures: [] });

      expect(container).toBeEmptyDOMElement();
    });
  });

  // --- Acceptance: Section collapsed by default ---

  describe('when features are archived', () => {
    const archivedFeatures = [
      createArchivedFeature('auth-poc', 'Auth POC', '2024-03-01T10:00:00Z'),
      createArchivedFeature('old-api', 'Old API', '2024-02-15T14:30:00Z'),
    ];

    it('shows header with count', () => {
      renderSection({ archivedFeatures });

      expect(screen.getByText(/Archived/)).toBeInTheDocument();
      expect(screen.getByText(/\(2\)/)).toBeInTheDocument();
    });

    it('is collapsed by default', () => {
      renderSection({ archivedFeatures });

      expect(screen.queryByText('Auth POC')).not.toBeInTheDocument();
      expect(screen.queryByText('Old API')).not.toBeInTheDocument();
    });

    it('expands when header is clicked', () => {
      renderSection({ archivedFeatures });

      fireEvent.click(screen.getByRole('button', { name: /archived/i }));

      expect(screen.getByText('Auth POC')).toBeInTheDocument();
      expect(screen.getByText('Old API')).toBeInTheDocument();
    });

    it('collapses when header is clicked again', () => {
      renderSection({ archivedFeatures });
      const header = screen.getByRole('button', { name: /archived/i });

      fireEvent.click(header); // expand
      fireEvent.click(header); // collapse

      expect(screen.queryByText('Auth POC')).not.toBeInTheDocument();
    });
  });

  // --- Acceptance: Restore button on each feature ---

  describe('expanded section', () => {
    const archivedFeatures = [
      createArchivedFeature('auth-poc', 'Auth POC', '2024-03-01T10:00:00Z'),
    ];

    const expandSection = () => {
      fireEvent.click(screen.getByRole('button', { name: /archived/i }));
    };

    it('shows restore button for each feature', () => {
      renderSection({ archivedFeatures });
      expandSection();

      expect(screen.getByRole('button', { name: /restore/i })).toBeInTheDocument();
    });

    it('shows archived timestamp', () => {
      renderSection({ archivedFeatures });
      expandSection();

      // Timestamp should be displayed in human-readable format
      expect(screen.getByText(/Mar 1, 2024/i)).toBeInTheDocument();
    });

    it('calls onRestore with featureId when restore clicked', () => {
      const onRestore = vi.fn();
      renderSection({ archivedFeatures, onRestore });
      expandSection();

      fireEvent.click(screen.getByRole('button', { name: /restore/i }));

      expect(onRestore).toHaveBeenCalledWith('auth-poc');
    });
  });

  // --- Acceptance: Loading state during restore ---

  describe('restore loading state', () => {
    const archivedFeatures = [
      createArchivedFeature('auth-poc', 'Auth POC', '2024-03-01T10:00:00Z'),
      createArchivedFeature('old-api', 'Old API', '2024-02-15T14:30:00Z'),
    ];

    const expandSection = () => {
      fireEvent.click(screen.getByRole('button', { name: /archived/i }));
    };

    it('shows "Restoring..." and disables button for restoring feature', () => {
      renderSection({ archivedFeatures, restoringFeatureId: 'auth-poc' });
      expandSection();

      const restoringButton = screen.getByRole('button', { name: /restoring/i });
      expect(restoringButton).toBeDisabled();
    });

    it('other restore buttons remain enabled', () => {
      renderSection({ archivedFeatures, restoringFeatureId: 'auth-poc' });
      expandSection();

      const buttons = screen.getAllByRole('button', { name: /restore/i });
      const enabledRestoreButton = buttons.find((btn) => !btn.hasAttribute('disabled'));
      expect(enabledRestoreButton).toBeInTheDocument();
    });
  });
});
