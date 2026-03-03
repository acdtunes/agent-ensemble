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

  describe('connection lifecycle', () => {
    it('exposes connecting status initially', () => {
      const { result } = renderHook(() => useRoadmapState('ws://localhost:8080', PROJECT_A));

      expect(result.current.connectionStatus).toBe('connecting');
      expect(result.current.roadmap).toBeNull();
      expect(result.current.transitions).toEqual([]);
      expect(result.current.error).toBeNull();
    });

    it('transitions to connected on WebSocket open', () => {
      const { result } = renderHook(() => useRoadmapState('ws://localhost:8080', PROJECT_A));
      const ws = latestWs();

      act(() => simulateOpen(ws));

      expect(result.current.connectionStatus).toBe('connected');
    });

    it('transitions to disconnected on WebSocket close', () => {
      const { result } = renderHook(() => useRoadmapState('ws://localhost:8080', PROJECT_A));
      const ws = latestWs();

      act(() => simulateOpen(ws));
      act(() => simulateClose(ws));

      expect(result.current.connectionStatus).toBe('disconnected');
    });

    it('closes WebSocket on unmount', () => {
      const { unmount } = renderHook(() => useRoadmapState('ws://localhost:8080', PROJECT_A));
      const ws = latestWs();

      act(() => simulateOpen(ws));
      unmount();

      expect(ws.close).toHaveBeenCalled();
    });
  });

  describe('project subscription', () => {
    it('sends subscribe with projectId after WS connection opens', () => {
      renderHook(() => useRoadmapState('ws://localhost:8080', PROJECT_A));
      const ws = latestWs();

      act(() => simulateOpen(ws));

      expect(ws.send).toHaveBeenCalledTimes(1);
      expect(parseSent(ws, 0)).toEqual({ type: 'subscribe', projectId: PROJECT_A });
    });

    it('sends unsubscribe for previous projectId when projectId changes', () => {
      let projectId = PROJECT_A;
      const { rerender } = renderHook(() => useRoadmapState('ws://localhost:8080', projectId));
      const ws = latestWs();

      act(() => simulateOpen(ws));
      ws.send.mockClear();

      projectId = PROJECT_B;
      rerender();

      expect(ws.send).toHaveBeenCalledTimes(2);
      expect(parseSent(ws, 0)).toEqual({ type: 'unsubscribe', projectId: PROJECT_A });
      expect(parseSent(ws, 1)).toEqual({ type: 'subscribe', projectId: PROJECT_B });
    });

    it('sends unsubscribe on unmount', () => {
      const { unmount } = renderHook(() => useRoadmapState('ws://localhost:8080', PROJECT_A));
      const ws = latestWs();

      act(() => simulateOpen(ws));
      ws.send.mockClear();

      unmount();

      expect(ws.send).toHaveBeenCalledTimes(1);
      expect(parseSent(ws, 0)).toEqual({ type: 'unsubscribe', projectId: PROJECT_A });
    });

    it('resets roadmap to null when switching projects before new init arrives', () => {
      let projectId = PROJECT_A;
      const { result, rerender } = renderHook(() => useRoadmapState('ws://localhost:8080', projectId));
      const ws = latestWs();
      const roadmap = makeRoadmap();

      act(() => {
        simulateOpen(ws);
        simulateMessage(ws, initMsg(PROJECT_A, roadmap));
      });

      expect(result.current.roadmap).toEqual(roadmap);

      projectId = PROJECT_B;
      rerender();

      expect(result.current.roadmap).toBeNull();
      expect(result.current.transitions).toEqual([]);
    });

    it('sends subscribe after reconnection', () => {
      renderHook(() => useRoadmapState('ws://localhost:8080', PROJECT_A));
      const ws1 = latestWs();

      act(() => {
        simulateOpen(ws1);
        simulateClose(ws1);
      });

      act(() => { vi.advanceTimersByTime(1000); });

      const ws2 = latestWs();
      act(() => simulateOpen(ws2));

      expect(ws2.send).toHaveBeenCalledTimes(1);
      expect(parseSent(ws2, 0)).toEqual({ type: 'subscribe', projectId: PROJECT_A });
    });
  });

  describe('roadmap message handling', () => {
    it('provides roadmap from init message for subscribed project', () => {
      const { result } = renderHook(() => useRoadmapState('ws://localhost:8080', PROJECT_A));
      const ws = latestWs();
      const roadmap = makeRoadmap();

      act(() => {
        simulateOpen(ws);
        simulateMessage(ws, initMsg(PROJECT_A, roadmap));
      });

      expect(result.current.roadmap).toEqual(roadmap);
      expect(result.current.transitions).toEqual([]);
    });

    it('ignores init messages for a different project', () => {
      const { result } = renderHook(() => useRoadmapState('ws://localhost:8080', PROJECT_A));
      const ws = latestWs();

      act(() => {
        simulateOpen(ws);
        simulateMessage(ws, initMsg(PROJECT_B, makeRoadmap()));
      });

      expect(result.current.roadmap).toBeNull();
    });

    it('updates roadmap and accumulates transitions from update messages', () => {
      const { result } = renderHook(() => useRoadmapState('ws://localhost:8080', PROJECT_A));
      const ws = latestWs();
      const initialRoadmap = makeRoadmap();
      const updatedRoadmap = makeRoadmap({
        roadmap: { project_id: 'test', created_at: '2026-01-01T00:00:00Z', total_steps: 1, phases: 1, status: 'in_progress' },
      });
      const transition = makeRoadmapTransition();

      act(() => {
        simulateOpen(ws);
        simulateMessage(ws, initMsg(PROJECT_A, initialRoadmap));
        simulateMessage(ws, updateMsg(PROJECT_A, updatedRoadmap, [transition]));
      });

      expect(result.current.roadmap).toEqual(updatedRoadmap);
      expect(result.current.transitions).toEqual([transition]);
    });

    it('ignores update messages for a different project', () => {
      const { result } = renderHook(() => useRoadmapState('ws://localhost:8080', PROJECT_A));
      const ws = latestWs();
      const roadmap = makeRoadmap();

      act(() => {
        simulateOpen(ws);
        simulateMessage(ws, initMsg(PROJECT_A, roadmap));
        simulateMessage(ws, updateMsg(PROJECT_B, makeRoadmap(), [makeRoadmapTransition()]));
      });

      expect(result.current.roadmap).toEqual(roadmap);
      expect(result.current.transitions).toEqual([]);
    });

    it('accumulates transitions across multiple updates', () => {
      const { result } = renderHook(() => useRoadmapState('ws://localhost:8080', PROJECT_A));
      const ws = latestWs();
      const t1 = makeRoadmapTransition({ timestamp: '2026-01-01T00:01:00Z' });
      const t2 = makeRoadmapTransition({ step_id: '01-02', timestamp: '2026-01-01T00:02:00Z' });

      act(() => {
        simulateOpen(ws);
        simulateMessage(ws, initMsg(PROJECT_A, makeRoadmap()));
        simulateMessage(ws, updateMsg(PROJECT_A, makeRoadmap(), [t1]));
        simulateMessage(ws, updateMsg(PROJECT_A, makeRoadmap(), [t2]));
      });

      expect(result.current.transitions).toHaveLength(2);
      expect(result.current.transitions).toContainEqual(t1);
      expect(result.current.transitions).toContainEqual(t2);
    });

    it('ignores project_list messages silently', () => {
      const { result } = renderHook(() => useRoadmapState('ws://localhost:8080', PROJECT_A));
      const ws = latestWs();

      act(() => {
        simulateOpen(ws);
        simulateMessage(ws, { type: 'project_list', projects: [] });
      });

      expect(result.current.roadmap).toBeNull();
      expect(result.current.error).toBeNull();
    });
  });

  describe('error handling', () => {
    it('exposes error on WebSocket error event', () => {
      const { result } = renderHook(() => useRoadmapState('ws://localhost:8080', PROJECT_A));
      const ws = latestWs();

      act(() => {
        ws.onerror?.(new Event('error'));
      });

      expect(result.current.error).toBe('WebSocket error');
    });

    it('exposes error on invalid JSON message', () => {
      const { result } = renderHook(() => useRoadmapState('ws://localhost:8080', PROJECT_A));
      const ws = latestWs();

      act(() => {
        simulateOpen(ws);
        ws.onmessage?.({ data: 'not valid json' });
      });

      expect(result.current.error).toMatch(/parse/i);
    });
  });

  describe('reconnection with backoff', () => {
    it('increases backoff delay on repeated failures', () => {
      renderHook(() => useRoadmapState('ws://localhost:8080', PROJECT_A));

      act(() => {
        simulateOpen(latestWs());
        simulateClose(latestWs());
      });

      act(() => { vi.advanceTimersByTime(1000); });
      expect(mockWsInstances).toHaveLength(2);

      act(() => {
        simulateOpen(latestWs());
        simulateClose(latestWs());
      });

      act(() => { vi.advanceTimersByTime(1000); });
      expect(mockWsInstances).toHaveLength(2);

      act(() => { vi.advanceTimersByTime(1000); });
      expect(mockWsInstances).toHaveLength(3);
    });

    it('resets backoff after successful connection and init', () => {
      renderHook(() => useRoadmapState('ws://localhost:8080', PROJECT_A));

      act(() => {
        simulateOpen(latestWs());
        simulateMessage(latestWs(), initMsg(PROJECT_A, makeRoadmap()));
        simulateClose(latestWs());
      });

      act(() => { vi.advanceTimersByTime(1000); });
      expect(mockWsInstances).toHaveLength(2);

      act(() => {
        simulateOpen(latestWs());
        simulateMessage(latestWs(), initMsg(PROJECT_A, makeRoadmap()));
        simulateClose(latestWs());
      });

      act(() => { vi.advanceTimersByTime(1000); });
      expect(mockWsInstances).toHaveLength(3);
    });

  });
});
