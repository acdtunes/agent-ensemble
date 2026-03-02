import { useState, useEffect, useCallback } from 'react';

// --- Route type (discriminated union — no other views possible) ---

export type Route =
  | { readonly view: 'overview' }
  | { readonly view: 'project'; readonly projectId: string }
  | { readonly view: 'board'; readonly projectId: string }
  | { readonly view: 'docs'; readonly projectId: string }
  | { readonly view: 'feature-board'; readonly projectId: string; readonly featureId: string }
  | { readonly view: 'feature-docs'; readonly projectId: string; readonly featureId: string };

// --- Pure functions ---

const FEATURE_BOARD_PATTERN = /^#\/projects\/([^/]+)\/features\/([^/]+)\/board$/;
const FEATURE_DOCS_PATTERN = /^#\/projects\/([^/]+)\/features\/([^/]+)\/docs$/;
const BOARD_ROUTE_PATTERN = /^#\/projects\/([^/]+)\/board$/;
const DOCS_ROUTE_PATTERN = /^#\/projects\/([^/]+)\/docs$/;
const PROJECT_PATTERN = /^#\/projects\/([^/]+)(\/.*)?$/;

type RoutePattern = readonly [RegExp, (matches: RegExpExecArray) => Route];

const ROUTE_PATTERNS: readonly RoutePattern[] = [
  [FEATURE_BOARD_PATTERN, (m) => ({ view: 'feature-board', projectId: m[1], featureId: m[2] })],
  [FEATURE_DOCS_PATTERN, (m) => ({ view: 'feature-docs', projectId: m[1], featureId: m[2] })],
  [BOARD_ROUTE_PATTERN, (m) => ({ view: 'board', projectId: m[1] })],
  [DOCS_ROUTE_PATTERN, (m) => ({ view: 'docs', projectId: m[1] })],
  [PROJECT_PATTERN, (m) => ({ view: 'project', projectId: m[1] })],
];

export const parseHash = (hash: string): Route => {
  for (const [pattern, toRoute] of ROUTE_PATTERNS) {
    const match = pattern.exec(hash);
    if (match !== null) return toRoute(match);
  }
  return { view: 'overview' };
};

// --- Hook ---

export const useRouter = (): Route => {
  const [route, setRoute] = useState<Route>(() => parseHash(window.location.hash));

  const handleHashChange = useCallback(() => {
    setRoute(parseHash(window.location.hash));
  }, []);

  useEffect(() => {
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [handleHashChange]);

  return route;
};
