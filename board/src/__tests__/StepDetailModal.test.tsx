import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { StepDetailModal } from '../components/StepDetailModal';
import type { RoadmapStep } from '../../shared/types';

afterEach(cleanup);

const createStep = (overrides: Partial<RoadmapStep> = {}): RoadmapStep => ({
  id: '01-03',
  name: 'Remove Agent from Modal',
  description: 'Test description',
  files_to_modify: ['board/src/components/StepDetailModal.tsx'],
  dependencies: [],
  criteria: ['Modal header does not display agent ID'],
  status: 'in_progress',
  teammate_id: 'crafter-01-03',
  started_at: '2026-03-04T23:31:10.433363+00:00',
  completed_at: null,
  review_attempts: 0,
  ...overrides,
});

const emptyLookup = new Map<string, RoadmapStep>();

describe('StepDetailModal', () => {
  describe('header display', () => {
    it('displays step name in header', () => {
      render(
        <StepDetailModal
          step={createStep({ name: 'My Step Name' })}
          stepLookup={emptyLookup}
          onClose={vi.fn()}
        />
      );
      expect(screen.getByRole('dialog')).toHaveTextContent('My Step Name');
    });

    it('displays step ID in header', () => {
      render(
        <StepDetailModal
          step={createStep({ id: '02-05' })}
          stepLookup={emptyLookup}
          onClose={vi.fn()}
        />
      );
      expect(screen.getByRole('dialog')).toHaveTextContent('02-05');
    });

    it('displays step status in header', () => {
      render(
        <StepDetailModal
          step={createStep({ status: 'review' })}
          stepLookup={emptyLookup}
          onClose={vi.fn()}
        />
      );
      expect(screen.getByRole('dialog')).toHaveTextContent(/review/i);
    });

    it('does not display teammate ID when teammate_id is set', () => {
      render(
        <StepDetailModal
          step={createStep({ teammate_id: 'crafter-01-03' })}
          stepLookup={emptyLookup}
          onClose={vi.fn()}
        />
      );
      expect(screen.getByRole('dialog')).not.toHaveTextContent('crafter-01-03');
    });

    it('does not display teammate emoji when teammate_id is set', () => {
      render(
        <StepDetailModal
          step={createStep({ teammate_id: 'crafter-01' })}
          stepLookup={emptyLookup}
          onClose={vi.fn()}
        />
      );
      // The crafter emoji is 🛠️
      expect(screen.getByRole('dialog')).not.toHaveTextContent('🛠️');
    });
  });

  describe('modal sections preserved', () => {
    it('displays description section when description exists', () => {
      render(
        <StepDetailModal
          step={createStep({ description: 'Detailed description here' })}
          stepLookup={emptyLookup}
          onClose={vi.fn()}
        />
      );
      expect(screen.getByTestId('description-section')).toHaveTextContent('Detailed description here');
    });

    it('displays files section when files exist', () => {
      render(
        <StepDetailModal
          step={createStep({ files_to_modify: ['src/App.tsx', 'src/utils.ts'] })}
          stepLookup={emptyLookup}
          onClose={vi.fn()}
        />
      );
      expect(screen.getByRole('dialog')).toHaveTextContent('src/App.tsx');
      expect(screen.getByRole('dialog')).toHaveTextContent('src/utils.ts');
    });

    it('displays dependencies section when dependencies exist', () => {
      const dep = createStep({ id: '01-01', name: 'First Step' });
      const lookup = new Map<string, RoadmapStep>([['01-01', dep]]);

      render(
        <StepDetailModal
          step={createStep({ dependencies: ['01-01'] })}
          stepLookup={lookup}
          onClose={vi.fn()}
        />
      );
      expect(screen.getByRole('dialog')).toHaveTextContent('First Step');
    });

    it('displays review history when entries exist', () => {
      render(
        <StepDetailModal
          step={createStep({
            review_history: [{
              cycle: 1,
              timestamp: '2026-03-04T12:00:00Z',
              outcome: 'rejected',
              feedback: 'Needs more tests',
            }],
          })}
          stepLookup={emptyLookup}
          onClose={vi.fn()}
        />
      );
      expect(screen.getByTestId('review-entry')).toHaveTextContent('Needs more tests');
    });
  });
});
