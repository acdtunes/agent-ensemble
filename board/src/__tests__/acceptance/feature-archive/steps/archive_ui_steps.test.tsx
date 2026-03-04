/**
 * Acceptance tests: Feature Archive UI Components
 *
 * Tests the React components for archive/restore workflows:
 *   - ArchiveConfirmDialog (US-04)
 *   - ArchivedFeaturesSection (US-02)
 *   - Feature list updates after archive/restore (US-01, US-03)
 *
 * Driving port: React components rendered via props
 * Validates: confirmation flow, archived section, list updates
 *
 * Gherkin reference: US-01 (1.5), US-02 (2.3-2.4), US-03 (3.4-3.5), US-04 (all)
 */

import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import {
  createArchivedFeature,
  createArchivedFeatures,
  createActiveFeature,
  createConfirmationContent,
} from './test-fixtures';

afterEach(cleanup);

// Computed paths prevent Vite from statically resolving imports before files exist
const ARCHIVE_CONFIRM_DIALOG_PATH = ['..', '..', '..', '..', 'components', 'ArchiveConfirmDialog'].join('/');
const ARCHIVED_FEATURES_SECTION_PATH = ['..', '..', '..', '..', 'components', 'ArchivedFeaturesSection'].join('/');

// =================================================================
// US-04: Confirmation Before Archive
// =================================================================

