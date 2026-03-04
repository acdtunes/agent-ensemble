# JTBD Analysis: Documentation Viewer

## Job Classification

**Job Type**: Brownfield Improvement (Job 2)
**Workflow**: `discuss -> design -> distill -> execute -> review`
**Rationale**: The web board app exists as a generic tool for any development project. User has identified specific unmet needs through real usage: reading docs is clunky in the IDE, and there is no way to bridge documentation review to AI agent prompting. The doc viewer must work with any project's configurable documentation root, not just a single hardcoded project. Discovery is lightweight -- user has articulated the problems clearly.

---

## Job Stories

### JS-01: Review Documentation During Feature Work

**When** I am in the middle of working on a feature and need to recall a decision, requirement, or design detail,
**I want to** quickly read the relevant documentation with rich formatting in the same tool I use to monitor delivery,
**so I can** stay in context without switching to the IDE and losing my flow.

**Functional Job**: Access and read project documentation with full markdown rendering (headers, code blocks, mermaid diagrams, tables).
**Emotional Job**: Feel focused and uninterrupted -- documentation access should not break the working rhythm.
**Social Job**: N/A (solo developer workflow).

**Forces Analysis**:
- **Push**: Opening docs in the IDE is clunky -- markdown preview is split-pane, navigation requires file tree browsing, and the IDE is already occupied with code. Context-switching between code editing and doc reading is disruptive.
- **Pull**: Rich markdown rendering in the board app means docs are readable at a glance. Staying in the same browser tab as the delivery board preserves mental context.
- **Anxiety**: Will the rendered docs look correct? Mermaid diagrams, Gherkin code blocks, YAML schemas -- if rendering is poor, the viewer is worse than the IDE.
- **Habit**: The IDE is already open. Muscle memory says "open file tree, find doc, preview." Switching to browser requires a conscious decision.

**Assessment**:
- Switch likelihood: High -- the frustration is real and frequent.
- Key blocker: Rendering quality (anxiety). If mermaid/code/tables render poorly, user reverts to IDE.
- Key enabler: Contextual integration with the board app eliminates context switching.
- Design implication: Markdown rendering must be high fidelity. Code blocks with syntax highlighting, mermaid diagram rendering, and proper table formatting are non-negotiable.

---

### JS-02: Cross-Reference Documentation During Review

**When** I am auditing or reviewing a feature and need to cross-reference documentation against implementation,
**I want to** navigate between related documents (ADRs, journey maps, user stories, architecture docs) organized by feature and document type,
**so I can** verify that implementation matches documented requirements and decisions.

**Functional Job**: Navigate a structured documentation hierarchy -- by feature, by wave (discuss/design/distill), by document type (ADR, journey, user story).
**Emotional Job**: Feel thorough and organized -- confident that the review covers all relevant documentation.
**Social Job**: N/A (solo developer workflow).

**Forces Analysis**:
- **Push**: In the IDE, finding related docs means browsing nested folders (e.g., `feature/card-redesign/discuss/`, then `design/`, then `distill/`). No overview of what exists for a feature. Easy to miss documents.
- **Pull**: A structured navigation showing all docs for a feature, grouped by wave/type, makes completeness visible. "I can see everything that exists for this feature."
- **Anxiety**: Will the navigation structure match how docs are actually organized on disk? If it diverges, trust breaks.
- **Habit**: File tree browsing in IDE. Known structure, even if clunky.

**Assessment**:
- Switch likelihood: High -- the pain of missing docs during review is real.
- Key blocker: Navigation must faithfully reflect the actual filesystem structure.
- Key enabler: Grouped, categorized view showing document completeness per feature.
- Design implication: Navigation should auto-discover docs from the project's configured documentation root (no hardcoded paths). Categories should derive from folder structure.

---

### JS-03: Bridge Documentation to AI Agent Workflow

**When** I have read a document and identified something that needs to change (rewrite, add content, fix inconsistency),
**I want to** copy the file path to my clipboard in a single action,
**so I can** paste it into an AI agent prompt and tell the agent which file to read or modify.

**Functional Job**: Copy the absolute or relative file path of the currently viewed document to clipboard.
**Emotional Job**: Feel efficient -- the transition from "reviewing a doc" to "prompting an agent to change it" should be frictionless.
**Social Job**: N/A.

**Forces Analysis**:
- **Push**: Currently, to get a file path, user must find the file in the IDE file tree, right-click, "Copy Path." Extra steps, context switch.
- **Pull**: One-click copy from the doc viewer. Path is always visible and accessible.
- **Anxiety**: Will the copied path be the right format? Absolute vs relative? Will the agent understand it?
- **Habit**: Right-click "Copy Path" in IDE file tree.

**Assessment**:
- Switch likelihood: Very high -- this is a trivial but high-frequency pain point.
- Key blocker: Path format must match what AI agents expect (relative path from project root).
- Key enabler: Single-click copy with visual confirmation.
- Design implication: Show the file path prominently. Copy button with feedback (toast or visual state change). Use relative path from project root.

