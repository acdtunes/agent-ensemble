# Journey: Multi-Project Selection and Navigation

## Emotional Arc
- **Start**: Constrained / frustrated ("My projects are at different paths, the tool cannot see them")
- **Middle**: Oriented / empowered ("I registered my projects, I can see them all, I can drill into features")
- **End**: Fluid / satisfied ("I navigate freely between projects and features")

## Journey Flow

```
[Register]               [Overview]                [Project]                 [Feature]

  Andres clicks        He opens the           He clicks a              He selects a
  "Add Project"        board and sees         project card             feature to view
  and picks folders    all projects           to enter it              its board or docs
                       with status

  +-----------+        +-----------+          +-----------+            +-----------+
  | CONFIGURE |------->| ORIENT    |--------->| SELECT    |----------->| DRILL DOWN|
  +-----------+        +-----------+          +-----------+            +-----------+

  Constrained /        Oriented /             Focused /                Productive /
  "how do I add?"      "I see everything"     "entering project"       "feature board"
```

## Step Details

### Step 1: Configure -- Add Projects from UI

**Context**: Andres has two projects he wants to monitor: `karateka` (a Godot game at `/Users/andres.dandrea/projects/personal/karateka`) and `nw-teams` (CLI tools at `/Users/andres.dandrea/projects/personal/nw-teams`). He needs to tell the board app where these projects live.

**What he does today**: Sets a `PROJECTS_ROOT` environment variable pointing to a parent directory. Only works if all projects share that parent directory.

**What he should do**:
```
+-----------------------------------------------------------------------+
| nWave Board                                          [Connected]      |
+-----------------------------------------------------------------------+
|                                                                       |
|  No projects yet. Click "Add Project" to get started.                 |
|                                                                       |
|         [ + Add Project ]                                             |
|                                                                       |
+-----------------------------------------------------------------------+

   (clicks "Add Project")

+-----------------------------------------------------------------------+
| Add Project                                                     [X]  |
+-----------------------------------------------------------------------+
|                                                                       |
|  Select a project folder:                                             |
|                                                                       |
|  [ Browse... ] /Users/andres.dandrea/projects/personal/karateka       |
|                                                                       |
|                                         [ Cancel ]  [ Add ]          |
+-----------------------------------------------------------------------+
```

**Emotional state**: Constrained -> Empowered ("I clicked a button, picked a folder, and it just works")

**Shared artifacts**:
- `${projectPaths}` -- array of absolute filesystem paths to registered projects (persisted internally by server)
- `${projectIds}` -- slug-format IDs derived from folder names

---

### Step 2: Orient -- Project Overview Dashboard

**Context**: Andres opens the board app in his browser. The overview page loads, showing cards for all registered projects. He can see at a glance that `nw-teams` has 3 active features with deliveries in progress, and `karateka` has 1 feature being set up.

**What he should see**:
```
+-----------------------------------------------------------------------+
| nWave Board                                          [Connected]      |
+-----------------------------------------------------------------------+
|                                                                       |
|  Projects (2)                                                         |
|                                                                       |
|  +-- karateka ---------------------------+  +-- nw-teams ----------+  |
|  |                                       |  |                      |  |
|  |  /Users/.../personal/karateka         |  |  /Users/.../nw-teams |  |
|  |                                       |  |                      |  |
|  |  Features: 1                          |  |  Features: 4         |  |
|  |  - movement-system (in progress)      |  |  - kanban-board (ok) |  |
|  |                                       |  |  - card-redesign (ok)|  |
|  |  No active delivery                   |  |  - doc-viewer (prog) |  |
|  |                                       |  |  - multi-project (.) |  |
|  |  Updated: 2026-02-28                  |  |  Updated: 2026-03-01 |  |
|  +---------------------------------------+  +----------------------+  |
|                                                                       |
+-----------------------------------------------------------------------+
```

**Emotional state**: Oriented / in control ("I see everything at a glance")

**Shared artifacts**:
- `${projectId}` -- used in URL routing `#/projects/{projectId}`
- `${featureList}` -- discovered from `docs/feature/` within each project
- `${projectSummary}` -- aggregated delivery status across features

---

### Step 3: Select -- Enter a Project

**Context**: Andres clicks the "nw-teams" card. He enters the project view, which shows the project's features as the primary navigation. He sees the feature list with summary status for each.

**What he should see**:
```
+-----------------------------------------------------------------------+
| < Overview / nw-teams                                [Connected]      |
+-----------------------------------------------------------------------+
|                                                                       |
|  Features (4)                                                         |
|                                                                       |
|  +-- kanban-board ------+  +-- card-redesign ------+                  |
|  |                      |  |                       |                  |
|  |  12/12 complete      |  |  26/26 complete       |                  |
|  |  [========= ] 100%   |  |  [========= ] 100%    |                  |
|  |                      |  |                       |                  |
|  |  Board  Docs         |  |  Board  Docs          |                  |
|  +----------------------+  +-----------------------+                  |
|                                                                       |
|  +-- doc-viewer --------+  +-- multi-project ------+                  |
|  |                      |  |                       |                  |
|  |  8/14 complete       |  |  0/0 not started      |                  |
|  |  [======    ] 57%    |  |  [          ] 0%      |                  |
|  |  2 active, 1 failed  |  |  No roadmap yet       |                  |
|  |                      |  |                       |                  |
|  |  Board  Docs         |  |  Docs                 |                  |
|  +----------------------+  +-----------------------+                  |
|                                                                       |
+-----------------------------------------------------------------------+
```

