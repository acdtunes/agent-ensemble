# Walking Skeleton Strategy: Documentation Viewer

## Walking Skeletons (3)

### WS-1: Navigate to docs, select a document, read its content
**User goal**: "I can open docs from the board, browse the tree, pick a doc, and read it."
**Stories touched**: US-01 (navigation, tree), US-02 (rendering)
**Observable outcome**: Doc viewer shows tree in sidebar, clicking a doc renders formatted content with file path displayed.

### WS-2: Copy a document path for AI agent prompting
**User goal**: "I can copy the file path to my clipboard and paste it into an agent prompt."
**Stories touched**: US-03 (copy path)
**Observable outcome**: Clicking copy button puts relative path in clipboard, "Copied!" confirmation appears.

### WS-3: Search for a document by filename keyword
**User goal**: "I can find a specific doc by typing a keyword instead of browsing folders."
**Stories touched**: US-04 (search), US-01 (tree)
**Observable outcome**: Typing in search field filters tree, clearing restores full tree.

## Walking Skeleton Litmus Test

| Criterion | WS-1 | WS-2 | WS-3 |
|-----------|------|------|------|
| Title describes user goal | Yes: "navigates, selects, reads" | Yes: "copies path for AI" | Yes: "searches by keyword" |
| Given/When describe user actions | Yes: clicks tab, clicks doc | Yes: clicks copy button | Yes: types in search |
| Then describe user observations | Yes: sees tree, reads content | Yes: path in clipboard, confirmation | Yes: filtered tree, restored tree |
| Non-technical stakeholder confirms | Yes: "can browse and read docs" | Yes: "can copy path for agents" | Yes: "can find docs by keyword" |

## Implementation Sequence

Walking skeletons are enabled AFTER all focused scenarios pass for their constituent stories. Sequence:

1. Enable US-01 focused scenarios (one at a time, starting with first non-skip)
2. Enable US-02 focused scenarios
3. Enable US-03 focused scenarios
4. Enable US-04 focused scenarios
5. Enable walking skeleton tests (all 3, they validate the full integration)

## Dependency Chain for One-at-a-Time Enablement

```
US-01 Scenario 1 (navigate to docs)
  -> US-01 Scenario 2 (tree structure)
    -> US-01 Scenarios 3-7 (expand/collapse, sort, counts)
    -> US-01 Scenarios 8-10 (error states)
    -> US-01 Scenarios 11-13 (edge cases)
  -> US-02 Scenario 1 (headings)
    -> US-02 Scenarios 2-6 (code, tables, mermaid, scroll)
    -> US-02 Scenarios 7-9 (error: deleted, malformed, retry)
    -> US-02 Scenarios 10-12 (edge: empty, unsupported, property)
  -> US-03 Scenario 1 (copy path)
    -> US-03 Scenarios 2-5 (confirmation, relative, visible, keyboard)
    -> US-03 Scenarios 6-8 (error: clipboard fail, edge, property)
  -> US-04 Scenario 1 (filter by keyword)
    -> US-04 Scenarios 2-5 (context, clear, case, live)
    -> US-04 Scenarios 6-9 (error: no results, empty, edge, property)
  -> Walking Skeletons 1-3 (full integration)
```

Server pure function tests (doc-tree.test.ts, doc-content.test.ts) can be implemented in parallel with US-01 since they test the pure core independently.
