import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { Breadcrumb, type BreadcrumbSegment } from '../components/Breadcrumb';

afterEach(cleanup);

describe('Breadcrumb', () => {
  it('renders all segment labels', () => {
    const segments: BreadcrumbSegment[] = [
      { label: 'Overview', onClick: vi.fn() },
      { label: 'agent-ensemble' },
    ];
    render(<Breadcrumb segments={segments} />);
    expect(screen.getByText('Overview')).toBeInTheDocument();
    expect(screen.getByText('agent-ensemble')).toBeInTheDocument();
  });

  it('renders clickable segments as buttons', () => {
    const onClick = vi.fn();
    const segments: BreadcrumbSegment[] = [
      { label: 'Overview', onClick },
      { label: 'agent-ensemble' },
    ];
    render(<Breadcrumb segments={segments} />);
    fireEvent.click(screen.getByText('Overview'));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('renders last segment as non-clickable text', () => {
    const segments: BreadcrumbSegment[] = [
      { label: 'Overview', onClick: vi.fn() },
      { label: 'agent-ensemble' },
    ];
    render(<Breadcrumb segments={segments} />);
    const lastSegment = screen.getByText('agent-ensemble');
    expect(lastSegment.tagName).not.toBe('BUTTON');
  });

  it('renders separator between segments', () => {
    const segments: BreadcrumbSegment[] = [
      { label: 'Overview', onClick: vi.fn() },
      { label: 'agent-ensemble' },
    ];
    const { container } = render(<Breadcrumb segments={segments} />);
    expect(container.textContent).toContain('/');
  });

  it('renders single segment without separator', () => {
    const segments: BreadcrumbSegment[] = [{ label: 'Overview' }];
    render(<Breadcrumb segments={segments} />);
    expect(screen.getByText('Overview')).toBeInTheDocument();
  });
});
