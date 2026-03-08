# Technology Stack: Project Docs Tab

## Overview

No new technologies introduced. This feature uses existing stack components.

## Frontend Stack (Unchanged)

| Component | Version | License | Purpose |
|-----------|---------|---------|---------|
| React | 18.x | MIT | UI framework |
| TypeScript | 5.x | Apache-2.0 | Type safety |
| Vite | 5.x | MIT | Build tooling |
| Tailwind CSS | 3.x | MIT | Styling |

## Reused Components

| Component | Location | License |
|-----------|----------|---------|
| `ProjectTabs` | `App.tsx:162-198` | Project code |
| `DocViewer` | `components/DocViewer.tsx` | Project code |
| `DocTree` | `components/DocTree.tsx` | Project code |
| `DocContent` | `components/DocContent.tsx` | Project code |
| `useDocTree` | `hooks/useDocTree.ts` | Project code |
| `useRouter` | `hooks/useRouter.ts` | Project code |

## Backend Stack (Unchanged)

Existing API endpoints serve project documentation:
- `/api/projects/{id}/docs/tree`
- `/api/projects/{id}/docs/content`

No new dependencies or endpoints required.

## Rationale

This feature requires zero new technology selections because:
1. `ProjectTabs` component already exists and renders correctly in `DocsView`
2. `DocViewer` and supporting hooks already handle project-level documentation
3. Router already supports `project` and `docs` view types

Technology selection focuses on composition of existing components.
