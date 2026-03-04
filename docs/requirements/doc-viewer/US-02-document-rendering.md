# US-02: Rich Markdown Document Rendering

## Problem
Andres Dandrea is a solo developer who needs to read project documentation (ADRs, JTBD analyses, journey maps, architecture designs) with rich formatting. The IDE markdown preview is clunky -- split-pane layout, poor rendering of complex content, and no syntax highlighting for code blocks. He finds it frustrating to read long, structured documents that contain code snippets, tables, and Gherkin scenarios in a tool not designed for reading.

## Who
- Solo developer | Reading project documentation | Wants high-fidelity markdown rendering that makes documents easy to consume

## Solution
When a document is selected from the tree, render it in the content panel with full markdown support: heading hierarchy, inline code, syntax-highlighted code blocks, tables with borders, mermaid diagrams rendered as visual diagrams, links, emphasis, lists, and blockquotes. The content panel scrolls independently of the sidebar.

## Job Story Traceability
- **JS-01**: Review Documentation During Feature Work (primary)

## Domain Examples

### 1: Happy Path -- Read an ADR with code blocks and tables
Andres selects "ADR-001-multi-project-state-management.md" from the tree. The content panel renders: an h1 title "ADR-001: Multi-Project State Management", h2 sections (Status, Context, Decision, Alternatives Considered, Consequences), inline code like `Map<ProjectId, ProjectEntry>` with monospace background, and a code block showing the `ProjectEntry` interface with TypeScript syntax highlighting.

### 2: Edge Case -- Document with Gherkin scenarios and YAML schemas
Andres selects "journey-card-monitoring.feature" from card-redesign/discuss. The content panel renders the Gherkin with keyword highlighting (Given, When, Then in distinct color), proper indentation, and code-block-style formatting. YAML schemas in the same document render with proper key-value highlighting.

### 3: Error/Boundary -- Very long document with 300+ lines
Andres selects "requirements-summary.md" which is 300+ lines. The content panel scrolls vertically. The sidebar remains fixed and visible while scrolling. The document heading remains accessible by scrolling back to the top.

## UAT Scenarios (BDD)

### Scenario: Headings render with visual hierarchy
Given Andres has selected a document containing h1, h2, h3, and h4 headings
When the content panel renders the document
Then h1 is the largest and most prominent
And h2 is visually smaller than h1
And h3 is visually smaller than h2
And heading hierarchy is clear through size and weight differentiation

### Scenario: Code blocks with syntax highlighting
Given Andres has selected a document containing a TypeScript code block
When the content panel renders the document
Then the code block appears with a distinct background color
And the code uses a monospace font
And TypeScript keywords, types, and strings are syntax-highlighted

### Scenario: Inline code renders distinctly
Given Andres has selected a document mentioning `currentState` in a paragraph
When the content panel renders the document
Then `currentState` appears in monospace font with a subtle background
And it is visually distinct from the surrounding prose text

### Scenario: Tables render with structure
Given Andres has selected a document with a markdown table (headers and rows)
When the content panel renders the document
Then the table shows with visible row separators
And columns are properly aligned
And header row is visually distinct from data rows

### Scenario: Mermaid diagrams render as visual diagrams
Given Andres has selected a document containing a mermaid code block with a flowchart
When the content panel renders the document
Then the mermaid code block is rendered as a visual diagram (SVG)
And the diagram is readable and properly sized within the content panel
And if mermaid rendering fails, the raw mermaid code is shown as a formatted code block

### Scenario: Independent scrolling of content and sidebar
Given Andres has selected a document with 300+ lines of content
When he scrolls down in the content panel
Then the content scrolls independently
And the sidebar document tree remains visible and fixed
And he can still click other documents in the sidebar without scrolling up

### Scenario: Document fails to load
Given Andres clicks a document in the tree
And the file has been deleted from the filesystem since the tree was loaded
When the content panel attempts to render
Then an error message appears: "Could not load this document"
And the message suggests the file may have been moved or deleted
And a "Retry" button is available

## Acceptance Criteria
- [ ] Markdown headings (h1-h6) render with proper visual hierarchy
- [ ] Inline code renders with monospace font and subtle background
- [ ] Code blocks render with distinct background and syntax highlighting
- [ ] Tables render with borders/separators and proper alignment
- [ ] Links are clickable
- [ ] Lists (ordered and unordered) render with proper indentation
- [ ] Blockquotes render with visual indentation
- [ ] Mermaid code blocks render as visual diagrams (SVG)
- [ ] Mermaid rendering degrades to formatted code block on failure
- [ ] Content panel scrolls independently of sidebar
- [ ] Error state shown when document cannot be loaded, with retry option
- [ ] Rendering degrades gracefully for unsupported markdown extensions (shows raw content, never hides it)

## Technical Notes
- Markdown rendering is client-side (server sends raw markdown)
- New API endpoint: `GET /api/projects/{projectId}/docs/content?path={docPath}` -- returns raw markdown
- Syntax highlighting library needed (solution choice deferred to DESIGN wave)
- Mermaid diagram rendering is Must Have -- library choice deferred to DESIGN wave
- Mermaid rendering must degrade gracefully to formatted code block on parse failure
- Must handle documents up to ~1000 lines without performance degradation
