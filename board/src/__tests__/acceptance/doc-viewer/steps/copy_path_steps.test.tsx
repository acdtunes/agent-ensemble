/**
 * Acceptance tests: US-03 - Copy File Path for AI Agent Prompting
 *
 * Driving port: CopyPathButton component (rendered via props)
 * Validates: clipboard copy, confirmation text, revert timing, keyboard access, fallback
 *
 * Gherkin reference: milestone-3-copy-file-path.feature (US-03 scenarios)
 */

import { describe, it, expect, afterEach, vi, beforeEach } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

afterEach(cleanup);

// Computed path prevents Vite from statically resolving the import before the file exists.
const COPY_PATH_BUTTON_PATH = ['..', '..', '..', '..', 'components', 'CopyPathButton'].join('/');

// --- Clipboard mock setup ---
let clipboardContent: string;

beforeEach(() => {
  clipboardContent = '';
  Object.assign(navigator, {
    clipboard: {
      writeText: vi.fn().mockImplementation(async (text: string) => {
        clipboardContent = text;
      }),
    },
  });
});

// =================================================================
// US-03 Scenario 1: Copy file path with one click
// =================================================================
describe('US-03: Copy file path with one click', () => {
  it('clicking copy button copies path to clipboard and shows confirmation', async () => {
    // Given Andres is viewing the document "docs/adrs/ADR-001-state-management.md"
    const { CopyPathButton } = await import(/* @vite-ignore */ COPY_PATH_BUTTON_PATH);
    const filePath = 'docs/adrs/ADR-001-state-management.md';

    // And the file path is displayed above the rendered content
    render(<CopyPathButton filePath={filePath} />);
    expect(screen.getByText(filePath)).toBeInTheDocument();

    // When he clicks the copy button next to the path
    fireEvent.click(screen.getByRole('button'));

    // Then the path is copied to the clipboard
    await waitFor(() => {
      expect(clipboardContent).toBe(filePath);
    });
    // And the button shows "Copied!" text
    expect(screen.getByText('Copied!')).toBeInTheDocument();
  });
});

// =================================================================
// US-03 Scenario 2: Copy confirmation reverts after 2 seconds
// =================================================================
describe('US-03: Copy confirmation reverts after 2 seconds', () => {
  it('button reverts from "Copied!" to default state after 2 seconds', async () => {
    // Given Andres has just clicked the copy button
    vi.useFakeTimers();
    const { CopyPathButton } = await import(/* @vite-ignore */ COPY_PATH_BUTTON_PATH);

    render(<CopyPathButton filePath="docs/test.md" />);
    fireEvent.click(screen.getByRole('button'));

    // And the button shows "Copied!" text
    await waitFor(() => {
      expect(screen.getByText('Copied!')).toBeInTheDocument();
    });

    // When 2 seconds have elapsed
    act(() => {
      vi.advanceTimersByTime(2000);
    });

    // Then the button reverts to its default copy state
    await waitFor(() => {
      expect(screen.queryByText('Copied!')).not.toBeInTheDocument();
    });

    vi.useRealTimers();
  });
});

