import { useState, useEffect, useRef, useCallback } from 'react';
import type { Roadmap, RoadmapTransition, ServerWSMessage, ClientWSMessage, ProjectId } from '../../shared/types';

// --- Connection status (exhaustive union) ---

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected';

// --- Hook return type ---

export interface UseRoadmapStateResult {
  readonly roadmap: Roadmap | null;
  readonly transitions: readonly RoadmapTransition[];
  readonly connectionStatus: ConnectionStatus;
  readonly error: string | null;
}

// --- Pure functions ---

const parseMessage = (data: string): ServerWSMessage => JSON.parse(data) as ServerWSMessage;

const computeNextBackoff = (current: number): number => Math.min(current * 2, 30_000);

const serializeMessage = (message: ClientWSMessage): string => JSON.stringify(message);

const BASE_BACKOFF_MS = 1000;

// --- Hook ---

export const useRoadmapState = (url: string, projectId: ProjectId): UseRoadmapStateResult => {
  const [roadmap, setRoadmap] = useState<Roadmap | null>(null);
  const [transitions, setTransitions] = useState<readonly RoadmapTransition[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connecting');
  const [error, setError] = useState<string | null>(null);

  const backoffRef = useRef(BASE_BACKOFF_MS);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const unmountedRef = useRef(false);
  const receivedInitRef = useRef(false);
  const wsRef = useRef<WebSocket | null>(null);
  const projectIdRef = useRef(projectId);

  const sendMessage = useCallback((ws: WebSocket, message: ClientWSMessage): void => {
    if (ws.readyState === WebSocket.OPEN || ws.readyState === 1) {
      ws.send(serializeMessage(message));
    }
  }, []);

  const connect = useCallback(() => {
    if (unmountedRef.current) return;

    setConnectionStatus('connecting');
    receivedInitRef.current = false;
    const ws = new WebSocket(url);

    ws.onopen = () => {
      if (unmountedRef.current) return;
      setConnectionStatus('connected');
      sendMessage(ws, { type: 'subscribe', projectId: projectIdRef.current });
    };

    ws.onmessage = (event: { data: string }) => {
      if (unmountedRef.current) return;
      try {
        const message = parseMessage(event.data);
        handleMessage(message);
      } catch {
        setError('Failed to parse message');
      }
    };

    ws.onerror = () => {
      if (unmountedRef.current) return;
      setError('WebSocket error');
    };

    ws.onclose = () => {
      if (unmountedRef.current) return;
      setConnectionStatus('disconnected');

      if (receivedInitRef.current) {
        backoffRef.current = BASE_BACKOFF_MS;
      }

      scheduleReconnect();
    };

    const matchesProject = (msg: { projectId: ProjectId; featureId?: string }): boolean =>
      !msg.featureId && msg.projectId === projectIdRef.current;

    const handleMessage = (message: ServerWSMessage): void => {
      switch (message.type) {
        case 'init':
          if (matchesProject(message)) {
            setRoadmap(message.roadmap);
            receivedInitRef.current = true;
          }
          break;
        case 'update':
          if (matchesProject(message)) {
            setRoadmap(message.roadmap);
            setTransitions((prev) => [...prev, ...message.roadmapTransitions]);
          }
          break;
        case 'project_list':
          break;
      }
    };

    const scheduleReconnect = (): void => {
      if (unmountedRef.current) return;
      const delay = backoffRef.current;
      backoffRef.current = computeNextBackoff(delay);
      reconnectTimerRef.current = setTimeout(connect, delay);
    };

    wsRef.current = ws;
  }, [url, sendMessage]);

  useEffect(() => {
    unmountedRef.current = false;
    connect();

    return () => {
      unmountedRef.current = true;
      if (wsRef.current) {
        sendMessage(wsRef.current, { type: 'unsubscribe', projectId: projectIdRef.current });
        wsRef.current.close();
      }
      if (reconnectTimerRef.current !== null) {
        clearTimeout(reconnectTimerRef.current);
      }
    };
  }, [connect, sendMessage]);

  useEffect(() => {
    const previousProjectId = projectIdRef.current;
    if (previousProjectId === projectId) return;

    projectIdRef.current = projectId;

    setRoadmap(null);
    setTransitions([]);

    if (wsRef.current) {
      sendMessage(wsRef.current, { type: 'unsubscribe', projectId: previousProjectId });
      sendMessage(wsRef.current, { type: 'subscribe', projectId });
    }
  }, [projectId, sendMessage]);

  return { roadmap, transitions, connectionStatus, error };
};
