import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useProjectList, applyProjectMessage, type ProjectListMessage } from '../hooks/useProjectList';
import type { ProjectSummary, ProjectId } from '../../shared/types';

// --- Fixtures ---

const makeProjectSummary = (id: string, overrides: Partial<ProjectSummary> = {}): ProjectSummary => ({
  projectId: id as ProjectId,
  name: id,
  totalSteps: 10,
  completed: 3,
  failed: 0,
  inProgress: 2,
  currentLayer: 1,
  updatedAt: '2026-01-01T00:00:00Z',
  ...overrides,
});

// --- Mock WebSocket (same pattern as useDeliveryState tests) ---

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

const simulateMessage = (ws: MockWebSocketInstance, message: ProjectListMessage): void => {
  ws.onmessage?.({ data: JSON.stringify(message) });
};

const simulateClose = (ws: MockWebSocketInstance): void => {
  ws.readyState = 3;
  ws.onclose?.();
};

// --- Pure function tests ---

describe('applyProjectMessage', () => {
  it('replaces entire list on projects_snapshot', () => {
    const projects = [makeProjectSummary('a'), makeProjectSummary('b')];
    const message: ProjectListMessage = { type: 'projects_snapshot', projects };

    expect(applyProjectMessage([], message)).toEqual(projects);
  });

  it('appends project on project_added', () => {
    const existing = [makeProjectSummary('a')];
    const added = makeProjectSummary('b');
    const message: ProjectListMessage = { type: 'project_added', project: added };

    const result = applyProjectMessage(existing, message);
    expect(result).toHaveLength(2);
    expect(result).toContainEqual(added);
  });

  it('updates existing project on project_added with same id', () => {
    const existing = [makeProjectSummary('a')];
    const updated = makeProjectSummary('a', { completed: 7 });
    const message: ProjectListMessage = { type: 'project_added', project: updated };

    const result = applyProjectMessage(existing, message);
    expect(result).toHaveLength(1);
    expect(result[0].completed).toBe(7);
  });

  it('removes project on project_removed', () => {
    const existing = [makeProjectSummary('a'), makeProjectSummary('b')];
    const message: ProjectListMessage = { type: 'project_removed', projectId: 'a' as ProjectId };

    const result = applyProjectMessage(existing, message);
    expect(result).toHaveLength(1);
    expect(result[0].projectId).toBe('b');
  });

  it('returns unchanged list when removing nonexistent project', () => {
    const existing = [makeProjectSummary('a')];
    const message: ProjectListMessage = { type: 'project_removed', projectId: 'z' as ProjectId };

    expect(applyProjectMessage(existing, message)).toEqual(existing);
  });
});

// --- Hook tests ---

describe('useProjectList', () => {
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
    it('starts with connecting status and empty projects', () => {
      const { result } = renderHook(() => useProjectList('ws://localhost:8080'));

      expect(result.current.connectionStatus).toBe('connecting');
      expect(result.current.projects).toEqual([]);
      expect(result.current.error).toBeNull();
    });

    it('transitions to connected on open', () => {
      const { result } = renderHook(() => useProjectList('ws://localhost:8080'));

      act(() => simulateOpen(latestWs()));

      expect(result.current.connectionStatus).toBe('connected');
    });

    it('transitions to disconnected on close', () => {
      const { result } = renderHook(() => useProjectList('ws://localhost:8080'));

      act(() => {
        simulateOpen(latestWs());
        simulateClose(latestWs());
      });

      expect(result.current.connectionStatus).toBe('disconnected');
    });

    it('closes WebSocket on unmount', () => {
      const { unmount } = renderHook(() => useProjectList('ws://localhost:8080'));

      act(() => simulateOpen(latestWs()));
      unmount();

      expect(latestWs().close).toHaveBeenCalled();
    });
  });

  describe('message handling', () => {
    it('populates projects from projects_snapshot', () => {
      const { result } = renderHook(() => useProjectList('ws://localhost:8080'));
      const ws = latestWs();
      const projects = [makeProjectSummary('proj-a'), makeProjectSummary('proj-b')];

      act(() => {
        simulateOpen(ws);
        simulateMessage(ws, { type: 'projects_snapshot', projects });
      });

      expect(result.current.projects).toEqual(projects);
    });

    it('reflects live project addition without page reload', () => {
      const { result } = renderHook(() => useProjectList('ws://localhost:8080'));
      const ws = latestWs();
      const initial = [makeProjectSummary('proj-a')];
      const added = makeProjectSummary('proj-b');

      act(() => {
        simulateOpen(ws);
        simulateMessage(ws, { type: 'projects_snapshot', projects: initial });
        simulateMessage(ws, { type: 'project_added', project: added });
      });

      expect(result.current.projects).toHaveLength(2);
      expect(result.current.projects).toContainEqual(added);
    });

    it('reflects live project removal without page reload', () => {
      const { result } = renderHook(() => useProjectList('ws://localhost:8080'));
      const ws = latestWs();
      const initial = [makeProjectSummary('proj-a'), makeProjectSummary('proj-b')];

      act(() => {
        simulateOpen(ws);
        simulateMessage(ws, { type: 'projects_snapshot', projects: initial });
        simulateMessage(ws, { type: 'project_removed', projectId: 'proj-a' as ProjectId });
      });

      expect(result.current.projects).toHaveLength(1);
      expect(result.current.projects[0].projectId).toBe('proj-b');
    });
  });

  describe('error handling', () => {
    it('exposes error on WebSocket error event', () => {
      const { result } = renderHook(() => useProjectList('ws://localhost:8080'));

      act(() => latestWs().onerror?.(new Event('error')));

      expect(result.current.error).toBe('WebSocket error');
    });

    it('exposes error on invalid JSON', () => {
      const { result } = renderHook(() => useProjectList('ws://localhost:8080'));

      act(() => {
        simulateOpen(latestWs());
        latestWs().onmessage?.({ data: 'bad json' });
      });

      expect(result.current.error).toMatch(/parse/i);
    });
  });

  describe('reconnection', () => {
    it('reconnects after disconnect', () => {
      renderHook(() => useProjectList('ws://localhost:8080'));

      act(() => {
        simulateOpen(latestWs());
        simulateClose(latestWs());
      });

      expect(mockWsInstances).toHaveLength(1);

      act(() => { vi.advanceTimersByTime(1000); });

      expect(mockWsInstances).toHaveLength(2);
    });

    it('does not reconnect after unmount', () => {
      const { unmount } = renderHook(() => useProjectList('ws://localhost:8080'));

      act(() => {
        simulateOpen(latestWs());
        simulateClose(latestWs());
      });

      unmount();
      act(() => { vi.advanceTimersByTime(5000); });

      expect(mockWsInstances).toHaveLength(1);
    });
  });
});
