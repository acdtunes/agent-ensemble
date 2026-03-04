# User Stories — Rebranding to Agent Ensemble

## US-1: Rename UI display text
**As a** developer opening the web dashboard,
**I want** to see "Agent Ensemble" as the application name,
**so that** the tool's purpose is immediately clear.

**Job trace**: Primary Job Story — instant communication of purpose
**Requirements**: R1

### Acceptance Criteria
```gherkin
Given the web dashboard is open
When the developer views the header
Then it displays "Agent Ensemble"
And the browser tab title reads "Agent Ensemble"
And the empty state message references "Agent Ensemble"
```

---

## US-2: Rename npm package
**As a** developer installing or building the board,
**I want** the npm package named `agent-ensemble`,
**so that** the package identity matches the brand.

**Job trace**: Primary Job Story — standalone identity
**Requirements**: R2

### Acceptance Criteria
```gherkin
Given the board's package.json
When reading the name field
Then it reads "agent-ensemble"
And npm install completes without errors
```

---

## US-3: Rename Python package and module
**As a** developer installing the CLI tools,
**I want** the Python package named `agent-ensemble` with module `agent_ensemble`,
**so that** imports and paths reflect the new identity.

**Job trace**: Primary Job Story — standalone identity
**Requirements**: R3

### Acceptance Criteria
```gherkin
Given the Python source directory
When importing the package
Then "import agent_ensemble" works
And "from agent_ensemble.cli import team_state" works
And no references to "nw_teams" remain in Python source
```

---

## US-4: Rename CLI commands
**As a** developer invoking CLI commands,
**I want** commands prefixed with `agent-ensemble:`,
**so that** the command names communicate the tool's identity.

**Job trace**: Primary Job Story — instant communication at CLI touchpoint
**Requirements**: R4

### Acceptance Criteria
```gherkin
Given the CLI commands are installed
When listing available commands
Then commands are prefixed "agent-ensemble:" (e.g., agent-ensemble:execute)
And no commands use the "nw-teams:" prefix
```

---

## US-5: Update install script
**As a** developer running the install script,
**I want** all installed paths to use `agent-ensemble` naming,
**so that** the installation reflects the new brand.

**Job trace**: Primary Job Story — consistent identity at install touchpoint
**Requirements**: R5

### Acceptance Criteria
```gherkin
Given the install script is executed
When commands are symlinked
Then they are placed in "~/.claude/commands/agent-ensemble/"
And Python modules are placed in "~/.claude/lib/python/agent_ensemble/"
```

---

## US-6: Rename state directory
**As a** developer running the tool in a project,
**I want** the state directory named `.agent-ensemble/`,
**so that** the runtime footprint matches the brand.

**Job trace**: Primary Job Story — consistent identity
**Requirements**: R6

### Acceptance Criteria
```gherkin
Given the tool is running in a project
When state files are written
Then they are placed in ".agent-ensemble/" not ".nw-teams/"
And the server watches the correct directory
```

---

## US-7: Update documentation
**As a** developer reading project documentation,
**I want** all docs to reference "Agent Ensemble",
**so that** the documentation is consistent with the brand.

**Job trace**: Primary Job Story — consistent identity across all surfaces
**Requirements**: R7

### Acceptance Criteria
```gherkin
Given the documentation files
When searching for the old name
Then no references to "NW Teams" or "nw-teams" appear in docs
And all references use "Agent Ensemble" or "agent-ensemble"
```

---

## US-8: Verify no residual references
**As a** developer auditing the codebase,
**I want** zero user-facing references to the old name,
**so that** the rebranding is complete and professional.

**Job trace**: Journey — no residual references scenario
**Requirements**: R8

### Acceptance Criteria
```gherkin
Given the rebranding is complete
When grepping for "nw.teams", "NW.Teams", "nw_teams" in source files
Then no matches are found in user-facing code
And the only acceptable matches are in git history
```