---

### JS-04: Discover Documentation from Board Context (Suggested)

**When** I am viewing a project's kanban board and want to understand the decisions and requirements behind a feature,
**I want to** access related documentation directly from the board view without navigating away,
**so I can** understand the "why" behind the "what" without losing sight of delivery progress.

**Functional Job**: From the board view, access documentation related to the current project/feature.
**Emotional Job**: Feel connected -- delivery status and documentation are not siloed. The full picture is available.
**Social Job**: N/A.

**Forces Analysis**:
- **Push**: Board and docs are completely separate today. Understanding "why is this step here?" requires switching to IDE and hunting for the relevant JTBD analysis or user story.
- **Pull**: A link or panel from the board to related docs creates a connected experience. "I see the card, I see the requirement that spawned it."
- **Anxiety**: Will the contextual link be accurate? What if docs and board data are organized differently?
- **Habit**: Mentally mapping between board cards and documentation folders.

**Assessment**:
- Switch likelihood: Medium-High -- depends on how seamlessly docs integrate with board.
- Key blocker: Mapping between board projects and doc folders must be reliable.
- Key enabler: Navigation from board to docs and back.
- Design implication: The board view needs a "Docs" entry point (tab, sidebar link, or navigation item). A new route like `#/projects/{id}/docs` keeps the pattern consistent.

---

### JS-05: Search Across All Documentation (Suggested)

**When** I know what concept I am looking for but not which document contains it,
**I want to** search across all project documentation by keyword,
**so I can** find the relevant document without browsing every folder.

**Functional Job**: Filename search across all markdown documents in the project's configured documentation root.
**Emotional Job**: Feel empowered -- "I can find anything." No more guessing which folder a decision was documented in.
**Social Job**: N/A.

**Forces Analysis**:
- **Push**: IDE search works but returns code results mixed with doc results. No way to search "only docs." Grep in terminal requires knowing folder structure.
- **Pull**: Docs-only search with results showing document title, matching snippet, and path.
- **Anxiety**: Will search be fast enough? Will it find content in code blocks and frontmatter?
- **Habit**: Ctrl+Shift+F in IDE (global search).

**Assessment**:
- Switch likelihood: Medium -- IDE global search is a strong habit.
- Key blocker: Search must be fast and return relevant snippets.
- Key enabler: Scoped to docs only (no noise from code files).
- Design implication: Server-side search endpoint. Results show document title, path, and matching snippet with keyword highlighted.

---

## Opportunity Scoring

| # | Job Story | Imp. | Sat. | Score | Priority |
|---|-----------|------|------|-------|----------|
| JS-01 | Review docs during feature work | 90% | 20% | 16.0 | Extremely Underserved |
| JS-02 | Cross-reference docs during review | 85% | 25% | 14.5 | Underserved |
| JS-03 | Bridge docs to AI agent workflow | 80% | 15% | 14.5 | Underserved |
| JS-04 | Discover docs from board context | 70% | 10% | 12.0 | Appropriately Served |
| JS-05 | Search across all documentation | 75% | 30% | 12.0 | Underserved |

**Scoring Method**: Team estimate (single developer, self-reported importance and current satisfaction).
**Confidence**: Medium (team estimate, not user survey).

### Top Opportunities (Score >= 12)
1. JS-01: Rich doc reading -- Score 16.0 -- Must Have
2. JS-02: Structured navigation -- Score 14.5 -- Must Have
3. JS-03: Copy path for AI agents -- Score 14.5 -- Must Have
4. JS-04: Board-to-docs navigation -- Score 12.0 -- Should Have
5. JS-05: Document search -- Score 12.0 -- Must Have (promoted from Could Have per user feedback)

---

## MoSCoW Prioritization

| Priority | Job Stories | Rationale |
|----------|------------|-----------|
| **Must Have** | JS-01, JS-02, JS-03, JS-05 | Core value proposition: read, navigate, search, and bridge to AI workflow |
| **Should Have** | JS-04 | Contextual board-to-docs integration deepens the experience |
| **Won't Have** | Inline editing, doc creation | Out of scope -- doc modification is done via AI agents, not the viewer |

---

## Suggested Functionalities (User Requested)

Based on the discovery, here are functionalities the user has not explicitly requested but that emerge naturally from the jobs:

1. **Contextual board-to-docs navigation** (JS-04): From the board, a "Docs" link takes the user to documentation related to that project. This closes the gap between "what is being built" and "why it was decided."

2. **Document search** (JS-05): Keyword search scoped to documentation files only. Eliminates noise from code search in IDE.

3. **Document table of contents**: For long documents (ADRs, architecture designs), a sidebar or top-level outline of headings. Enables jumping to the relevant section without scrolling.

4. **Breadcrumb navigation**: Shows the document's position in the hierarchy (project > feature > wave > document). Always answers "where am I?" and enables quick navigation up the tree.

5. **"Last modified" indicator**: Shows when a document was last changed. During review/audit, this helps assess whether documentation is current or stale.
