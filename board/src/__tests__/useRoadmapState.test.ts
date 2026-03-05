import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useRoadmapState } from '../hooks/useRoadmapState';
import type { Roadmap, RoadmapTransition, ServerWSMessage, ProjectId } from '../../shared/types';

// --- Test fixtures (pure data) ---

const PROJECT_A = 'project-a' as ProjectId;
const PROJECT_B = 'project-b' as ProjectId;

const makeRoadmap = (overrides: Partial<Roadmap> = {}): Roadmap => ({
  roadmap: { project_id: 'test', created_at: '2026-01-01T00:00:00Z', total_steps: 1, phases: 1 },
  phases: [
    {
      id: '01',
      name: 'Phase 01',
      steps: [
        {
          id: '01-01',
          name: 'Step 01-01',
          files_to_modify: [],
          dependencies: [],
          criteria: [],
          status: 'pending',
          teammate_id: null,
          started_at: null,
          completed_at: null,
          review_attempts: 0,
        },
      ],
    },
  ],
  ...overrides,
});

const makeRoadmapTransition = (overrides: Partial<RoadmapTransition> = {}): RoadmapTransition => ({
  step_id: '01-01',
  from_status: 'pending',
  to_status: 'in_progress',
  teammate_id: null,
  timestamp: '2026-01-01T00:01:00Z',
  ...overrides,
});

// --- Mock WebSocket ---

type WSEventHandler = (event: { data: string }) => void;
type WSCloseHandler = (event?: { code?: number; reason?: string }) => void;
type WSOpenHandler = () => void;
type WSErrorHandler = (event: Event) => void;

interface MockWebSocketInstance {
  onopen: WSOpenHandler | null;
  onclose: WSCloseHandler | null;
  onmessage: WSEventHandler | null;
  onerror: WSErrorHandler | null;
  close: ReturnType<typeof vi.fn>;
  send: ReturnType<typeof vi.fn>;
  readyState: number;
  url: string;
}

let mockWsInstances: MockWebSocketInstance[] = [];

const createMockWebSocketClass = () => {
  mockWsInstances = [];
  return vi.fn().mockImplementation((url: string) => {
    const instance: MockWebSocketInstance = {
      onopen: null,
      onclose: null,
      onmessage: null,
      onerror: null,
      close: vi.fn(),
      send: vi.fn(),
      readyState: 0,
      url,
    };
    mockWsInstances.push(instance);
    return instance;
  });
};

const latestWs = (): MockWebSocketInstance => mockWsInstances[mockWsInstances.length - 1];

const simulateOpen = (ws: MockWebSocketInstance): void => {
  ws.readyState = 1;
  ws.onopen?.();
};

const initMsg = (projectId: ProjectId, roadmap: Roadmap): ServerWSMessage => ({
  type: 'init',
  projectId,
  roadmap,
});

const updateMsg = (projectId: ProjectId, roadmap: Roadmap, roadmapTransitions: RoadmapTransition[]): ServerWSMessage => ({
  type: 'update',
  projectId,
  roadmap,
  roadmapTransitions,
});

const simulateMessage = (ws: MockWebSocketInstance, message: ServerWSMessage): void => {
  ws.onmessage?.({ data: JSON.stringify(message) });
};

const simulateClose = (ws: MockWebSocketInstance): void => {
  ws.readyState = 3;
  ws.onclose?.();
};

const parseSent = (ws: MockWebSocketInstance, callIndex: number) =>
  JSON.parse(ws.send.mock.calls[callIndex][0] as string);

// --- Tests ---

