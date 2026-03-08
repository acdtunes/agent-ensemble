---
description: "Creates a phased roadmap.json for a feature goal with acceptance criteria and TDD steps. Use when planning implementation steps before execution."
disable-model-invocation: true
argument-hint: '[agent] [goal-description] - Example: @solution-architect "Migrate to microservices"'
---

# EN-ROADMAP: Goal Planning

**Wave**: CROSS_WAVE
**Agent**: Architect (en-solution-architect) or domain-appropriate agent

## Overview

Dispatches expert agent to create a roadmap. Agent decides structure (phases/steps) and scaffolds via CLI; orchestrator validates output.

Output: `docs/feature/{feature-id}/deliver/roadmap.json`

## Usage

```bash
/en:roadmap @en-solution-architect "Migrate monolith to microservices"
/en:roadmap @en-software-crafter "Replace legacy authentication system"
/en:roadmap @en-product-owner "Implement multi-tenant support"
```

## Execution Steps

You MUST execute these steps in order. Do NOT skip any.

**Step 1 — Parse parameters:**
1. Agent name (after @, validated against agent registry)
2. Goal description (quoted string)
3. Derive feature-id from goal (kebab-case, e.g., "Migrate to OAuth2" -> "migrate-to-oauth2")

**Step 2 — Invoke agent to create roadmap:**

Invoke via Task tool:
```
@{agent-name}

Create the roadmap at docs/feature/{feature-id}/deliver/roadmap.json.

1. Decide the phase/step structure from the architecture and acceptance tests
2. Scaffold via CLI:
   PYTHONPATH=src/ python3 -m des.cli.roadmap init \
     --project-id {feature-id} \
     --goal "{goal-description}" \
     --output docs/feature/{feature-id}/deliver/roadmap.json \
     --phases {N} --steps "{e.g. 01:3,02:2}"
3. Fill every TODO with real content. Do NOT change the YAML structure
   (phases, steps, keys). Fill in: names, descriptions, acceptance criteria,
   time estimates, dependencies, and implementation_scope paths.

Goal: {goal-description}
```

Context to pass (if available): measurement baseline|mikado-graph.md|existing docs.

**Step 3 — Validate via CLI (hard gate, mandatory):**

```bash
PYTHONPATH=src/ python3 -m des.cli.roadmap validate docs/feature/{feature-id}/deliver/roadmap.json
```
- Exit 0 -> success, roadmap ready
- Exit 1 -> print errors, STOP, do NOT proceed
- Exit 2 -> usage error, STOP

## Invocation Principles

Keep agent prompt minimal. Agent knows roadmap structure and planning methodology.

Pass: goal description + measurement context (if available).
Do not pass: YAML templates|phase guidance|step decomposition rules.

For performance roadmaps, include measurement context inline so agent can validate targets against baselines.

## Success Criteria

### Dispatcher (you) — all 3 must be checked
- [ ] Parameters parsed (agent name, goal, feature-id)
- [ ] Agent invoked via Task tool to create roadmap (scaffold + fill)
- [ ] `des.cli.roadmap validate` executed via Bash (exit 0)

### Agent output (reference)
- [ ] All TODO placeholders replaced with real content
- [ ] Steps are self-contained and atomic
- [ ] Acceptance criteria are behavioral and measurable
- [ ] Step decomposition ratio <= 2.5 (steps / production files)
- [ ] Dependencies mapped, time estimates provided

## Error Handling

- Invalid agent: report valid agents and stop
- Missing goal: show usage syntax and stop
- Scaffold failure (exit 2): report CLI error and stop
- Validation failure (exit 1): print errors, do not proceed

## Examples

### Example 1: Standard architecture roadmap
```
/en:roadmap @en-solution-architect "Migrate authentication to OAuth2"
```
Derives feature-id="migrate-auth-to-oauth2", invokes agent to create roadmap, validates. Produces docs/feature/migrate-auth-to-oauth2/deliver/roadmap.json.

### Example 2: Performance roadmap with measurement context
```
/en:roadmap @en-solution-architect "Optimize test suite execution"
```
Passes measurement data inline. Agent creates roadmap, validates targets against baseline, prioritizes largest bottleneck first.

### Example 3: Mikado refactoring
```
/en:roadmap @en-software-crafter "Extract payment module from monolith"
```
Agent creates roadmap with methodology: mikado, references mikado-graph.md, maps leaf nodes to steps.

## Workflow Context

```bash
/en:roadmap @agent "goal"              # 1. Plan (agent scaffolds + fills -> validate)
/en:execute @agent "feature-id" "01-01" # 2. Execute steps
/en:finalize @agent "feature-id"        # 3. Finalize
```
