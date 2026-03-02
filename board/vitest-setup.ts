import { vi } from 'vitest';

// Bridge vitest's `vi` to a global `jest` object for @testing-library/dom compatibility.
// @testing-library/dom's `jestFakeTimersAreEnabled()` checks `typeof jest !== 'undefined'`
// to detect fake timers and properly advance them inside `waitFor`. Without this bridge,
// `waitFor` hangs when `vi.useFakeTimers()` is active because its internal `setTimeout`
// and the asyncWrapper's microtask-drain `setTimeout(0)` are both faked.
(globalThis as any).jest = {
  advanceTimersByTime: vi.advanceTimersByTime.bind(vi),
};
