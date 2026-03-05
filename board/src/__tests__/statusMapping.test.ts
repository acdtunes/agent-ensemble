import { describe, it, expect } from 'vitest';
import {
  mapStatusToDisplayColumn,
  expandStepToFileCards,
  expandStepToStepCard,
} from '../utils/statusMapping';
import type { RoadmapStep } from '../../shared/types';

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

describe('mapStatusToDisplayColumn', () => {
  it.each([
    ['pending', 'pending'],
    ['claimed', 'in_progress'],
    ['in_progress', 'in_progress'],
    ['review', 'review'],
    ['approved', 'done'],
  ] as const)('maps %s -> %s', (status, expected) => {
    expect(mapStatusToDisplayColumn(status)).toBe(expected);
  });
});

describe('expandStepToFileCards', () => {
  it('creates one card per file with step metadata', () => {
    const step = makeStep({ id: 'step-42', name: 'Add auth', status: 'claimed', teammate_id: 'crafter-01' });
    const cards = expandStepToFileCards(step, true);

    expect(cards).toHaveLength(2);
    expect(cards[0]).toMatchObject({
      stepId: 'step-42',
      stepName: 'Add auth',
      displayColumn: 'in_progress',
      teammateId: 'crafter-01',
      isBlocked: true,
    });
  });

  it('maps worktree and review count to each card', () => {
    const step = makeStep({ worktree: '/path/to/worktree', review_attempts: 3 });
    const [card] = expandStepToFileCards(step, false);

    expect(card.usesWorktree).toBe(true);
    expect(card.reviewCount).toBe(3);
  });

  it('falls back to step name when no files', () => {
    const cards = expandStepToFileCards(makeStep({ files_to_modify: [] }), false);
    expect(cards).toHaveLength(1);
    expect(cards[0].filename).toBe('Implement feature');
  });
});

describe('expandStepToStepCard', () => {
  it('maps core step fields to card data', () => {
    const step = makeStep({
      id: 'step-99',
      name: 'Test step',
      files_to_modify: ['a.ts', 'b.ts'],
      status: 'review',
      teammate_id: 'crafter-01',
      review_attempts: 2,
    });
    const card = expandStepToStepCard(step, true);

    expect(card.stepId).toBe('step-99');
    expect(card.stepName).toBe('Test step');
    expect(card.fileCount).toBe(2);
    expect(card.files).toEqual(['a.ts', 'b.ts']);
    expect(card.displayColumn).toBe('review');
    expect(card.teammateId).toBe('crafter-01');
    expect(card.reviewCount).toBe(2);
    expect(card.isBlocked).toBe(true);
  });

  it('maps dependencies and conflicts', () => {
    const step = makeStep({
      dependencies: ['step-00', 'step-01'],
      conflicts_with: ['step-02'],
      worktree: '/path/to/worktree',
    });
    const card = expandStepToStepCard(step, false);

    expect(card.dependencyCount).toBe(2);
    expect(card.conflictsWith).toEqual(['step-02']);
    expect(card.usesWorktree).toBe(true);
  });

  it('handles missing optional fields', () => {
    const card = expandStepToStepCard(makeStep(), false);
    expect(card.conflictsWith).toEqual([]);
    expect(card.usesWorktree).toBe(false);
  });
});
