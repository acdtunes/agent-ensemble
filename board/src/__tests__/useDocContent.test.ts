/**
 * Unit tests for useDocContent hook.
 *
 * Driving port: useDocContent(projectId, docPath, featureId?)
 * Tests: fetch lifecycle, loading/error/success states, retry, empty content, feature-scoped fetch
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

// Computed path prevents Vite from statically resolving before file exists.
const HOOK_PATH = ['..', 'hooks', 'useDocContent'].join('/');

// --- Fetch mock helpers ---

const createFetchSuccess = (content: string) =>
  vi.fn().mockResolvedValue({
    ok: true,
    text: () => Promise.resolve(content),
  } as Partial<Response>);

const createFetchError = (status: number, body: { error: string }) =>
  vi.fn().mockResolvedValue({
    ok: false,
    status,
    json: () => Promise.resolve(body),
  } as Partial<Response>);

const createFetchNetworkError = () =>
  vi.fn().mockRejectedValue(new Error('Network error'));

beforeEach(() => {
  vi.stubGlobal('fetch', createFetchSuccess(''));
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('useDocContent', () => {
  it('returns idle state when docPath is null', async () => {
    const { useDocContent } = await import(/* @vite-ignore */ HOOK_PATH);
    const { result } = renderHook(() => useDocContent('my-project', null));

    expect(result.current.content).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('fetches content when docPath is provided', async () => {
    const markdown = '# Hello World';
    vi.stubGlobal('fetch', createFetchSuccess(markdown));

    const { useDocContent } = await import(/* @vite-ignore */ HOOK_PATH);
    const { result } = renderHook(() => useDocContent('my-project', 'docs/readme.md'));

    // Initially loading
    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.content).toBe(markdown);
    expect(result.current.error).toBeNull();
    expect(fetch).toHaveBeenCalledWith(
      '/api/projects/my-project/docs/content?path=docs%2Freadme.md',
    );
  });

  it('sets error on HTTP failure', async () => {
    vi.stubGlobal('fetch', createFetchError(404, { error: 'Document not found' }));

    const { useDocContent } = await import(/* @vite-ignore */ HOOK_PATH);
    const { result } = renderHook(() => useDocContent('my-project', 'missing.md'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.content).toBeNull();
    expect(result.current.error).toBe('Document not found');
  });

  it('sets error on network failure', async () => {
    vi.stubGlobal('fetch', createFetchNetworkError());

    const { useDocContent } = await import(/* @vite-ignore */ HOOK_PATH);
    const { result } = renderHook(() => useDocContent('my-project', 'readme.md'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.content).toBeNull();
    expect(result.current.error).toBe('Failed to load document');
  });

  it('retry re-fetches the same path', async () => {
    const fetchMock = createFetchError(500, { error: 'Server error' });
    vi.stubGlobal('fetch', fetchMock);

    const { useDocContent } = await import(/* @vite-ignore */ HOOK_PATH);
    const { result } = renderHook(() => useDocContent('my-project', 'readme.md'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('Server error');

    // Switch to success for retry
    vi.stubGlobal('fetch', createFetchSuccess('# Retry Success'));

    act(() => {
      result.current.retry();
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.content).toBe('# Retry Success');
    expect(result.current.error).toBeNull();
  });

  it('handles empty document content', async () => {
    vi.stubGlobal('fetch', createFetchSuccess(''));

    const { useDocContent } = await import(/* @vite-ignore */ HOOK_PATH);
    const { result } = renderHook(() => useDocContent('my-project', 'empty.md'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.content).toBe('');
    expect(result.current.error).toBeNull();
  });

  it('re-fetches when docPath changes', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, text: () => Promise.resolve('# First') } as Partial<Response>)
      .mockResolvedValueOnce({ ok: true, text: () => Promise.resolve('# Second') } as Partial<Response>);
    vi.stubGlobal('fetch', fetchMock);

    const { useDocContent } = await import(/* @vite-ignore */ HOOK_PATH);
    const { result, rerender } = renderHook(
      ({ path }: { path: string | null }) => useDocContent('my-project', path),
      { initialProps: { path: 'first.md' as string | null } },
    );

    await waitFor(() => {
      expect(result.current.content).toBe('# First');
    });

    rerender({ path: 'second.md' });

    await waitFor(() => {
      expect(result.current.content).toBe('# Second');
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('fetches feature-scoped content when featureId provided', async () => {
    const markdown = '# Feature Doc';
    vi.stubGlobal('fetch', createFetchSuccess(markdown));

    const { useDocContent } = await import(/* @vite-ignore */ HOOK_PATH);
    const { result } = renderHook(() =>
      useDocContent('my-project', 'spec.md', 'auth-flow'),
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.content).toBe(markdown);
    expect(fetch).toHaveBeenCalledWith(
      '/api/projects/my-project/features/auth-flow/docs/content?path=spec.md',
    );
  });

  it('fetches project-level content when featureId is undefined', async () => {
    vi.stubGlobal('fetch', createFetchSuccess('# Project Doc'));

    const { useDocContent } = await import(/* @vite-ignore */ HOOK_PATH);
    const { result } = renderHook(() =>
      useDocContent('my-project', 'readme.md', undefined),
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(fetch).toHaveBeenCalledWith(
      '/api/projects/my-project/docs/content?path=readme.md',
    );
  });
});
