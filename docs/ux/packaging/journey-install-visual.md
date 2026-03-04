# Journey: Install agent-ensemble

## Journey Overview

**Goal**: User discovers agent-ensemble and successfully installs it for Claude Code integration
**Persona**: Developer who uses Claude Code daily and wants team coordination features
**Trigger**: Sees agent-ensemble mentioned in documentation, colleague recommendation, or GitHub search

## Emotional Arc

```
                                    Step 5: First Use
                                         *****
                                       **     **
Step 3: Install              Step 4: **         **
         ****               Verify **
       **    **               *****
      *        **            *
     *           *          *
    *             *        *
Step 1: Discover   * Step 2: *
       **          *  Prepare*
      *  **        **      **
     *     **        ******
    *        **
   *           *
Start: Curious/Skeptical                              End: Confident/Productive

EMOTIONAL STATES:
- Start: Curious but skeptical ("Will this actually help?")
- Step 1: Interested ("This looks useful")
- Step 2: Slightly anxious ("Hope this doesn't break my setup")
- Step 3: Focused ("Let's see if it works")
- Step 4: Relieved/Satisfied ("It worked!")
- Step 5: Confident/Productive ("I can use this daily")
```

---

## Journey Flow

```
+-------------+     +-------------+     +-------------+     +-------------+     +-------------+
|   DISCOVER  | --> |   PREPARE   | --> |   INSTALL   | --> |   VERIFY    | --> |  FIRST USE  |
|             |     |             |     |             |     |             |     |             |
| Read about  |     | Check pipx  |     | Two-step    |     | Confirm     |     | Run first   |
| features    |     | installed   |     | process     |     | everything  |     | command     |
|             |     |             |     |             |     | works       |     |             |
+-------------+     +-------------+     +-------------+     +-------------+     +-------------+
      |                   |                   |                   |                   |
   Curious             Anxious            Focused            Relieved           Confident
   "Useful?"           "Break?"           "Working"          "Success!"         "Productive"
```

---

## Step 1: Discover

**User Action**: Reads README or docs about agent-ensemble

**Emotional State**:
- Entry: Curious but skeptical
- Exit: Interested, ready to try

**Expected Information**:
```
+-- README.md -------------------------------------------------------+
|                                                                     |
|  # agent-ensemble                                                   |
|                                                                     |
|  Team coordination commands for Claude Code.                        |
|                                                                     |
|  ## Quick Start                                                     |
|                                                                     |
|  $ pipx install agent-ensemble                                      |
|  $ agent-ensemble install                                           |
|                                                                     |
|  ## What You Get                                                    |
|                                                                     |
|  10 coordination commands:                                          |
|    /ensemble:deliver  - Parallel feature delivery                   |
|    /ensemble:review   - Multi-perspective code review               |
|    /ensemble:debug    - Competing hypotheses debugging              |
|    ... and 7 more                                                   |
|                                                                     |
+---------------------------------------------------------------------+
```

**Integration Checkpoint**: README exists, installation instructions match actual command names

---

## Step 2: Prepare

**User Action**: Ensures pipx is installed, checks system requirements

**Emotional State**:
- Entry: Interested, slight anxiety
- Exit: Ready, anxiety addressed

**TUI Mockup - pipx not installed**:
```
+-- Terminal --------------------------------------------------------+
|                                                                     |
| $ pipx --version                                                    |
| zsh: command not found: pipx                                        |
|                                                                     |
| $ brew install pipx    # or: pip install pipx --user                |
| ==> Downloading pipx-1.4.3.bottle.tar.gz                            |
| ...                                                                 |
| ==> pipx 1.4.3 installed                                            |
|                                                                     |
| $ pipx --version                                                    |
| 1.4.3                                                               |
|                                                                     |
+---------------------------------------------------------------------+
```

**TUI Mockup - pipx already installed**:
```
+-- Terminal --------------------------------------------------------+
|                                                                     |
| $ pipx --version                                                    |
| 1.4.3                                                               |
|                                                                     |
+---------------------------------------------------------------------+
```

**Shared Artifacts**:
- `pipx` command availability (prerequisite)

**Error Path**: User doesn't have Python 3.11+ or pip. Error message guides to Python installation.

---

## Step 3: Install

**User Action**: Runs two-step installation process

**Emotional State**:
- Entry: Focused, committed
- Exit: Satisfied, relieved

### Step 3a: PyPI Installation

**Command**: `pipx install agent-ensemble`

**TUI Mockup - Success**:
```
+-- Terminal --------------------------------------------------------+
|                                                                     |
| $ pipx install agent-ensemble                                       |
|   installed package agent-ensemble 0.1.0, installed using Python    |
|   3.11.6                                                            |
|   These apps are now globally available                             |
|     - agent-ensemble                                                |
| done!                                                               |
|                                                                     |
+---------------------------------------------------------------------+
```

