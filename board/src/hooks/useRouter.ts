import { useState, useEffect, useCallback } from 'react';

// --- Route type (discriminated union — no other views possible) ---

export type Route =
  | { readonly view: 'overview' }
  | { readonly view: 'board'; readonly projectId: string };

// --- Pure functions ---

const BOARD_ROUTE_PATTERN = /^#\/projects\/([^/]+)\/board$/;

export const parseHash = (hash: string): Route => {
  const match = BOARD_ROUTE_PATTERN.exec(hash);
  if (match !== null) {
    return { view: 'board', projectId: match[1] };
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
