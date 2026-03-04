import { describe, it, expect } from 'vitest';
import {
  type DisplayColumn,
  DISPLAY_COLUMNS,
  mapStatusToDisplayColumn,
  expandStepToFileCards,
  expandStepToStepCard,
} from '../utils/statusMapping';
import { STEP_STATUSES, type RoadmapStep } from '../../shared/types';

// --- Helper: build a RoadmapStep with sensible defaults ---

const makeStep = (overrides: Partial<RoadmapStep> = {}): RoadmapStep => ({
  id: 'step-01',
  name: 'Implement feature',
  files_to_modify: ['src/foo.ts', 'src/bar.ts'],
  dependencies: [],
  criteria: [],
  status: 'pending',
  teammate_id: null,
  started_at: null,
  completed_at: null,
  review_attempts: 0,
  ...overrides,
});

// =============================================================
// DisplayColumn type & DISPLAY_COLUMNS ordered array
// =============================================================

describe('DISPLAY_COLUMNS', () => {
  it('contains exactly 4 columns in rendering order', () => {
    expect(DISPLAY_COLUMNS).toEqual(['pending', 'in_progress', 'review', 'done']);
  });

  it('has no duplicates', () => {
    const unique = new Set(DISPLAY_COLUMNS);
    expect(unique.size).toBe(DISPLAY_COLUMNS.length);
  });
});

// =============================================================
// mapStatusToDisplayColumn — exhaustive mapping
// =============================================================

describe('mapStatusToDisplayColumn', () => {
  const expectedMapping: Record<string, DisplayColumn> = {
    pending: 'pending',
    claimed: 'in_progress',
    in_progress: 'in_progress',
    review: 'review',
    approved: 'done',
  };

  it('maps every StepStatus to exactly one DisplayColumn', () => {
    for (const status of STEP_STATUSES) {
      const column = mapStatusToDisplayColumn(status);
      expect(DISPLAY_COLUMNS).toContain(column);
    }
  });

  it.each(
    Object.entries(expectedMapping).map(([status, column]) => ({ status, column })),
  )('maps $status -> $column', ({ status, column }) => {
    expect(mapStatusToDisplayColumn(status as any)).toBe(column);
  });

  it('covers all 5 StepStatus values', () => {
    const mappedStatuses = Object.keys(expectedMapping);
    expect(mappedStatuses.sort()).toEqual([...STEP_STATUSES].sort());
  });
});

// =============================================================
// expandStepToFileCards — file-card expansion
// =============================================================

describe('expandStepToFileCards', () => {
  it('produces one FileCardData per file in files_to_modify', () => {
    const step = makeStep({ files_to_modify: ['a.ts', 'b.ts', 'c.ts'] });
    const cards = expandStepToFileCards(step, false);
    expect(cards).toHaveLength(3);
  });

  it('sets filename from files_to_modify entries', () => {
    const step = makeStep({ files_to_modify: ['src/utils/foo.ts'] });
    const [card] = expandStepToFileCards(step, false);
    expect(card.filename).toBe('src/utils/foo.ts');
  });

  it('carries stepId and stepName from the step', () => {
    const step = makeStep({ id: 'step-42', name: 'Add auth' });
    const cards = expandStepToFileCards(step, false);
    for (const card of cards) {
      expect(card.stepId).toBe('step-42');
      expect(card.stepName).toBe('Add auth');
    }
  });

  it('maps step status to displayColumn using the status mapping', () => {
    const step = makeStep({ status: 'claimed' });
    const [card] = expandStepToFileCards(step, false);
    expect(card.displayColumn).toBe('in_progress');
  });

  it('maps review_attempts to reviewCount', () => {
    const step = makeStep({ review_attempts: 3 });
    const [card] = expandStepToFileCards(step, false);
    expect(card.reviewCount).toBe(3);
  });

  it('sets worktree flag from step (always false for RoadmapStep)', () => {
    const step = makeStep();
    expect(expandStepToFileCards(step, false)[0].worktree).toBe(false);
  });

  it('propagates isBlocked flag from parameter', () => {
    const step = makeStep();
    expect(expandStepToFileCards(step, false)[0].isBlocked).toBe(false);
    expect(expandStepToFileCards(step, true)[0].isBlocked).toBe(true);
  });

  it('falls back to step name when files_to_modify is empty', () => {
    const step = makeStep({ files_to_modify: [] });
    const cards = expandStepToFileCards(step, false);
    expect(cards).toHaveLength(1);
    expect(cards[0].filename).toBe(step.name);
  });

  it('maps teammate_id to teammateId on each card', () => {
    const step = makeStep({ teammate_id: 'crafter-01' });
    const cards = expandStepToFileCards(step, false);
    for (const card of cards) {
      expect(card.teammateId).toBe('crafter-01');
    }
  });

  it('maps null teammate_id to null teammateId', () => {
    const step = makeStep({ teammate_id: null });
    const cards = expandStepToFileCards(step, false);
    for (const card of cards) {
      expect(card.teammateId).toBeNull();
    }
  });
});

// =============================================================
// expandStepToStepCard — step-card expansion with dependency count
// =============================================================

describe('expandStepToStepCard', () => {
  it('sets dependencyCount from dependencies.length', () => {
    const step = makeStep({ dependencies: ['step-00', 'step-01', 'step-02'] });
    const card = expandStepToStepCard(step, false);
    expect(card.dependencyCount).toBe(3);
  });

  it('sets dependencyCount to 0 when dependencies is empty', () => {
    const step = makeStep({ dependencies: [] });
    const card = expandStepToStepCard(step, false);
    expect(card.dependencyCount).toBe(0);
  });
});
