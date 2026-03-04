/**
 * Tests for Toast notification component and useToast hook.
 *
 * Driving port: useToast hook - show(message) function
 * Tests: Message display, auto-dismiss, positioning, single toast (no stacking)
 *
 * Acceptance criteria:
 * - Toast component renders message and auto-dismisses after 2 seconds
 * - Toast appears in fixed position (bottom-right)
 * - Toast has subtle styling matching board theme (dark bg, light text)
 * - Multiple toasts replace previous (no stacking)
 * - useToast hook provides show() function for triggering toast
 */

import { describe, it, expect, afterEach, vi, beforeEach } from 'vitest';
import { render, screen, cleanup, act, renderHook } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { Toast } from '../components/Toast';
import { useToast } from '../hooks/useToast';

afterEach(cleanup);

// --- Toast Component Tests ---

describe('Toast', () => {
  it('renders message when message prop is provided', () => {
    render(<Toast message="Copied to clipboard" />);
    expect(screen.getByText('Copied to clipboard')).toBeInTheDocument();
  });

  it('renders nothing when message is null', () => {
    const { container } = render(<Toast message={null} />);
    expect(container.firstChild).toBeNull();
  });

  it('has fixed positioning for bottom-right placement', () => {
    render(<Toast message="Test message" />);
    const toast = screen.getByRole('status');
    expect(toast).toHaveClass('fixed');
    expect(toast).toHaveClass('bottom-4');
    expect(toast).toHaveClass('right-4');
  });

  it('has dark theme styling matching board', () => {
    render(<Toast message="Test message" />);
    const toast = screen.getByRole('status');
    expect(toast).toHaveClass('bg-gray-800');
    expect(toast).toHaveClass('text-gray-100');
  });
});

// --- useToast Hook Tests ---

describe('useToast', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns null message initially', () => {
    const { result } = renderHook(() => useToast());
    expect(result.current.message).toBeNull();
  });

  it('show() sets message', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      result.current.show('Hello world');
    });

    expect(result.current.message).toBe('Hello world');
  });

  it('message auto-dismisses after 2 seconds', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      result.current.show('Temporary message');
    });

    expect(result.current.message).toBe('Temporary message');

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(result.current.message).toBeNull();
  });

  it('new message replaces previous (no stacking)', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      result.current.show('First message');
    });

    expect(result.current.message).toBe('First message');

    act(() => {
      result.current.show('Second message');
    });

    expect(result.current.message).toBe('Second message');
  });

  it('new message resets dismiss timer', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      result.current.show('First message');
    });

    act(() => {
      vi.advanceTimersByTime(1500);
    });

    act(() => {
      result.current.show('Second message');
    });

    act(() => {
      vi.advanceTimersByTime(1500);
    });

    // Should still be visible - only 1.5s elapsed since second show()
    expect(result.current.message).toBe('Second message');

    act(() => {
      vi.advanceTimersByTime(500);
    });

    // Now 2s elapsed since second show() - should be dismissed
    expect(result.current.message).toBeNull();
  });
});
