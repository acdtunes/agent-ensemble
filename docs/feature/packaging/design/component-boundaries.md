# Packaging Feature - Component Boundaries

**Date**: 2026-03-04

## Module Overview

```
src/agent_ensemble/
  __init__.py                 # Existing: version constant
  cli/                        # Existing: team_state, parallel_groups, etc.
  packaging/                  # NEW: packaging feature
    __init__.py               # Public exports
    main.py                   # CLI entry point
    installer.py              # Install/uninstall operations
    manifest.py               # Manifest read/write
    detector.py               # nWave detection
    types.py                  # Data classes
    constants.py              # Configuration values
```

## Component Specifications

### main.py - CLI Entry Point

**Responsibility**: Parse CLI arguments, dispatch to handlers, manage exit codes.

**Boundaries**:
- IN: sys.argv
- OUT: exit code (0=success, 1=error)
- CALLS: installer, manifest (for version command)

**Interface Contract**:
```
Commands:
  agent-ensemble --version     -> print version, exit 0
  agent-ensemble install       -> InstallResult
  agent-ensemble uninstall     -> UninstallResult
  agent-ensemble status        -> StatusReport
```

**Dependencies**: argparse (stdlib), installer, types

---

### installer.py - Installation Operations

**Responsibility**: Execute install/uninstall/status operations.

**Boundaries**:
- IN: operation type, options (--yes flag)
- OUT: InstallResult | UninstallResult | StatusReport
- SIDE EFFECTS: filesystem writes, subprocess calls

**Operations**:

| Operation | Input | Output | Effects |
|-----------|-------|--------|---------|
| install | None | InstallResult | Copy files, write manifest, maybe install nWave |
| uninstall | yes_flag: bool | UninstallResult | Remove files, remove manifest |
| status | None | StatusReport | None (read-only) |

**Dependencies**: manifest, detector, types, constants, pathlib, shutil

---

### manifest.py - Manifest Handler

**Responsibility**: Read/write/parse manifest YAML file.

**Boundaries**:
- IN: Path | Manifest data
- OUT: Manifest | None (if not found)
- SIDE EFFECTS: file read/write

**Data Contract**:

```python
@dataclass
class Manifest:
    version: str
    installed: datetime
    source: str  # "pypi"
    files: ManifestFiles
    checksum: str | None

@dataclass
class ManifestFiles:
    commands: list[str]  # Relative paths from ~/.claude/
    lib: list[str]
```

**Functions**:
- `read_manifest(path: Path) -> Manifest | None`
- `write_manifest(path: Path, manifest: Manifest) -> None`
- `compute_checksum(files: list[Path]) -> str`

**Dependencies**: pyyaml, types, pathlib

---

### detector.py - nWave Detector

**Responsibility**: Check nWave presence, trigger installation if needed.

**Boundaries**:
- IN: None
- OUT: NWaveStatus
- SIDE EFFECTS: subprocess calls (check, install)

**Detection Logic**:
```
1. Check `which nwave-ai` exists -> found
2. OR check ~/.claude/commands/nw/ exists -> found
3. Neither -> not found
```

**Data Contract**:

```python
@dataclass
class NWaveStatus:
    installed: bool
    version: str | None
    path: Path | None

@dataclass
class NWaveInstallResult:
    success: bool
    error_message: str | None
```

**Functions**:
- `detect_nwave() -> NWaveStatus`
- `install_nwave() -> NWaveInstallResult`

**Dependencies**: subprocess, pathlib

---

### types.py - Data Classes

**Responsibility**: Define data structures for inter-component communication.

**Boundaries**:
- IN: None (definitions only)
- OUT: Type definitions
- SIDE EFFECTS: None

**Types**:

```python
@dataclass
class InstallResult:
    success: bool
    version: str
    components_installed: int
    nwave_installed: bool
    backup_created: Path | None
    error_message: str | None

@dataclass
class UninstallResult:
    success: bool
    files_removed: int
    error_message: str | None

@dataclass
class StatusReport:
    version: str
    installed: bool
    location: Path | None
    manifest_path: Path | None
    install_date: datetime | None
    components: list[ComponentHealth]
    overall_health: str  # "Healthy" | "Unhealthy"

@dataclass
class ComponentHealth:
    name: str
    expected_count: int
    actual_count: int
    status: str  # "OK" | "MISSING FILES" | "OK (N extra)"
    missing: list[str]
    extra: list[str]
```

**Dependencies**: dataclasses, datetime, pathlib

---

### constants.py - Configuration Values

**Responsibility**: Centralize all configuration constants.

**Boundaries**:
- IN: None
- OUT: Constant values
- SIDE EFFECTS: None

**Values**:

```python
# Paths (all relative to home directory)
CLAUDE_DIR = Path.home() / ".claude"
COMMANDS_DIR = CLAUDE_DIR / "commands" / "ensemble"
LIB_DIR = CLAUDE_DIR / "lib" / "python" / "agent_ensemble"
MANIFEST_PATH = CLAUDE_DIR / "ensemble-manifest.yaml"
BACKUP_DIR_TEMPLATE = "ensemble-backup-{timestamp}"

# nWave
NWAVE_COMMANDS_DIR = CLAUDE_DIR / "commands" / "nw"
NWAVE_PACKAGE = "nwave-ai"

# Package
PACKAGE_NAME = "agent-ensemble"
```

**Dependencies**: pathlib

## Dependency Graph

```
main.py
  |
  +-> installer.py
  |     |
  |     +-> manifest.py
  |     |     |
  |     |     +-> types.py
  |     |
  |     +-> detector.py
  |     |
  |     +-> constants.py
  |     |
  |     +-> types.py
  |
  +-> types.py (for --version)
```

## Boundary Rules

1. **No circular dependencies**: Each module depends only on modules below it in the graph
2. **types.py has no dependencies**: Pure data definitions
3. **constants.py has no dependencies**: Pure values
4. **main.py is the only entry point**: No other module called directly from outside
5. **Effects isolated to edges**: installer.py and detector.py contain all side effects

## Testing Strategy per Component

| Component | Test Type | Mock Strategy |
|-----------|-----------|---------------|
| main.py | Integration | subprocess with real CLI |
| installer.py | Unit + Integration | tmp_path for filesystem |
| manifest.py | Unit | In-memory operations |
| detector.py | Unit | Mock subprocess.run |
| types.py | Unit | Type checking only |
| constants.py | Unit | Value assertions |

## Integration Points

### External Dependencies

| Component | External System | Integration Method |
|-----------|----------------|-------------------|
| detector.py | nWave CLI | subprocess.run |
| detector.py | pipx | subprocess.run |
| installer.py | ~/.claude/ filesystem | pathlib + shutil |
| manifest.py | ~/.claude/ensemble-manifest.yaml | pyyaml |

### Shared Artifacts (from registry)

| Artifact | Source Component | Consumer Components |
|----------|-----------------|---------------------|
| version | constants.py (from __init__) | main.py, installer.py, manifest.py |
| MANIFEST_PATH | constants.py | installer.py, manifest.py |
| COMMANDS_DIR | constants.py | installer.py |
| LIB_DIR | constants.py | installer.py |
