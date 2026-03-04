# Journey: Review Feature Documentation

## Emotional Arc
- **Start**: Curious / slightly frustrated ("I need to check something, where was that decision?")
- **Middle**: Focused / oriented ("I can see the structure, I found the doc, it renders well")
- **End**: Efficient / satisfied ("I read it, I copied the path, I prompted the agent")

## Journey Flow

```
[Board View]                    [Doc Viewer]                    [AI Agent Prompt]

  Andres is on           He clicks "Docs"         He browses        He reads the         He copies the
  the board view         in the project           the doc tree       document with         file path and
  monitoring a           navigation               to find the        rich markdown         pastes into
  delivery                                        relevant doc       rendering             agent prompt

  +-----------+          +-----------+          +-----------+      +-----------+          +-----------+
  | TRIGGER   |--------->| NAVIGATE  |--------->| LOCATE    |----->| READ      |--------->| ACT       |
  +-----------+          +-----------+          +-----------+      +-----------+          +-----------+

  Curious /              Oriented /              Searching /        Focused /             Efficient /
  "where was that?"      "I see the docs link"   "scanning tree"    "reading content"     "got the path"
```

## Step Details

### Step 1: Trigger -- From Board to Docs

**Context**: Andres Dandrea is monitoring delivery on the board (a generic tool for any development project). He sees a card for "Auth middleware" and wants to recall an ADR about a design decision. He looks for a way to access docs without leaving the board app.

**What he sees today**: Nothing. There is no docs link. He must switch to the IDE.

**What he should see**:
```
+-----------------------------------------------------------------------+
| < Overview / acme-api                              [Connected]        |
+-----------------------------------------------------------------------+
| Board   Docs                                                          |
+-----------------------------------------------------------------------+
|                                                                       |
|  [ProgressHeader: 12/20 steps complete]                               |
|                                                                       |
|  Queued    |  Active    |  Review    |  Done                          |
|  --------  |  --------  |  --------  |  --------                      |
|  [card]    |  [card]    |  [card]    |  [card]                        |
|  [card]    |  [card]    |            |  [card]                        |
|                                                                       |
+-----------------------------------------------------------------------+
```

**Emotional state**: Curious -> Oriented (sees "Docs" tab in project navigation)

**Shared artifacts**:
- `${projectId}` -- from URL hash `#/projects/{id}/board`
- `${projectPath}` -- resolved from project registry (filesystem path)

---

### Step 2: Navigate -- Enter Doc Viewer

**Context**: Andres clicks "Docs" in the project navigation. The URL changes to `#/projects/{id}/docs`. The doc viewer loads with a sidebar showing the document tree.

**What he should see**:
```
+-----------------------------------------------------------------------+
| < Overview / acme-api                              [Connected]        |
+-----------------------------------------------------------------------+
| Board   Docs                                                          |
+-----------------------------------------------------------------------+
|                                                                       |
| +-- Doc Tree ------+  +-- No document selected -------------------+  |
| |                   |  |                                           |  |
| | v ADRs (8)        |  |  Select a document from the tree on the  |  |
| |   ADR-001-multi.. |  |  left to start reading.                  |  |
| |   ADR-002-projec..|  |                                           |  |
| |   ADR-003-client..|  |  This project has:                       |  |
| |   ...             |  |    8 ADRs                                 |  |
| |                   |  |    3 Features with documentation          |  |
| | v Features        |  |    23 documents total                     |  |
| |   v card-redesign |  |                                           |  |
| |     v discuss (7) |  |                                           |  |
| |     v design  (3) |  |                                           |  |
| |     v distill (5) |  |                                           |  |
| |   > kanban-board  |  |                                           |  |
| |   > multi-project |  |                                           |  |
| |                   |  |                                           |  |
| +-------------------+  +------------------------------------------+  |
|                                                                       |
+-----------------------------------------------------------------------+
```

**Emotional state**: Oriented -> Exploring ("I can see everything that exists")

**Shared artifacts**:
- `${docTree}` -- auto-discovered from the project's configured documentation root
- `${docCount}` -- count of documents per category
- `${projectId}` -- carried from Step 1

---

### Step 3: Locate -- Find the Document

**Context**: Andres wants the ADR about multi-project state management. He scans the ADR list in the tree, sees "ADR-001-multi-project-state-management" and clicks it.

Alternative path: He uses the search bar at the top of the doc tree. Types "state management" and sees matching results.

