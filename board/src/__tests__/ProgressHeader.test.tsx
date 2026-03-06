/**
 * Unit tests for ProgressHeader component
 *
 * Test Budget: 2 behaviors × 2 = 4 unit tests max
 * - Renders description when provided
 * - Omits description section when not provided
 */

import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { ProgressHeader } from '../components/ProgressHeader';
import type { RoadmapSummary } from '../../shared/types';

afterEach(cleanup);

const createSummary = (overrides: Partial<RoadmapSummary> = {}): RoadmapSummary => ({
  total_steps: 10,
  total_phases: 3,
  done: 5,
  in_progress: 2,
  pending: 3,
  ...overrides,
});

describe('ProgressHeader description rendering', () => {
  it('renders description between stat cards and phase info when provided', () => {
    const description = 'Provides secure authentication including login, logout, and session management.';

    render(
      <ProgressHeader
        summary={createSummary()}
        currentPhase={2}
        createdAt="2026-01-15"
        description={description}
      />
    );

    // Description should be rendered with test ID
    const descriptionElement = screen.getByTestId('progress-header-description');
    expect(descriptionElement).toHaveTextContent(description);
    // Should have muted styling
    expect(descriptionElement.className).toMatch(/text-gray-400|text-gray-500/);
  });

  it('omits description section when description is undefined', () => {
    render(
      <ProgressHeader
        summary={createSummary()}
        currentPhase={2}
        createdAt="2026-01-15"
      />
    );

    // No description element should be rendered
    expect(screen.queryByTestId('progress-header-description')).not.toBeInTheDocument();
  });

  it('omits description section when description is empty string', () => {
    render(
      <ProgressHeader
        summary={createSummary()}
        currentPhase={2}
        createdAt="2026-01-15"
        description=""
      />
    );

    // No description element should be rendered
    expect(screen.queryByTestId('progress-header-description')).not.toBeInTheDocument();
  });

  it('omits description section when description is whitespace only', () => {
    render(
      <ProgressHeader
        summary={createSummary()}
        currentPhase={2}
        createdAt="2026-01-15"
        description="   "
      />
    );

    // No description element should be rendered
    expect(screen.queryByTestId('progress-header-description')).not.toBeInTheDocument();
  });
});
