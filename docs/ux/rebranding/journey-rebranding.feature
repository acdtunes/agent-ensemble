Feature: Rebranding from NW Teams to Agent Ensemble
  As a developer using or discovering the tool
  I want all surfaces to reflect the Agent Ensemble identity
  So that the name communicates AI agent orchestration at every touchpoint

  Scenario: Developer discovers the tool by name
    Given a developer hears about "Agent Ensemble"
    When they consider what the tool does
    Then the name suggests AI agents working together in coordination

  Scenario: Developer installs via install script
    Given the install script is executed
    When commands are installed to the Claude CLI
    Then the install path contains "agent-ensemble" not "nw-teams"
    And the Python module is installed as "agent_ensemble"

  Scenario: Developer invokes a CLI command
    Given the tool is installed
    When the developer types a command
    Then the command prefix is "agent-ensemble:" not "nw-teams:"
    And available commands include "agent-ensemble:execute" and "agent-ensemble:review"

  Scenario: Developer opens the web dashboard
    Given the board server is running
    When the developer opens the web UI
    Then the page title reads "Agent Ensemble"
    And the header displays "Agent Ensemble" not "NW Teams Board"

  Scenario: Developer shares the tool with others
    Given the developer wants to recommend the tool
    When they mention "Agent Ensemble"
    Then no further explanation of the name is needed
    And the tool's purpose is understood from the name alone

  Scenario: No residual NW Teams references
    Given the rebranding is complete
    When searching the codebase for "nw.teams" or "NW Teams"
    Then no user-facing references to the old name remain
    And internal references are limited to git history only