**Emotional state**: Focused ("I see the features, I know where to go")

**Shared artifacts**:
- `${featureId}` -- slug from directory name (e.g., `card-redesign`)
- `${featureStatus}` -- derived from feature's `execution-log.yaml` or `roadmap.yaml`
- `${hasRoadmap}` -- boolean, determines whether "Board" link is available

---

### Step 4: Drill Down -- Feature Board or Docs

**Context**: Andres clicks "Board" on the "doc-viewer" feature card. He sees the kanban board for that feature's delivery, with cards organized by layer and status. He can also click "Docs" to see that feature's documentation. Crucially, the header includes **project and feature dropdowns** so he can switch project or feature without navigating back to the overview or feature list.

**What he should see (Board view)**:
```
+-----------------------------------------------------------------------+
| < Overview / [nw-teams v] / [doc-viewer v]           [Connected]      |
+-----------------------------------------------------------------------+
| Board   Docs                                                          |
+-----------------------------------------------------------------------+
|                                                                       |
|  doc-viewer delivery                                                  |
|  [======            ] 8/14 steps (57%)    Phase 2 of 3                |
|                                                                       |
|  Queued    |  Active     |  Review     |  Done                        |
|  --------  |  ---------- |  ---------- |  --------                    |
|  [card]    |  [card]     |  [card]     |  [card]                      |
|  [card]    |  [card]     |             |  [card]                      |
|            |             |             |  [card]                      |
|            |             |             |  [card]                      |
|                                                                       |
+-----------------------------------------------------------------------+

  [nw-teams v] = project dropdown (lists all registered projects)
  [doc-viewer v] = feature dropdown (lists features; board shows only board-capable, docs shows all)
```

**What he should see (Docs view)**:
```
+-----------------------------------------------------------------------+
| < Overview / [nw-teams v] / [doc-viewer v]           [Connected]      |
+-----------------------------------------------------------------------+
| Board   Docs                                                          |
+-----------------------------------------------------------------------+
|  v discuss (4)      |  # Architecture Design                         |
|    jtbd-analysis.md |                                                 |
|    journey.yaml     |  ## Overview                                    |
|  v design (3)       |  The doc-viewer feature provides...             |
|   >architecture.md< |                                                 |
|    components.md    |  ## Components                                  |
|  v distill (3)      |  ...                                            |
|    walking-skel.md  |                                                 |
+-----------------------------------------------------------------------+
```

**URL pattern**: `#/projects/{projectId}/features/{featureId}/board` or `#/projects/{projectId}/features/{featureId}/docs`

**Emotional state**: Productive / in flow ("I can switch features or projects without losing my place")

**Shared artifacts**:
- `${featureId}` -- from URL, feature card click, or feature dropdown selection
- `${featureRoadmap}` -- loaded from `docs/feature/{featureId}/roadmap.yaml`
- `${featureState}` -- loaded from `docs/feature/{featureId}/execution-log.yaml`
- `${projectList}` -- populates the project dropdown
- `${featureList}` -- populates the feature dropdown (filtered by view: board-capable only for board, all for docs)

---

## Error Paths

### E1: No Projects Registered Yet
**When**: First launch or all projects have been removed.
**What user sees**: Overview shows empty state: "No projects yet. Click 'Add Project' to get started." with a prominent button.
**Emotional impact**: Guided, not confused. Clear next step -- click the button.

### E2: Selected Folder Does Not Exist or Is Invalid
**When**: User types a path manually and it does not exist, or the folder was deleted after registration.
**What user sees**: Inline validation error: "Directory not found: /path/to/project". For already-registered projects whose path disappeared, the project card shows an error state with a "Remove" option.
**Emotional impact**: Mild frustration, but clear diagnostic and actionable.

### E3: Project Has No Features
**When**: User enters a project that has no `docs/feature/` directory or it is empty.
**What user sees**: Feature list shows empty state: "No features found. Features are discovered from `docs/feature/` directories."
**Emotional impact**: Acceptable -- not all projects have features yet.

### E4: Feature Has No Roadmap
**When**: Feature directory exists but has no `roadmap.yaml`.
**What user sees**: Feature card shows "Docs" link only (no "Board" link). Tooltip or muted text: "No roadmap.yaml -- board unavailable."
**Emotional impact**: Clear feedback, no dead ends.

### E5: Feature Roadmap Parse Error
**When**: `roadmap.yaml` exists but is malformed.
**What user sees**: Feature card shows error indicator. Clicking "Board" shows inline error with the parse message and file path.
**Emotional impact**: Diagnostic, actionable.

---

## Integration Points

| From | To | Data | Validation |
|------|-----|------|------------|
| Add Project UI | Server API | `${projectPath}` | Path resolves to existing directory |
| Server registry | Overview dashboard | `${projectSummary}` | All registered projects appear as cards |
| Feature filesystem scan | Project view | `${featureList}` | Features match `docs/feature/*/` directories |
| Feature `roadmap.yaml` | Feature board | `${featureRoadmap}` | Roadmap parses correctly |
| Feature `execution-log.yaml` | Feature board | `${featureState}` | State file parses correctly |
| URL hash | All views | `${projectId}`, `${featureId}` | IDs match registered projects and discovered features |
