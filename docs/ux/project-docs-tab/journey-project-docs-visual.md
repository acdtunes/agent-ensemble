# Journey: Access Project Documentation from Project Page

**Epic**: project-docs-tab
**Date**: 2026-03-06
**Persona**: Carla Rivera, tech lead reviewing project-wide architecture docs before a planning session

## Journey Flow

```
[Project Page]          [Project Page]           [Project Page]
 Feature List            Docs View                Feature List
 (Board tab)             (Docs tab)               (Board tab)

+------------------+   +------------------+      +------------------+
| Overview / proj  |   | Overview / proj  |      | Overview / proj  |
| Agent Ensemble   |   | Agent Ensemble   |      | Agent Ensemble   |
| [Board] [Docs]   |   | [Board] [Docs]   |      | [Board] [Docs]   |
|                  |   |                  |      |                  |
| Feature cards... |   | Sidebar | Content|      | Feature cards... |
+------------------+   +------------------+      +------------------+
        |                       |                        ^
        | click Docs tab        | click Board tab        |
        +------>                +----------------------->+
```

## Emotional Arc

```
Start: Oriented, task-focused     Middle: Exploring, engaged     End: Informed, satisfied
      |                                  |                             |
  "I know where                   "The docs are                "Found what I
   to find docs"                   organized and                 needed, back
                                   easy to browse"               to features"
```

**Arc pattern**: Discovery Joy (Curious -> Exploring -> Informed)

## Step-by-Step with UI Mockups

### Step 1: Project Page with Tab Navigation

The project page gains Board | Docs tabs in the header, replacing the plain title.

```
+------------------------------------------------------------------------+
| Overview / nw-teams                                                     |
| Agent Ensemble    [Board]  [Docs]                         Connected [*] |
+------------------------------------------------------------------------+
|                                                                        |
| [Search features...]                    [All] [Active] [Planned] ...   |
|                                                                        |
| -- Active (3) ---------------------------------------------------      |
| +------------------+ +------------------+ +------------------+         |
| | auth-flow        | | update-ensemble  | | project-docs-tab |         |
| | 75% complete     | | 40% complete     | | Planned          |         |
| +------------------+ +------------------+ +------------------+         |
|                                                                        |
| -- Planned (2) --------------------------------------------------      |
| +------------------+ +------------------+                              |
| | test-consolidat  | | remove-teammates |                              |
| | Not started      | | Not started      |                              |
| +------------------+ +------------------+                              |
+------------------------------------------------------------------------+
```

**Emotional state**: Oriented -- "I see Board is active, and there is a Docs tab I can reach."
**Key change**: `<h1>Agent Ensemble</h1>` replaced with `ProjectTabs` component showing breadcrumb + tabs.

### Step 2: Click Docs Tab -- Documentation Browser

User clicks "Docs" tab. Page transitions to the documentation viewer.

```
+------------------------------------------------------------------------+
| Overview / nw-teams                                                     |
| Agent Ensemble    [Board]  [Docs]                         Connected [*] |
+------------------------------------------------------------------------+
|                                                                        |
| +-- Sidebar (w-64) --+  +-- Content Pane ----------------------------+ |
| |                     |  |                                            | |
| | > docs/             |  | Select a document to view its contents    | |
| |   > feature/        |  |                                            | |
| |     > auth-flow/    |  |                                            | |
| |       baseline.yaml |  |                                            | |
| |       roadmap.yaml  |  |                                            | |
| |   > requirements/   |  |                                            | |
| |     > auth-flow/    |  |                                            | |
| |   > ux/             |  |                                            | |
| |     > auth-flow/    |  |                                            | |
| |       journey.yaml  |  |                                            | |
| |                     |  |                                            | |
| +---------------------+  +--------------------------------------------+ |
+------------------------------------------------------------------------+
```

**Emotional state**: Exploring -- "The doc tree is familiar, organized by directory structure."
**Shared artifact**: `${projectId}` used in API call `/api/projects/${projectId}/docs/tree`

