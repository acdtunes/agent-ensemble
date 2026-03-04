# Multi-Perspective Code Review with Agent Teams

**Command**: `/ensemble:review`
**Requires**: `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` in settings.json or environment

## Overview

Execute parallel code review using Claude Code Agent Teams. You (the Lead) will create a team of reviewer teammates, each applying a different lens to the code. This catches more issues than a single-perspective review.

## Your Role: Team Lead

You are the **Team Lead** — orchestrate the review team, synthesize findings, produce unified report.

## Workflow

### Phase 1: Understand Review Scope

Ask the user:
1. What to review? (PR, specific files, recent changes)
2. Any specific concerns? (security, performance, etc.)

Get the scope:
```bash
# For PR review
gh pr diff {pr-number}

# For recent changes
git diff main...HEAD

# For specific files
# User provides file paths
```

### Phase 2: Create Team

```
Create an agent team for multi-perspective code review.
```

### Phase 3: Spawn Reviewer Teammates

Spawn 3 reviewer teammates with different focuses:

**Reviewer 1: Testing Theater & TDD Quality**
```
Spawn a reviewer teammate with this prompt:

"You are a Testing Theater specialist reviewer.

Focus areas:
- 7 Deadly Patterns: Happy Path Hero, Tautological Tests, The Mockaholic,
  Line Coverage Junkie, Shallow Diver, The Time Traveler, Test Pollution
- Test-to-implementation coupling
- Missing edge cases and error paths
- Test naming and readability

Review the code and report findings with severity (Critical/High/Medium/Low).
Message me when done with your findings."
```

**Reviewer 2: Security & Input Validation**
```
Spawn a reviewer teammate with this prompt:

"You are a security specialist reviewer.

Focus areas:
- OWASP Top 10 vulnerabilities
- Input validation and sanitization
- Authentication and authorization
- Secrets exposure
- SQL injection, XSS, command injection
- Dependency vulnerabilities

Review the code and report findings with severity (Critical/High/Medium/Low).
Message me when done with your findings."
```

**Reviewer 3: Performance & Architecture**
```
Spawn a reviewer teammate with this prompt:

"You are a performance and architecture reviewer.

Focus areas:
- N+1 queries and database performance
- Memory leaks and resource management
- Algorithmic complexity
- Caching opportunities
- SOLID principle violations
- Dependency inversion compliance

Review the code and report findings with severity (Critical/High/Medium/Low).
Message me when done with your findings."
```

### Phase 4: Wait for Findings

Monitor teammate progress. Each reviewer will message you with their findings.

### Phase 5: Synthesize Report

Once all reviewers complete:

1. **Collect all findings** from reviewer messages
2. **Deduplicate**: Same issue found by multiple reviewers → merge
3. **Flag contradictions**: Reviewers disagree → note for user resolution
4. **Prioritize**: Order by severity (Critical > High > Medium > Low)
5. **Produce unified report**:

```markdown
# Code Review Report

## Summary
- Critical: {count}
- High: {count}
- Medium: {count}
- Low: {count}

## Critical Issues
{findings}

## High Priority
{findings}

## Medium Priority
{findings}

## Low Priority / Suggestions
{findings}

## Contradictions (Needs User Input)
{any conflicting reviewer opinions}

---
Reviewed by: Testing Theater Specialist, Security Specialist, Performance Specialist
```

### Phase 6: Cleanup

```
Ask all reviewer teammates to shut down.
Clean up the team.
```

Present the unified report to the user.

## Customizing Review Focus

Users can request specific focus areas:

```
/ensemble:review --focus security,performance
```

This spawns only the requested reviewer types.

## Example Invocation

```
User: /ensemble:review PR #142

Lead (you):
1. Fetch PR diff
2. Create team with 3 reviewers
3. Wait for all findings
4. Synthesize: 2 Critical, 5 High, 8 Medium issues found
5. Clean up team
6. Present unified report
```

## Success Criteria

- [ ] All reviewer teammates completed
- [ ] Findings deduplicated and prioritized
- [ ] Contradictions flagged
- [ ] Unified report produced
- [ ] Team cleaned up
