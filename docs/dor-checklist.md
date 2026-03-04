# Definition of Ready: agent-ensemble

## DoR Checklist

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 1 | **User value clear** | PASS | JTBD analysis with 4 jobs, opportunity scoring prioritizes J1 |
| 2 | **Acceptance criteria testable** | PASS | All AC are binary (checkbox), no subjective language |
| 3 | **Dependencies identified** | PASS | Requires `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS` feature flag |
| 4 | **Scope bounded** | PASS | Walking skeleton (US-00) first, then incremental stories |
| 5 | **Technical feasibility confirmed** | PASS | Agent teams docs reviewed; API exists in Claude Code |
| 6 | **UX journey mapped** | PASS | 8-step journey with emotional arc and failure paths |
| 7 | **Risks documented** | PASS | Four forces analysis covers anxieties; mitigations defined |
| 8 | **Estimated size reasonable** | PASS | Walking skeleton ~1 day; full J1 ~3 days |

## Handoff Package

### For Solution Architect (DESIGN wave)

**Input Artifacts**:
- `docs/ux/agent-ensemble/jtbd-job-stories.md` - Jobs and opportunity scores
- `docs/ux/agent-ensemble/jtbd-four-forces.md` - Adoption anxieties to address
- `docs/ux/agent-ensemble/journey-parallel-deliver-visual.md` - UX journey
- `docs/requirements/agent-ensemble-user-stories.md` - Stories with AC

**Key Decisions for Architect**:
1. **Namespace**: Create `~/.claude/commands/agent-ensemble/` separate from `~/.claude/commands/nw/`
2. **Agent reuse**: agent-ensemble agents can delegate to existing nw agents (software-crafter, etc.)
3. **Feature flag**: Fail fast if `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS` not set
4. **DES integration**: Team execution must produce valid execution-log entries

**Constraints**:
- Do NOT modify existing nw framework files
- Walking skeleton must work before expanding scope
- Token cost increase is acceptable if time savings > 3x

**Quality Attributes Priority**:
1. Reliability - teams must not fail silently
2. Observability - user must see teammate progress
3. Maintainability - separate namespace allows independent evolution
4. Performance - parallel execution should be 3-5x faster for eligible roadmaps

## Next Step

Invoke: `/nw:design agent-ensemble`

Architect will:
1. Define component boundaries (orchestrator, teammate protocol, task coordination)
2. Create C4 diagrams showing agent-ensemble structure
3. Select teammate display mode (in-process vs tmux)
4. Design DES integration for team execution
5. Produce roadmap.yaml for implementation
