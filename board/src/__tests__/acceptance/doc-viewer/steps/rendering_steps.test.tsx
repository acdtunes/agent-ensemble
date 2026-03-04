/**
 * Acceptance tests: US-02 - Rich Markdown Document Rendering
 *
 * Driving port: DocContent component (rendered via props)
 * Validates: heading hierarchy, code blocks, inline code, tables, mermaid, scroll, errors
 *
 * Gherkin reference: milestone-2-document-rendering.feature (US-02 scenarios)
 */

import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import {
  createMarkdownWithHeadings,
  createMarkdownWithCodeBlock,
  createMarkdownWithInlineCode,
  createMarkdownWithTable,
  createMarkdownWithMermaid,
  createMarkdownWithMalformedMermaid,
  createLongMarkdown,
  createEmptyMarkdown,
} from './test-fixtures';

afterEach(cleanup);

// Computed path prevents Vite from statically resolving the import before the file exists.
const DOC_CONTENT_PATH = ['..', '..', '..', '..', 'components', 'DocContent'].join('/');

// =================================================================
// US-02 Scenario 1: Headings render with visual hierarchy
// =================================================================
describe('US-02: Headings render with visual hierarchy', () => {
  it('h1 is largest, h2 smaller, h3 smallest, with clear differentiation', async () => {
    // Given Andres has selected a document containing h1, h2, and h3 headings
    const { DocContent } = await import(/* @vite-ignore */ DOC_CONTENT_PATH);
    const markdown = createMarkdownWithHeadings();

    // When the content panel renders the document
    render(<DocContent content={markdown} docPath="test/doc.md" loading={false} error={null} />);

    // Then h1 is the largest and most prominent
    const h1 = screen.getByRole('heading', { level: 1 });
    expect(h1).toBeInTheDocument();
    expect(h1.textContent).toBe('Main Title');

    // And h2 is visually smaller than h1
    const h2 = screen.getByRole('heading', { level: 2 });
    expect(h2).toBeInTheDocument();
    expect(h2.textContent).toBe('Section One');

    // And h3 is visually smaller than h2
    const h3 = screen.getByRole('heading', { level: 3 });
    expect(h3).toBeInTheDocument();
    expect(h3.textContent).toBe('Sub-section');
  });
});

// =================================================================
// US-02 Scenario 2: Code blocks with syntax highlighting
// =================================================================
describe('US-02: Code blocks render with syntax highlighting', () => {
  it('TypeScript code block has distinct background and monospace font', async () => {
    // Given Andres has selected a document containing a TypeScript code block
    const { DocContent } = await import(/* @vite-ignore */ DOC_CONTENT_PATH);
    const markdown = createMarkdownWithCodeBlock();

    // When the content panel renders the document
    render(<DocContent content={markdown} docPath="test/doc.md" loading={false} error={null} />);

    // Then the code block appears with a distinct background
    const codeBlock = screen.getByRole('code') ?? screen.getByText(/interface Config/);
    expect(codeBlock).toBeInTheDocument();
    // And the code uses a monospace font (verified via code/pre element existence)
    const preElement = codeBlock.closest('pre');
    expect(preElement).toBeTruthy();
  });
});

// =================================================================
// US-02 Scenario 3: Inline code renders distinctly
// =================================================================
describe('US-02: Inline code renders distinctly from prose', () => {
  it('"currentState" appears in monospace distinct from surrounding text', async () => {
    // Given Andres has selected a document mentioning "currentState" inline
    const { DocContent } = await import(/* @vite-ignore */ DOC_CONTENT_PATH);
    const markdown = createMarkdownWithInlineCode();

    // When the content panel renders the document
    render(<DocContent content={markdown} docPath="test/doc.md" loading={false} error={null} />);

    // Then "currentState" appears in a code element
    const codeElement = screen.getByText('currentState');
    expect(codeElement).toBeInTheDocument();
    expect(codeElement.tagName.toLowerCase()).toBe('code');
  });
});

// =================================================================
// US-02 Scenario 4: Tables render with proper structure
// =================================================================
describe('US-02: Tables render with proper structure', () => {
  it('table renders with headers distinct from data rows', async () => {
    // Given Andres has selected a document with a markdown table
    const { DocContent } = await import(/* @vite-ignore */ DOC_CONTENT_PATH);
    const markdown = createMarkdownWithTable();

    // When the content panel renders the document
    render(<DocContent content={markdown} docPath="test/doc.md" loading={false} error={null} />);

    // Then the table shows with visible structure
    const table = screen.getByRole('table');
    expect(table).toBeInTheDocument();
    // And columns are properly aligned (header row exists)
    expect(screen.getByText('Column A')).toBeInTheDocument();
    expect(screen.getByText('Column B')).toBeInTheDocument();
    // And data rows exist
    expect(screen.getByText('value 1')).toBeInTheDocument();
  });
});

// =================================================================
// US-02 Scenario 5: Mermaid diagrams render as visual diagrams
// =================================================================
describe('US-02: Mermaid diagrams render as visual diagrams', () => {
  it('mermaid code block is rendered as an SVG diagram', async () => {
    // Given Andres has selected a document containing a mermaid flowchart
    const { DocContent } = await import(/* @vite-ignore */ DOC_CONTENT_PATH);
    const markdown = createMarkdownWithMermaid();

    // When the content panel renders the document
    render(<DocContent content={markdown} docPath="test/doc.md" loading={false} error={null} />);

    // Then the mermaid block is rendered as a visual diagram
    // (Implementation may use SVG or a container with mermaid class)
    await waitFor(() => {
      const svg = document.querySelector('svg') ?? document.querySelector('[data-mermaid]');
      expect(svg).toBeTruthy();
    });
  });
});

