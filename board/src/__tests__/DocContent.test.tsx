/**
 * Unit tests for DocContent component.
 *
 * Driving port: DocContent component props
 * Tests: loading, error with retry, content display, empty content, scroll container
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

afterEach(cleanup);

// Computed path prevents Vite from statically resolving before file exists.
const DOC_CONTENT_PATH = ['..', 'components', 'DocContent'].join('/');

describe('DocContent', () => {
  it('shows loading indicator when loading is true', async () => {
    const { DocContent } = await import(/* @vite-ignore */ DOC_CONTENT_PATH);

    render(<DocContent content={null} docPath="test.md" loading={true} error={null} />);

    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('shows error message with retry button when error is present', async () => {
    const { DocContent } = await import(/* @vite-ignore */ DOC_CONTENT_PATH);
    const onRetry = vi.fn();

    render(
      <DocContent
        content={null}
        docPath="test.md"
        loading={false}
        error="Could not load this document"
        onRetry={onRetry}
      />,
    );

    expect(screen.getByText(/could not load this document/i)).toBeInTheDocument();
    const retryButton = screen.getByRole('button', { name: /retry/i });
    expect(retryButton).toBeInTheDocument();

    fireEvent.click(retryButton);
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('renders markdown content as text', async () => {
    const { DocContent } = await import(/* @vite-ignore */ DOC_CONTENT_PATH);

    render(
      <DocContent content="# Hello World" docPath="test.md" loading={false} error={null} />,
    );

    expect(screen.getByText(/Hello World/)).toBeInTheDocument();
  });

  it('renders empty content without error', async () => {
    const { DocContent } = await import(/* @vite-ignore */ DOC_CONTENT_PATH);

    render(
      <DocContent content="" docPath="empty.md" loading={false} error={null} />,
    );

    expect(screen.queryByText(/error/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/could not load/i)).not.toBeInTheDocument();
  });

  it('has a scrollable container with overflow class', async () => {
    const { DocContent } = await import(/* @vite-ignore */ DOC_CONTENT_PATH);

    const { container } = render(
      <DocContent content="Some content" docPath="test.md" loading={false} error={null} />,
    );

    const scrollContainer = container.querySelector('[class*="overflow"]');
    expect(scrollContainer).toBeTruthy();
  });

  it('does not show retry button when onRetry is not provided', async () => {
    const { DocContent } = await import(/* @vite-ignore */ DOC_CONTENT_PATH);

    render(
      <DocContent
        content={null}
        docPath="test.md"
        loading={false}
        error="Some error"
      />,
    );

    expect(screen.getByText(/some error/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /retry/i })).not.toBeInTheDocument();
  });
});