**What he should see (after clicking a doc)**:
```
+-----------------------------------------------------------------------+
| < Overview / acme-api                              [Connected]        |
+-----------------------------------------------------------------------+
| Board   Docs                                                          |
+-----------------------------------------------------------------------+
|                                                                       |
| +-- Doc Tree ------+  +-- ADR-001: Multi-Project State Mgmt -----+  |
| |                   |  |                                           |  |
| | [Search docs...] |  |  docs/adrs/ADR-001-multi-project...  [cp] |  |
| |                   |  |                                           |  |
| | v ADRs (8)        |  |  ## Status                                |  |
| |  *ADR-001-multi.* |  |  Proposed                                 |  |
| |   ADR-002-projec..|  |                                           |  |
| |   ADR-003-client..|  |  ## Context                                |  |
| |   ...             |  |  The board currently holds a single       |  |
| |                   |  |  `currentState` and `plan` in the server  |  |
| | v Features        |  |  process. To support multiple concurrent  |  |
| |   v card-redesign |  |  projects (max 5), the server needs to    |  |
| |     v discuss (7) |  |  manage per-project state...              |  |
| |     v design  (3) |  |                                           |  |
| |     v distill (5) |  |  ## Decision                               |  |
| |   > kanban-board  |  |  Use an in-memory `Map<ProjectId,         |  |
| |   > multi-project |  |  ProjectEntry>` managed by a               |  |
| |                   |  |  `ProjectRegistry` module...               |  |
| +-------------------+  +------------------------------------------+  |
|                                                                       |
+-----------------------------------------------------------------------+
```

**Emotional state**: Searching -> Focused ("Found it, reading now")

**Shared artifacts**:
- `${selectedDocPath}` -- relative path from project root (e.g., `docs/adrs/ADR-001-multi-project-state-management.md`)
- `${docContent}` -- raw markdown content served from backend
- `${docTitle}` -- extracted from first `#` heading or filename

---

### Step 4: Read -- Consume the Document

**Context**: Andres reads the ADR. It has markdown headings, code-like references to `Map<ProjectId, ProjectEntry>`, and structured sections. The rendering is clean with proper heading hierarchy, inline code formatting, and readable paragraphs.

**Key rendering requirements**:
- Headings with proper hierarchy (h1-h6)
- Inline code with monospace background
- Code blocks with syntax highlighting
- Tables with borders and alignment
- Mermaid diagrams rendered as SVG (Must Have), with fallback to formatted code blocks on parse failure
- Gherkin scenarios with keyword highlighting
- Links clickable (internal doc links navigate within viewer)

**Emotional state**: Focused ("This is easy to read, I found what I needed")

---

### Step 5: Act -- Copy Path and Prompt Agent

**Context**: Andres has read the ADR and decides it needs updating. He clicks the copy button `[cp]` next to the file path. A brief visual confirmation appears ("Copied!"). He switches to his terminal, pastes the path into a prompt for Claude: "Read `docs/adrs/ADR-001-multi-project-state-management.md` and update the status from Proposed to Accepted."

**What he should see after clicking copy**:
```
  docs/adrs/ADR-001-multi-project...  [Copied!]
```
The `[Copied!]` label reverts to `[cp]` after 2 seconds.

**Emotional state**: Efficient / Satisfied ("Seamless transition from reading to prompting")

**Shared artifacts**:
- `${copiedPath}` -- same as `${selectedDocPath}`, relative from project root

---

## Error Paths

### E1: No Documentation Found
**When**: Project's configured documentation root does not exist or contains no markdown files.
**What user sees**: Empty state in doc tree: "No documentation found for this project."
**Emotional impact**: Mild disappointment, but clear guidance.

### E2: Document Fails to Load
**When**: File exists in tree but cannot be read (permissions, deleted between discovery and access).
**What user sees**: Error in content panel: "Could not load `{path}`. The file may have been moved or deleted." with a refresh suggestion.
**Emotional impact**: Brief frustration, clear recovery path.

### E3: Malformed Markdown
**When**: Markdown has syntax errors or unsupported elements.
**What user sees**: Best-effort rendering. Raw markdown shown for unparseable sections rather than blank space. Never hide content.
**Emotional impact**: Acceptable degradation -- content is still accessible.

---

## Integration Points

| From | To | Data | Validation |
|------|-----|------|------------|
| Board view URL | Doc viewer URL | `${projectId}` | Same project ID in both routes |
| Project registry | Doc tree | `${projectPath}` | Filesystem path resolves correctly |
| Filesystem | Doc tree | `${docTree}` | Auto-discovered, reflects actual structure |
| Filesystem | Content panel | `${docContent}` | Raw markdown served correctly |
| Content panel | Clipboard | `${selectedDocPath}` | Relative path from project root |
