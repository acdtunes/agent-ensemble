# Technology Stack: Documentation Viewer (doc-viewer)

## New Dependencies

### react-markdown

- **Purpose**: Client-side markdown rendering as React components
- **Version**: ^9.x (latest stable)
- **License**: MIT
- **GitHub**: https://github.com/remarkjs/react-markdown (~13k stars)
- **Maintenance**: Active, part of unified/remark ecosystem
- **Rationale**: Native React integration — renders markdown as React component tree (no `dangerouslySetInnerHTML`). Extensible via remark (AST) and rehype (HTML) plugin pipelines. Supports custom component overrides for code blocks (needed for mermaid).
- **Alternatives considered**:
  - **marked** (MIT, ~33k stars): Fast but outputs HTML strings, requiring `dangerouslySetInnerHTML` — poor React integration, XSS risk surface.
  - **markdown-it** (MIT, ~18k stars): Plugin-based but same HTML string issue as marked. Better suited for non-React contexts.

### rehype-highlight

- **Purpose**: Syntax highlighting for code blocks within react-markdown pipeline
- **Version**: ^7.x (latest stable)
- **License**: MIT
- **GitHub**: https://github.com/rehypejs/rehype-highlight (~300 stars, part of rehype ecosystem)
- **Maintenance**: Active, maintained by unified collective
- **Rationale**: Plugs directly into react-markdown's rehype pipeline — zero integration friction. Uses highlight.js under the hood (190+ languages). Tree-shakeable language registration keeps bundle manageable.
- **Alternatives considered**:
  - **react-syntax-highlighter** (MIT, ~4k stars): Standalone React component wrapping Prism/highlight.js. Would require custom code block override in react-markdown instead of a simple plugin. Extra abstraction layer with no benefit.
  - **shiki** (MIT, ~10k stars): VS Code-quality TextMate grammars. Requires WASM loading, async initialization. Overkill for a local dev tool — highlight.js quality is sufficient.

### highlight.js

- **Purpose**: Language grammar definitions for rehype-highlight
- **Version**: ^11.x (latest stable)
- **License**: BSD-3-Clause
- **GitHub**: https://github.com/highlightjs/highlight.js (~24k stars)
- **Maintenance**: Active, 15+ year history
- **Rationale**: Peer dependency of rehype-highlight. Register only needed languages (TypeScript, YAML, Gherkin, Markdown, JSON, Python, Bash) to control bundle size.
- **Note**: Include a highlight.js CSS theme (e.g., `github` or `github-dark`) for styling.

### mermaid

- **Purpose**: Render mermaid diagram code blocks as SVG
- **Version**: ^11.x (latest stable)
- **License**: MIT
- **GitHub**: https://github.com/mermaid-js/mermaid (~73k stars)
- **Maintenance**: Very active, major releases yearly
- **Rationale**: Only option for mermaid rendering — it is the canonical library. Client-side rendering via `mermaid.render()` produces SVG strings. Integration with react-markdown via custom code block component that detects `language-mermaid` and renders SVG instead of text.
- **Bundle impact**: ~2MB (significant). Acceptable for a local dev tool where network latency is zero.
- **Graceful degradation**: If `mermaid.render()` throws (malformed diagram), fall back to showing the raw mermaid source as a formatted code block.

### remark-gfm

- **Purpose**: GitHub Flavored Markdown support (tables, strikethrough, task lists)
- **Version**: ^4.x (latest stable)
- **License**: MIT
- **GitHub**: https://github.com/remarkjs/remark-gfm (~1k stars, part of remark ecosystem)
- **Maintenance**: Active, maintained by unified collective
- **Rationale**: Tables are a Must Have in the rendering requirements (US-02). Standard markdown does not include table syntax — GFM extension is needed. Also adds strikethrough and task lists which appear in project documentation.

## No New Server Dependencies

All server-side functionality uses Node.js built-in modules:
- `node:fs/promises` — `readdir`, `readFile`, `stat`, `access` (async filesystem operations)
- `node:path` — `join`, `resolve`, `relative`, `normalize` (path manipulation and security)

This is consistent with the existing server architecture which minimizes external dependencies.

## Existing Dependencies Reused

| Dependency | Usage in doc-viewer |
|------------|-------------------|
| `express` | New HTTP route handlers for docs endpoints |
| `react` | New components (DocViewer, DocTree, DocContent, CopyPathButton) |
| `tailwindcss` | Styling for all new components |
| `vitest` | Tests for new pure functions and components |
| `@testing-library/react` | Component tests |
| `typescript` | Type definitions for all new types |

## Bundle Size Impact Estimate

| Package | Approx. gzipped size | Notes |
|---------|---------------------|-------|
| react-markdown | ~15 KB | Core + remark-parse + rehype |
| remark-gfm | ~5 KB | GFM extension |
| rehype-highlight | ~3 KB | Plugin wrapper |
| highlight.js (selective) | ~30-50 KB | 7-8 languages only |
| mermaid | ~250 KB gzipped | Largest addition |
| **Total** | **~300-320 KB** | Acceptable for local tool |

Mermaid dominates the bundle. Consider lazy-loading mermaid (dynamic import on first mermaid block encounter) to avoid penalizing pages without diagrams.
