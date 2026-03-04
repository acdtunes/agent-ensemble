# Acceptance Criteria — Rebranding to Agent Ensemble

## AC-1: UI Display (US-1)

```gherkin
Scenario: Dashboard header shows new name
  Given the Agent Ensemble web dashboard is running
  When a developer navigates to the root URL
  Then the page header displays "Agent Ensemble"

Scenario: Browser tab shows new name
  Given the web dashboard is loaded
  When the developer views the browser tab
  Then the tab title reads "Agent Ensemble"

Scenario: Empty state shows new name
  Given no projects are configured
  When the developer views the overview dashboard
  Then the empty state message references "Agent Ensemble"
```

## AC-2: npm Package (US-2)

```gherkin
Scenario: Package name is updated
  Given the board directory
  When reading package.json
  Then the "name" field is "agent-ensemble"

Scenario: Build succeeds with new name
  Given the package is renamed
  When running "npm run build"
  Then the build completes without errors
```

## AC-3: Python Package (US-3)

```gherkin
Scenario: Python module is renamed
  Given the source directory
  When listing "src/"
  Then "agent_ensemble/" exists
  And "nw_teams/" does not exist

Scenario: Python imports work
  Given the renamed module
  When running "python -c 'import agent_ensemble'"
  Then no import errors occur

Scenario: pyproject.toml reflects new name
  Given pyproject.toml
  When reading the project name
  Then it reads "agent-ensemble"
```

## AC-4: CLI Commands (US-4)

```gherkin
Scenario: Command files use new prefix
  Given the commands directory
  When listing command files
  Then command definitions reference "agent-ensemble:" prefix

Scenario: Old prefix does not work
  Given the tool is installed
  When searching for "nw-teams:" in command files
  Then no matches are found
```

## AC-5: Install Script (US-5)

```gherkin
Scenario: Install creates correct paths
  Given the install script
  When reading the script contents
  Then all paths reference "agent-ensemble" not "nw-teams"

Scenario: Commands install to new directory
  Given install.sh is executed
  When checking ~/.claude/commands/
  Then "agent-ensemble/" directory exists with command files
```

## AC-6: State Directory (US-6)

```gherkin
Scenario: State files use new directory
  Given the server is running
  When state files are created
  Then they are written to ".agent-ensemble/"

Scenario: Server watches correct directory
  Given the server configuration
  When reading file watcher paths
  Then they reference ".agent-ensemble/" not ".nw-teams/"
```

## AC-7: Documentation (US-7)

```gherkin
Scenario: No old name in documentation
  Given all documentation files
  When searching for "NW Teams" or "nw-teams"
  Then zero matches are found in docs/
```

## AC-8: No Residual References (US-8)

```gherkin
Scenario: Codebase is clean of old name
  Given the complete source tree
  When searching for "nw.teams" (case-insensitive, regex)
  Then no matches are found in source files
  And no matches are found in configuration files
  And no matches are found in UI components
```
