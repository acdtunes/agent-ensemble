import { describe, it, expect, afterEach, vi, beforeEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import type { UseDirectoryBrowserResult } from '../hooks/useDirectoryBrowser';

// --- Mock setup ---

const defaultHookResult: UseDirectoryBrowserResult = {
  currentPath: '/home/user',
  parent: '/',
  entries: [],
  loading: false,
  error: null,
  navigateTo: vi.fn(),
  navigateUp: vi.fn(),
  reset: vi.fn(),
};

let mockHookReturn: UseDirectoryBrowserResult = { ...defaultHookResult };

vi.mock('../hooks/useDirectoryBrowser', () => ({
  useDirectoryBrowser: () => mockHookReturn,
}));

// Import AFTER mock registration
import { DirectoryBrowser } from '../components/DirectoryBrowser';

afterEach(cleanup);

beforeEach(() => {
  mockHookReturn = {
    ...defaultHookResult,
    navigateTo: vi.fn(),
    navigateUp: vi.fn(),
    reset: vi.fn(),
  };
});

// --- Acceptance: renders directory listing and click navigates ---

describe('DirectoryBrowser', () => {
  describe('acceptance: directory listing with navigation', () => {
    it('displays directory entries and navigates on click', () => {
      mockHookReturn = {
        ...mockHookReturn,
        currentPath: '/home/user/projects',
        entries: [
          { name: 'my-app', path: '/home/user/projects/my-app' },
          { name: 'docs', path: '/home/user/projects/docs' },
        ],
      };

      render(<DirectoryBrowser onSelect={vi.fn()} onCancel={vi.fn()} />);

      // Displays current path
      expect(screen.getByText('/home/user/projects')).toBeInTheDocument();

      // Shows directory entries
      expect(screen.getByText('my-app')).toBeInTheDocument();
      expect(screen.getByText('docs')).toBeInTheDocument();

      // Clicking a directory calls navigateTo
      fireEvent.click(screen.getByText('my-app'));
      expect(mockHookReturn.navigateTo).toHaveBeenCalledWith('/home/user/projects/my-app');
    });
  });

  // --- Unit: loading state ---

  describe('loading state', () => {
    it('shows loading indicator while fetching', () => {
      mockHookReturn = { ...mockHookReturn, loading: true, currentPath: null };

      render(<DirectoryBrowser onSelect={vi.fn()} onCancel={vi.fn()} />);

      expect(screen.getByText(/loading/i)).toBeInTheDocument();
    });
  });

  // --- Unit: error display ---

  describe('error display', () => {
    it('shows error message inline on error', () => {
      mockHookReturn = {
        ...mockHookReturn,
        error: 'Permission denied',
      };

      render(<DirectoryBrowser onSelect={vi.fn()} onCancel={vi.fn()} />);

      expect(screen.getByText('Permission denied')).toBeInTheDocument();
    });
  });

  // --- Unit: up button ---

  describe('up button', () => {
    it('calls navigateUp when clicked', () => {
      mockHookReturn = {
        ...mockHookReturn,
        currentPath: '/home/user/projects',
        parent: '/home/user',
      };

      render(<DirectoryBrowser onSelect={vi.fn()} onCancel={vi.fn()} />);

      fireEvent.click(screen.getByRole('button', { name: /up/i }));
      expect(mockHookReturn.navigateUp).toHaveBeenCalledOnce();
    });

    it.each([
      { parent: null, currentPath: '/', expectedDisabled: true },
      { parent: '/', currentPath: '/home/user', expectedDisabled: false },
    ])('is disabled=$expectedDisabled when parent=$parent', ({ parent, currentPath, expectedDisabled }) => {
      mockHookReturn = { ...mockHookReturn, currentPath, parent };

      render(<DirectoryBrowser onSelect={vi.fn()} onCancel={vi.fn()} />);

      if (expectedDisabled) {
        expect(screen.getByRole('button', { name: /up/i })).toBeDisabled();
      } else {
        expect(screen.getByRole('button', { name: /up/i })).not.toBeDisabled();
      }
    });
  });

  // --- Unit: select button ---

  describe('select button', () => {
    it('calls onSelect with currentPath when clicked', () => {
      const onSelect = vi.fn();
      mockHookReturn = {
        ...mockHookReturn,
        currentPath: '/home/user/projects',
      };

      render(<DirectoryBrowser onSelect={onSelect} onCancel={vi.fn()} />);

      fireEvent.click(screen.getByRole('button', { name: /select/i }));
      expect(onSelect).toHaveBeenCalledWith('/home/user/projects');
    });

    it('disables select button when currentPath is null', () => {
      mockHookReturn = { ...mockHookReturn, currentPath: null };

      render(<DirectoryBrowser onSelect={vi.fn()} onCancel={vi.fn()} />);

      expect(screen.getByRole('button', { name: /select/i })).toBeDisabled();
    });
  });

  // --- Unit: cancel button ---

  describe('cancel button', () => {
    it('calls onCancel when clicked', () => {
      const onCancel = vi.fn();

      render(<DirectoryBrowser onSelect={vi.fn()} onCancel={onCancel} />);

      fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
      expect(onCancel).toHaveBeenCalledOnce();
    });
  });

  // --- Unit: initial fetch on mount ---

  describe('initial fetch', () => {
    it('calls navigateTo on mount to fetch initial listing', () => {
      render(<DirectoryBrowser onSelect={vi.fn()} onCancel={vi.fn()} />);

      expect(mockHookReturn.navigateTo).toHaveBeenCalledWith();
    });
  });
});
