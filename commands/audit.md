# Multi-Perspective Quality Audit with Agent Teams

**Command**: `/ensemble:audit`
**Requires**: `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` in settings.json or environment

## Overview

Execute a comprehensive quality audit using Claude Code Agent Teams. You (the Lead) will create a team of up to 5 specialized reviewer agents, each examining the codebase from their area of expertise. Reviewers cross-reference findings and the Lead synthesizes a unified audit report.

## Why Multi-Perspective Audit?

A single reviewer tends to:
- Focus on their strongest area, missing issues in others
- Apply inconsistent severity ratings across domains
- Miss cross-cutting concerns that span multiple specializations

With 5 specialized reviewers working in parallel, each domain gets expert attention and cross-cutting themes emerge from overlapping findings.

## Your Role: Team Lead

You are the **Team Lead** — orchestrate the audit team, facilitate cross-referencing, synthesize the unified audit report.

**Your responsibilities**:
- Determine which reviewer perspectives are relevant for the scope
- Create the team and spawn relevant reviewers
- Facilitate cross-referencing when findings overlap
- Resolve contradictions between reviewers
- Synthesize all findings into a prioritized audit report
- Clean up the team

**You do NOT**:
- Audit the code yourself (reviewers do this)
- Override reviewer findings without evidence

## Available Reviewer Perspectives

| Perspective | Agent Type | Focus Areas |
|-------------|-----------|-------------|
| Code Quality | `nw-software-crafter-reviewer` | TDD discipline, testing theater (7 deadly patterns), code smells, SOLID principles |
| Architecture | `nw-solution-architect-reviewer` | Component boundaries, ADR quality, dependency management, coupling analysis |
| Platform | `nw-platform-architect-reviewer` | CI/CD pipeline, deployment readiness, observability, security infrastructure |
| Data | `nw-data-engineer-reviewer` | Schema design, query patterns, data security, migration quality |
| Acceptance | `nw-acceptance-designer-reviewer` | Test coverage, BDD quality, edge case coverage, acceptance criteria completeness |

## Workflow

### Phase 1: Understand Scope

Gather from user:
1. **Audit scope**: Entire project, specific modules, or specific concerns
2. **Priority concerns**: Any areas of particular worry?
3. **Context**: Recent changes, upcoming milestones, known tech debt

Based on scope, determine which reviewer perspectives are relevant:
- **Full audit**: All 5 perspectives
- **Pre-release audit**: Code Quality + Platform + Acceptance
- **Architecture review**: Architecture + Data + Platform
- **Test quality audit**: Code Quality + Acceptance
- **Custom**: User specifies which perspectives

Present selection to user for confirmation.

### Phase 2: Create Team

```
Create an agent team for multi-perspective quality audit.
```

### Phase 3: Spawn Reviewers

**IMPORTANT — Agent Types and Model**:
- Code Quality reviewer MUST use `subagent_type: nw-software-crafter-reviewer`
- Architecture reviewer MUST use `subagent_type: nw-solution-architect-reviewer`
- Platform reviewer MUST use `subagent_type: nw-platform-architect-reviewer`
- Data reviewer MUST use `subagent_type: nw-data-engineer-reviewer`
- Acceptance reviewer MUST use `subagent_type: nw-acceptance-designer-reviewer`
- ALL teammates MUST use `model: opus` to override agent defaults that may not resolve
- NEVER use `general-purpose` for any reviewer

**Naming Convention**: `code-quality`, `architecture`, `platform`, `data`, `acceptance`

**MAXIMIZE PARALLELISM**: Spawn ALL selected reviewers simultaneously in a SINGLE message with multiple Task tool calls.

