import { describe, it, expect, afterEach, vi, beforeEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

// --- Mock DirectoryBrowser to isolate AddProjectDialog behavior ---

let capturedOnSelect: ((path: string) => void) | null = null;
let capturedOnCancel: (() => void) | null = null;

vi.mock('../components/DirectoryBrowser', () => ({
  DirectoryBrowser: ({ onSelect, onCancel }: { onSelect: (path: string) => void; onCancel: () => void }) => {
    capturedOnSelect = onSelect;
    capturedOnCancel = onCancel;
    return (
      <div data-testid="directory-browser">
        <button type="button" onClick={() => onSelect('/selected/path')}>MockSelect</button>
        <button type="button" onClick={onCancel}>MockCancel</button>
      </div>
    );
  },
}));

// Import AFTER mock registration
import { AddProjectDialog } from '../components/AddProjectDialog';

afterEach(cleanup);

beforeEach(() => {
  capturedOnSelect = null;
  capturedOnCancel = null;
});

const renderDialog = (overrides: Partial<Parameters<typeof AddProjectDialog>[0]> = {}) =>
  render(
    <AddProjectDialog
      onSubmit={overrides.onSubmit ?? (() => {})}
      onCancel={overrides.onCancel ?? (() => {})}
      submitting={overrides.submitting ?? false}
      error={overrides.error ?? null}
    />
  );

// --- Acceptance: Browse button toggles to DirectoryBrowser, selecting path populates input ---

describe('AddProjectDialog', () => {
  describe('acceptance: browse integration flow', () => {
    it('shows Browse button that toggles to DirectoryBrowser, and selecting a path populates the input', () => {
      const onSubmit = vi.fn();
      renderDialog({ onSubmit });

      // Browse button is visible next to the text input
      expect(screen.getByRole('button', { name: /browse/i })).toBeInTheDocument();
      expect(screen.getByRole('textbox', { name: /project path/i })).toBeInTheDocument();

      // Click Browse -- text input hidden, DirectoryBrowser shown
      fireEvent.click(screen.getByRole('button', { name: /browse/i }));
      expect(screen.queryByRole('textbox', { name: /project path/i })).not.toBeInTheDocument();
      expect(screen.getByTestId('directory-browser')).toBeInTheDocument();

      // Select a path in DirectoryBrowser -- returns to input mode with selected path
      fireEvent.click(screen.getByText('MockSelect'));
      expect(screen.getByRole('textbox', { name: /project path/i })).toBeInTheDocument();
      expect(screen.queryByTestId('directory-browser')).not.toBeInTheDocument();
      expect(screen.getByRole('textbox', { name: /project path/i })).toHaveValue('/selected/path');

      // Can submit the selected path
      fireEvent.click(screen.getByRole('button', { name: /add$/i }));
      expect(onSubmit).toHaveBeenCalledWith('/selected/path');
    });
  });

  // --- Unit: browse mode toggle ---

  describe('browse mode toggle', () => {
    it('hides text input and shows DirectoryBrowser when Browse clicked', () => {
      renderDialog();

      fireEvent.click(screen.getByRole('button', { name: /browse/i }));

      expect(screen.queryByRole('textbox', { name: /project path/i })).not.toBeInTheDocument();
      expect(screen.getByTestId('directory-browser')).toBeInTheDocument();
    });
  });

  // --- Unit: DirectoryBrowser onCancel returns to input without changing path ---

  describe('browse cancel', () => {
    it('returns to input mode without changing path when DirectoryBrowser cancelled', () => {
      renderDialog();

      // Enter a path first
      const input = screen.getByRole('textbox', { name: /project path/i });
      fireEvent.change(input, { target: { value: '/original/path' } });

      // Toggle browse mode and cancel
      fireEvent.click(screen.getByRole('button', { name: /browse/i }));
      fireEvent.click(screen.getByText('MockCancel'));

      // Back to input mode with original path preserved
      expect(screen.getByRole('textbox', { name: /project path/i })).toHaveValue('/original/path');
      expect(screen.queryByTestId('directory-browser')).not.toBeInTheDocument();
    });
  });

  // --- Unit: outer Cancel resets browse mode ---

  describe('dialog cancel resets browse mode', () => {
    it('calls onCancel and resets browsing state when outer Cancel clicked during browse', () => {
      const onCancel = vi.fn();
      renderDialog({ onCancel });

      // Enter browse mode
      fireEvent.click(screen.getByRole('button', { name: /browse/i }));
      expect(screen.getByTestId('directory-browser')).toBeInTheDocument();

      // Click the outer Cancel button (should still be visible)
      fireEvent.click(screen.getByRole('button', { name: /^cancel$/i }));
      expect(onCancel).toHaveBeenCalledOnce();
    });
  });

  // --- Existing behavior preserved ---

  it('renders input field for project path', () => {
    renderDialog();
    expect(screen.getByRole('textbox', { name: /project path/i })).toBeInTheDocument();
  });

  it('calls onSubmit with the entered path', () => {
    const onSubmit = vi.fn();
    renderDialog({ onSubmit });

    const input = screen.getByRole('textbox', { name: /project path/i });
    fireEvent.change(input, { target: { value: '/home/user/my-project' } });
    fireEvent.click(screen.getByRole('button', { name: /add$/i }));

    expect(onSubmit).toHaveBeenCalledWith('/home/user/my-project');
  });

  it('calls onCancel when Cancel button clicked', () => {
    const onCancel = vi.fn();
    renderDialog({ onCancel });

    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it('disables submit button when submitting', () => {
    renderDialog({ submitting: true });
    expect(screen.getByRole('button', { name: /add/i })).toBeDisabled();
  });

  it('displays error message when error is set', () => {
    renderDialog({ error: 'Duplicate project' });
    expect(screen.getByText('Duplicate project')).toBeInTheDocument();
  });

  it('disables submit button when path is empty', () => {
    renderDialog();
    expect(screen.getByRole('button', { name: /add$/i })).toBeDisabled();
  });
});
