import type { Roadmap, RoadmapStep } from '../../shared/types';

// --- Pure utility functions ---

interface TeammateInfo {
  readonly teammateId: string;
  readonly currentStepName: string | null;
  readonly completedCount: number;
}

const ACTIVE_STATUSES: ReadonlySet<string> = new Set(['claimed', 'in_progress', 'review']);

const deriveTeammates = (roadmap: Roadmap): readonly TeammateInfo[] => {
  const map = new Map<string, { currentStepName: string | null; completedCount: number }>();

  for (const phase of roadmap.phases) {
    for (const step of phase.steps) {
      if (step.teammate_id === null) continue;

      const existing = map.get(step.teammate_id);
      if (existing) {
        if (step.status === 'approved') existing.completedCount++;
        else if (ACTIVE_STATUSES.has(step.status)) existing.currentStepName = step.name;
      } else {
        map.set(step.teammate_id, {
          currentStepName: ACTIVE_STATUSES.has(step.status) ? step.name : null,
          completedCount: step.status === 'approved' ? 1 : 0,
        });
      }
    }
  }

  return Array.from(map.entries())
    .filter(([, info]) => info.currentStepName !== null)
    .map(([teammateId, info]) => ({
      teammateId,
      currentStepName: info.currentStepName,
      completedCount: info.completedCount,
    }));
};

// --- Component ---

interface TeamPanelProps {
  readonly roadmap: Roadmap;
}

export const TeamPanel = ({ roadmap }: TeamPanelProps) => {
  const teammates = deriveTeammates(roadmap);

  if (teammates.length === 0) {
    return (
      <div className="rounded-lg border border-gray-800 bg-gray-900/60 p-4 shadow-sm">
        <p className="text-sm text-gray-400">No active teammates</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {teammates.map((teammate) => (
        <div
          key={teammate.teammateId}
          className="rounded-lg border border-gray-800 bg-gray-900/60 p-4 shadow-sm transition-all duration-300 ease-in-out hover:shadow-md"
        >
          <div className="font-medium text-gray-200">
            {teammate.teammateId}
          </div>
          <div className="mt-1 text-sm text-gray-400">
            {teammate.currentStepName ?? <span className="italic">Idle</span>}
          </div>
          <div className="mt-1 text-xs text-gray-500">
            {teammate.completedCount} completed
          </div>
        </div>
      ))}
    </div>
  );
};