**Code Quality Reviewer Template**:
```
Spawn a reviewer teammate (subagent_type: nw-software-crafter-reviewer, name: code-quality, model: opus) with this prompt:

"You are code-quality on the {team} team. Project root: {project_root}

Conduct a code quality audit of: {scope}

Focus areas:
1. Testing Theater — detect the 7 deadly patterns:
   - Happy Path Hero, Tautological Tests, The Mockaholic,
     Line Coverage Junkie, Shallow Diver, The Time Traveler, Test Pollution
2. TDD discipline — are tests written before implementation? Do they drive design?
3. Code smells — long methods, god classes, feature envy, primitive obsession
4. SOLID violations — single responsibility, open-closed, Liskov, interface segregation, dependency inversion

For each finding, provide:
- File and location
- Severity: Critical / High / Medium / Low
- Description of the issue
- Suggested remediation

Communication protocol:
- When you find something relevant to another reviewer's domain: message them
- When you disagree with another reviewer's finding: message them AND me
- When you're done: message me with your complete findings

You are using nw-software-crafter-reviewer methodology."
```

**Architecture Reviewer Template**:
```
Spawn a reviewer teammate (subagent_type: nw-solution-architect-reviewer, name: architecture, model: opus) with this prompt:

"You are architecture on the {team} team. Project root: {project_root}

Conduct an architecture audit of: {scope}

Focus areas:
1. Component boundaries — are they well-defined? Any leaky abstractions?
2. ADR quality — are architectural decisions documented? Are they followed?
3. Dependency management — dependency direction, circular dependencies, coupling
4. Design patterns — appropriate use, over-engineering, missing patterns
5. API design — consistency, versioning, error handling

For each finding, provide:
- File and location
- Severity: Critical / High / Medium / Low
- Description of the issue
- Suggested remediation

Communication protocol:
- When you find something relevant to another reviewer's domain: message them
- When you disagree with another reviewer's finding: message them AND me
- When you're done: message me with your complete findings

You are using nw-solution-architect-reviewer methodology."
```

**Platform Reviewer Template**:
```
Spawn a reviewer teammate (subagent_type: nw-platform-architect-reviewer, name: platform, model: opus) with this prompt:

"You are platform on the {team} team. Project root: {project_root}

Conduct a platform audit of: {scope}

Focus areas:
1. CI/CD pipeline — build reliability, test coverage in pipeline, deploy safety
2. Deployment readiness — health checks, graceful shutdown, rollback strategy
3. Observability — logging quality, metrics coverage, alerting rules, tracing
4. Security infrastructure — secrets management, network policies, access control
5. Infrastructure as Code — quality, drift detection, documentation

For each finding, provide:
- File and location
- Severity: Critical / High / Medium / Low
- Description of the issue
- Suggested remediation

Communication protocol:
- When you find something relevant to another reviewer's domain: message them
- When you disagree with another reviewer's finding: message them AND me
- When you're done: message me with your complete findings

You are using nw-platform-architect-reviewer methodology."
```

**Data Reviewer Template**:
```
Spawn a reviewer teammate (subagent_type: nw-data-engineer-reviewer, name: data, model: opus) with this prompt:

"You are data on the {team} team. Project root: {project_root}

Conduct a data architecture audit of: {scope}

Focus areas:
1. Schema design — normalization, indexing strategy, naming conventions
2. Query patterns — N+1 queries, missing indexes, query optimization
3. Data security — PII handling, encryption at rest/transit, access controls
4. Migration quality — reversibility, data integrity, backward compatibility
5. Data governance — validation rules, consistency checks, audit trails

For each finding, provide:
- File and location
- Severity: Critical / High / Medium / Low
- Description of the issue
- Suggested remediation

Communication protocol:
- When you find something relevant to another reviewer's domain: message them
- When you disagree with another reviewer's finding: message them AND me
- When you're done: message me with your complete findings

You are using nw-data-engineer-reviewer methodology."
```

**Acceptance Reviewer Template**:
```
Spawn a reviewer teammate (subagent_type: nw-acceptance-designer-reviewer, name: acceptance, model: opus) with this prompt:

"You are acceptance on the {team} team. Project root: {project_root}

Conduct an acceptance test audit of: {scope}

Focus areas:
1. Test coverage — are acceptance criteria covered by tests?
2. BDD quality — Given-When-Then format, meaningful scenarios, no tautologies
3. Edge case coverage — boundary conditions, error paths, concurrent scenarios
4. Test independence — no test pollution, proper setup/teardown
5. Acceptance criteria completeness — do stories have measurable, testable criteria?

For each finding, provide:
- File and location
- Severity: Critical / High / Medium / Low
- Description of the issue
- Suggested remediation

Communication protocol:
- When you find something relevant to another reviewer's domain: message them
- When you disagree with another reviewer's finding: message them AND me
- When you're done: message me with your complete findings

You are using nw-acceptance-designer-reviewer methodology."
```