describe('useRoadmapState hook', () => {
  let MockWebSocket: ReturnType<typeof createMockWebSocketClass>;
  const originalWebSocket = globalThis.WebSocket;

  beforeEach(() => {
    vi.useFakeTimers();
    MockWebSocket = createMockWebSocketClass();
    (globalThis as Record<string, unknown>).WebSocket = MockWebSocket;
  });

  afterEach(() => {
    vi.useRealTimers();
    (globalThis as Record<string, unknown>).WebSocket = originalWebSocket;
  });

  it('progresses through connection states: connecting → connected → disconnected', () => {
    const { result } = renderHook(() => useRoadmapState('ws://localhost:8080', PROJECT_A));
    const ws = latestWs();

    // Initial state
    expect(result.current.connectionStatus).toBe('connecting');
    expect(result.current.roadmap).toBeNull();
    expect(result.current.transitions).toEqual([]);

    // After open
    act(() => simulateOpen(ws));
    expect(result.current.connectionStatus).toBe('connected');

    // After close
    act(() => simulateClose(ws));
    expect(result.current.connectionStatus).toBe('disconnected');
  });

  it('sends subscribe on open, unsubscribe on unmount, and closes WebSocket', () => {
    const { unmount } = renderHook(() => useRoadmapState('ws://localhost:8080', PROJECT_A));
    const ws = latestWs();

    act(() => simulateOpen(ws));
    expect(parseSent(ws, 0)).toEqual({ type: 'subscribe', projectId: PROJECT_A });

    ws.send.mockClear();
    unmount();

    expect(parseSent(ws, 0)).toEqual({ type: 'unsubscribe', projectId: PROJECT_A });
    expect(ws.close).toHaveBeenCalled();
  });

  it('handles project switch: unsubscribes old, subscribes new, resets state', () => {
    let projectId = PROJECT_A;
    const { result, rerender } = renderHook(() => useRoadmapState('ws://localhost:8080', projectId));
    const ws = latestWs();
    const roadmap = makeRoadmap();

    act(() => {
      simulateOpen(ws);
      simulateMessage(ws, initMsg(PROJECT_A, roadmap));
    });
    expect(result.current.roadmap).toEqual(roadmap);

    ws.send.mockClear();
    projectId = PROJECT_B;
    rerender();

    expect(parseSent(ws, 0)).toEqual({ type: 'unsubscribe', projectId: PROJECT_A });
    expect(parseSent(ws, 1)).toEqual({ type: 'subscribe', projectId: PROJECT_B });
    expect(result.current.roadmap).toBeNull();
    expect(result.current.transitions).toEqual([]);
  });

  it('provides roadmap from init message and filters by projectId', () => {
    const { result } = renderHook(() => useRoadmapState('ws://localhost:8080', PROJECT_A));
    const ws = latestWs();
    const roadmap = makeRoadmap();

    act(() => {
      simulateOpen(ws);
      // Init for different project - should be ignored
      simulateMessage(ws, initMsg(PROJECT_B, makeRoadmap()));
    });
    expect(result.current.roadmap).toBeNull();

    act(() => {
      // Init for subscribed project - should be accepted
      simulateMessage(ws, initMsg(PROJECT_A, roadmap));
    });
    expect(result.current.roadmap).toEqual(roadmap);
  });

  it('updates roadmap and accumulates transitions, filtering by projectId', () => {
    const { result } = renderHook(() => useRoadmapState('ws://localhost:8080', PROJECT_A));
    const ws = latestWs();
    const t1 = makeRoadmapTransition({ timestamp: '2026-01-01T00:01:00Z' });
    const t2 = makeRoadmapTransition({ step_id: '01-02', timestamp: '2026-01-01T00:02:00Z' });

    act(() => {
      simulateOpen(ws);
      simulateMessage(ws, initMsg(PROJECT_A, makeRoadmap()));
      simulateMessage(ws, updateMsg(PROJECT_A, makeRoadmap(), [t1]));
      simulateMessage(ws, updateMsg(PROJECT_A, makeRoadmap(), [t2]));
      // Update from different project - should be ignored
      simulateMessage(ws, updateMsg(PROJECT_B, makeRoadmap(), [makeRoadmapTransition()]));
    });

    expect(result.current.transitions).toHaveLength(2);
    expect(result.current.transitions).toContainEqual(t1);
    expect(result.current.transitions).toContainEqual(t2);
  });

  it('exposes errors from WebSocket errors and invalid JSON', () => {
    const { result } = renderHook(() => useRoadmapState('ws://localhost:8080', PROJECT_A));
    const ws = latestWs();

    // WebSocket error
    act(() => ws.onerror?.(new Event('error')));
    expect(result.current.error).toBe('WebSocket error');

    // Invalid JSON (simulating fresh hook to test parse error)
    const { result: result2 } = renderHook(() => useRoadmapState('ws://localhost:8080', PROJECT_A));
    const ws2 = latestWs();

    act(() => {
      simulateOpen(ws2);
      ws2.onmessage?.({ data: 'not valid json' });
    });
    expect(result2.current.error).toMatch(/parse/i);
  });

  it('reconnects with exponential backoff, resetting after successful init', () => {
    renderHook(() => useRoadmapState('ws://localhost:8080', PROJECT_A));

    // First disconnect - reconnects after 1s
    act(() => {
      simulateOpen(latestWs());
      simulateClose(latestWs());
    });
    act(() => vi.advanceTimersByTime(1000));
    expect(mockWsInstances).toHaveLength(2);

    // Second disconnect without init - backoff doubles to 2s
    act(() => {
      simulateOpen(latestWs());
      simulateClose(latestWs());
    });
    act(() => vi.advanceTimersByTime(1000));
    expect(mockWsInstances).toHaveLength(2); // Not reconnected yet
    act(() => vi.advanceTimersByTime(1000));
    expect(mockWsInstances).toHaveLength(3);

    // Successful init resets backoff
    act(() => {
      simulateOpen(latestWs());
      simulateMessage(latestWs(), initMsg(PROJECT_A, makeRoadmap()));
      simulateClose(latestWs());
    });
    act(() => vi.advanceTimersByTime(1000));
    expect(mockWsInstances).toHaveLength(4); // Reconnects after 1s
  });

  it('re-subscribes to current project after reconnection', () => {
    renderHook(() => useRoadmapState('ws://localhost:8080', PROJECT_A));

    act(() => {
      simulateOpen(latestWs());
      simulateClose(latestWs());
    });
    act(() => vi.advanceTimersByTime(1000));

    const ws2 = latestWs();
    act(() => simulateOpen(ws2));

    expect(parseSent(ws2, 0)).toEqual({ type: 'subscribe', projectId: PROJECT_A });
  });
});
