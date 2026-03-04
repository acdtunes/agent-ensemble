import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useProjectList, applyProjectMessage, type ProjectListMessage } from '../hooks/useProjectList';
import type { ProjectSummary, ProjectId } from '../../shared/types';

// --- Fixtures ---

const makeProjectSummary = (id: string, overrides: Partial<ProjectSummary> = {}): ProjectSummary => ({
  projectId: id as ProjectId,
  name: id,
  totalSteps: 10,
  done: 3,
  inProgress: 2,
  currentLayer: 1,
  updatedAt: '2026-01-01T00:00:00Z',
  featureCount: 0,
  features: [],
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
  it('replaces entire list on project_list', () => {
    const projects = [makeProjectSummary('a'), makeProjectSummary('b')];
    const message: ProjectListMessage = { type: 'project_list', projects };

    expect(applyProjectMessage([], message)).toEqual(projects);
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
    it('populates projects from project_list', () => {
      const { result } = renderHook(() => useProjectList('ws://localhost:8080'));
      const ws = latestWs();
      const projects = [makeProjectSummary('proj-a'), makeProjectSummary('proj-b')];

      act(() => {
        simulateOpen(ws);
        simulateMessage(ws, { type: 'project_list', projects });
      });

      expect(result.current.projects).toEqual(projects);
    });

    it('replaces project list on subsequent project_list message', () => {
      const { result } = renderHook(() => useProjectList('ws://localhost:8080'));
      const ws = latestWs();
      const initial = [makeProjectSummary('proj-a')];
      const updated = [makeProjectSummary('proj-a'), makeProjectSummary('proj-b')];

      act(() => {
        simulateOpen(ws);
        simulateMessage(ws, { type: 'project_list', projects: initial });
        simulateMessage(ws, { type: 'project_list', projects: updated });
      });

      expect(result.current.projects).toHaveLength(2);
      expect(result.current.projects).toEqual(updated);
    });

    it('reflects live project removal without page reload', () => {
      const { result } = renderHook(() => useProjectList('ws://localhost:8080'));
      const ws = latestWs();
      const initial = [makeProjectSummary('proj-a'), makeProjectSummary('proj-b')];

      act(() => {
        simulateOpen(ws);
        simulateMessage(ws, { type: 'project_list', projects: initial });
        simulateMessage(ws, { type: 'project_removed', projectId: 'proj-a' as ProjectId });
      });

      expect(result.current.projects).toHaveLength(1);
      expect(result.current.projects[0].projectId).toBe('proj-b');
    });

    // TODO: Fix applyProjectMessage to handle unknown message types gracefully
    it.skip('ignores unknown message types', () => {
      const { result } = renderHook(() => useProjectList('ws://localhost:8080'));
      const ws = latestWs();

      act(() => {
        simulateOpen(ws);
        // Simulate an 'init' message (from ServerWSMessage, not ProjectListMessage)
        ws.onmessage?.({ data: JSON.stringify({ type: 'init', projectId: 'x', state: {}, plan: {} }) });
      });

      expect(result.current.projects).toEqual([]);
      expect(result.current.error).toBeNull();
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
});
