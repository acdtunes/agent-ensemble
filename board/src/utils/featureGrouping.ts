import type { FeatureSummary } from '../../shared/types';
import { classifyFeatureDisplayState, type FeatureDisplayState } from '../components/FeatureCard';

// --- Types ---

export type GroupKey = 'active' | 'planned' | 'completed' | 'no-roadmap';

export interface FeatureGroup {
  readonly key: GroupKey;
  readonly displayName: string;
  readonly features: readonly FeatureSummary[];
}

// --- Constants ---

export const GROUP_ORDER: readonly GroupKey[] = ['active', 'planned', 'completed', 'no-roadmap'];

const GROUP_DISPLAY_NAMES: Record<GroupKey, string> = {
  active: 'Active',
  planned: 'Planned',
  completed: 'Completed',
  'no-roadmap': 'No Roadmap',
};

// --- Pure functions ---

const displayStateToGroupKey = (state: FeatureDisplayState | null): GroupKey =>
  state === null ? 'no-roadmap' : state;

const compareNamesIgnoreCase = (a: FeatureSummary, b: FeatureSummary): number =>
  a.name.toLowerCase().localeCompare(b.name.toLowerCase());

export const groupFeaturesByStatus = (
  features: readonly FeatureSummary[],
): readonly FeatureGroup[] => {
  const grouped = new Map<GroupKey, FeatureSummary[]>(
    GROUP_ORDER.map((key) => [key, []]),
  );

  for (const feature of features) {
    const state = classifyFeatureDisplayState(feature);
    const key = displayStateToGroupKey(state);
    grouped.get(key)!.push(feature);
  }

  return GROUP_ORDER.map((key) => ({
    key,
    displayName: GROUP_DISPLAY_NAMES[key],
    features: grouped.get(key)!.slice().sort(compareNamesIgnoreCase),
  }));
};
