# ADR-002: Markdown Rendering Library Selection

## Status

Accepted

## Context

The doc-viewer feature requires client-side markdown rendering with syntax highlighting, mermaid diagram support, tables, and code blocks. The rendering must integrate with the existing React + TypeScript frontend. The board is a local development tool — bundle size is secondary to rendering quality and integration simplicity.

## Options Considered

### Option A: react-markdown + rehype-highlight + mermaid

React component that renders markdown as a React element tree via the unified/remark/rehype pipeline. Syntax highlighting via rehype-highlight (highlight.js). Mermaid via custom component override.

- (+) Native React integration — no `dangerouslySetInnerHTML`
- (+) Composable plugin pipeline (remark for AST, rehype for HTML transforms)
- (+) Custom component overrides enable mermaid integration without hacks
- (+) Active maintenance, part of the unified collective (~13k stars)
- (+) MIT license
- (-) Larger dependency tree (unified ecosystem)
- (-) Plugin configuration requires understanding remark/rehype pipeline

### Option B: marked + DOMPurify + react-syntax-highlighter

marked produces HTML string, sanitized by DOMPurify, rendered via `dangerouslySetInnerHTML`. Code blocks rendered separately via react-syntax-highlighter.

- (+) marked is fast and lightweight (~33k stars)
- (+) Simple API (markdown string in, HTML string out)
- (-) Requires `dangerouslySetInnerHTML` — increases XSS attack surface
- (-) Requires DOMPurify as additional dependency for safety
- (-) Mermaid integration requires post-render DOM manipulation (fragile)
- (-) Two separate rendering paths (marked for prose, react-syntax-highlighter for code)

### Option C: markdown-it + custom React wrapper

markdown-it parses to tokens, custom renderer maps tokens to React elements.

- (+) Token-based API allows fine-grained control
- (+) Well-maintained (~18k stars), MIT license
- (-) Requires building a custom React renderer (significant effort)
- (-) No established React integration — community solutions are thin
- (-) Token-to-React mapping is the same work react-markdown already does

## Decision

**Option A: react-markdown + rehype-highlight + mermaid.**

## Consequences

- react-markdown, remark-gfm, rehype-highlight, highlight.js, and mermaid added to `board/package.json`
- Markdown rendering is fully React-native — no raw HTML injection
- Mermaid diagrams handled via custom code block component: detect `language-mermaid`, call `mermaid.render()`, display SVG or fall back to code block on parse error
- Syntax highlighting for TypeScript, YAML, JSON, Python, Bash, Gherkin registered selectively to control bundle size
- Tables supported via remark-gfm plugin
- Mermaid adds ~250 KB gzipped — acceptable for local tool with zero network latency
- Consider lazy-loading mermaid via dynamic import to improve initial load for docs without diagrams