**TUI Mockup - Already installed**:
```
+-- Terminal --------------------------------------------------------+
|                                                                     |
| $ pipx install agent-ensemble                                       |
| 'agent-ensemble' already seems to be installed. Not modifying       |
| existing installation in '/Users/carlos/.local/pipx/venvs/          |
| agent-ensemble'. Pass '--force' to force installation.              |
|                                                                     |
+---------------------------------------------------------------------+
```

### Step 3b: Claude Code Integration

**Command**: `agent-ensemble install`

**TUI Mockup - Fresh install (nWave not installed)**:
```
+-- Terminal --------------------------------------------------------+
|                                                                     |
| $ agent-ensemble install                                            |
|                                                                     |
| Installing agent-ensemble v0.1.0 to ~/.claude/                      |
|                                                                     |
| [1/4] Checking dependencies...                                      |
|       nWave not found. Installing dependency...                     |
|       Running: pipx install nwave-ai                                |
|       Running: nwave-ai install                                     |
|       nWave v1.2.0 installed successfully.                          |
|                                                                     |
| [2/4] Checking existing installation...                             |
|       No existing installation found.                               |
|                                                                     |
| [3/4] Installing components...                                      |
|       commands/ensemble/  10 commands                               |
|       lib/python/agent_ensemble/  Python support library            |
|                                                                     |
| [4/4] Creating manifest...                                          |
|       ~/.claude/ensemble-manifest.txt                               |
|                                                                     |
| Done! Installed 10 commands and 1 library.                          |
|                                                                     |
| Available commands:                                                 |
|   /ensemble:deliver   Parallel feature delivery                     |
|   /ensemble:review    Multi-perspective code review                 |
|   /ensemble:debug     Competing hypotheses debugging                |
|   /ensemble:design    Architecture exploration                      |
|   /ensemble:discover  Requirements gathering                        |
|   /ensemble:distill   Acceptance criteria refinement                |
|   /ensemble:document  Documentation generation                      |
|   /ensemble:execute   Task execution                                |
|   /ensemble:refactor  Code refactoring                              |
|   /ensemble:audit     Code audit                                    |
|                                                                     |
| Try: /ensemble:review in Claude Code                                |
|                                                                     |
+---------------------------------------------------------------------+
```

**TUI Mockup - Fresh install (nWave already installed)**:
```
+-- Terminal --------------------------------------------------------+
|                                                                     |
| $ agent-ensemble install                                            |
|                                                                     |
| Installing agent-ensemble v0.1.0 to ~/.claude/                      |
|                                                                     |
| [1/4] Checking dependencies...                                      |
|       nWave v1.2.0 already installed. Skipping.                     |
|                                                                     |
| [2/4] Checking existing installation...                             |
|       No existing installation found.                               |
|                                                                     |
| [3/4] Installing components...                                      |
|       commands/ensemble/  10 commands                               |
|       lib/python/agent_ensemble/  Python support library            |
|                                                                     |
| [4/4] Creating manifest...                                          |
|       ~/.claude/ensemble-manifest.txt                               |
|                                                                     |
| Done! Installed 10 commands and 1 library.                          |
|                                                                     |
+---------------------------------------------------------------------+
```

**TUI Mockup - Upgrade from existing installation**:
```
+-- Terminal --------------------------------------------------------+
|                                                                     |
| $ agent-ensemble install                                            |
|                                                                     |
| Installing agent-ensemble v0.1.0 to ~/.claude/                      |
|                                                                     |
| [1/4] Checking dependencies...                                      |
|       nWave v1.2.0 already installed. Skipping.                     |
|                                                                     |
| [2/4] Checking existing installation...                             |
|       Found existing installation: v0.0.9                           |
|       Creating backup at ~/.claude/ensemble-backup-20260304-143022/ |
|                                                                     |
| [3/4] Installing components...                                      |
|       commands/ensemble/  10 commands (updated)                     |
|       lib/python/agent_ensemble/  Python support library (updated)  |
|                                                                     |
| [4/4] Updating manifest...                                          |
|       ~/.claude/ensemble-manifest.txt                               |
|                                                                     |
| Done! Updated from v0.0.9 to v0.1.0.                                 |
|                                                                     |
| To rollback: agent-ensemble rollback                                |
|                                                                     |
+---------------------------------------------------------------------+
```

