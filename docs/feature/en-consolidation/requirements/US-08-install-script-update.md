# US-08: Update install.sh for post-consolidation project structure

**Parent feature**: EN Consolidation
**JTBD**: When I clone the EN framework repo and want to use `/en:*` commands in my Claude Code session, I want to run a single setup command that configures everything, so I can start using parallel feature delivery immediately without manual configuration steps.

---

## Job Dimensions

| Dimension | Description |
|---|---|
| **Functional** | Install Python dependencies, configure Claude Code settings, clean up old installations, install board UI |
| **Emotional** | Confidence that setup is complete -- no "did I miss a step?" anxiety |
| **Social** | Professional onboarding experience for external consumers of the framework |

## Four Forces

| Force | Description |
|---|---|
| **Push** | Current install.sh copies files to `~/.claude/` which won't work after consolidation. External consumers get a broken installer. |
| **Pull** | One command (`./install.sh`) gets everything working. No manual JSON editing, no hunting for dependencies. |
| **Anxiety** | "Will it mess up my existing Claude Code setup?" -- modifying `~/.claude/settings.json` must be a safe merge, not an overwrite. |
| **Habit** | Users are accustomed to `./install.sh` as the entry point -- keeping the same command reduces friction. |

---

## User Story

**As an** external developer cloning the EN framework repo
**I want** `./install.sh` to set up everything needed for the post-consolidation project structure
**So that** I can immediately use `/en:*` commands in Claude Code without manual configuration

## Acceptance Criteria

```gherkin
Feature: Post-consolidation install script

  Scenario: Clean up old global installations
    Given the user has a previous ensemble installation at ~/.claude/
    When they run ./install.sh
    Then the following are removed if they exist:
      | Path                                       |
      | ~/.claude/commands/ensemble/                |
      | ~/.claude/commands/nw-teams/                |
      | ~/.claude/lib/python/agent_ensemble/        |
      | ~/.claude/lib/python/nw_teams/              |
      | ~/.claude/ensemble-manifest.txt             |
    And old symlinks at those paths are also removed
    And a message is printed for each item cleaned up
    And nothing is removed if no old installation exists

  Scenario: Install Python dependencies via uv (preferred)
    Given uv is available on the system
    When the user runs ./install.sh
    Then the script runs `uv pip install -e .` in the project root
    And ruamel.yaml and pyyaml are installed
    And src/en/ and src/des/ are importable via `python -m en.cli.*` and `python -m des.cli.*`

  Scenario: Install Python dependencies via pip (fallback)
    Given uv is NOT available but pip is
    When the user runs ./install.sh
    Then the script runs `pip install -e .` in the project root
    And the same dependencies are installed as with uv

  Scenario: No Python package manager found
    Given neither uv nor pip is available
    When the user runs ./install.sh
    Then the script prints instructions for installing uv or pip
    And exits with a non-zero status code

  Scenario: Auto-configure Claude Code settings
    Given ~/.claude/settings.json does not exist
    When the user runs ./install.sh
    Then the script creates ~/.claude/settings.json with:
      """json
      {
        "env": {
          "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1"
        }
      }
      """

  Scenario: Merge into existing Claude Code settings
    Given ~/.claude/settings.json already exists with other settings
    When the user runs ./install.sh
    Then the script adds CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS to the env object
    And all existing settings are preserved (merge, not overwrite)
    And the JSON remains valid and properly formatted

  Scenario: Settings already configured
    Given ~/.claude/settings.json already has CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1
    When the user runs ./install.sh
    Then the script detects it and skips the settings step
    And prints "Agent teams already enabled"

  Scenario: Install board UI dependencies
    Given the board/ directory exists with a package.json
    When the user runs ./install.sh
    Then the script runs `npm install` in the board/ directory
    And prints the number of packages installed or a success message

  Scenario: Board UI npm not available
    Given npm is NOT available on the system
    When the user runs ./install.sh
    Then the script prints a warning that board UI could not be installed
    And continues without failing (board is not required for core functionality)
    And prints instructions to install Node.js/npm

  Scenario: Print post-install summary
    When ./install.sh completes successfully
    Then the script prints available /en:* commands:
      | Command             | Description                          |
      | /en:deliver         | Parallel feature delivery             |
      | /en:execute         | Single-step dispatch                  |
      | /en:discover        | Product discovery                     |
      | /en:discuss         | JTBD analysis and requirements        |
      | /en:design          | Architecture design                   |
      | /en:distill         | Acceptance test design                |
      | /en:review          | Code review                           |
      | /en:refactor        | Refactoring                           |
      | /en:document        | Documentation                         |
      | /en:research        | Research                              |
    And prints: "Board UI: cd board && npm run dev"
    And prints uninstall instructions

  Scenario: Idempotent execution
    When the user runs ./install.sh twice
    Then the second run produces the same result as the first
    And no errors occur
    And no duplicate entries are added to settings.json

  Scenario: Help flag
    When the user runs ./install.sh --help
    Then the script prints usage information
    And exits with status 0
```

## What install.sh NO LONGER does (removed from old version)

- Does NOT install nWave globally (nwave-ai is fully vendored in nwave/)
- Does NOT copy commands to ~/.claude/commands/ (commands are project-local)
- Does NOT copy Python library to ~/.claude/lib/python/ (CLIs run via PYTHONPATH=src)
- Does NOT write a manifest file (project is self-contained and git-tracked)
- Does NOT require --nwave-version flag (no global nWave dependency)

## Dependencies

- Depends on US-02 (src/en/ exists)
- Depends on US-03 (commands/ are generated)
- Depends on US-04 (old ensemble commands deleted)
- No other user stories depend on this one (can be implemented last)

## Notes

- The `~/.claude/settings.json` merge should use `jq` if available, with a Python fallback (`python3 -c "import json; ..."`) for systems without jq
- The editable install (`pip install -e .`) means changes to src/en/ or src/des/ are immediately reflected without reinstalling
- Board UI install (npm) should not block the overall install if it fails -- core functionality works without it
- The `--help` flag is preserved from the current version
- Consider adding `--skip-board` flag if board install becomes slow or problematic
