import { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import type { Components } from 'react-markdown';
import 'highlight.js/styles/github-dark.css';

// --- Props ---

interface DocContentProps {
  readonly content: string | null;
  readonly docPath: string;
  readonly loading: boolean;
  readonly error: string | null;
  readonly onRetry?: () => void;
}

// --- Mermaid block component ---

const MermaidBlock = ({ code }: { readonly code: string }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        const mermaid = (await import('mermaid')).default;
        mermaid.initialize({ startOnLoad: false, theme: 'dark' });
        const id = `mermaid-${Date.now()}`;
        const { svg: rendered } = await mermaid.render(id, code);
        if (!cancelled) setSvg(rendered);
      } catch {
        // Malformed diagram — keep raw source visible as fallback
      }
    };
    run();
    return () => {
      cancelled = true;
      // Clean up any orphaned mermaid containers
      document.querySelectorAll('[id^="dmermaid-"]').forEach(el => el.remove());
    };
  }, [code]);

  if (svg !== null) {
    return <div data-mermaid ref={containerRef} dangerouslySetInnerHTML={{ __html: svg }} />;
  }

  return (
    <div data-mermaid ref={containerRef}>
      <pre><code>{code}</code></pre>
    </div>
  );
};

// --- Custom code component for react-markdown ---

const isMermaidLanguage = (className: string | undefined): boolean =>
  className !== undefined && className.includes('language-mermaid');

const CodeBlock: Components['code'] = ({ className, children, ...rest }) => {
  if (isMermaidLanguage(className)) {
    const code = String(children).replace(/\n$/, '');
    return <MermaidBlock code={code} />;
  }
  return <code className={className} {...rest}>{children}</code>;
};

// --- Plugins (stable references to avoid re-renders) ---

const remarkPlugins = [remarkGfm];
const rehypePlugins = [rehypeHighlight];

// --- DocContent component ---

export const DocContent = ({ content, loading, error, onRetry }: DocContentProps) => {
  const components = useMemo<Components>(() => ({ code: CodeBlock }), []);

  if (loading) {
    return (
      <div className="overflow-y-auto p-4">
        <p className="text-gray-400">Loading...</p>
      </div>
    );
  }

  if (error !== null) {
    return (
      <div className="overflow-y-auto p-4">
        <p className="text-red-400">{error}</p>
        {onRetry !== undefined && (
          <button
            className="mt-2 rounded bg-gray-700 px-3 py-1 text-sm text-gray-200 hover:bg-gray-600"
            onClick={onRetry}
          >
            Retry
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="overflow-y-auto p-4 prose prose-invert max-w-none text-gray-300">
      {content !== null && content.length > 0 && (
        <Markdown
          remarkPlugins={remarkPlugins}
          rehypePlugins={rehypePlugins}
          components={components}
        >
          {content}
        </Markdown>
      )}
    </div>
  );
};