**TUI Mockup - nWave installation fails**:
```
+-- Terminal --------------------------------------------------------+
|                                                                     |
| $ agent-ensemble install                                            |
|                                                                     |
| Installing agent-ensemble v0.1.0 to ~/.claude/                      |
|                                                                     |
| [1/4] Checking dependencies...                                      |
|       nWave not found. Installing dependency...                     |
|       Running: pipx install nwave-ai                                |
|                                                                     |
| Error: Failed to install nWave dependency                           |
|                                                                     |
|   nWave is required for agent-ensemble to function.                 |
|   The automatic installation failed with:                           |
|     pipx: command not found                                         |
|                                                                     |
|   Manual installation:                                              |
|     1. Install pipx: pip install pipx --user && pipx ensurepath     |
|     2. Restart your terminal                                        |
|     3. Run: pipx install nwave-ai && nwave-ai install               |
|     4. Re-run: agent-ensemble install                               |
|                                                                     |
+---------------------------------------------------------------------+
```

**Shared Artifacts**:
- `${version}` -> source: pyproject.toml
- `${install_path}` -> `~/.claude/`
- `${manifest_path}` -> `~/.claude/ensemble-manifest.txt`
- `${backup_path}` -> `~/.claude/ensemble-backup-{timestamp}/`

**Error Path - Permission denied**:
```
+-- Terminal --------------------------------------------------------+
|                                                                     |
| $ agent-ensemble install                                            |
|                                                                     |
| Error: Cannot write to ~/.claude/                                   |
|                                                                     |
|   The directory ~/.claude/ exists but is not writable.              |
|                                                                     |
|   Try:                                                              |
|     1. Check permissions: ls -la ~/.claude/                         |
|     2. Fix ownership: sudo chown -R $USER ~/.claude/                |
|                                                                     |
+---------------------------------------------------------------------+
```

**Integration Checkpoint**: Files copied successfully, manifest created, backup exists if upgrading

---

## Step 4: Verify

**User Action**: Confirms installation worked

**Emotional State**:
- Entry: Hopeful
- Exit: Confident, relieved

**Command**: `agent-ensemble --version`

**TUI Mockup**:
```
+-- Terminal --------------------------------------------------------+
|                                                                     |
| $ agent-ensemble --version                                          |
| agent-ensemble 0.1.0                                                |
|                                                                     |
+---------------------------------------------------------------------+
```

**Command**: `agent-ensemble status`

**TUI Mockup**:
```
+-- Terminal --------------------------------------------------------+
|                                                                     |
| $ agent-ensemble status                                             |
|                                                                     |
| agent-ensemble v0.1.0                                               |
|                                                                     |
| Installation:                                                       |
|   Location:    ~/.claude/                                           |
|   Manifest:    ~/.claude/ensemble-manifest.txt                      |
|   Installed:   2026-03-04 14:30:22                                  |
|                                                                     |
| Components:                                                         |
|   commands/ensemble/           10 files    OK                       |
|   lib/python/agent_ensemble/   12 files    OK                       |
|                                                                     |
| Status: Healthy                                                     |
|                                                                     |
+---------------------------------------------------------------------+
```

**Shared Artifacts**:
- `${version}` displayed matches pyproject.toml
- `${install_timestamp}` from manifest

---

## Step 5: First Use

**User Action**: Uses an ensemble command in Claude Code

**Emotional State**:
- Entry: Ready, curious
- Exit: Confident, productive

**TUI Mockup**:
```
+-- Claude Code -----------------------------------------------------+
|                                                                     |
| > /ensemble:review                                                  |
|                                                                     |
| Starting multi-perspective code review...                           |
|                                                                     |
| Perspectives:                                                       |
|   [1] Security Auditor                                              |
|   [2] Performance Optimizer                                         |
|   [3] Maintainability Expert                                        |
|                                                                     |
| What would you like me to review?                                   |
|                                                                     |
+---------------------------------------------------------------------+
```

**Integration Checkpoint**: Command is discovered by Claude Code, executes without errors

---

## Error Scenarios Summary

| Error | User Sees | Recovery |
|-------|-----------|----------|
| pipx not installed | "command not found: pipx" | Install pipx first |
| Python < 3.11 | "Requires Python 3.11+" | Upgrade Python |
| Package not on PyPI | "No matching distribution" | Check spelling, network |
| nWave install fails | "Failed to install nWave dependency" | Manual install steps provided |
| Permission denied | "Cannot write to ~/.claude/" | Fix permissions |
| Disk full | "No space left on device" | Free disk space |
| Conflicting files | Backup created, warning shown | Review backup, continue |

---

## Shared Artifacts Registry

| Artifact | Source of Truth | Consumers |
|----------|-----------------|-----------|
| `${version}` | pyproject.toml | --version, install output, manifest |
| `${install_path}` | constants (hardcoded) | install, uninstall, status |
| `${manifest_path}` | constants | install, uninstall, status |
| `${command_count}` | len(commands/*.md) | install output, status |
| `${nwave_version}` | nwave-ai --version | install output (dependency check) |

See `docs/ux/packaging/shared-artifacts-registry.md` for full tracking.
