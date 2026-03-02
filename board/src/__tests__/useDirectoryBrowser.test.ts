import { describe, it, expect, afterEach, vi, beforeEach } from 'vitest';
import { renderHook, act, cleanup } from '@testing-library/react';
import { useDirectoryBrowser } from '../hooks/useDirectoryBrowser';
import type { BrowseResponse } from '../../shared/types';

afterEach(cleanup);

// --- Test fixtures ---

const createBrowseResponse = (
  overrides: Partial<BrowseResponse> = {},
): BrowseResponse => ({
  path: '/home/user',
  parent: '/',
  entries: [
    { name: 'projects', path: '/home/user/projects' },
    { name: 'documents', path: '/home/user/documents' },
  ],
  ...overrides,
});

const stubFetchSuccess = (response: BrowseResponse): void => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(response),
    }),
  );
};

const stubFetchFailure = (status: number, errorBody: { error: string }): void => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: false,
      status,
      json: () => Promise.resolve(errorBody),
    }),
  );
};

const stubFetchNetworkError = (): void => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockRejectedValue(new Error('Network error')),
  );
};

// --- Acceptance test ---

describe('useDirectoryBrowser', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('acceptance: hook fetches and returns directory listing', () => {
    it('navigateTo fetches directory and returns entries with path', async () => {
      const browseResponse = createBrowseResponse();
      stubFetchSuccess(browseResponse);

      const { result } = renderHook(() => useDirectoryBrowser());

      await act(async () => {
        await result.current.navigateTo('/home/user');
      });

      expect(result.current.currentPath).toBe('/home/user');
      expect(result.current.entries).toEqual(browseResponse.entries);
      expect(result.current.error).toBeNull();
      expect(result.current.loading).toBe(false);
      expect(fetch).toHaveBeenCalledWith(
        '/api/browse?path=%2Fhome%2Fuser',
      );
    });
  });

  // --- Unit tests ---

  describe('initial state', () => {
    it('returns empty entries, no error, not loading', () => {
      const { result } = renderHook(() => useDirectoryBrowser());

      expect(result.current.currentPath).toBeNull();
      expect(result.current.entries).toEqual([]);
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
    });
  });

  describe('navigateTo', () => {
    it('sets loading true during fetch', async () => {
      let resolveFetch!: (value: unknown) => void;
      vi.stubGlobal(
        'fetch',
        vi.fn().mockReturnValue(
          new Promise((resolve) => {
            resolveFetch = resolve;
          }),
        ),
      );

      const { result } = renderHook(() => useDirectoryBrowser());

      act(() => {
        result.current.navigateTo('/some/path');
      });

      expect(result.current.loading).toBe(true);

      await act(async () => {
        resolveFetch({
          ok: true,
          json: () => Promise.resolve(createBrowseResponse({ path: '/some/path' })),
        });
      });

      expect(result.current.loading).toBe(false);
    });

    it('encodes the path as query parameter', async () => {
      stubFetchSuccess(createBrowseResponse({ path: '/path with spaces' }));

      const { result } = renderHook(() => useDirectoryBrowser());

      await act(async () => {
        await result.current.navigateTo('/path with spaces');
      });

      expect(fetch).toHaveBeenCalledWith(
        '/api/browse?path=%2Fpath%20with%20spaces',
      );
    });

    it('clears previous error on successful fetch', async () => {
      stubFetchFailure(404, { error: 'Not found' });
      const { result } = renderHook(() => useDirectoryBrowser());

      await act(async () => {
        await result.current.navigateTo('/bad/path');
      });
      expect(result.current.error).toBe('Not found');

      stubFetchSuccess(createBrowseResponse({ path: '/good/path' }));

      await act(async () => {
        await result.current.navigateTo('/good/path');
      });
      expect(result.current.error).toBeNull();
    });
  });

  describe('error handling', () => {
    it('sets error string when server responds with error', async () => {
      stubFetchFailure(404, { error: 'Directory not found' });

      const { result } = renderHook(() => useDirectoryBrowser());

      await act(async () => {
        await result.current.navigateTo('/nonexistent');
      });

      expect(result.current.error).toBe('Directory not found');
      expect(result.current.entries).toEqual([]);
      expect(result.current.loading).toBe(false);
    });

    it('sets fallback error on network failure', async () => {
      stubFetchNetworkError();

      const { result } = renderHook(() => useDirectoryBrowser());

      await act(async () => {
        await result.current.navigateTo('/some/path');
      });

      expect(result.current.error).toBe('Failed to browse directory');
      expect(result.current.entries).toEqual([]);
      expect(result.current.loading).toBe(false);
    });
  });

  describe('navigateUp', () => {
    it('navigates to parent directory from response', async () => {
      const browseResponse = createBrowseResponse({
        path: '/home/user/projects',
        parent: '/home/user',
      });
      stubFetchSuccess(browseResponse);

      const { result } = renderHook(() => useDirectoryBrowser());

      await act(async () => {
        await result.current.navigateTo('/home/user/projects');
      });

      const parentResponse = createBrowseResponse({
        path: '/home/user',
        parent: '/',
        entries: [{ name: 'projects', path: '/home/user/projects' }],
      });
      stubFetchSuccess(parentResponse);

      await act(async () => {
        await result.current.navigateUp();
      });

      expect(result.current.currentPath).toBe('/home/user');
      expect(fetch).toHaveBeenLastCalledWith(
        '/api/browse?path=%2Fhome%2Fuser',
      );
    });

    it('does nothing when parent is null (root directory)', async () => {
      const rootResponse = createBrowseResponse({
        path: '/',
        parent: null,
        entries: [{ name: 'home', path: '/home' }],
      });
      stubFetchSuccess(rootResponse);

      const { result } = renderHook(() => useDirectoryBrowser());

      await act(async () => {
        await result.current.navigateTo('/');
      });

      const fetchMock = fetch as ReturnType<typeof vi.fn>;
      const callCountAfterNavigate = fetchMock.mock.calls.length;

      await act(async () => {
        await result.current.navigateUp();
      });

      expect(fetchMock.mock.calls.length).toBe(callCountAfterNavigate);
      expect(result.current.currentPath).toBe('/');
    });
  });

  describe('reset', () => {
    it('navigates to default path (no path param)', async () => {
      const initialResponse = createBrowseResponse({
        path: '/home/user/deep/nested',
        parent: '/home/user/deep',
      });
      stubFetchSuccess(initialResponse);

      const { result } = renderHook(() => useDirectoryBrowser());

      await act(async () => {
        await result.current.navigateTo('/home/user/deep/nested');
      });

      const defaultResponse = createBrowseResponse({
        path: '/home/user',
        parent: '/',
      });
      stubFetchSuccess(defaultResponse);

      await act(async () => {
        await result.current.reset();
      });

      expect(result.current.currentPath).toBe('/home/user');
      expect(fetch).toHaveBeenLastCalledWith('/api/browse');
    });
  });
});
