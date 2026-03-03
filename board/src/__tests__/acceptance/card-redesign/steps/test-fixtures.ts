/**
 * Shared test fixtures for card-redesign acceptance tests.
 *
 * These fixtures build domain objects (Roadmap, RoadmapStep, FileCardData)
 * from business-language descriptions.
 */

import type {
  Roadmap,
  RoadmapPhase,
  RoadmapStep,
  RoadmapSummary,
  StepStatus,
} from '../../../../../shared/types';
import type { FileCardData, StepCardData } from '../../../../utils/statusMapping';

// --- RoadmapStep builder ---

export const createRoadmapStep = (
  overrides: Partial<RoadmapStep> & Pick<RoadmapStep, 'id' | 'name'>,
): RoadmapStep => ({
  description: '',
  files_to_modify: [],
  dependencies: [],
  criteria: [],
  status: 'pending',
  teammate_id: null,
  started_at: null,
  completed_at: null,
  review_attempts: 0,
  ...overrides,
});

// --- RoadmapPhase builder ---

export const createRoadmapPhase = (
  overrides: Partial<RoadmapPhase> & Pick<RoadmapPhase, 'id' | 'name' | 'steps'>,
): RoadmapPhase => ({
  ...overrides,
});

// --- Roadmap builder ---

export const createRoadmap = (
  phases: readonly RoadmapPhase[],
  overrides?: Partial<Roadmap['roadmap']>,
): Roadmap => ({
  roadmap: {
    project_id: 'test-project',
    created_at: '2026-03-01T00:00:00Z',
    total_steps: phases.reduce((sum, p) => sum + p.steps.length, 0),
    phases: phases.length,
    ...overrides,
  },
  phases,
});

// --- RoadmapSummary builder ---

export const createRoadmapSummary = (overrides?: Partial<RoadmapSummary>): RoadmapSummary => ({
  total_steps: 7,
  total_phases: 3,
  completed: 3,
  failed: 0,
  in_progress: 2,
  pending: 2,
  ...overrides,
});

// --- StepCardData builder ---

export const createStepCardData = (
  overrides: Partial<StepCardData> & Pick<StepCardData, 'stepId' | 'stepName'>,
): StepCardData => ({
  displayColumn: 'in_progress',
  fileCount: 1,
  files: [],
  reviewCount: 0,
  worktree: false,
  isBlocked: false,
  teammateId: null,
  dependencyCount: 0,
  ...overrides,
});

// --- FileCardData builder ---

export const createFileCardData = (
  overrides: Partial<FileCardData> & Pick<FileCardData, 'filename' | 'stepId' | 'stepName'>,
): FileCardData => ({
  displayColumn: 'in_progress',
  reviewCount: 0,
  worktree: false,
  isBlocked: false,
  teammateId: null,
  ...overrides,
});

// --- Helper to derive teammates from roadmap ---

export const deriveTeammates = (roadmap: Roadmap): Record<string, { current_step: string | null; completed_steps: string[] }> => {
  const teammates: Record<string, { current_step: string | null; completed_steps: string[] }> = {};
  for (const phase of roadmap.phases) {
    for (const step of phase.steps) {
      if (step.teammate_id !== null) {
        if (!teammates[step.teammate_id]) {
          teammates[step.teammate_id] = { current_step: null, completed_steps: [] };
        }
        if (step.status === 'approved') {
          teammates[step.teammate_id].completed_steps.push(step.id);
        } else {
          teammates[step.teammate_id].current_step = step.id;
        }
      }
    }
  }
  return teammates;
};
