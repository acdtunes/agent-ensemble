import { describe, it, expect, afterEach, vi, beforeEach } from 'vitest';
import { render, screen, cleanup, act, renderHook } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { Toast } from '../components/Toast';
import { useToast } from '../hooks/useToast';

afterEach(cleanup);

describe('Toast', () => {
  it('renders message when provided, nothing when null', () => {
    const { rerender, container } = render(<Toast message="Copied" />);
    expect(screen.getByText('Copied')).toBeInTheDocument();

    rerender(<Toast message={null} />);
    expect(container.firstChild).toBeNull();
  });
});

describe('useToast', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('show() sets message that auto-dismisses after 2s', () => {
    const { result } = renderHook(() => useToast());
    expect(result.current.message).toBeNull();

    act(() => result.current.show('Hello'));
    expect(result.current.message).toBe('Hello');

    act(() => vi.advanceTimersByTime(2000));
    expect(result.current.message).toBeNull();
  });

  it('new message replaces previous and resets timer', () => {
    const { result } = renderHook(() => useToast());

    act(() => result.current.show('First'));
    act(() => vi.advanceTimersByTime(1500));
    act(() => result.current.show('Second'));

    expect(result.current.message).toBe('Second');

    act(() => vi.advanceTimersByTime(1500));
    expect(result.current.message).toBe('Second'); // still visible

    act(() => vi.advanceTimersByTime(500));
    expect(result.current.message).toBeNull(); // now dismissed
  });
});