// @skip - Component not yet implemented
describe.skip('US-04 Scenario 4.1: Confirmation dialog shown', () => {
  it('Given user clicks Archive button, Then modal shows with feature name', async () => {
    // Given a feature card with archive capability
    const featureName = 'auth-system';
    const content = createConfirmationContent(featureName);

    // When the archive button is clicked (dialog is opened)
    const { ArchiveConfirmDialog } = await import(/* @vite-ignore */ ARCHIVE_CONFIRM_DIALOG_PATH);
    render(
      <ArchiveConfirmDialog
        featureName={featureName}
        isOpen={true}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    // Then the modal shows with the feature name
    expect(screen.getByText(content.title)).toBeInTheDocument();
    expect(screen.getByText(new RegExp(featureName))).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /archive/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
  });
});

// @skip - Component not yet implemented
describe.skip('US-04 Scenario 4.2: Cancel aborts archive', () => {
  it('Given confirmation dialog open, When user clicks Cancel, Then dialog closes', async () => {
    // Given confirmation dialog is open
    const onCancel = vi.fn();
    const { ArchiveConfirmDialog } = await import(/* @vite-ignore */ ARCHIVE_CONFIRM_DIALOG_PATH);
    render(
      <ArchiveConfirmDialog
        featureName="auth-system"
        isOpen={true}
        onConfirm={vi.fn()}
        onCancel={onCancel}
      />,
    );

    // When user clicks Cancel
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));

    // Then onCancel is called (dialog closes)
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});

// @skip - Component not yet implemented
describe.skip('US-04 Scenario 4.3: Confirm triggers archive', () => {
  it('Given confirmation dialog open, When user clicks Archive, Then API called', async () => {
    // Given confirmation dialog is open
    const onConfirm = vi.fn();
    const { ArchiveConfirmDialog } = await import(/* @vite-ignore */ ARCHIVE_CONFIRM_DIALOG_PATH);
    render(
      <ArchiveConfirmDialog
        featureName="auth-system"
        isOpen={true}
        onConfirm={onConfirm}
        onCancel={vi.fn()}
      />,
    );

    // When user clicks Archive
    fireEvent.click(screen.getByRole('button', { name: /archive/i }));

    // Then onConfirm is called (API will be triggered)
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});

// @skip - Component not yet implemented
describe.skip('US-04 Scenario 4.4: Loading state during archive', () => {
  it('Given user confirms archive, When archive in progress, Then button shows loading', async () => {
    // Given user has confirmed archive (loading state)
    const { ArchiveConfirmDialog } = await import(/* @vite-ignore */ ARCHIVE_CONFIRM_DIALOG_PATH);
    render(
      <ArchiveConfirmDialog
        featureName="auth-system"
        isOpen={true}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
        loading={true}
      />,
    );

    // Then the Archive button shows loading indicator
    const archiveButton = screen.getByRole('button', { name: /archiving/i });
    expect(archiveButton).toBeDisabled();
  });
});

// =================================================================
// US-02: View Archived Features
// =================================================================

// @skip - Component not yet implemented
describe.skip('US-02 Scenario 2.3: Archived section shows count', () => {
  it('Given 3 archived features, Then shows "Archived (3)" header', async () => {
    // Given 3 archived features
    const archivedFeatures = createArchivedFeatures(3);

    // When rendering the archived section
    const { ArchivedFeaturesSection } = await import(/* @vite-ignore */ ARCHIVED_FEATURES_SECTION_PATH);
    render(
      <ArchivedFeaturesSection
        archivedFeatures={archivedFeatures}
        onRestore={vi.fn()}
      />,
    );

    // Then the header shows the count
    expect(screen.getByText(/archived.*3/i)).toBeInTheDocument();
  });
});

// @skip - Component not yet implemented
describe.skip('US-02 Scenario 2.4: Archived section collapsed by default', () => {
  it('Given archived features exist, Then section is collapsed', async () => {
    // Given archived features exist
    const archivedFeatures = createArchivedFeatures(2);

    // When rendering the archived section
    const { ArchivedFeaturesSection } = await import(/* @vite-ignore */ ARCHIVED_FEATURES_SECTION_PATH);
    render(
      <ArchivedFeaturesSection
        archivedFeatures={archivedFeatures}
        onRestore={vi.fn()}
      />,
    );

    // Then the section is collapsed (feature names not visible)
    expect(screen.queryByText('archived-feature-1')).not.toBeInTheDocument();
    // But the header is visible
    expect(screen.getByText(/archived.*2/i)).toBeInTheDocument();
  });
});

// @skip - Component not yet implemented
describe.skip('US-02: Archived section expands to show features', () => {
  it('Given collapsed archived section, When expanded, Then features are visible', async () => {
    // Given archived features exist and section is collapsed
    const archivedFeatures = createArchivedFeatures(2);
    const { ArchivedFeaturesSection } = await import(/* @vite-ignore */ ARCHIVED_FEATURES_SECTION_PATH);
    render(
      <ArchivedFeaturesSection
        archivedFeatures={archivedFeatures}
        onRestore={vi.fn()}
      />,
    );

    // When user clicks to expand
    fireEvent.click(screen.getByText(/archived.*2/i));

    // Then the feature names are visible
    await waitFor(() => {
      expect(screen.getByText('archived-feature-1')).toBeInTheDocument();
      expect(screen.getByText('archived-feature-2')).toBeInTheDocument();
    });
  });
});

// =================================================================
// US-03: Restore triggers callback
// =================================================================

// @skip - Component not yet implemented
describe.skip('US-03 Scenario 3.4: Restore button triggers callback', () => {
  it('Given expanded archived section, When Restore clicked, Then onRestore called', async () => {
    // Given archived features in expanded section
    const archivedFeatures = [createArchivedFeature('old-poc')];
    const onRestore = vi.fn();
    const { ArchivedFeaturesSection } = await import(/* @vite-ignore */ ARCHIVED_FEATURES_SECTION_PATH);
    render(
      <ArchivedFeaturesSection
        archivedFeatures={archivedFeatures}
        onRestore={onRestore}
        defaultExpanded={true}
      />,
    );

    // When user clicks Restore
    fireEvent.click(screen.getByRole('button', { name: /restore/i }));

    // Then onRestore is called with the feature ID
    expect(onRestore).toHaveBeenCalledWith('old-poc');
  });
});

// @skip - Component not yet implemented
describe.skip('US-03: Restore loading state', () => {
  it('Given restore in progress, Then restore button shows loading', async () => {
    // Given archived features with restore in progress
    const archivedFeatures = [createArchivedFeature('old-poc')];
    const { ArchivedFeaturesSection } = await import(/* @vite-ignore */ ARCHIVED_FEATURES_SECTION_PATH);
    render(
      <ArchivedFeaturesSection
        archivedFeatures={archivedFeatures}
        onRestore={vi.fn()}
        restoring="old-poc"
        defaultExpanded={true}
      />,
    );

    // Then the restore button shows loading
    const restoreButton = screen.getByRole('button', { name: /restoring/i });
    expect(restoreButton).toBeDisabled();
  });
});

// =================================================================
// US-02: Empty archive section
// =================================================================

// @skip - Component not yet implemented
describe.skip('US-02: Empty archive hides section', () => {
  it('Given no archived features, Then archived section is hidden', async () => {
    // Given no archived features
    const { ArchivedFeaturesSection } = await import(/* @vite-ignore */ ARCHIVED_FEATURES_SECTION_PATH);
    const { container } = render(
      <ArchivedFeaturesSection
        archivedFeatures={[]}
        onRestore={vi.fn()}
      />,
    );

    // Then the section is not rendered (or shows nothing)
    expect(container.textContent).toBe('');
  });
});