### Step 3: Select a Document

User clicks a document in the sidebar tree. Content loads in the main pane.

```
+------------------------------------------------------------------------+
| Overview / nw-teams                                                     |
| Agent Ensemble    [Board]  [Docs]                         Connected [*] |
+------------------------------------------------------------------------+
|                                                                        |
| +-- Sidebar (w-64) --+  +-- Content Pane ----------------------------+ |
| |                     |  | docs/ux/auth-flow/journey.yaml       [CP] | |
| | > docs/             |  |                                            | |
| |   > feature/        |  | journey:                                   | |
| |   > requirements/   |  |   name: "User Authentication"              | |
| |   > ux/             |  |   goal: "Secure login flow"                | |
| |     > auth-flow/    |  |   persona: "Carla Rivera"                  | |
| |      [journey.yaml] |  |                                            | |
| |       visual.md     |  |   emotional_arc:                           | |
| |                     |  |     start: "Anxious"                       | |
| |                     |  |     middle: "Focused"                      | |
| |                     |  |     end: "Confident"                       | |
| |                     |  |                                            | |
| +---------------------+  +--------------------------------------------+ |
+------------------------------------------------------------------------+
```

**Emotional state**: Engaged -- "I can read the document content right here."
**[CP]** = CopyPathButton for copying the file path

### Step 4: Return to Feature List

User clicks "Board" tab to return to the feature card list.

```
+------------------------------------------------------------------------+
| Overview / nw-teams                                                     |
| Agent Ensemble    [Board]  [Docs]                         Connected [*] |
+------------------------------------------------------------------------+
|                                                                        |
| [Search features...]                    [All] [Active] [Planned] ...   |
|                                                                        |
| Feature cards displayed as before...                                   |
+------------------------------------------------------------------------+
```

**Emotional state**: Satisfied -- "Seamless round-trip, no context lost."

## Error Paths

### E1: No Documentation Found
When the project has no docs/ directory or it is empty, the Docs view shows an empty state.

```
+------------------------------------------------------------------------+
| Overview / nw-teams                                                     |
| Agent Ensemble    [Board]  [Docs]                         Connected [*] |
+------------------------------------------------------------------------+
|                                                                        |
| No documentation found                                                 |
|                                                                        |
+------------------------------------------------------------------------+
```

### E2: Documentation Fetch Fails
When the API returns an error, an error message is shown.

```
+------------------------------------------------------------------------+
| Overview / nw-teams                                                     |
| Agent Ensemble    [Board]  [Docs]                         Connected [*] |
+------------------------------------------------------------------------+
|                                                                        |
| Failed to fetch documentation tree                                     |
|                                                                        |
+------------------------------------------------------------------------+
```

### E3: Individual Document Fails to Load
When a selected document fails to load, the content pane shows an error but the sidebar remains functional.

## Integration Points

| From | To | Shared Artifact |
|------|----|-----------------|
| Router (`useRouter`) | ProjectView / DocsView | `${projectId}` from URL hash |
| ProjectTabs | Board/Docs URLs | `#/projects/${projectId}/board` and `#/projects/${projectId}/docs` |
| DocsView | API endpoint | `/api/projects/${projectId}/docs/tree` |
| DocViewer | API endpoint | `/api/projects/${projectId}/docs/content?path=${path}` |

## Consistency Checklist (vs Feature Docs Tab)

| Aspect | Feature Level | Project Level (Target) |
|--------|--------------|----------------------|
| Tab bar | FeatureNavHeader: Board / Docs | ProjectTabs: Board / Docs |
| Tab visual style | Blue underline on active tab | Same blue underline (reuses ProjectTabs) |
| Breadcrumb | Overview / {projectId} / {featureId} | Overview / {projectId} |
| Doc viewer | MultiRootDocViewer (3 labeled roots) | DocViewer (single root -- whole docs/) |
| Empty state | "No documentation found" | "No documentation found" |
| Copy path button | Yes | Yes |
