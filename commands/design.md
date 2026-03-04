# AGENT-ENSEMBLE:DESIGN — Cross-Discipline Architecture with Agent Teams

**Command**: `/agent-ensemble:design`
**Requires**: `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` in settings.json or environment

## Overview

Execute parallel architecture design using Claude Code Agent Teams. You (the Lead) will create a team of three architect specializations working simultaneously — solution architecture, data architecture, and platform architecture — then cross-review for consistency.

## Why Cross-Discipline Design?

A single architect tends to:
- Favor their own specialization, underspecifying other domains
- Make assumptions about data or infrastructure that don't hold
- Miss integration gaps between system, data, and platform concerns

With three specialists designing in parallel and cross-reviewing, each domain gets deep attention and integration issues surface early.

## Your Role: Team Lead

You are the **Team Lead** — orchestrate the architect team, facilitate cross-domain coordination, synthesize the unified architecture document.

**Your responsibilities**:
- Gather requirements and constraints from the user
- Create the team and spawn all three architects
- Facilitate cross-domain communication when decisions affect other domains
- Coordinate the cross-review phase
- Synthesize all designs into a unified architecture document
- Clean up the team

**You do NOT**:
- Design the architecture yourself (architects do this)
- Make technology choices without architect input

## Workflow

### Phase 1: Understand Requirements

Gather from user:
1. **User stories / acceptance criteria**: What does the system need to do?
2. **Non-functional requirements**: Performance, scalability, availability targets
3. **Constraints**: Existing tech stack, team expertise, budget, timeline
4. **Context**: Greenfield vs brownfield, existing systems to integrate with

### Phase 2: Create Team

```
Create an agent team for cross-discipline architecture design.
```

### Phase 3: Spawn Architects

**IMPORTANT — Agent Types and Model**:
- Solution architect MUST use `subagent_type: nw-solution-architect`
- Data architect MUST use `subagent_type: nw-data-engineer`
- Platform architect MUST use `subagent_type: nw-platform-architect`
- ALL teammates MUST use `model: opus` to override agent defaults that may not resolve
- NEVER use `general-purpose` for architects

**Naming Convention**: `solution-architect`, `data-architect`, `platform-architect`

**Spawn ALL three simultaneously** in a SINGLE message with multiple Task tool calls.

**Solution Architect Template**:
```
Spawn an architect teammate (subagent_type: nw-solution-architect, name: solution-architect, model: opus) with this prompt:

"You are solution-architect on the {team} team. Project root: {project_root}

Design the system architecture for: {feature/project description}

Requirements:
{user stories and acceptance criteria}

Non-functional requirements:
{NFRs}

Constraints:
{constraints}

Your deliverables:
1. C4 Context and Container diagrams
2. Component boundaries and responsibilities
3. Technology selection with justification
4. API contracts between components
5. Error handling and resilience patterns

Communication protocol:
- When a decision affects data architecture (storage, schemas, queries): message data-architect
- When a decision affects platform (deployment, scaling, observability): message platform-architect
- When you need input from another domain: message the relevant architect
- When you're done: message me with your complete design document

You are using nw-solution-architect methodology."
```

**Data Architect Template**:
```
Spawn an architect teammate (subagent_type: nw-data-engineer, name: data-architect, model: opus) with this prompt:

"You are data-architect on the {team} team. Project root: {project_root}

Design the data architecture for: {feature/project description}

Requirements:
{user stories and acceptance criteria}

Non-functional requirements:
{NFRs}

Constraints:
{constraints}

Your deliverables:
1. Schema design (entities, relationships, migrations)
2. Data flow diagrams (ingestion, processing, output)
3. Storage technology selection with justification
4. Query patterns and optimization strategy
5. Data security and governance approach

Communication protocol:
- When a decision affects system design (API contracts, component boundaries): message solution-architect
- When a decision affects infrastructure (database hosting, backups, scaling): message platform-architect
- When you need input from another domain: message the relevant architect
- When you're done: message me with your complete design document

You are using nw-data-engineer methodology."
```