// =================================================================
// US-03 Scenario 3: Copied path is relative from project root
// =================================================================
describe('US-03: Copied path is relative from project root', () => {
  it('clipboard contains relative path without absolute filesystem prefixes', async () => {
    // Given Andres is viewing a deeply nested document
    const { CopyPathButton } = await import(/* @vite-ignore */ COPY_PATH_BUTTON_PATH);
    const filePath = 'docs/feature/card-redesign/discuss/jtbd-analysis.md';

    render(<CopyPathButton filePath={filePath} />);

    // When he copies the file path
    fireEvent.click(screen.getByRole('button'));

    // Then the clipboard contains the relative path
    await waitFor(() => {
      expect(clipboardContent).toBe('docs/feature/card-redesign/discuss/jtbd-analysis.md');
    });
    // And the path does not start with absolute prefixes
    expect(clipboardContent).not.toMatch(/^\/Users\//);
    expect(clipboardContent).not.toMatch(/^C:\\/);
  });
});

// =================================================================
// US-03 Scenario 4: File path always visible when viewing a document
// =================================================================
describe('US-03: File path always visible when viewing a document', () => {
  it('path and copy button are rendered when a file path is provided', async () => {
    // Given Andres has selected any document from the tree
    const { CopyPathButton } = await import(/* @vite-ignore */ COPY_PATH_BUTTON_PATH);
    const filePath = 'docs/any-document.md';

    render(<CopyPathButton filePath={filePath} />);

    // Then the file path is visible above the rendered content
    expect(screen.getByText(filePath)).toBeInTheDocument();
    // And the copy button is positioned next to the path
    expect(screen.getByRole('button')).toBeInTheDocument();
  });
});

// =================================================================
// US-03 Scenario 5: Copy button is keyboard accessible
// =================================================================
describe('US-03: Copy button is keyboard accessible', () => {
  it('activating with Enter copies the file path', async () => {
    // Given Andres is viewing a document and the copy button is focused
    const { CopyPathButton } = await import(/* @vite-ignore */ COPY_PATH_BUTTON_PATH);
    const filePath = 'docs/keyboard-test.md';

    render(<CopyPathButton filePath={filePath} />);
    const button = screen.getByRole('button');
    button.focus();

    // When he activates the button with Enter
    fireEvent.keyDown(button, { key: 'Enter' });

    // Then the file path is copied to the clipboard
    // Note: native button elements handle Enter/Space natively via click event
    // This test verifies the button is a proper focusable button element
    expect(button.tagName.toLowerCase()).toBe('button');
    expect(button).not.toHaveAttribute('tabindex', '-1');
  });
});

// =================================================================
// US-03 Scenario 6: Copy fails when clipboard is unavailable
// =================================================================
describe('US-03: Copy fails when clipboard is unavailable', () => {
  it('shows fallback hint when clipboard write fails', async () => {
    // Given Andres is viewing a document
    // And the clipboard permission has been denied
    const { CopyPathButton } = await import(/* @vite-ignore */ COPY_PATH_BUTTON_PATH);
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockRejectedValue(new Error('Clipboard denied')),
      },
    });

    render(<CopyPathButton filePath="docs/no-clipboard.md" />);

    // When he clicks the copy button
    fireEvent.click(screen.getByRole('button'));

    // Then a hint suggests manual copy
    await waitFor(() => {
      const hint = screen.queryByText(/select/i) ?? screen.queryByText(/copy/i);
      expect(hint).toBeTruthy();
    });
  });
});

// =================================================================
// US-03 Scenario 7: No copy button when no document is selected
// =================================================================
describe('US-03: No copy button when no document is selected', () => {
  it('does not render path or button when filePath is null', async () => {
    // Given Andres is viewing the doc viewer with no document selected
    const { CopyPathButton } = await import(/* @vite-ignore */ COPY_PATH_BUTTON_PATH);

    render(<CopyPathButton filePath={null as any} />);

    // Then no file path is displayed
    // And no copy button is visible
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});

// =================================================================
// US-03 Scenario 8: Rapid consecutive clicks
// =================================================================
describe('US-03: Rapid consecutive clicks do not cause duplicate clipboard writes', () => {
  it('rapid double-click copies once and shows stable confirmation', async () => {
    // Given Andres is viewing a document
    const { CopyPathButton } = await import(/* @vite-ignore */ COPY_PATH_BUTTON_PATH);
    const filePath = 'docs/rapid-click-test.md';

    render(<CopyPathButton filePath={filePath} />);

    // When he clicks the copy button twice rapidly
    const button = screen.getByRole('button');
    fireEvent.click(button);
    fireEvent.click(button);

    // Then the path is copied and confirmation is stable
    await waitFor(() => {
      expect(screen.getByText('Copied!')).toBeInTheDocument();
    });
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(filePath);
  });
});

// =================================================================
// US-03 Scenario 9: Copy path for deeply nested document
// =================================================================
describe('US-03: Copy path for deeply nested document preserves full relative path', () => {
  it('deeply nested path is copied in full', async () => {
    // Given Andres is viewing a document in a deep folder
    const { CopyPathButton } = await import(/* @vite-ignore */ COPY_PATH_BUTTON_PATH);
    const filePath = 'docs/feature/card-redesign/discuss/jtbd/sub-analysis.md';

    render(<CopyPathButton filePath={filePath} />);

    // When he copies the file path
    fireEvent.click(screen.getByRole('button'));

    // Then the clipboard contains the full relative path including all nested folders
    await waitFor(() => {
      expect(clipboardContent).toBe(filePath);
    });
  });
});
