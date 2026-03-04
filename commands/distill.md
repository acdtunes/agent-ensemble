# Parallel Acceptance Test Design with Agent Teams

**Command**: `/ensemble:distill`
**Requires**: `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` in settings.json or environment

## Overview

Execute parallel acceptance test design using Claude Code Agent Teams. You (the Lead) will create a team of acceptance designers, each working on a different user story simultaneously. Each designer is paired with a dedicated reviewer. The result is a consolidated, consistent acceptance test suite in Given-When-Then format.

## Why Parallel Acceptance Design?

A single designer working sequentially tends to:
- Apply inconsistent Given states across stories
- Miss shared scenarios between related stories
- Slow down when stories are independent and could be designed simultaneously

With multiple designers in parallel, each story gets deep attention while the Lead ensures cross-story consistency.

## Your Role: Team Lead

You are the **Team Lead** — orchestrate the designer team, ensure cross-story consistency, consolidate the final acceptance test suite.

**Your responsibilities**:
- Identify user stories ready for acceptance design
- Group stories by independence (parallel) vs shared concerns (coordinated)
- Create the team and spawn designer+reviewer pairs
- Monitor for shared scenarios and contradicting assumptions
- Consolidate all acceptance tests into a unified suite
- Clean up the team

**You do NOT**:
- Design acceptance tests yourself (designers do this)
- Review tests yourself (reviewers do this)

## Workflow

### Phase 1: Understand Scope

Gather from user:
1. **Feature documentation**: Where are the user stories? (files, PRs, Jira)
2. **Architecture context**: Existing system design, acceptance criteria format preferences
3. **Stories to design for**: Which stories are ready for acceptance test design?

Read the user stories and acceptance criteria from the specified sources.

### Phase 2: Group Stories

Analyze story dependencies:
- **Independent stories**: No shared domain concepts → can be designed fully in parallel
- **Related stories**: Share Given states, domain entities, or edge cases → designers should coordinate

Present grouping to user for confirmation:
```
Story grouping for parallel design:

Parallel Group 1 (independent):
  - US-01: User registration
  - US-03: Password reset

Parallel Group 2 (independent):
  - US-02: User login
  - US-04: Session management

Coordinated (shared domain):
  - US-05: Order creation  ←→  US-06: Order cancellation
  (Share order entity and state transitions)
```

### Phase 3: Create Team

```
Create an agent team for parallel acceptance test design.
```

### Phase 4: Spawn Designers and Reviewers

**IMPORTANT — Agent Types and Model**:
- Designers MUST use `subagent_type: nw-acceptance-designer`
- Reviewers MUST use `subagent_type: nw-acceptance-designer-reviewer`
- ALL teammates MUST use `model: opus` to override agent defaults that may not resolve
- NEVER use `general-purpose` for designers or reviewers

**Naming Convention**: `designer-{story_id}` paired with `reviewer-{story_id}`

**MAXIMIZE PARALLELISM**: Spawn ALL designer+reviewer pairs simultaneously in a SINGLE message with multiple Task tool calls.

**Designer Template**:
```
Spawn a designer teammate (subagent_type: nw-acceptance-designer, name: designer-{story_id}, model: opus) with this prompt:

"You are designer-{story_id} on the {team} team. Project root: {project_root}

Design acceptance tests for User Story {story_id}: {story_title}

Story details:
{story_description}

Acceptance criteria:
{acceptance_criteria}

Architecture context:
{relevant architecture details}

Your deliverables:
1. Given-When-Then acceptance test scenarios
2. Happy path, error paths, and edge cases
3. Shared Given states identified (for cross-story reuse)
4. Boundary conditions and data constraints

Communication protocol:
- When you discover a Given state shared with another story: message the relevant designer-{other_id}
- When you find a contradicting assumption: message me AND the affected designer
- Your dedicated reviewer is reviewer-{story_id}. When done, message reviewer-{story_id}:
  'Story {story_id} acceptance tests ready for review.'
- If reviewer responds NEEDS_REVISION, address feedback and re-submit
- Only mark your task complete after reviewer APPROVED

You are using nw-acceptance-designer methodology."
```

