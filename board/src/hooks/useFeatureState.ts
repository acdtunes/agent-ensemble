import { useState, useEffect, useCallback } from 'react';
import type { DeliveryState, ExecutionPlan } from '../../shared/types';

// --- Hook return type ---

export interface UseFeatureStateResult {
  readonly plan: ExecutionPlan | null;
  readonly state: DeliveryState | null;
  readonly loading: boolean;
  readonly error: string | null;
}

// --- Pure helpers ---

const buildPlanUrl = (projectId: string, featureId: string): string =>
  `/api/projects/${projectId}/features/${featureId}/plan`;

const buildStateUrl = (projectId: string, featureId: string): string =>
  `/api/projects/${projectId}/features/${featureId}/state`;

const parseErrorBody = async (response: Response): Promise<string> => {
  try {
    const body = (await response.json()) as { error?: string };
    return body.error ?? 'Unknown error';
  } catch {
    return 'Unknown error';
  }
};

// --- Hook ---

export const useFeatureState = (
  projectId: string,
  featureId: string,
): UseFeatureStateResult => {
  const [plan, setPlan] = useState<ExecutionPlan | null>(null);
  const [state, setState] = useState<DeliveryState | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchFeatureData = useCallback(async () => {
    setLoading(true);
    setError(null);
    setPlan(null);
    setState(null);

    try {
      const [planResponse, stateResponse] = await Promise.all([
        fetch(buildPlanUrl(projectId, featureId)),
        fetch(buildStateUrl(projectId, featureId)),
      ]);

      // Plan: 404 = error (missing roadmap), other errors = error
      if (!planResponse.ok) {
        const errorMessage = await parseErrorBody(planResponse);
        setError(errorMessage);
        return;
      }

      // State: 404 = null (no execution log yet), other errors = error
      if (!stateResponse.ok && stateResponse.status !== 404) {
        const errorMessage = await parseErrorBody(stateResponse);
        setError(errorMessage);
        return;
      }

      const planData = (await planResponse.json()) as ExecutionPlan;
      setPlan(planData);

      if (stateResponse.ok) {
        const stateData = (await stateResponse.json()) as DeliveryState;
        setState(stateData);
      }
      // state stays null if 404
    } catch {
      setError('Failed to load feature data');
    } finally {
      setLoading(false);
    }
  }, [projectId, featureId]);

  useEffect(() => {
    fetchFeatureData();
  }, [fetchFeatureData]);

  return { plan, state, loading, error };
};
