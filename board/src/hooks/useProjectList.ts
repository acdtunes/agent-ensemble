import { useState, useEffect, useRef, useCallback } from 'react';
import type { ProjectSummary, ProjectId } from '../../shared/types';
import type { ConnectionStatus } from './useRoadmapState';

// --- Message types (project list WS protocol) ---

export type ProjectListMessage =
  | { readonly type: 'project_list'; readonly projects: readonly ProjectSummary[] }
  | { readonly type: 'project_added'; readonly project: ProjectSummary }
  | { readonly type: 'project_removed'; readonly projectId: ProjectId };

// --- Hook return type ---

export interface UseProjectListResult {
  readonly projects: readonly ProjectSummary[];
  readonly connectionStatus: ConnectionStatus;
  readonly error: string | null;
}

// --- Pure functions ---

const parseMessage = (data: string): ProjectListMessage =>
  JSON.parse(data) as ProjectListMessage;

const computeNextBackoff = (current: number): number =>
  Math.min(current * 2, 30_000);

export const applyProjectMessage = (
  projects: readonly ProjectSummary[],
  message: ProjectListMessage,
): readonly ProjectSummary[] => {
  switch (message.type) {
    case 'project_list':
      return message.projects;
    case 'project_added': {
      const filtered = projects.filter(p => p.projectId !== message.project.projectId);
      return [...filtered, message.project];
    }
    case 'project_removed':
      return projects.filter(p => p.projectId !== message.projectId);
  }
};

const BASE_BACKOFF_MS = 1000;

// --- Hook ---

export const useProjectList = (url: string): UseProjectListResult => {
  const [projects, setProjects] = useState<readonly ProjectSummary[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connecting');
  const [error, setError] = useState<string | null>(null);

  const backoffRef = useRef(BASE_BACKOFF_MS);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const unmountedRef = useRef(false);
  const receivedSnapshotRef = useRef(false);
  const wsRef = useRef<WebSocket | null>(null);

  const connect = useCallback(() => {
    if (unmountedRef.current) return;

    setConnectionStatus('connecting');
    receivedSnapshotRef.current = false;
    const ws = new WebSocket(url);

    ws.onopen = () => {
      if (unmountedRef.current) return;
      setConnectionStatus('connected');
    };

    ws.onmessage = (event: { data: string }) => {
      if (unmountedRef.current) return;
      try {
        const message = parseMessage(event.data);
        setProjects(prev => applyProjectMessage(prev, message));
        if (message.type === 'project_list') {
          receivedSnapshotRef.current = true;
        }
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

      if (receivedSnapshotRef.current) {
        backoffRef.current = BASE_BACKOFF_MS;
      }

      scheduleReconnect();
    };

    const scheduleReconnect = (): void => {
      if (unmountedRef.current) return;
      const delay = backoffRef.current;
      backoffRef.current = computeNextBackoff(delay);
      reconnectTimerRef.current = setTimeout(connect, delay);
    };

    wsRef.current = ws;
  }, [url]);

  useEffect(() => {
    unmountedRef.current = false;
    connect();

    return () => {
      unmountedRef.current = true;
      wsRef.current?.close();
      if (reconnectTimerRef.current !== null) {
        clearTimeout(reconnectTimerRef.current);
      }
    };
  }, [connect]);

  return { projects, connectionStatus, error };
};
