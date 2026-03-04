# Packaging Feature - Technology Stack

**Date**: 2026-03-04

## Stack Summary

| Layer | Technology | License | Rationale |
|-------|------------|---------|-----------|
| CLI Framework | argparse | PSF (stdlib) | Zero dependencies, sufficient for simple CLI |
| Config Format | YAML | - | pyyaml already in dependencies, human-readable |
| YAML Parser | pyyaml | MIT | Already dependency, mature |
| File Operations | pathlib + shutil | PSF (stdlib) | Type-safe, cross-platform |
| Subprocess | subprocess | PSF (stdlib) | nWave detection/installation |
| Build System | setuptools | MIT | Already configured |
| Distribution | PyPI | - | Standard Python distribution |
| Installation | pipx | MIT | Isolated CLI tool installation |

## Decision Details

### CLI Framework: argparse

**Selected**: argparse (Python stdlib)

**Alternatives Considered**:

| Option | Stars | License | Pros | Cons |
|--------|-------|---------|------|------|
| argparse | stdlib | PSF | Zero deps, familiar, sufficient | Verbose for complex CLIs |
| click | 15k+ | BSD-3 | Decorators, composable | New dependency |
| typer | 14k+ | MIT | Type hints, modern | New dependency, click underneath |

**Decision**: argparse

- CLI has only 4 commands: --version, install, uninstall, status
- No subcommand complexity requiring click/typer features
- Zero additional dependencies aligns with time-to-market priority
- Team familiar with argparse

**Trade-off**: Slightly more verbose code vs no new dependencies.

### Manifest Format: YAML

**Selected**: YAML via pyyaml

**Alternatives Considered**:

| Option | Pros | Cons |
|--------|------|------|
| YAML | Human-readable, comments, aligns with nWave | Requires parser |
| JSON | Stdlib, no parser needed | No comments, less readable |
| TOML | Modern, standard for Python config | New dependency (tomli) for Py<3.11 read |
| Plain text | Simple | No structure for metadata |

**Decision**: YAML

- pyyaml already in project dependencies (pyproject.toml)
- nWave uses YAML for similar purposes
- Human-readable for debugging
- Supports comments for manifest header

**Trade-off**: Parser dependency vs alignment with ecosystem.

### File Operations: pathlib + shutil

**Selected**: Python stdlib pathlib and shutil

**Rationale**:
- pathlib provides type-safe path manipulation
- shutil provides cross-platform copy/remove operations
- No external dependencies
- Built-in since Python 3.4

### Subprocess: subprocess

**Selected**: Python stdlib subprocess

**Usage**:
- `subprocess.run(['which', 'nwave-ai'])` for detection
- `subprocess.run(['pipx', 'install', 'nwave-ai'])` for nWave installation
- `subprocess.run(['nwave-ai', 'install'])` for nWave integration

**Error Handling**: Check return codes, capture stderr for error messages.

## Dependency Analysis

### Current Dependencies (pyproject.toml)

```toml
dependencies = [
    "pyyaml>=6.0",
    "ruamel.yaml>=0.18",
]
```

### Dependencies After Packaging Feature

No new dependencies required. All functionality achievable with:
- Existing pyyaml for manifest handling
- Python stdlib for CLI, filesystem, subprocess

### OSS Validation

| Package | Last Commit | Stars | License | Status |
|---------|-------------|-------|---------|--------|
| pyyaml | <6 months | 2.4k+ | MIT | Active |
| ruamel.yaml | <6 months | 500+ | MIT | Active |
| setuptools | <1 month | 2k+ | MIT | Active |

All dependencies meet OSS criteria: recent activity, permissive licenses, active maintenance.

## Version Requirements

- Python >= 3.11 (already in pyproject.toml)
- pipx >= 1.0 (user prerequisite, not bundled)
- nWave (installed as dependency during `agent-ensemble install`)

## Platform Support

| Platform | Support Level | Notes |
|----------|--------------|-------|
| macOS | Primary | Developer workstations |
| Linux | Primary | CI/CD, servers |
| Windows | Secondary | Tested, pathlib handles separators |

Cross-platform achieved via:
- pathlib.Path for all path operations
- shutil for file operations
- No shell scripts in core functionality
