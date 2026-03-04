# JTBD Analysis: Multi-Project Selector

## Job Classification

**Job Type**: Brownfield Improvement (Job 2)
**Workflow**: `discuss -> design -> distill -> execute -> review`
**Rationale**: The web board application exists with multi-project infrastructure already in place (registry, discovery, WebSocket subscriptions, hash router, project cards). The user has identified a specific constraint: project discovery only scans a single `PROJECTS_ROOT` directory, but real projects live at arbitrary filesystem paths. The feature model (docs/feature/{feature-id}/) and its sub-navigation also need surfacing. Discovery is lightweight -- the user has articulated the problems and the existing architecture clearly.

---

## Persona

### Andres Dandrea -- Solo Developer

**Who**: Solo developer managing multiple personal projects across different filesystem locations, using the board app to monitor delivery progress and review documentation.

**Demographics**:
- Technical proficiency: Expert (writes the tooling he uses)
- Frequency of interaction: Multiple times daily during active delivery
- Environment: macOS, single machine, projects scattered across `~/projects/personal/`
- Primary motivation: See delivery status and docs for all projects in one place without filesystem constraints

**Job Steps**:

| Job Step | Goal | Desired Outcome |
|----------|------|-----------------|
| Register | Add a project from the UI by selecting a folder | Minimize steps to register a project at an arbitrary path |
| Orient | See all registered projects at a glance | Minimize time to assess which projects exist and their status |
| Select | Switch between projects | Minimize navigation friction when jumping between projects |
| Drill down | View features within a project | Minimize time to find a specific feature's board or docs |
| Monitor | Track delivery progress per feature | Minimize likelihood of missing status changes across projects |

**Pain Points**:
- "All my projects must live under one parent directory" -- maps to Job Step: Register
- "I cannot add karateka (Godot game) and nw-teams (CLI tools) to the same board instance" -- maps to Job Step: Register
- "Each project has multiple features with their own roadmaps, but the board only shows the top-level project state" -- maps to Job Step: Drill down

**Success Metrics**:
- Register a project in under 10 seconds (click Add, pick folder, done)
- Switch between projects in 1 click from the overview
- Navigate to a specific feature's board in 2 clicks or fewer
- Zero configuration file editing -- everything is done from the UI

---

## Job Stories

### JS-01: Register Projects from Arbitrary Paths

**When** I have development projects scattered across different directories on my machine (e.g., `/Users/andres.dandrea/projects/personal/karateka` and `/Users/andres.dandrea/projects/personal/nw-teams`),
**I want to** register each project in the board app regardless of where it lives on the filesystem,
**so I can** monitor all my projects in a single dashboard without reorganizing my directory structure.

**Functional Job**: Add a project to the board by specifying its absolute filesystem path, independent of any parent directory constraint.
**Emotional Job**: Feel unconstrained -- the tool adapts to how I organize my files, not the other way around.
**Social Job**: N/A (solo developer workflow).

**Forces Analysis**:
- **Push**: Current discovery mechanism (`scanProjectDirsFs`) only scans subdirectories of a single `PROJECTS_ROOT`. Projects at `/Users/andres.dandrea/projects/personal/karateka` and `/Users/andres.dandrea/projects/personal/nw-teams` share a common parent (`personal/`), but other projects might not. The constraint forces artificial directory organization.
- **Pull**: An "Add Project" button in the UI with a folder picker would let the user point at any directory. The board becomes a true multi-project dashboard without requiring any config file editing.
- **Anxiety**: Will the folder picker work reliably across browsers? What if a registered path becomes invalid (project moved or deleted)?
- **Habit**: The current `PROJECTS_ROOT` environment variable is simple: set one path, all subdirectories with `state.yaml` are auto-discovered. Switching to explicit registration adds a UI step, but it's intuitive (click, pick folder, done).

**Assessment**:
- Switch likelihood: High -- the constraint is the primary blocker preventing real usage with multiple projects.
- Key blocker: Anxiety about browser folder picker limitations. Mitigation: provide both native folder picker and text input fallback.
- Key enabler: UI-driven add/remove with server-side persistence that survives restarts.
- Design implication: "Add Project" button on overview opens a folder picker; server validates and persists. "Remove" action on each project card unregisters without deleting files.

---

### JS-02: See All Projects at a Glance

**When** I have registered 2-5 projects in the board app and want a quick status check,
**I want to** see all projects on a single overview page with their delivery progress summarized,
**so I can** identify which project needs attention without navigating into each one.

**Functional Job**: View an overview dashboard showing all registered projects with summary metrics (completion percentage, active steps, failed steps, last updated).
**Emotional Job**: Feel oriented and in control -- one glance tells me where things stand across all my work.
**Social Job**: N/A.

**Forces Analysis**:
- **Push**: With multiple projects registered, the user needs a landing page that answers "what needs my attention right now?" Currently the overview exists (`#/` route) with project cards, but only for auto-discovered projects under `PROJECTS_ROOT`.
- **Pull**: Project cards already exist in `ProjectCard.tsx` with completion percentage, active/failed badges, and last-updated timestamp. Extending this to arbitrary-path projects is natural.
- **Anxiety**: Will the overview become cluttered with 5 projects? What if a project has no active delivery (no `state.yaml`)?
- **Habit**: The current overview already works for auto-discovered projects. The user just needs it to include explicitly registered projects too.

**Assessment**:
- Switch likelihood: High -- the overview already exists and works well; it just needs to include all registered projects.
- Key blocker: Projects without active deliveries (no `state.yaml`) need a graceful representation.
- Design implication: Project cards should handle the "no active delivery" state gracefully (show project name, indicate no active delivery, still link to docs).

---