**Platform Architect Template**:
```
Spawn an architect teammate (subagent_type: nw-platform-architect, name: platform-architect, model: opus) with this prompt:

"You are platform-architect on the {team} team. Project root: {project_root}

Design the platform architecture for: {feature/project description}

Requirements:
{user stories and acceptance criteria}

Non-functional requirements:
{NFRs}

Constraints:
{constraints}

Your deliverables:
1. CI/CD pipeline design
2. Infrastructure architecture (compute, networking, storage)
3. Deployment strategy (blue-green, canary, rolling)
4. Observability stack (logging, metrics, tracing, alerting)
5. Security infrastructure (secrets management, network policies, access control)

Communication protocol:
- When a decision affects system design (scaling approach, service mesh): message solution-architect
- When a decision affects data (database hosting, replication, backups): message data-architect
- When you need input from another domain: message the relevant architect
- When you're done: message me with your complete design document

You are using nw-platform-architect methodology."
```

### Phase 4: Design Phase

While architects are designing:

1. **Monitor cross-domain messages**: Ensure decisions that affect other domains are communicated
2. **Detect conflicts**: If two architects make incompatible choices (e.g., solution architect picks microservices but platform architect designs for monolith), intervene immediately
3. **Facilitate alignment**: When an architect asks a question that another can answer, route the message

### Phase 5: Cross-Review

Once all three architects complete their designs, spawn reviewer agents for formal cross-review:

**IMPORTANT — Reviewer Agent Types**:
- Solution review MUST use `subagent_type: nw-solution-architect-reviewer`
- Data review MUST use `subagent_type: nw-data-engineer-reviewer`
- Platform review MUST use `subagent_type: nw-platform-architect-reviewer`
- ALL reviewers MUST use `model: opus`

**Naming Convention**: `solution-reviewer`, `data-reviewer`, `platform-reviewer`

Each reviewer examines ALL THREE designs from their perspective:

```
Spawn a reviewer teammate (subagent_type: nw-solution-architect-reviewer, name: solution-reviewer, model: opus) with this prompt:

"You are solution-reviewer on the {team} team.

Review these three architecture documents for consistency and integration gaps:
1. System design: {solution-architect output location}
2. Data architecture: {data-architect output location}
3. Platform blueprint: {platform-architect output location}

Focus on:
- Are component boundaries consistent across all three?
- Do API contracts align with data schemas?
- Does the deployment strategy support the system topology?
- Are there integration gaps between domains?

Report findings with severity (Critical/High/Medium/Low).
Message me when done.

You are using nw-solution-architect-reviewer methodology."
```

Repeat similarly for `data-reviewer` and `platform-reviewer`.

### Phase 6: Synthesize

After cross-review completes:

1. **Collect all designs and review findings**
2. **Resolve integration gaps** identified by reviewers
3. **Produce unified architecture document**:

```markdown
# Architecture Document: {project/feature}

## Overview
{executive summary of architecture}

## System Design
{from solution-architect, refined by review}
### C4 Diagrams
### Component Boundaries
### Technology Selection
### API Contracts

## Data Architecture
{from data-architect, refined by review}
### Schema Design
### Data Flows
### Storage Selection
### Query Patterns

## Platform Blueprint
{from platform-architect, refined by review}
### CI/CD Pipeline
### Infrastructure
### Deployment Strategy
### Observability

## Integration Points
{cross-cutting concerns identified during cross-review}

## Decision Log
{key decisions with rationale from each architect}

## Open Questions
{unresolved items needing user input}

---
Designed by: solution-architect, data-architect, platform-architect
Reviewed by: solution-reviewer, data-reviewer, platform-reviewer
Method: Cross-discipline parallel design with cross-review
```

### Phase 7: Cleanup

```
Ask all architect and reviewer teammates to shut down.
Clean up the team.
```

Present the unified architecture document to the user.

## Example Invocation

```
User: /agent-ensemble:design "Real-time notification system for our e-commerce platform"

Lead (you):
1. Gather requirements: push notifications, email, in-app, at scale
2. Create team with 3 architects
3. Architects design in parallel:
   - solution-architect: event-driven with WebSocket + SNS
   - data-architect: event store + preference schema + DynamoDB
   - platform-architect: ECS Fargate + CloudWatch + canary deploy
4. Cross-review: data-reviewer finds schema doesn't support solution's batching strategy
5. Resolve: data-architect adjusts schema
6. Synthesize unified document
7. Clean up team, present architecture
```

## Success Criteria

- [ ] All three architect specializations produced designs
- [ ] Cross-domain decisions communicated during design
- [ ] Cross-review completed by all three reviewer types
- [ ] Integration gaps identified and resolved
- [ ] Unified architecture document produced
- [ ] Team cleaned up
