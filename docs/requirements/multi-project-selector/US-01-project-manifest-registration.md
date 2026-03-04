# US-01: Add and Remove Projects via UI

## Problem
Andres is a solo developer with projects at arbitrary filesystem paths (e.g., `/Users/andres.dandrea/projects/personal/karateka` for a Godot game and `/Users/andres.dandrea/projects/personal/nw-teams` for CLI tools). He finds it impossible to monitor both projects in the board app because the current discovery mechanism (`scanProjectDirsFs`) requires all projects to live under a single `PROJECTS_ROOT` directory. He must either restructure his filesystem or run separate server instances per project.

## Who
- Solo developer | Has 2-5 projects at scattered filesystem paths | Wants to register all projects in one board app instance without filesystem reorganization or manual config file editing

## Solution
An "Add Project" button on the overview dashboard that opens a native folder picker (or path input). The user selects a project directory, the server validates it (checks the path exists and contains recognizable project artifacts), and registers it in the project registry. The server persists the registered project list internally (e.g., `~/.nwave/projects.json`) so it survives restarts -- but the user never edits this file directly. A "Remove" action on each project card lets the user unregister a project (does not delete files, only removes from the board).

## Job Story Trace
- JS-01: Register Projects from Arbitrary Paths

## Domain Examples

### 1: Happy Path -- Andres adds two projects from the UI
Andres opens the board app. The overview is empty. He clicks "Add Project", a folder picker dialog opens, and he navigates to `/Users/andres.dandrea/projects/personal/karateka`. The server validates the path and adds it. The overview now shows one project card. He clicks "Add Project" again and selects `/Users/andres.dandrea/projects/personal/nw-teams`. The overview now shows two project cards. Both persist across server restarts.

### 2: Edge Case -- Selected path does not exist or is invalid
Andres types a path manually (if the UI offers a text input fallback) and enters `/Users/andres.dandrea/projects/archive/old-project` which was deleted last week. The server responds with a validation error: "Directory not found: /Users/andres.dandrea/projects/archive/old-project". The project is not added. Andres sees the error inline and can try again.

### 3: Error/Boundary -- First launch, no projects yet
Andres just installed the board app. He opens it for the first time. The overview shows an empty state: "No projects yet. Click 'Add Project' to get started." The call-to-action is clear and immediate.

### 4: Happy Path -- Andres removes a project
Andres has three projects registered. He no longer needs to track `old-project`. He clicks a remove/trash icon on the `old-project` card, confirms the removal, and the project disappears from the overview. The project files on disk are untouched.

### 5: Edge Case -- Adding a project that is already registered
Andres accidentally selects `/Users/andres.dandrea/projects/personal/karateka` again. The server detects the duplicate path and responds: "This project is already registered." The project is not duplicated.

## UAT Scenarios (BDD)

### Scenario 1: Add a project via folder selection
```gherkin
Scenario: User adds a project by selecting a folder
  Given the overview dashboard is showing with no projects
  When Andres clicks "Add Project"
  And selects the folder "/Users/andres.dandrea/projects/personal/karateka"
  Then the server validates the path exists
  And "karateka" appears as a project card on the overview
  And the project is persisted across server restarts
```

### Scenario 2: Invalid path shows validation error
```gherkin
Scenario: Adding an invalid path shows an error
  Given Andres is on the overview dashboard
  When he attempts to add a project with path "/nonexistent/archive/old-project"
  Then a validation error is shown: "Directory not found"
  And no project is added to the registry
```

### Scenario 3: Empty state shows guidance
```gherkin
Scenario: First launch shows empty state with add prompt
  Given no projects have been registered
  When Andres opens the board app
  Then the overview shows "No projects yet"
  And an "Add Project" button is prominently displayed
```

### Scenario 4: Remove a project from the board
```gherkin
Scenario: User removes a project from the board
  Given projects "karateka" and "nw-teams" are registered
  When Andres clicks the remove action on the "karateka" card
  And confirms the removal
  Then "karateka" is removed from the overview
  And the project files at "/Users/andres.dandrea/projects/personal/karateka" are untouched
  And the removal persists across server restarts
```

### Scenario 5: Adding a duplicate project is rejected
```gherkin
Scenario: Adding an already-registered project path is rejected
  Given project "karateka" is already registered with path "/Users/andres.dandrea/projects/personal/karateka"
  When Andres attempts to add a project with the same path
  Then a message is shown: "This project is already registered"
  And no duplicate entry is created
```

## Acceptance Criteria
- [ ] Overview dashboard has an "Add Project" button
- [ ] Clicking "Add Project" allows the user to select a folder path (native picker or text input)
- [ ] Server validates the selected path exists before registering
- [ ] Valid paths are added to the project registry and appear on the overview immediately
- [ ] Invalid paths show a clear validation error message without adding to the registry
- [ ] Each project card has a remove action that unregisters the project (no file deletion)
- [ ] Removal requires confirmation (prevent accidental removal)
- [ ] Duplicate paths are detected and rejected with a clear message
- [ ] Registered project list is persisted internally and survives server restarts
- [ ] Empty state (no projects) shows clear guidance with the "Add Project" call-to-action
- [ ] Project ID is derived from the folder name (slugified), validated against `ProjectId` brand type

## Technical Notes
- The existing `ProjectRegistry` (`registry.ts`) accepts `ProjectConfig` with `projectId`, `statePath`, `planPath`, `docsRoot`. The add-project flow translates a selected folder path into a `ProjectConfig` by resolving well-known file locations within the project.
- The existing `ProjectId` brand type and `createProjectId()` validation in `shared/types.ts` should be reused for deriving IDs from folder names.
- Persistence: the server writes the registered project list to an internal file (e.g., `~/.nwave/projects.json`). This file is an implementation detail, never user-facing.
- New API endpoints: `POST /api/projects` (add), `DELETE /api/projects/:id` (remove).
- The folder picker in the browser uses `<input type="file" webkitdirectory>` or the File System Access API (`showDirectoryPicker()`). The selected path is sent to the server for validation and registration.
- Functional programming paradigm: path validation and ID derivation are pure functions; persistence and filesystem checks are IO adapters.

## Dependencies
- None (foundational story -- other stories depend on this)
