# Requirements Summary: agent-ensemble Packaging

## Epic Overview

**Epic Name**: Packaging
**Goal**: Package agent-ensemble software for easy installation via PyPI + pipx, following nWave's approach
**Target Users**: Developers using Claude Code who want team coordination features

## User Stories

| ID | Title | Priority | Effort | Status |
|----|-------|----------|--------|--------|
| US-01 | PyPI Package Installation | Must Have | 2 days | Ready |
| US-02 | Claude Code Integration | Must Have | 2 days | Ready |
| US-03 | Clean Uninstallation | Must Have | 1 day | Ready |
| US-04 | Version and Status Commands | Should Have | 1 day | Ready |

**Total Estimated Effort**: 6 days

## Walking Skeleton Scope

Based on JTBD opportunity scoring, the walking skeleton delivers:

1. **US-01**: `pipx install agent-ensemble` -- install from PyPI
2. **US-02**: `agent-ensemble install` -- check/install nWave dependency, copy files to ~/.claude/, create manifest
3. **US-03**: `agent-ensemble uninstall` -- manifest-based removal with preview
4. **US-04**: `agent-ensemble --version` -- show installed version

**Note**: agent-ensemble depends on nWave (`nwave-ai` on PyPI). The install command automatically installs nWave if not present.

## Deferred to Later Iteration

- **Update Command**: `agent-ensemble update` (requires v0.2.0 to test upgrade path)
- **Rollback Command**: `agent-ensemble rollback` (restore from backup)
- **Custom Configuration**: `--path`, `--components`, `--dev` flags
- **Version Check**: `agent-ensemble check-update` (compare to PyPI latest)

## Jobs-to-be-Done Mapping

| Job | Stories | Primary Outcome |
|-----|---------|-----------------|
| Install Job | US-01, US-02 | Minimize time to complete installation |
| Uninstall Job | US-03 | Minimize likelihood of leftover files |
| Verify Job | US-04 | Minimize time to verify installation health |
| Update Job | (deferred) | Minimize likelihood of update breaking workflow |

## Success Metrics

1. **Installation Success Rate**: >95% of users complete installation without errors
2. **Time to First Command**: <5 minutes from discovery to running first ensemble command
3. **Clean Uninstall**: 100% of users have no leftover files after uninstall
4. **Support Tickets**: <5% of users need help with installation

## Risks

| Risk | Probability | Impact | Mitigation | Owner |
|------|------------|--------|------------|-------|
| PyPI name "agent-ensemble" taken | Low | High | Check availability early | Dev Team |
| Claude Code path changes | Low | High | Abstract paths to constants | Dev Team |
| pipx compatibility issues | Low | Medium | Test on macOS, Linux, Windows | QA |
| User's ~/.claude/ has conflicts | Medium | Medium | Backup before install | Design |
| nWave installation fails | Medium | High | Provide clear manual installation steps | Dev Team |
| nWave version incompatibility | Low | Medium | Document minimum nWave version | Dev Team |

## Dependencies

```
US-01: PyPI Package Installation
  |
  v
US-02: Claude Code Integration <-- US-03: Uninstall (needs manifest)
  |    (installs nWave dependency)      |
  v                                     v
US-04: Version and Status <------------ (shares manifest structure)
```

**External Dependency**: nWave (`nwave-ai` on PyPI, https://github.com/nWave-ai/nWave)
- agent-ensemble requires nWave for core agent functionality
- US-02 automatically installs nWave if not present

## Non-Functional Requirements

### Performance
- Installation completes in <30 seconds on typical hardware
- `--version` responds in <100ms
- `status` command completes in <1 second

### Reliability
- Installation is idempotent (safe to run multiple times)
- Failed installation leaves no partial state
- Backup created before any destructive operation

### Usability
- Progress shown for operations >1 second
- Error messages include cause and recovery steps
- Confirmation required for destructive operations

### Compatibility
- Python 3.11+ required
- Works on macOS, Linux, Windows
- No sudo/admin required for standard installation

## Glossary

| Term | Definition |
|------|------------|
| pipx | Python package installer for CLI applications (isolated environments) |
| Manifest | YAML file tracking installed files for clean uninstall |
| Claude Code | Anthropic's CLI tool for AI-assisted development |
| ~/.claude/ | User's Claude configuration directory |
| ensemble | Namespace for agent-ensemble commands (/ensemble:*) |
| nWave | Core agent framework that agent-ensemble depends on (PyPI: nwave-ai) |

## Cross-References

- JTBD Analysis: `docs/ux/packaging/jtbd-analysis.md`
- Journey Design: `docs/ux/packaging/journey-install-visual.md`
- BDD Scenarios: `docs/ux/packaging/journey-install.feature`
- Shared Artifacts: `docs/ux/packaging/shared-artifacts-registry.md`
