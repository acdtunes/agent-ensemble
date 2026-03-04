Feature: Install agent-ensemble
  As a developer who uses Claude Code daily
  I want to install agent-ensemble with minimal friction
  So I can start using team coordination features immediately

  Background:
    Given the user has Python 3.11 or higher installed
    And the user has pipx available

  # ============================================
  # Step 1: Discover
  # ============================================

  @happy-path
  Scenario: Developer discovers installation instructions
    Given Carlos Mendez is browsing the agent-ensemble GitHub repository
    When Carlos reads the README.md file
    Then Carlos sees a "Quick Start" section
    And the Quick Start shows exactly 2 commands:
      | command                       |
      | pipx install agent-ensemble   |
      | agent-ensemble install        |
    And Carlos understands what agent-ensemble provides

  # ============================================
  # Step 2: Prepare
  # ============================================

  @happy-path
  Scenario: Developer verifies pipx is available
    Given Carlos Mendez wants to install agent-ensemble
    When Carlos runs "pipx --version"
    Then the output shows a version number like "1.4.3"
    And Carlos knows the prerequisite is satisfied

  @error-path
  Scenario: Developer discovers pipx is not installed
    Given Carlos Mendez does not have pipx installed
    When Carlos runs "pipx --version"
    Then the output shows "command not found: pipx"
    And Carlos needs to install pipx first

  @error-path @recovery
  Scenario: Developer installs pipx on macOS
    Given Carlos Mendez does not have pipx installed
    And Carlos is using macOS with Homebrew
    When Carlos runs "brew install pipx"
    Then pipx is installed successfully
    And Carlos can proceed with agent-ensemble installation

  # ============================================
  # Step 3a: Install from PyPI
  # ============================================

  @happy-path
  Scenario: Fresh installation from PyPI
    Given Carlos Mendez has pipx installed
    And agent-ensemble is not currently installed via pipx
    When Carlos runs "pipx install agent-ensemble"
    Then the output shows "installed package agent-ensemble 0.1.0"
    And the output shows "These apps are now globally available"
    And the output lists "agent-ensemble" as available
    And the installation completes with "done!"

  @error-path
  Scenario: Package already installed via pipx
    Given Carlos Mendez has pipx installed
    And agent-ensemble 0.1.0 is already installed via pipx
    When Carlos runs "pipx install agent-ensemble"
    Then the output shows "already seems to be installed"
    And the output suggests using "--force" to reinstall

  @error-path
  Scenario: Package not found on PyPI
    Given Carlos Mendez has pipx installed
    And agent-ensemble is not published on PyPI
    When Carlos runs "pipx install agent-ensemble"
    Then the output shows "No matching distribution found"
    And Carlos understands the package is not yet available

  # ============================================
  # Step 3b: Install to Claude Code
  # ============================================

  @happy-path
  Scenario: Fresh installation to Claude Code with nWave not installed
    Given Carlos Mendez has installed agent-ensemble via pipx
    And no previous ensemble installation exists in ~/.claude/
    And nWave is not installed
    When Carlos runs "agent-ensemble install"
    Then the output shows "Installing agent-ensemble v0.1.0 to ~/.claude/"
    And the output shows progress "[1/4] Checking dependencies..."
    And the output shows "nWave not found. Installing dependency..."
    And the output shows "Running: pipx install nwave-ai"
    And the output shows "Running: nwave-ai install"
    And the output shows "nWave v1.2.0 installed successfully."
    And the output shows progress "[2/4] Checking existing installation..."
    And the output shows "No existing installation found."
    And the output shows progress "[3/4] Installing components..."
    And the output shows "commands/ensemble/  10 commands"
    And the output shows "lib/python/agent_ensemble/  Python support library"
    And the output shows progress "[4/4] Creating manifest..."
    And the output shows "Done! Installed 10 commands and 1 library."
    And the output lists available commands with descriptions

  @happy-path
  Scenario: Fresh installation to Claude Code with nWave already installed
    Given Carlos Mendez has installed agent-ensemble via pipx
    And no previous ensemble installation exists in ~/.claude/
    And nWave v1.2.0 is already installed
    When Carlos runs "agent-ensemble install"
    Then the output shows "Installing agent-ensemble v0.1.0 to ~/.claude/"
    And the output shows progress "[1/4] Checking dependencies..."
    And the output shows "nWave v1.2.0 already installed. Skipping."
    And the output shows progress "[2/4] Checking existing installation..."
    And the output shows "No existing installation found."
    And the output shows progress "[3/4] Installing components..."
    And the output shows progress "[4/4] Creating manifest..."
    And the output shows "Done! Installed 10 commands and 1 library."

  @happy-path
  Scenario: Installation creates correct directory structure
    Given Carlos Mendez has installed agent-ensemble via pipx
    When Carlos runs "agent-ensemble install"
    Then the directory ~/.claude/commands/ensemble/ exists
    And the directory ~/.claude/lib/python/agent_ensemble/ exists
    And the file ~/.claude/ensemble-manifest.txt exists

  @happy-path
  Scenario: Installation copies all 10 commands
    Given Carlos Mendez has installed agent-ensemble via pipx
    When Carlos runs "agent-ensemble install"
    Then ~/.claude/commands/ensemble/ contains exactly these files:
      | filename      |
      | audit.md      |
      | debug.md      |
      | deliver.md    |
      | design.md     |
      | discover.md   |
      | distill.md    |
      | document.md   |
      | execute.md    |
      | refactor.md   |
      | review.md     |

  @happy-path
  Scenario: Upgrade existing installation with backup
    Given Carlos Mendez has agent-ensemble v0.0.9 installed in ~/.claude/
    And the current package version is 0.1.0
    When Carlos runs "agent-ensemble install"
    Then the output shows "Found existing installation: v0.0.9"
    And the output shows "Creating backup at ~/.claude/ensemble-backup-"
    And a backup directory is created with the timestamp
    And the backup contains the previous installation files
    And the output shows "Updated from v0.0.9 to v0.1.0"

  @anxiety-path
  Scenario: Installation preserves unrelated files in ~/.claude/
    Given Carlos Mendez has custom files in ~/.claude/
    And ~/.claude/my-custom-agent.md exists
    When Carlos runs "agent-ensemble install"
    Then ~/.claude/my-custom-agent.md still exists unchanged
    And only ensemble-specific files are created or modified

  @error-path
  Scenario: Permission denied on ~/.claude/
    Given Carlos Mendez has ~/.claude/ with read-only permissions
    When Carlos runs "agent-ensemble install"
    Then the output shows "Error: Cannot write to ~/.claude/"
    And the output shows "The directory ~/.claude/ exists but is not writable."
    And the output suggests checking permissions with "ls -la ~/.claude/"
    And the output suggests fixing with "sudo chown -R $USER ~/.claude/"

  @error-path
  Scenario: Insufficient disk space
    Given Carlos Mendez has less than 1MB free disk space
    When Carlos runs "agent-ensemble install"
    Then the output shows an error about disk space
    And no partial installation is left behind

  @error-path
  Scenario: nWave installation fails
    Given Carlos Mendez has installed agent-ensemble via pipx
    And nWave is not installed
    And pipx is not available on the system
    When Carlos runs "agent-ensemble install"
    Then the output shows "Error: Failed to install nWave dependency"
    And the output shows "nWave is required for agent-ensemble to function."
    And the output shows "pipx: command not found"
    And the output provides manual installation steps:
      | step | command                                        |
      | 1    | pip install pipx --user && pipx ensurepath     |
      | 2    | Restart your terminal                          |
      | 3    | pipx install nwave-ai && nwave-ai install      |
      | 4    | agent-ensemble install                         |
    And no partial ensemble installation is created

  # ============================================
  # Step 4: Verify
  # ============================================

  @happy-path
  Scenario: Verify installed version
    Given Carlos Mendez has completed agent-ensemble installation
    When Carlos runs "agent-ensemble --version"
    Then the output shows exactly "agent-ensemble 0.1.0"

  @happy-path
  Scenario: Check installation health
    Given Carlos Mendez has completed agent-ensemble installation
    When Carlos runs "agent-ensemble status"
    Then the output shows "agent-ensemble v0.1.0"
    And the output shows "Location:    ~/.claude/"
    And the output shows "Manifest:    ~/.claude/ensemble-manifest.txt"
    And the output shows the installation timestamp
    And the output shows "commands/ensemble/" with "OK" status
    And the output shows "lib/python/agent_ensemble/" with "OK" status
    And the output shows "Status: Healthy"

  @error-path
  Scenario: Detect corrupted installation
    Given Carlos Mendez has completed agent-ensemble installation
    And ~/.claude/commands/ensemble/review.md has been deleted
    When Carlos runs "agent-ensemble status"
    Then the output shows "commands/ensemble/" with "MISSING FILES" status
    And the output shows "Status: Unhealthy"
    And the output suggests running "agent-ensemble install" to repair

  # ============================================
  # Step 5: First Use
  # ============================================

  @happy-path
  Scenario: First command execution in Claude Code
    Given Carlos Mendez has installed agent-ensemble
    And Carlos opens a Claude Code session
    When Carlos types "/ensemble:review"
    Then Claude Code recognizes the ensemble:review command
    And the review workflow begins
    And Carlos is prompted for what to review

  @happy-path
  Scenario: Commands appear in Claude Code help
    Given Carlos Mendez has installed agent-ensemble
    And Carlos opens a Claude Code session
    When Carlos looks at available commands
    Then Carlos sees commands prefixed with "ensemble:"
    And Carlos sees "ensemble:deliver", "ensemble:review", "ensemble:debug"

  # ============================================
  # Manifest Tracking
  # ============================================

  @happy-path
  Scenario: Manifest records installation details
    Given Carlos Mendez has completed agent-ensemble installation
    When Carlos reads ~/.claude/ensemble-manifest.txt
    Then the manifest contains the version "0.1.0"
    And the manifest contains the installation timestamp
    And the manifest lists all installed files

  # ============================================
  # Property Scenarios
  # ============================================

  @property
  Scenario: Version consistency across outputs
    Given Carlos Mendez has completed agent-ensemble installation
    Then "agent-ensemble --version" output matches the version in pyproject.toml
    And "agent-ensemble status" output matches the version in pyproject.toml
    And the manifest file contains the same version

  @property
  Scenario: Installation is idempotent
    Given Carlos Mendez has completed agent-ensemble installation
    When Carlos runs "agent-ensemble install" again
    Then no files are corrupted or duplicated
    And the installation remains healthy
    And the backup is created for the previous state
