/**
 * Unit tests for useFeatureState hook.
 *
 * Driving port: useFeatureState(projectId, featureId, wsUrl)
 * Tests: WebSocket subscription, realtime updates, connection states
 *
 * Acceptance criteria:
 * - Hook subscribes to WebSocket with projectId AND featureId
 * - Hook receives init message and returns roadmap with computed summary
 * - Hook receives update messages and updates roadmap in realtime
 * - Connection status reflects WebSocket state
 * - Loading state true until init received
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import type { ServerWSMessage, Roadmap, ProjectId, FeatureId } from '../../shared/types';

// --- WebSocket mock ---

type MessageHandler = (event: { data: string }) => void;
type EventHandler = () => void;

class MockWebSocket {
  static instances: MockWebSocket[] = [];
  static OPEN = 1;
  static CLOSED = 3;

  url: string;
  readyState = MockWebSocket.OPEN;
  onopen: EventHandler | null = null;
  onmessage: MessageHandler | null = null;
  onerror: EventHandler | null = null;
  onclose: EventHandler | null = null;
  sentMessages: string[] = [];

  constructor(url: string) {
    this.url = url;
    MockWebSocket.instances.push(this);
    // Simulate async open
    setTimeout(() => this.onopen?.(), 0);
  }

  send(data: string): void {
    this.sentMessages.push(data);
  }

  close(): void {
    this.readyState = MockWebSocket.CLOSED;
    this.onclose?.();
  }

  // Test helpers
  simulateMessage(msg: ServerWSMessage): void {
    this.onmessage?.({ data: JSON.stringify(msg) });
  }

  simulateError(): void {
    this.onerror?.();
  }

  simulateClose(): void {
    this.readyState = MockWebSocket.CLOSED;
    this.onclose?.();
  }
}

const HOOK_PATH = ['..', 'hooks', 'useFeatureState'].join('/');

// --- Fixtures ---

const makeRoadmap = (): Roadmap => ({
  roadmap: { project_id: 'my-project', created_at: '2026-03-01T00:00:00Z', total_steps: 2, phases: 1 },
  phases: [{
    id: '01',
    name: 'Foundation',
    steps: [
      {
        id: '01-01', name: 'Step A', files_to_modify: [], dependencies: [], criteria: [],
        status: 'approved', teammate_id: 'crafter-01',
        started_at: null, completed_at: null, review_attempts: 1,
      },
      {
        id: '01-02', name: 'Step B', files_to_modify: [], dependencies: [], criteria: [],
        status: 'in_progress', teammate_id: 'crafter-02',
        started_at: null, completed_at: null, review_attempts: 0,
      },
    ],
  }],
});

const makeUpdatedRoadmap = (): Roadmap => ({
  roadmap: { project_id: 'my-project', created_at: '2026-03-01T00:00:00Z', total_steps: 2, phases: 1 },
  phases: [{
    id: '01',
    name: 'Foundation',
    steps: [
      {
        id: '01-01', name: 'Step A', files_to_modify: [], dependencies: [], criteria: [],
        status: 'approved', teammate_id: 'crafter-01',
        started_at: null, completed_at: null, review_attempts: 1,
      },
      {
        id: '01-02', name: 'Step B', files_to_modify: [], dependencies: [], criteria: [],
        status: 'approved', teammate_id: 'crafter-02',
        started_at: null, completed_at: null, review_attempts: 1,
      },
    ],
  }],
});

beforeEach(() => {
  MockWebSocket.instances = [];
  vi.stubGlobal('WebSocket', MockWebSocket);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('useFeatureState', () => {
  it('subscribes with projectId and featureId on connect', async () => {
    const { useFeatureState } = await import(/* @vite-ignore */ HOOK_PATH);
    renderHook(() => useFeatureState('my-project', 'auth-flow', 'ws://localhost:3001'));

    await waitFor(() => {
      expect(MockWebSocket.instances.length).toBe(1);
    });

    const ws = MockWebSocket.instances[0];
    await waitFor(() => {
      expect(ws.sentMessages.length).toBeGreaterThan(0);
    });

    const subscribeMsg = JSON.parse(ws.sentMessages[0]);
    expect(subscribeMsg).toEqual({
      type: 'subscribe',
      projectId: 'my-project' as ProjectId,
      featureId: 'auth-flow' as FeatureId,
    });
  });

  it('returns roadmap and summary after receiving init message', async () => {
    const { useFeatureState } = await import(/* @vite-ignore */ HOOK_PATH);
    const { result } = renderHook(() => useFeatureState('my-project', 'auth-flow', 'ws://localhost:3001'));

    expect(result.current.loading).toBe(true);
    expect(result.current.connectionStatus).toBe('connecting');

    await waitFor(() => {
      expect(MockWebSocket.instances.length).toBe(1);
    });

    const ws = MockWebSocket.instances[0];
    const roadmap = makeRoadmap();

    act(() => {
      ws.simulateMessage({
        type: 'init',
        projectId: 'my-project' as ProjectId,
        featureId: 'auth-flow' as FeatureId,
        roadmap,
      });
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.roadmap).toEqual(roadmap);
    expect(result.current.summary).toEqual({
      total_steps: 2,
      total_phases: 1,
      done: 1,
      in_progress: 1,
      pending: 0,
    });
    expect(result.current.error).toBeNull();
  });

  it('updates roadmap on receiving update message', async () => {
    const { useFeatureState } = await import(/* @vite-ignore */ HOOK_PATH);
    const { result } = renderHook(() => useFeatureState('my-project', 'auth-flow', 'ws://localhost:3001'));

    await waitFor(() => {
      expect(MockWebSocket.instances.length).toBe(1);
    });

    const ws = MockWebSocket.instances[0];
    const roadmap = makeRoadmap();

    act(() => {
      ws.simulateMessage({
        type: 'init',
        projectId: 'my-project' as ProjectId,
        featureId: 'auth-flow' as FeatureId,
        roadmap,
      });
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const updatedRoadmap = makeUpdatedRoadmap();

    act(() => {
      ws.simulateMessage({
        type: 'update',
        projectId: 'my-project' as ProjectId,
        featureId: 'auth-flow' as FeatureId,
        roadmap: updatedRoadmap,
        roadmapTransitions: [{ step_id: '01-02', from_status: 'in_progress', to_status: 'approved', teammate_id: null, timestamp: '2026-03-01T04:00:00Z' }],
      });
    });

    await waitFor(() => {
      expect(result.current.roadmap).toEqual(updatedRoadmap);
    });

    expect(result.current.summary?.done).toBe(2);
    expect(result.current.summary?.in_progress).toBe(0);
    expect(result.current.transitions.length).toBe(1);
  });

  it('ignores messages for different features', async () => {
    const { useFeatureState } = await import(/* @vite-ignore */ HOOK_PATH);
    const { result } = renderHook(() => useFeatureState('my-project', 'auth-flow', 'ws://localhost:3001'));

    await waitFor(() => {
      expect(MockWebSocket.instances.length).toBe(1);
    });

    const ws = MockWebSocket.instances[0];

    act(() => {
      ws.simulateMessage({
        type: 'init',
        projectId: 'my-project' as ProjectId,
        featureId: 'other-feature' as FeatureId,
        roadmap: makeRoadmap(),
      });
    });

    // Should still be loading because we didn't get OUR init
    expect(result.current.loading).toBe(true);
    expect(result.current.roadmap).toBeNull();
  });

  it('resubscribes when featureId changes', async () => {
    const { useFeatureState } = await import(/* @vite-ignore */ HOOK_PATH);
    const { result, rerender } = renderHook(
      ({ featureId }: { featureId: string }) => useFeatureState('my-project', featureId, 'ws://localhost:3001'),
      { initialProps: { featureId: 'auth-flow' as FeatureId } },
    );

    await waitFor(() => {
      expect(MockWebSocket.instances.length).toBe(1);
    });

    const ws = MockWebSocket.instances[0];

    act(() => {
      ws.simulateMessage({
        type: 'init',
        projectId: 'my-project' as ProjectId,
        featureId: 'auth-flow' as FeatureId,
        roadmap: makeRoadmap(),
      });
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    ws.sentMessages = [];

    rerender({ featureId: 'user-profile' as FeatureId });

    await waitFor(() => {
      expect(ws.sentMessages.length).toBe(2);
    });

    const unsubscribeMsg = JSON.parse(ws.sentMessages[0]);
    const subscribeMsg = JSON.parse(ws.sentMessages[1]);

    expect(unsubscribeMsg).toEqual({
      type: 'unsubscribe',
      projectId: 'my-project' as ProjectId,
      featureId: 'auth-flow' as FeatureId,
    });
    expect(subscribeMsg).toEqual({
      type: 'subscribe',
      projectId: 'my-project' as ProjectId,
      featureId: 'user-profile' as FeatureId,
    });

    expect(result.current.loading).toBe(true);
    expect(result.current.roadmap).toBeNull();
  });

  it('shows disconnected status on WebSocket close', async () => {
    const { useFeatureState } = await import(/* @vite-ignore */ HOOK_PATH);
    const { result } = renderHook(() => useFeatureState('my-project', 'auth-flow', 'ws://localhost:3001'));

    await waitFor(() => {
      expect(result.current.connectionStatus).toBe('connected');
    });

    const ws = MockWebSocket.instances[0];

    act(() => {
      ws.simulateClose();
    });

    await waitFor(() => {
      expect(result.current.connectionStatus).toBe('disconnected');
    });
  });

  it('sets error on WebSocket error', async () => {
    const { useFeatureState } = await import(/* @vite-ignore */ HOOK_PATH);
    const { result } = renderHook(() => useFeatureState('my-project', 'auth-flow', 'ws://localhost:3001'));

    await waitFor(() => {
      expect(MockWebSocket.instances.length).toBe(1);
    });

    const ws = MockWebSocket.instances[0];

    act(() => {
      ws.simulateError();
    });

    await waitFor(() => {
      expect(result.current.error).toBe('WebSocket error');
    });
  });
});
