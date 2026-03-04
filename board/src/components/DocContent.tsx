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

// --- File type detection ---

const getFileExtension = (path: string): string => {
  const lastDot = path.lastIndexOf('.');
  return lastDot === -1 ? '' : path.slice(lastDot + 1).toLowerCase();
};

const isGherkinFile = (path: string): boolean => getFileExtension(path) === 'feature';
const isYamlFile = (path: string): boolean => ['yaml', 'yml'].includes(getFileExtension(path));

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

// --- Gherkin syntax highlighter ---

const GHERKIN_KEYWORDS = /^(Feature|Background|Scenario|Scenario Outline|Examples|Given|When|Then|And|But|Rule):/;
const GHERKIN_TAG = /^@[\w-]+/;
const GHERKIN_TABLE_ROW = /^\s*\|.*\|\s*$/;
const GHERKIN_DOC_STRING = /^"""/;
const GHERKIN_COMMENT = /^#/;
const GHERKIN_PLACEHOLDER = /<[^>]+>/g;

const SCENARIO_KEYWORDS = /^\s*(Scenario|Scenario Outline|Background|Examples):/;
const TAG_LINE = /^\s*@/;
const COMMENT_LINE = /^\s*#/;

const GherkinContent = ({ content }: { readonly content: string }) => {
  const lines = content.split('\n');

  // Find lines that need spacing before scenario blocks
  // Walk backwards from each scenario to find the start of its "block" (comments + tags + scenario)
  const needsSpacingAt = new Set<number>();
  for (let i = 1; i < lines.length; i++) {
    if (SCENARIO_KEYWORDS.test(lines[i])) {
      // Walk backwards to find where this scenario block starts
      let blockStart = i;
      let j = i - 1;

      // Skip empty lines
      while (j >= 0 && lines[j].trim() === '') {
        j--;
      }

      // Include preceding tags
      while (j >= 0 && TAG_LINE.test(lines[j])) {
        blockStart = j;
        j--;
        // Skip empty lines between tags
        while (j >= 0 && lines[j].trim() === '') {
          j--;
        }
      }

      // Include preceding comment block (section headers)
      while (j >= 0 && COMMENT_LINE.test(lines[j])) {
        blockStart = j;
        j--;
        // Skip empty lines within comment block
        while (j >= 0 && lines[j].trim() === '') {
          j--;
        }
      }

      needsSpacingAt.add(blockStart);
    }
  }

  return (
    <pre className="text-sm font-mono leading-relaxed">
      {lines.map((line, i) => (
        <GherkinLine key={i} line={line} addTopMargin={needsSpacingAt.has(i)} />
      ))}
    </pre>
  );
};

const GherkinLine = ({ line, addTopMargin }: { readonly line: string; readonly addTopMargin: boolean }) => {
  const trimmed = line.trim();
  const marginClass = addTopMargin ? 'mt-4 pt-4 border-t border-gray-700' : '';

  // Comments
  if (GHERKIN_COMMENT.test(trimmed)) {
    return <div className={`text-gray-500 italic ${marginClass}`}>{line}</div>;
  }

  // Tags (@tag)
  if (GHERKIN_TAG.test(trimmed)) {
    return <div className={`text-cyan-400 ${marginClass}`}>{line}</div>;
  }

  // Table rows
  if (GHERKIN_TABLE_ROW.test(line)) {
    return <div className={`text-amber-300 ${marginClass}`}>{line}</div>;
  }

  // Doc strings
  if (GHERKIN_DOC_STRING.test(trimmed)) {
    return <div className={`text-gray-400 ${marginClass}`}>{line}</div>;
  }

  // Keywords
  const keywordMatch = trimmed.match(GHERKIN_KEYWORDS);
  if (keywordMatch) {
    const keyword = keywordMatch[1];
    const rest = line.slice(line.indexOf(keyword) + keyword.length + 1);
    const indent = line.slice(0, line.indexOf(keyword));

    // Highlight placeholders in scenario outlines
    const highlightedRest = rest.split(GHERKIN_PLACEHOLDER).reduce<React.ReactNode[]>((acc, part, idx, arr) => {
      acc.push(part);
      if (idx < arr.length - 1) {
        const match = rest.match(GHERKIN_PLACEHOLDER);
        if (match && match[idx]) {
          acc.push(<span key={idx} className="text-purple-400">{match[idx]}</span>);
        }
      }
      return acc;
    }, []);

    const keywordColor = ['Feature', 'Rule'].includes(keyword)
      ? 'text-emerald-400 font-bold'
      : ['Scenario', 'Scenario Outline', 'Background', 'Examples'].includes(keyword)
        ? 'text-blue-400 font-semibold'
        : 'text-pink-400'; // Given/When/Then/And/But

    return (
      <div className={marginClass}>
        {indent}
        <span className={keywordColor}>{keyword}:</span>
        <span className="text-gray-200">{highlightedRest}</span>
      </div>
    );
  }

  // Regular lines (likely step continuation or description)
  return <div className={`text-gray-300 ${marginClass}`}>{line}</div>;
};

// --- YAML syntax highlighter ---

const YamlContent = ({ content }: { readonly content: string }) => (
  <pre className="text-sm font-mono leading-relaxed hljs language-yaml">
    <code dangerouslySetInnerHTML={{ __html: highlightYaml(content) }} />
  </pre>
);

const highlightYaml = (content: string): string => {
  // Simple YAML highlighting - keys, strings, comments
  return content
    .split('\n')
    .map(line => {
      // Comments
      if (line.trim().startsWith('#')) {
        return `<span class="hljs-comment">${escapeHtml(line)}</span>`;
      }
      // Key-value pairs
      const colonIndex = line.indexOf(':');
      if (colonIndex > 0 && !line.trim().startsWith('-')) {
        const key = line.slice(0, colonIndex);
        const value = line.slice(colonIndex + 1);
        return `<span class="hljs-attr">${escapeHtml(key)}</span>:${highlightYamlValue(value)}`;
      }
      return escapeHtml(line);
    })
    .join('\n');
};

const highlightYamlValue = (value: string): string => {
  const trimmed = value.trim();
  if (trimmed === '') return value;
  if (trimmed === 'true' || trimmed === 'false') {
    return value.replace(trimmed, `<span class="hljs-literal">${trimmed}</span>`);
  }
  if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
    return value.replace(trimmed, `<span class="hljs-number">${trimmed}</span>`);
  }
  if (trimmed.startsWith('"') || trimmed.startsWith("'")) {
    return value.replace(trimmed, `<span class="hljs-string">${escapeHtml(trimmed)}</span>`);
  }
  return escapeHtml(value);
};

const escapeHtml = (str: string): string =>
  str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// --- DocContent component ---

export const DocContent = ({ content, docPath, loading, error, onRetry }: DocContentProps) => {
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

  // Gherkin .feature files
  if (isGherkinFile(docPath) && content !== null && content.length > 0) {
    return (
      <div className="overflow-y-auto p-4">
        <GherkinContent content={content} />
      </div>
    );
  }

  // YAML files
  if (isYamlFile(docPath) && content !== null && content.length > 0) {
    return (
      <div className="overflow-y-auto p-4">
        <YamlContent content={content} />
      </div>
    );
  }

  // Markdown (default)
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
