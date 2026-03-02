import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { AddProjectDialog } from '../components/AddProjectDialog';

afterEach(cleanup);

describe('AddProjectDialog', () => {
  it('renders input field for project path', () => {
    render(<AddProjectDialog onSubmit={() => {}} onCancel={() => {}} submitting={false} error={null} />);
    expect(screen.getByRole('textbox', { name: /project path/i })).toBeInTheDocument();
  });

  it('calls onSubmit with the entered path', () => {
    const onSubmit = vi.fn();
    render(<AddProjectDialog onSubmit={onSubmit} onCancel={() => {}} submitting={false} error={null} />);

    const input = screen.getByRole('textbox', { name: /project path/i });
    fireEvent.change(input, { target: { value: '/home/user/my-project' } });
    fireEvent.click(screen.getByRole('button', { name: /add$/i }));

    expect(onSubmit).toHaveBeenCalledWith('/home/user/my-project');
  });

  it('calls onCancel when Cancel button clicked', () => {
    const onCancel = vi.fn();
    render(<AddProjectDialog onSubmit={() => {}} onCancel={onCancel} submitting={false} error={null} />);

    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it('disables submit button when submitting', () => {
    render(<AddProjectDialog onSubmit={() => {}} onCancel={() => {}} submitting={true} error={null} />);
    expect(screen.getByRole('button', { name: /add/i })).toBeDisabled();
  });

  it('displays error message when error is set', () => {
    render(<AddProjectDialog onSubmit={() => {}} onCancel={() => {}} submitting={false} error="Duplicate project" />);
    expect(screen.getByText('Duplicate project')).toBeInTheDocument();
  });

  it('disables submit button when path is empty', () => {
    render(<AddProjectDialog onSubmit={() => {}} onCancel={() => {}} submitting={false} error={null} />);
    expect(screen.getByRole('button', { name: /add$/i })).toBeDisabled();
  });
});
