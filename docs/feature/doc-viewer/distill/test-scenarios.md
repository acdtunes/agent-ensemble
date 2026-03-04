# Test Scenarios: Documentation Viewer (doc-viewer)

## Scenario Summary

| Milestone | Feature File | Scenarios | Error/Edge | Error % |
|-----------|-------------|-----------|------------|---------|
| Walking Skeletons | walking-skeleton.feature | 3 | 0 | 0% (E2E) |
| US-01 Navigation & Tree | milestone-1-navigation-and-tree.feature | 13 | 6 | 46% |
| US-02 Rendering | milestone-2-document-rendering.feature | 12 | 6 | 50% |
| US-03 Copy Path | milestone-3-copy-file-path.feature | 10 | 5 | 50% |
| US-04 Search | milestone-4-document-search.feature | 9 | 4 | 44% |
| Server: doc-tree | doc-tree.test.ts | 9 | 4 | 44% |
| Server: doc-content | doc-content.test.ts | 13 | 10 | 77% |
| **Total** | | **69** | **35** | **51%** |

Note: Walking skeletons are E2E integration tests that inherently cover error paths through their vertical slice. Server doc-content tests have high error ratio (77%) due to security-critical path traversal prevention.

Combined frontend error/edge ratio (feature files): 21 error/edge out of 44 focused = **48%** (target: 40%). Exceeds target.
Combined total including server: 35 error/edge out of 69 = **51%**. Well above threshold.

## Scenarios by User Story

### US-01: Board-to-Docs Navigation and Document Tree (13 scenarios)

| # | Scenario | Type | Tags |
|---|----------|------|------|
| 1 | Navigate from board to docs via tab | Happy | @US-01 |
| 2 | Document tree reflects project structure | Happy | @US-01 @skip |
| 3 | Expand and collapse tree folders | Happy | @US-01 @skip |
| 4 | Navigate back to board from docs | Happy | @US-01 @skip |
| 5 | Select a document from the tree | Happy | @US-01 @skip |
| 6 | Document tree sorts folders before files | Happy | @US-01 @skip |
| 7 | Document tree shows accurate file counts | Happy | @US-01 @skip |
| 8 | Project with no documentation configured | Error | @US-01 @skip |
| 9 | Project with missing documentation directory | Error | @US-01 @skip |
| 10 | Unknown project shows error | Error | @US-01 @skip |
| 11 | Deeply nested structure renders faithfully | Edge | @US-01 @skip |
| 12 | Only markdown files appear in tree | Edge | @US-01 @skip |
| 13 | Tree structure always matches filesystem | Property | @US-01 @skip @property |

### US-02: Rich Markdown Document Rendering (12 scenarios)

| # | Scenario | Type | Tags |
|---|----------|------|------|
| 1 | Headings render with visual hierarchy | Happy | @US-02 |
| 2 | Code blocks with syntax highlighting | Happy | @US-02 @skip |
| 3 | Inline code renders distinctly | Happy | @US-02 @skip |
| 4 | Tables render with proper structure | Happy | @US-02 @skip |
| 5 | Mermaid diagrams render as visual diagrams | Happy | @US-02 @skip |
| 6 | Content panel scrolls independently | Happy | @US-02 @skip |
| 7 | Document fails to load (deleted file) | Error | @US-02 @skip |
| 8 | Mermaid with invalid syntax degrades | Error | @US-02 @skip |
| 9 | Retry after failed load succeeds | Error | @US-02 @skip |
| 10 | Empty document renders without error | Edge | @US-02 @skip |
| 11 | Unsupported extensions degrade gracefully | Edge | @US-02 @skip |
| 12 | Any valid markdown renders without crashing | Property | @US-02 @skip @property |

### US-03: Copy File Path for AI Agent Prompting (10 scenarios)

