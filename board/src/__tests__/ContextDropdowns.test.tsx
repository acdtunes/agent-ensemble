import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, within, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { ContextDropdowns } from '../components/ContextDropdowns';
import type { FeatureSummary, FeatureId } from '../../shared/types';

afterEach(cleanup);

const makeFeature = (id: string, overrides: Partial<FeatureSummary> = {}): FeatureSummary => ({
  featureId: id as FeatureId,
  name: id,
  hasRoadmap: true,
  hasExecutionLog: true,
  totalSteps: 5,
  completed: 2,
  failed: 0,
  inProgress: 1,
  currentLayer: 1,
  updatedAt: '2026-03-01T00:00:00Z',
  ...overrides,
});

describe('ContextDropdowns', () => {
  it('displays project ID', () => {
    render(
      <ContextDropdowns
        projectId="my-project"
        featureId="auth"
        features={[makeFeature('auth')]}
        onFeatureChange={vi.fn()}
      />,
    );

    expect(screen.getByText('my-project')).toBeInTheDocument();
  });

  it('renders feature dropdown with provided features', () => {
    const features = [makeFeature('auth'), makeFeature('payments')];
    render(
      <ContextDropdowns
        projectId="proj"
        featureId="auth"
        features={features}
        onFeatureChange={vi.fn()}
      />,
    );

    const dropdown = screen.getByTestId('feature-dropdown');
    const options = within(dropdown).getAllByRole('option');
    expect(options).toHaveLength(2);
    expect(options[0]).toHaveTextContent('auth');
    expect(options[1]).toHaveTextContent('payments');
  });

  it('selects current feature in dropdown', () => {
    const features = [makeFeature('auth'), makeFeature('payments')];
    render(
      <ContextDropdowns
        projectId="proj"
        featureId="payments"
        features={features}
        onFeatureChange={vi.fn()}
      />,
    );

    const dropdown = screen.getByTestId('feature-dropdown') as HTMLSelectElement;
    expect(dropdown.value).toBe('payments');
  });

  it('calls onFeatureChange when selection changes', () => {
    const onFeatureChange = vi.fn();
    const features = [makeFeature('auth'), makeFeature('payments')];
    render(
      <ContextDropdowns
        projectId="proj"
        featureId="auth"
        features={features}
        onFeatureChange={onFeatureChange}
      />,
    );

    const dropdown = screen.getByTestId('feature-dropdown');
    fireEvent.change(dropdown, { target: { value: 'payments' } });
    expect(onFeatureChange).toHaveBeenCalledWith('payments');
  });
});