**Reviewer Template**:
```
Spawn a reviewer teammate (subagent_type: nw-acceptance-designer-reviewer, name: reviewer-{story_id}, model: opus) with this prompt:

"You are reviewer-{story_id} on the {team} team.

You are paired with designer-{story_id}. ONLY review work from designer-{story_id}.

Your role:
- Review acceptance test scenarios for completeness and quality
- Check GWT format correctness
- Verify edge cases and error paths are covered
- Detect missing boundary conditions
- Validate Given states are reusable and consistent

When designer-{story_id} messages you:
1. Read the acceptance test scenarios
2. Check for: GWT format, completeness, edge cases, shared Given state consistency
3. Respond with one of:
   - 'Story {story_id} APPROVED' — tests meet quality standards
   - 'Story {story_id} NEEDS_REVISION: {specific feedback}' — issues to fix

Stay available — designer-{story_id} may re-submit after revision.

You are using nw-acceptance-designer-reviewer methodology."
```

### Phase 5: Design Phase

While designers are working:

1. **Monitor cross-story messages**: When designers discover shared scenarios, ensure coordination happens
2. **Detect contradictions**: If two designers make different assumptions about the same domain entity, intervene
3. **Track progress**: Each designer should produce their scenarios and submit to their reviewer

### Phase 6: Review Phase

Each reviewer validates their paired designer's output:
- **APPROVED**: Scenarios meet quality standards
- **NEEDS_REVISION**: Specific feedback for improvement

Designers address revision feedback and re-submit.

### Phase 7: Consolidate

Once all designers have reviewer APPROVED:

1. **Collect all acceptance test scenarios**
2. **Deduplicate shared Given states**: Identify common setup across stories, extract to shared fixtures
3. **Check consistency**: Verify no contradicting When/Then for the same domain action
4. **Order logically**: Group by feature area, dependency order
5. **Produce unified test suite**:

```markdown
# Acceptance Test Suite: {feature}

## Shared Given States
{common setup used across multiple stories}

### Given: A registered user
- User exists with valid credentials
- Email verified

### Given: An active order
- Order created with at least one item
- Payment authorized

## Story: US-01 — {title}

### Scenario: {happy path}
Given {precondition}
When {action}
Then {expected outcome}

### Scenario: {error path}
Given {precondition}
When {invalid action}
Then {error handling}

## Story: US-02 — {title}
...

## Cross-Story Scenarios
{scenarios that span multiple stories}

---
Designed by: {N} acceptance designer teammates
Reviewed by: {N} acceptance reviewer teammates
Method: Parallel per-story design with cross-story consolidation
```

### Phase 8: Cleanup

```
Ask all designer and reviewer teammates to shut down.
Clean up the team.
```

Present the consolidated acceptance test suite to the user.

## Example Invocation

```
User: /ensemble:distill "Design acceptance tests for the checkout feature stories"

Lead (you):
1. Read stories: US-10 (cart review), US-11 (payment), US-12 (confirmation), US-13 (order history)
2. Group: US-10 + US-11 coordinated (share cart state), US-12 + US-13 independent
3. Create team, spawn 4 designer+reviewer pairs
4. designer-10 messages designer-11: "We share 'Given: cart with items' state"
5. All reviewers APPROVED
6. Consolidate: extract 3 shared Given states, 24 total scenarios
7. Clean up team, present unified acceptance test suite
```

## Success Criteria

- [ ] All stories have acceptance tests designed in parallel
- [ ] Each designer paired with dedicated reviewer
- [ ] Shared Given states identified and deduplicated
- [ ] No contradicting assumptions across stories
- [ ] All designers got reviewer APPROVED
- [ ] Unified acceptance test suite produced
- [ ] Team cleaned up
