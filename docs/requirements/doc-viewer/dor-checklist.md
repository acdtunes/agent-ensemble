# Definition of Ready Validation: Documentation Viewer

## US-01: Board-to-Docs Navigation and Document Tree

| DoR Item | Status | Evidence/Issue |
|----------|--------|----------------|
| Problem statement clear | PASS | "Andres finds it disruptive to switch to the IDE to browse docs mid-work" -- domain language, specific pain |
| User/persona identified | PASS | "Andres Dandrea, solo developer monitoring delivery on the board app" -- specific person, context, motivation |
| 3+ domain examples | PASS | 3 examples: happy path (navigate to docs), edge case (deep nested doc structure), error (no docs) |
| UAT scenarios (3-7) | PASS | 5 scenarios: navigate via tab, tree structure, expand/collapse, back to board, no docs |
| AC derived from UAT | PASS | 8 AC items, each traceable to scenarios |
| Right-sized | PASS | 2-3 days, 5 scenarios, single demo-able feature (tree navigation) |
| Technical notes | PASS | New route, new API endpoint, configurable docs root per project, pure function signature |
| Dependencies tracked | PASS | No upstream dependencies. US-02, US-03, US-04 depend on this (downstream) |

**DoR Status**: PASSED

---

## US-02: Rich Markdown Document Rendering

| DoR Item | Status | Evidence/Issue |
|----------|--------|----------------|
| Problem statement clear | PASS | "IDE markdown preview is clunky -- split-pane layout, poor rendering, no syntax highlighting" -- specific frustrations |
| User/persona identified | PASS | "Andres Dandrea, solo developer reading project documentation" |
| 3+ domain examples | PASS | 3 examples: ADR with code blocks, Gherkin scenarios, 300+ line document |
| UAT scenarios (3-7) | PASS | 7 scenarios: headings, code blocks, inline code, tables, mermaid diagrams, scrolling, error |
| AC derived from UAT | PASS | 12 AC items covering all rendering aspects including mermaid and error handling |
| Right-sized | PASS | 2-3 days, 7 scenarios, single demo-able feature (rendered doc reading) |
| Technical notes | PASS | Client-side rendering, new API endpoint, syntax highlighting deferred to DESIGN, mermaid Must Have (library deferred to DESIGN) |
| Dependencies tracked | PASS | Depends on US-01 (for selected doc path and content API). Documented. |

**DoR Status**: PASSED

---

## US-03: Copy File Path for AI Agent Prompting

| DoR Item | Status | Evidence/Issue |
|----------|--------|----------------|
| Problem statement clear | PASS | "Must switch to IDE, find file, right-click, Copy Path -- multi-step context switch" -- concrete pain |
| User/persona identified | PASS | "Andres Dandrea, reviewing docs and prompting AI agents" -- specific workflow context |
| 3+ domain examples | PASS | 3 examples: copy ADR path, copy nested feature doc, clipboard API unavailable |
| UAT scenarios (3-7) | PASS | 5 scenarios: copy click, confirmation revert, relative path, visibility, keyboard |
| AC derived from UAT | PASS | 6 AC items derived from scenarios |
| Right-sized | PASS | 1 day, 5 scenarios, single demo-able feature (copy button) |
| Technical notes | PASS | Clipboard API, relative path format, timing, dependency on US-02 |
| Dependencies tracked | PASS | Depends on US-02 (path displayed above rendered content). Documented. |

**DoR Status**: PASSED

---

## US-04: Document Search by Filename

| DoR Item | Status | Evidence/Issue |
|----------|--------|----------------|
| Problem statement clear | PASS | "23+ files across nested folders, browsing tree to find the right document is slow" -- concrete, quantified |
| User/persona identified | PASS | "Andres Dandrea, searching for a specific document" |
| 3+ domain examples | PASS | 3 examples: keyword match, multiple results with disambiguation, no results |
| UAT scenarios (3-7) | PASS | 5 scenarios: filter, parent context, no results, clear, case-insensitive |
| AC derived from UAT | PASS | 7 AC items covering search behavior |
| Right-sized | PASS | 1 day, 5 scenarios, single feature (search filter) |
| Technical notes | PASS | Client-side only, filename matching, depends on US-01 |
| Dependencies tracked | PASS | Depends on US-01 (doc tree data). Documented. |

**DoR Status**: PASSED

---

## Summary

| Story | DoR Status | Blockers |
|-------|-----------|----------|
| US-01 | PASSED | None |
| US-02 | PASSED | None |
| US-03 | PASSED | None |
| US-04 | PASSED | None |

All 4 stories pass the 8-item DoR hard gate. Ready for handoff to DESIGN wave.
