import { useState, useEffect, useRef, useCallback } from 'react';
import type { Roadmap, RoadmapTransition, RoadmapSummary, ServerWSMessage, ClientWSMessage, FeatureId } from '../../shared/types';
import { computeRoadmapSummary } from '../../shared/types';

// --- Connection status (exhaustive union) ---

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected';

// --- Hook return type ---

export interface UseFeatureStateResult {
  readonly roadmap: Roadmap | null;
  readonly summary: RoadmapSummary | null;
  readonly transitions: readonly RoadmapTransition[];
  readonly connectionStatus: ConnectionStatus;
  readonly loading: boolean;
  readonly error: string | null;
}

// --- Pure functions ---

const parseMessage = (data: string): ServerWSMessage => JSON.parse(data) as ServerWSMessage;

const computeNextBackoff = (current: number): number => Math.min(current * 2, 30_000);

const serializeMessage = (message: ClientWSMessage): string => JSON.stringify(message);

const BASE_BACKOFF_MS = 1000;

// --- Hook ---

export const useFeatureState = (
  projectId: string,
  featureId: string,
  wsUrl: string = `ws://${window.location.hostname}:3001`,
): UseFeatureStateResult => {
  const [roadmap, setRoadmap] = useState<Roadmap | null>(null);
  const [summary, setSummary] = useState<RoadmapSummary | null>(null);
  const [transitions, setTransitions] = useState<readonly RoadmapTransition[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connecting');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const backoffRef = useRef(BASE_BACKOFF_MS);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const unmountedRef = useRef(false);
  const receivedInitRef = useRef(false);
  const wsRef = useRef<WebSocket | null>(null);
  const projectIdRef = useRef(projectId);
  const featureIdRef = useRef(featureId as FeatureId);

  const sendMessage = useCallback((ws: WebSocket, message: ClientWSMessage): void => {
    if (ws.readyState === WebSocket.OPEN || ws.readyState === 1) {
      ws.send(serializeMessage(message));
    }
  }, []);

  const connect = useCallback(() => {
    if (unmountedRef.current) return;

    setConnectionStatus('connecting');
    setLoading(true);
    receivedInitRef.current = false;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      if (unmountedRef.current) return;
      setConnectionStatus('connected');
      sendMessage(ws, {
        type: 'subscribe',
        projectId: projectIdRef.current,
        featureId: featureIdRef.current,
      });
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

    const matchesFeature = (msg: { projectId: string; featureId?: string }): boolean =>
      msg.projectId === projectIdRef.current && msg.featureId === featureIdRef.current;

    const handleMessage = (message: ServerWSMessage): void => {
      switch (message.type) {
        case 'init':
          if (matchesFeature(message)) {
            setRoadmap(message.roadmap);
            setSummary(computeRoadmapSummary(message.roadmap));
            receivedInitRef.current = true;
            setLoading(false);
          }
          break;
        case 'update':
          if (matchesFeature(message)) {
            setRoadmap(message.roadmap);
            setSummary(computeRoadmapSummary(message.roadmap));
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
  }, [wsUrl, sendMessage]);

  useEffect(() => {
    unmountedRef.current = false;
    connect();

    return () => {
      unmountedRef.current = true;
      if (wsRef.current) {
        sendMessage(wsRef.current, {
          type: 'unsubscribe',
          projectId: projectIdRef.current,
          featureId: featureIdRef.current,
        });
        wsRef.current.close();
      }
      if (reconnectTimerRef.current !== null) {
        clearTimeout(reconnectTimerRef.current);
      }
    };
  }, [connect, sendMessage]);

  useEffect(() => {
    const previousProjectId = projectIdRef.current;
    const previousFeatureId = featureIdRef.current;
    if (previousProjectId === projectId && previousFeatureId === featureId) return;

    projectIdRef.current = projectId;
    featureIdRef.current = featureId as FeatureId;

    setRoadmap(null);
    setSummary(null);
    setTransitions([]);
    setLoading(true);

    if (wsRef.current) {
      sendMessage(wsRef.current, {
        type: 'unsubscribe',
        projectId: previousProjectId,
        featureId: previousFeatureId,
      });
      sendMessage(wsRef.current, {
        type: 'subscribe',
        projectId,
        featureId: featureId as FeatureId,
      });
    }
  }, [projectId, featureId, sendMessage]);

  return { roadmap, summary, transitions, connectionStatus, loading, error };
};
