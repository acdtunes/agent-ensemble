# Requirements Summary: Documentation Viewer (doc-viewer)

## Epic Overview

Enable developers to read, navigate, and act on project documentation within the board web application -- a generic tool for any development project. The documentation root is configurable per project (part of the existing project registration/discovery mechanism). This eliminates context-switching to the IDE for doc review and enables frictionless transition to AI agent prompting.

## Job Stories Summary

| ID | Job Story | MoSCoW | Opp. Score |
|----|-----------|--------|------------|
| JS-01 | Review docs during feature work | Must | 16.0 |
| JS-02 | Cross-reference docs during review | Must | 14.5 |
| JS-03 | Bridge docs to AI agent workflow | Must | 14.5 |
| JS-04 | Discover docs from board context | Should | 12.0 |
| JS-05 | Search across all documentation | Must | 12.0 |

## User Stories

| ID | Title | Jobs Served | MoSCoW | Est. Effort | Scenarios |
|----|-------|-------------|--------|-------------|-----------|
| US-01 | Board-to-Docs Navigation and Document Tree | JS-01, JS-02, JS-04 | Must | 2-3 days | 5 |
| US-02 | Rich Markdown Document Rendering | JS-01 | Must | 2-3 days | 6 |
| US-03 | Copy File Path for AI Agent Prompting | JS-03 | Must | 1 day | 5 |
| US-04 | Document Search by Filename | JS-05, JS-02 | Must | 1 day | 5 |

## Story Map

```
Workflow:  [Navigate to Docs] --> [Browse/Search] --> [Select Doc] --> [Read Doc] --> [Act on Doc]
               |                      |                   |               |              |
MVP:      Board "Docs" tab     Doc tree with          Click to select   Rich markdown   Copy file
          New route             categories +           Render content    rendering +     path
          US-01                 filename search        US-01 + US-02     mermaid
                                US-01 + US-04                            US-02           US-03
```

**MVP**: US-01 + US-02 + US-03 + US-04. Navigate, search, read (with mermaid), copy path.

## Dependencies

```
US-01 (Navigation + Tree)
  |
  +---> US-02 (Rendering)  -- depends on US-01 for selected doc path
  |       |
  |       +---> US-03 (Copy Path)  -- depends on US-02 for path display
  |
  +---> US-04 (Search)  -- depends on US-01 for doc tree data
```

## Implementation Order (Recommended)

1. **US-01**: Navigation and tree (foundation -- route, API, sidebar)
2. **US-02**: Markdown rendering (content panel, the core value)
3. **US-03**: Copy path (small, high-impact, builds on US-02)
4. **US-04**: Search (MVP, client-side only)

## Suggested Future Stories (Not in Scope)

These emerged from discovery but are explicitly deferred:

- **Document table of contents**: For long documents, a sidebar outline of headings for quick jumping
- **Breadcrumb navigation**: Show document position in hierarchy above content
- **"Last modified" indicator**: Show when a document was last changed for staleness assessment
- **Full-text search**: Server-side search across document content (not just filenames)
- **Internal doc links**: Click a link to another doc and navigate within the viewer

## Cross-Cutting Concerns

### Backend Changes Required
- New API endpoint: `GET /api/projects/{projectId}/docs/tree`
- New API endpoint: `GET /api/projects/{projectId}/docs/content?path={docPath}`
- Documentation root is configurable per project (part of existing project registration/discovery mechanism)
- Endpoints scan the project's configured documentation root for markdown files

### Frontend Changes Required
- New route in hash router: `#/projects/{id}/docs`
- New route type in `Route` union: `{ view: 'docs'; projectId: string }`
- New top-level component: `DocViewer` (sidebar + content panel)
- New sub-components: `DocTree`, `DocContent`, `CopyPathButton`
- Tab navigation added to project header (Board | Docs)

### Routing Impact
- `useRouter` hook must be extended with new `docs` route pattern
- `App.tsx` must handle the new route variant

## Artifact Locations

| Artifact | Path |
|----------|------|
| JTBD Analysis | `docs/ux/doc-viewer/jtbd-analysis.md` |
| Journey Visual | `docs/ux/doc-viewer/journey-doc-review-visual.md` |
| Journey Schema | `docs/ux/doc-viewer/journey-doc-review.yaml` |
| Journey Gherkin | `docs/ux/doc-viewer/journey-doc-review.feature` |
| Shared Artifacts | `docs/ux/doc-viewer/shared-artifacts-registry.md` |
| US-01 | `docs/requirements/doc-viewer/US-01-doc-viewer-navigation.md` |
| US-02 | `docs/requirements/doc-viewer/US-02-document-rendering.md` |
| US-03 | `docs/requirements/doc-viewer/US-03-copy-file-path.md` |
| US-04 | `docs/requirements/doc-viewer/US-04-document-search.md` |
| DoR Checklist | `docs/requirements/doc-viewer/dor-checklist.md` |