### Phase 4: Audit Phase

While reviewers are auditing:

1. **Monitor cross-domain messages**: When a reviewer finds something in another's domain, ensure it reaches them
2. **Detect contradictions**: If two reviewers assess the same code differently, facilitate resolution
3. **Track severity distribution**: Watch for unusual patterns (e.g., all Critical findings from one reviewer)

### Phase 5: Cross-Reference

After initial findings:

1. **Broadcast summary**: Share high-level findings across all reviewers
2. **Request cross-validation**: Ask reviewers to validate each other's Critical/High findings
3. **Identify cross-cutting themes**: Patterns that appear across multiple domains

### Phase 6: Synthesize Report

Once all reviewers complete:

1. **Collect all findings**
2. **Deduplicate**: Same issue found by multiple reviewers → merge with all perspectives
3. **Resolve contradictions**: Note which evidence is stronger, or flag for user decision
4. **Prioritize**: Order by severity, then by cross-cutting impact
5. **Identify themes**: Group related findings into improvement areas
6. **Produce unified audit report**:

```markdown
# Quality Audit Report: {project/scope}

## Executive Summary
- Critical: {count}
- High: {count}
- Medium: {count}
- Low: {count}
- Perspectives applied: {list of reviewer types}

## Critical Issues
{highest priority findings requiring immediate attention}

### {Finding title}
- **Severity**: Critical
- **Domain**: {which reviewer(s) found it}
- **Location**: {file:line}
- **Description**: {what's wrong}
- **Impact**: {what could happen}
- **Remediation**: {how to fix}

## High Priority Issues
{findings with significant impact}

## Medium Priority Issues
{findings worth addressing}

## Low Priority / Suggestions
{nice-to-haves and minor improvements}

## Cross-Cutting Themes
{patterns that emerged across multiple reviewer domains}

### Theme: {name}
- Affected areas: {list}
- Found by: {reviewer1, reviewer2}
- Root cause: {underlying issue}
- Recommended approach: {how to address holistically}

## Contradictions (Needs User Input)
{conflicting reviewer assessments}

## Metrics Summary
| Domain | Critical | High | Medium | Low |
|--------|----------|------|--------|-----|
| Code Quality | | | | |
| Architecture | | | | |
| Platform | | | | |
| Data | | | | |
| Acceptance | | | | |

---
Audited by: {list of reviewer types used}
Method: Multi-perspective parallel audit with cross-referencing
```

### Phase 7: Cleanup

```
Ask all reviewer teammates to shut down.
Clean up the team.
```

Present the unified audit report to the user.

## Example Invocation

```
User: /ensemble:audit "Full quality audit of the order management module"

Lead (you):
1. Scope: order management module, all 5 perspectives relevant
2. Create team, spawn 5 reviewers in parallel
3. Reviewers audit simultaneously:
   - code-quality finds testing theater in order tests
   - architecture finds circular dependency between order and payment
   - platform finds missing health checks
   - data finds N+1 queries in order listing
   - acceptance finds missing edge cases for partial refunds
4. Cross-reference: code-quality and acceptance both flag test quality → merge
5. Synthesize: 3 Critical, 7 High, 12 Medium, 5 Low findings
6. Theme: "Order-Payment coupling" appears in architecture + data + code-quality
7. Clean up team, present audit report
```

## Success Criteria

- [ ] Relevant reviewer perspectives selected and spawned
- [ ] All reviewers completed their audit
- [ ] Cross-domain findings shared between reviewers
- [ ] Contradictions identified and flagged
- [ ] Findings deduplicated and prioritized
- [ ] Cross-cutting themes identified
- [ ] Unified audit report produced with severity metrics
- [ ] Team cleaned up
