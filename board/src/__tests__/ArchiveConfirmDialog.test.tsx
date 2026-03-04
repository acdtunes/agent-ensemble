/**
 * Unit tests: ArchiveConfirmDialog
 *
 * Tests the modal confirmation dialog for feature archiving:
 *   - Modal displays feature name
 *   - Cancel closes without action
 *   - Confirm triggers callback
 *   - Loading state shown during archive
 *
 * Driving port: React component rendered via props
 */

import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { ArchiveConfirmDialog } from '../components/ArchiveConfirmDialog';

afterEach(cleanup);

// --- Pure helper: render with defaults ---

const renderDialog = (overrides: Partial<Parameters<typeof ArchiveConfirmDialog>[0]> = {}) =>
  render(
    <ArchiveConfirmDialog
      featureName={overrides.featureName ?? 'test-feature'}
      isOpen={overrides.isOpen ?? true}
      onConfirm={overrides.onConfirm ?? vi.fn()}
      onCancel={overrides.onCancel ?? vi.fn()}
      loading={overrides.loading ?? false}
    />,
  );

// --- Acceptance: Modal displays feature name ---

describe('ArchiveConfirmDialog', () => {
  describe('when isOpen is true', () => {
    it('displays dialog with feature name and action buttons', () => {
      const featureName = 'auth-system';
      renderDialog({ featureName });

      expect(screen.getByText('Archive Feature?')).toBeInTheDocument();
      expect(screen.getByText(new RegExp(featureName))).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /archive/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    });
  });

  describe('when isOpen is false', () => {
    it('renders nothing', () => {
      const { container } = renderDialog({ isOpen: false });

      expect(container).toBeEmptyDOMElement();
    });
  });

  // --- Behavior: Cancel closes without action ---

  describe('cancel button', () => {
    it('calls onCancel when clicked', () => {
      const onCancel = vi.fn();
      renderDialog({ onCancel });

      fireEvent.click(screen.getByRole('button', { name: /cancel/i }));

      expect(onCancel).toHaveBeenCalledTimes(1);
    });

    it('does not call onConfirm when cancel clicked', () => {
      const onConfirm = vi.fn();
      renderDialog({ onConfirm });

      fireEvent.click(screen.getByRole('button', { name: /cancel/i }));

      expect(onConfirm).not.toHaveBeenCalled();
    });
  });

  // --- Behavior: Confirm triggers callback ---

  describe('archive button', () => {
    it('calls onConfirm when clicked', () => {
      const onConfirm = vi.fn();
      renderDialog({ onConfirm });

      fireEvent.click(screen.getByRole('button', { name: /archive/i }));

      expect(onConfirm).toHaveBeenCalledTimes(1);
    });

    it('does not call onCancel when archive clicked', () => {
      const onCancel = vi.fn();
      renderDialog({ onCancel });

      fireEvent.click(screen.getByRole('button', { name: /archive/i }));

      expect(onCancel).not.toHaveBeenCalled();
    });
  });

  // --- Behavior: Loading state during archive ---

  describe('loading state', () => {
    it('disables archive button when loading', () => {
      renderDialog({ loading: true });

      const archiveButton = screen.getByRole('button', { name: /archiving/i });
      expect(archiveButton).toBeDisabled();
    });

    it('disables cancel button when loading', () => {
      renderDialog({ loading: true });

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      expect(cancelButton).toBeDisabled();
    });

    it('shows "Archiving..." text on button when loading', () => {
      renderDialog({ loading: true });

      expect(screen.getByRole('button', { name: /archiving/i })).toBeInTheDocument();
    });
  });
});