### JS-03: Navigate to a Feature Within a Project

**When** I have selected a project and it contains multiple features (e.g., `kanban-board`, `card-redesign`, `doc-viewer`, `multi-project-board`),
**I want to** see and select a specific feature to view its board or documentation,
**so I can** focus on the delivery and documentation of one feature at a time.

**Functional Job**: Browse the list of features within a project (discovered from `docs/feature/{feature-id}/` directories) and select one to view its roadmap, execution log, and documentation.
**Emotional Job**: Feel organized -- my project's work is structured by feature, and the tool reflects that structure.
**Social Job**: N/A.

**Forces Analysis**:
- **Push**: The current board shows one delivery state per project (`state.yaml` at the project root). But real projects have multiple features, each with its own `roadmap.yaml` and `execution-log.yaml`. There is no way to drill into feature-level delivery.
- **Pull**: A feature selector within the project view -- perhaps as a sidebar, dropdown, or sub-navigation -- lets the user focus on one feature's delivery at a time. This matches the actual artifact structure (`docs/feature/{feature-id}/roadmap.yaml`).
- **Anxiety**: Will feature discovery add latency? What if a feature directory exists but has no `roadmap.yaml`?
- **Habit**: Currently the user navigates to `#/projects/{id}/board` and sees a single board. Adding feature-level navigation changes this mental model.

**Assessment**:
- Switch likelihood: High -- this is the core unmet need. Projects without feature-level navigation are limited to single-delivery monitoring.
- Key blocker: Feature discovery must be fast (local filesystem, not network) and handle incomplete feature directories gracefully.
- Design implication: Features are discovered by scanning `docs/feature/` within each project. Each feature with a `roadmap.yaml` can show a board. Features without a roadmap can still show documentation.

---

### JS-04: Switch Between Projects Quickly

**When** I am deep in one project's feature board and need to check something in another project,
**I want to** switch projects with minimal navigation (1-2 clicks),
**so I can** maintain my working context and not lose track of where I was.

**Functional Job**: Navigate from any view within one project back to the overview, or directly to another project.
**Emotional Job**: Feel fluid -- project switching should feel like switching tabs, not like starting over.
**Social Job**: N/A.

**Forces Analysis**:
- **Push**: The current "< Overview" breadcrumb in the header takes the user back to the project list, but from there they must click into the new project, then find the right feature. This is 3+ clicks.
- **Pull**: A project switcher in the header (dropdown or persistent sidebar) enables 1-click switching. The URL structure `#/projects/{id}/...` already supports deep linking.
- **Anxiety**: A persistent project switcher might take space from the main content area.
- **Habit**: The "< Overview" -> click project pattern is simple and understood, even if it takes more clicks.

**Assessment**:
- Switch likelihood: Medium -- the current pattern works, just adds friction. For 2-3 projects, the friction is tolerable. For 5 projects with features, it becomes painful.
- Key enabler: Header-level project/feature breadcrumb that also serves as a switcher.
- Design implication: The breadcrumb `Overview / {project} / {feature}` where each segment is clickable and navigable. Keep it lightweight -- no heavy dropdown, just clickable breadcrumb segments.

---

## Opportunity Scoring

| # | Job Story | Imp. | Sat. | Score | Priority |
|---|-----------|------|------|-------|----------|
| JS-01 | Register projects from arbitrary paths | 95% | 10% | 17.5 | Extremely Underserved |
| JS-03 | Navigate to feature within project | 90% | 5% | 17.5 | Extremely Underserved |
| JS-02 | See all projects at a glance | 80% | 60% | 9.6 | Overserved |
| JS-04 | Switch between projects quickly | 70% | 40% | 9.1 | Overserved |

**Scoring Method**: Team estimate (single developer, self-reported importance and current satisfaction).
**Confidence**: Medium (team estimate, not user survey).

### Top Opportunities (Score >= 12)
1. JS-01: Arbitrary path registration -- Score 17.5 -- Must Have (primary blocker)
2. JS-03: Feature-level navigation -- Score 17.5 -- Must Have (core value)

### Appropriately Served / Overserved Areas (Score < 12)
3. JS-02: Project overview -- Score 9.6 -- Should Have (already partially works, extend to include registered projects)
4. JS-04: Quick project switching -- Score 9.1 -- Could Have (current breadcrumb works, enhance if time allows)

---

## MoSCoW Prioritization

| Priority | Job Stories | Rationale |
|----------|------------|-----------|
| **Must Have** | JS-01, JS-03 | Without arbitrary path registration, the feature has no purpose. Without feature-level navigation, the tool cannot reflect real project structure. |
| **Should Have** | JS-02 | Overview dashboard already exists; extending it to registered projects is incremental work that completes the picture. |
| **Could Have** | JS-04 | Quick switching improves flow but the current breadcrumb pattern is functional. Enhance later. |
| **Won't Have** | Project creation, feature scaffolding, remote project sync | Out of scope -- the board is read-only, monitoring delivery state from filesystem artifacts. |

---

## Outcome Statements

Derived from the 8-step job map:

| Job Map Step | Outcome Statement |
|-------------|-------------------|
| Define | Minimize the time to determine which projects to register in the board |
| Locate | Minimize the likelihood of mistyping a project path (folder picker eliminates typos) |
| Prepare | Minimize the steps required to register a project (click Add, pick folder, done) |
| Confirm | Minimize the likelihood of registering a path that has no deliverable artifacts |
| Execute | Minimize the time to navigate from overview to a specific feature's board |
| Monitor | Minimize the likelihood of missing a delivery status change across projects |
| Modify | Minimize the time to add or remove a project from the board UI |
| Conclude | Minimize the likelihood of stale projects cluttering the overview (remove button) |