| # | Scenario | Type | Tags |
|---|----------|------|------|
| 1 | Copy file path with one click | Happy | @US-03 |
| 2 | Copy confirmation reverts after 2s | Happy | @US-03 @skip |
| 3 | Copied path is relative from project root | Happy | @US-03 @skip |
| 4 | File path always visible when viewing doc | Happy | @US-03 @skip |
| 5 | Copy button is keyboard accessible | Happy | @US-03 @skip |
| 6 | Copy fails when clipboard unavailable | Error | @US-03 @skip |
| 7 | No copy button when no document selected | Error | @US-03 @skip |
| 8 | Rapid consecutive clicks handled gracefully | Error | @US-03 @skip |
| 9 | Copy deeply nested doc preserves full path | Edge | @US-03 @skip |
| 10 | Displayed path always matches copied path | Property | @US-03 @skip @property |

### US-04: Document Search by Filename (9 scenarios)

| # | Scenario | Type | Tags |
|---|----------|------|------|
| 1 | Filter tree by filename keyword | Happy | @US-04 |
| 2 | Search preserves parent folder context | Happy | @US-04 @skip |
| 3 | Clear search restores full tree | Happy | @US-04 @skip |
| 4 | Search is case-insensitive | Happy | @US-04 @skip |
| 5 | Search updates as user types | Happy | @US-04 @skip |
| 6 | No results shows helpful message | Error | @US-04 @skip |
| 7 | Search on empty tree shows no results | Error | @US-04 @skip |
| 8 | Single character search filters | Edge | @US-04 @skip |
| 9 | Clearing always restores original tree | Property | @US-04 @skip @property |

### Server Pure Functions: doc-tree (9 scenarios)

| # | Scenario | Type |
|---|----------|------|
| 1 | Builds tree with root-level files | Happy |
| 2 | Builds nested tree from flat entries | Happy |
| 3 | Handles empty entries | Edge |
| 4 | Handles deeply nested structure | Happy |
| 5 | sortNodes: directories before files | Happy |
| 6 | sortNodes: all files (no dirs) | Edge |
| 7 | sortNodes: empty array | Edge |
| 8 | Filters non-markdown files | Happy |
| 9 | Excludes hidden directories | Happy |

### Server Pure Functions: doc-content (13 scenarios)

| # | Scenario | Type |
|---|----------|------|
| 1 | Accepts simple filename | Happy |
| 2 | Accepts nested relative path | Happy |
| 3 | Accepts deeply nested path | Happy |
| 4 | REJECTS ../ traversal | Security/Error |
| 5 | REJECTS embedded ../ | Security/Error |
| 6 | REJECTS null bytes | Security/Error |
| 7 | REJECTS absolute path | Security/Error |
| 8 | REJECTS encoded traversal | Security/Error |
| 9 | REJECTS empty path | Security/Error |
| 10 | REJECTS escape via nested ../ | Security/Error |
| 11 | Accepts path with spaces | Edge |
| 12 | Accepts hyphens and underscores | Edge |
| 13 | Normalizes redundant separators | Edge |

## Property-Based Test Tags

Scenarios tagged `@property` signal universal invariants for the DELIVER wave crafter to implement as property-based tests with generators:

1. **US-01**: Tree structure always matches filesystem organization
2. **US-02**: Any valid markdown document renders without crashing
3. **US-03**: Displayed path always matches copied path
4. **US-04**: Clearing search always restores original tree completely

## Integration Checkpoints (from shared-artifacts-registry.md)

| Checkpoint | Test Coverage |
|------------|--------------|
| Board-to-Docs navigation (projectId carries over) | Walking skeleton 1, US-01 scenario 1 |
| Doc tree accuracy (reflects filesystem) | US-01 scenario 2, doc-tree.test.ts |
| Doc content accuracy (content matches file) | Walking skeleton 1, US-02 scenario 1 |
| Copy path correctness (display = clipboard) | Walking skeleton 2, US-03 scenarios 1+3, @property tag |
| Docs root resolution (config resolves correctly) | doc-content.test.ts resolveDocsRoot tests |
