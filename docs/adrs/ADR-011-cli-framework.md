# ADR-011: CLI Framework Selection

## Status

Accepted

## Context

The packaging feature requires a CLI interface with four commands:
- `--version`: Display version
- `install`: Copy files to ~/.claude/
- `uninstall`: Remove installed files
- `status`: Show installation health

We need to select a CLI framework that balances simplicity, maintenance, and developer experience.

### Quality Attribute Priorities
1. Time-to-market (fast delivery)
2. Maintainability (easy to extend later)
3. Reliability (predictable behavior)
4. Testability (easy to test CLI)

### Constraints
- Functional programming paradigm (CLAUDE.md)
- Python 3.11+ only
- Prefer zero new dependencies

## Decision

Use **argparse** from Python standard library.

## Alternatives Considered

### Alternative 1: Click

**What**: Decorator-based CLI framework with composable commands.

**Evaluation**:
| Criterion | Score | Notes |
|-----------|-------|-------|
| Learning curve | Medium | New decorators to learn |
| Dependencies | +1 | Adds click dependency |
| Features | High | Groups, contexts, rich help |
| Testability | Good | CliRunner for testing |

**Why Rejected**: Adds dependency for features we don't need. Four simple commands don't require click's composability or context passing.

### Alternative 2: Typer

**What**: Modern CLI framework using Python type hints, built on Click.

**Evaluation**:
| Criterion | Score | Notes |
|-----------|-------|-------|
| Learning curve | Low | Type hints are intuitive |
| Dependencies | +2 | Adds typer + click |
| Features | High | Auto-completion, help generation |
| Testability | Good | Inherits CliRunner |

**Why Rejected**: Two dependencies for marginal benefit. Type hints are nice but argparse handles our simple interface adequately.

### Alternative 3: Fire

**What**: Auto-generate CLI from Python objects.

**Evaluation**:
| Criterion | Score | Notes |
|-----------|-------|-------|
| Learning curve | Low | Zero boilerplate |
| Dependencies | +1 | Adds fire dependency |
| Features | Medium | Limited customization |
| Testability | Poor | Hard to test, magic |

**Why Rejected**: Too magical, less control over help text and error handling. Not suitable for user-facing CLI.

## Consequences

### Positive
- Zero new dependencies
- Standard library = stable, well-documented
- Team already familiar with argparse
- Explicit control over help text and error messages
- Easy to test via subprocess

### Negative
- More verbose than decorator-based alternatives
- Manual subcommand setup (vs typer's automatic)
- No built-in auto-completion (can add later with argcomplete if needed)

### Neutral
- Sufficient for 4 commands; would reconsider at 10+ commands
- --help output less pretty than typer; acceptable for CLI tool

## Implementation Notes

```python
# Subcommand pattern
parser = argparse.ArgumentParser(prog='agent-ensemble')
parser.add_argument('--version', action='version', version=f'agent-ensemble {VERSION}')

subparsers = parser.add_subparsers(dest='command')
subparsers.add_parser('install', help='Install to Claude Code')
subparsers.add_parser('uninstall', help='Remove from Claude Code').add_argument('--yes', ...)
subparsers.add_parser('status', help='Show installation status')
```

## References

- argparse docs: https://docs.python.org/3/library/argparse.html
- Click: https://click.palletsprojects.com/
- Typer: https://typer.tiangolo.com/
