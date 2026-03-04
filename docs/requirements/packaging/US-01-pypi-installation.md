# US-01: PyPI Package Installation

## Problem

Carlos Mendez is a developer who uses Claude Code daily for AI-assisted development. He heard about agent-ensemble from a colleague and wants to try it. He finds it frustrating that the current installation requires cloning a git repository, running a shell script, and hoping the symlinks don't break when he reorganizes his projects folder. He wishes he could install it like any other professional CLI tool -- with a single package manager command.

## Who

| User Type | Context | Motivation |
|-----------|---------|------------|
| Developer | Discovering agent-ensemble for first time | Try team coordination features quickly |
| Developer | Setting up new machine | Reproduce working environment efficiently |
| Team Lead | Onboarding team members | Standardize tooling without manual setup |

## Solution

Publish agent-ensemble to PyPI so users can install with `pipx install agent-ensemble`, following the same pattern as nWave and other professional CLI tools.

## Job Story Trace

**Traces to**: Install Job (JTBD Analysis)
> "When I discover agent-ensemble and want to try it for team coordination, I want to install it with a single command that 'just works', so I can start using team coordination features immediately without fighting with configuration."

## Domain Examples

### Example 1: Happy Path -- First-time installation

Carlos Mendez has been using Claude Code for 6 months. His colleague Ana mentions agent-ensemble for multi-perspective code reviews. Carlos opens his terminal:

```
$ pipx install agent-ensemble
  installed package agent-ensemble 0.1.0, installed using Python 3.11.6
  These apps are now globally available
    - agent-ensemble
done!
```

Carlos feels the familiar satisfaction of a clean pip-style installation. No git clone, no manual scripts.

### Example 2: Edge Case -- Package already installed

Carlos tries to install agent-ensemble but forgot he installed it last week:

```
$ pipx install agent-ensemble
'agent-ensemble' already seems to be installed. Not modifying existing
installation in '/Users/carlos/.local/pipx/venvs/agent-ensemble'.
Pass '--force' to force installation.
```

Carlos appreciates the clear message -- no silent failures, no corrupt installation.

### Example 3: Error Case -- pipx not available

Carlos tries to install but doesn't have pipx:

```
$ pipx install agent-ensemble
zsh: command not found: pipx
```

Carlos checks the README, which tells him: "First install pipx: `brew install pipx` (macOS) or `pip install pipx --user`"

### Example 4: Error Case -- Python version too old

Carlos's machine has Python 3.9:

```
$ pipx install agent-ensemble
ERROR: agent-ensemble requires Python >=3.11 but the running Python is 3.9.7
```

The error clearly states the requirement, allowing Carlos to upgrade Python.

## UAT Scenarios (BDD)

### Scenario 1: Fresh installation from PyPI

```gherkin
Scenario: Developer installs agent-ensemble from PyPI
  Given Carlos Mendez has pipx version 1.4.3 installed
  And Python 3.11 or higher is available
  And agent-ensemble is not currently installed
  When Carlos runs "pipx install agent-ensemble"
  Then the output shows "installed package agent-ensemble 0.1.0"
  And the output shows "These apps are now globally available"
  And the output lists "agent-ensemble" as available
  And the command "agent-ensemble --version" outputs "agent-ensemble 0.1.0"
```

### Scenario 2: Package already installed

```gherkin
Scenario: Developer attempts to reinstall existing package
  Given Carlos Mendez has agent-ensemble 0.1.0 installed via pipx
  When Carlos runs "pipx install agent-ensemble"
  Then the output shows "'agent-ensemble' already seems to be installed"
  And the output suggests using "--force" to reinstall
  And the existing installation is not modified
```

### Scenario 3: Force reinstallation

```gherkin
Scenario: Developer forces reinstallation
  Given Carlos Mendez has agent-ensemble 0.1.0 installed via pipx
  When Carlos runs "pipx install agent-ensemble --force"
  Then the package is reinstalled
  And the output shows "installed package agent-ensemble 0.1.0"
```

### Scenario 4: Python version check

```gherkin
Scenario: Installation fails on old Python
  Given Carlos Mendez has Python 3.9.7 as the system Python
  When Carlos runs "pipx install agent-ensemble"
  Then the output shows an error about Python version
  And the error specifies "requires Python >=3.11"
  And no partial installation is created
```

### Scenario 5: Network failure during installation

```gherkin
Scenario: Installation handles network failure gracefully
  Given Carlos Mendez has pipx installed
  And the network connection to PyPI is unavailable
  When Carlos runs "pipx install agent-ensemble"
  Then the output shows a network-related error
  And no partial installation is left behind
```

## Acceptance Criteria

- [ ] Package is published to PyPI under name "agent-ensemble"
- [ ] `pipx install agent-ensemble` succeeds on Python 3.11+
- [ ] Package version matches pyproject.toml version
- [ ] Installation creates `agent-ensemble` CLI command globally
- [ ] `agent-ensemble --version` outputs correct version
- [ ] Installation fails cleanly with informative message on Python < 3.11
- [ ] Already-installed scenario provides clear guidance

## Technical Notes (Optional)

- Package name on PyPI: `agent-ensemble`
- Requires Python >= 3.11 (specified in pyproject.toml)
- Dependencies: pyyaml, ruamel.yaml (already in pyproject.toml)
- Build system: setuptools (already configured)
- Entry point: `agent-ensemble` CLI command

## Dependencies

- None (foundational story)

## Risks

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| PyPI name already taken | Low | High | Check availability before implementation |
| pipx compatibility issues | Low | Medium | Test on multiple OS/Python versions |