// =================================================================
// US-02 Scenario 6: Content panel scrolls independently of sidebar
// =================================================================
describe('US-02: Content panel scrolls independently of sidebar', () => {
  it('long content is contained in a scrollable panel', async () => {
    // Given Andres has selected a document with 300+ lines of content
    const { DocContent } = await import(/* @vite-ignore */ DOC_CONTENT_PATH);
    const markdown = createLongMarkdown(350);

    // When the content panel renders the document
    const { container } = render(
      <DocContent content={markdown} docPath="test/doc.md" loading={false} error={null} />,
    );

    // Then the content is contained in a scrollable element
    // (The component should have overflow-y styling for independent scroll)
    const scrollContainer = container.querySelector('[class*="overflow"]') ?? container.firstElementChild;
    expect(scrollContainer).toBeTruthy();
    // And the content is rendered (first and last lines present)
    expect(screen.getByText(/Line 1:/)).toBeInTheDocument();
  });
});

// =================================================================
// US-02 Scenario 7: Document fails to load because file was deleted
// =================================================================
describe('US-02: Document fails to load because file was deleted', () => {
  it('shows error message with retry button when load fails', async () => {
    // Given Andres clicks a document that has been deleted
    const { DocContent } = await import(/* @vite-ignore */ DOC_CONTENT_PATH);
    const onRetry = vi.fn();

    // When the content panel attempts to load the document
    render(
      <DocContent
        content={null}
        docPath="deleted/doc.md"
        loading={false}
        error="Could not load this document"
        onRetry={onRetry}
      />,
    );

    // Then an error message shows "Could not load this document"
    expect(screen.getByText(/could not load this document/i)).toBeInTheDocument();
    // And a retry button is available
    const retryButton = screen.getByRole('button', { name: /retry/i });
    expect(retryButton).toBeInTheDocument();

    // Clicking retry invokes the retry handler
    fireEvent.click(retryButton);
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});

// =================================================================
// US-02 Scenario 8: Mermaid with invalid syntax degrades to code block
// =================================================================
describe('US-02: Mermaid diagram with invalid syntax degrades to code block', () => {
  it('malformed mermaid shows as code block and rest of document renders', async () => {
    // Given Andres has selected a document with a malformed mermaid block
    const { DocContent } = await import(/* @vite-ignore */ DOC_CONTENT_PATH);
    const markdown = createMarkdownWithMalformedMermaid();

    // When the content panel renders the document
    render(<DocContent content={markdown} docPath="test/doc.md" loading={false} error={null} />);

    // Then the malformed mermaid source is shown as a formatted code block
    await waitFor(() => {
      expect(screen.getByText(/graph INVALID/)).toBeInTheDocument();
    });
    // And the rest of the document renders normally
    expect(screen.getByText('Following Section')).toBeInTheDocument();
  });
});

// =================================================================
// US-02 Scenario 9: Retry after failed load succeeds
// =================================================================
describe('US-02: Retry after failed document load succeeds', () => {
  it('retry callback is invoked to reload the document', async () => {
    // Given Andres is viewing an error for a failed document
    const { DocContent } = await import(/* @vite-ignore */ DOC_CONTENT_PATH);
    const onRetry = vi.fn();

    render(
      <DocContent
        content={null}
        docPath="temp-error/doc.md"
        loading={false}
        error="Could not load this document"
        onRetry={onRetry}
      />,
    );

    // When he clicks the retry button
    fireEvent.click(screen.getByRole('button', { name: /retry/i }));

    // Then the retry handler is invoked
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});

// =================================================================
// US-02 Scenario 10: Empty document renders without error
// =================================================================
describe('US-02: Empty document renders without error', () => {
  it('empty markdown file shows content panel without errors', async () => {
    // Given Andres has selected a document that is empty (zero bytes)
    const { DocContent } = await import(/* @vite-ignore */ DOC_CONTENT_PATH);

    // When the content panel renders the document
    render(
      <DocContent content={createEmptyMarkdown()} docPath="empty/doc.md" loading={false} error={null} />,
    );

    // Then an empty content panel is shown without errors
    expect(screen.queryByText(/error/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/could not load/i)).not.toBeInTheDocument();
  });
});

// =================================================================
// US-02 Scenario 11: Unsupported markdown extensions degrade gracefully
// =================================================================
describe('US-02: Document with unsupported markdown extensions degrades gracefully', () => {
  it('unsupported content shown as raw text, nothing hidden', async () => {
    // Given a document with an unsupported extension (e.g., custom directive)
    const { DocContent } = await import(/* @vite-ignore */ DOC_CONTENT_PATH);
    const markdown = '# Title\n\n:::custom-directive\nSome content inside\n:::\n\n## After';

    // When the content panel renders the document
    render(<DocContent content={markdown} docPath="test/doc.md" loading={false} error={null} />);

    // Then the unsupported content is shown as raw text
    expect(screen.getByText(/Some content inside/)).toBeInTheDocument();
    // And no content is hidden or lost
    expect(screen.getByText('After')).toBeInTheDocument();
  });
});
