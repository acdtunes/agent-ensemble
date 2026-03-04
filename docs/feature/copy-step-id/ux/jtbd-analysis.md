# JTBD Analysis: Copy Step ID to Clipboard

## Job Story

**When** I need to reference a specific step ID in a CLI command,
**I want to** quickly copy the step ID to my clipboard,
**so I can** paste it into the terminal without manual selection and transcription errors.

### Job Dimensions

**Functional**: Copy step ID from UI to clipboard for use in CLI commands

**Emotional**: Feel efficient and confident when transitioning between UI and CLI workflows

**Social**: Demonstrate smooth workflow mastery when pair programming or demonstrating the tool

## Forces Analysis

### Demand-Generating Forces

**Push (Current Frustration)**:
- Must manually select tiny "01-03" text in StepCard footer
- Small text size makes precise selection difficult
- Manual transcription risks typos in step ID
- Breaks flow when switching from board UI to terminal

**Pull (New Solution Attraction)**:
- Single click to copy step ID
- Immediate visual feedback (toast notification)
- Seamless UI-to-CLI workflow
- Common pattern from other tools (copy icons everywhere)

### Demand-Reducing Forces

**Anxiety (Fear of New Approach)**:
- Minimal — this is a universally understood UX pattern
- Slight concern: will I know if the copy succeeded? (mitigated by toast feedback)

**Habit (Comfort with Current)**:
- Low — current manual selection is already painful
- No established muscle memory to break

### Assessment

- **Switch Likelihood**: High — tiny implementation, large quality-of-life improvement
- **Key Enabler**: Visual feedback (toast) confirms action success
- **Design Implication**: Click target should be obvious (hover state, cursor change)

## Context

This is a micro-improvement within the nw-teams board UI. The StepCard component displays steps from the current feature roadmap. Each step has an ID like "01-03" shown in the footer. Users frequently need this ID for CLI commands:

```bash
python -m agent_ensemble.cli.team_state transition --step 01-03
```

Currently, users must carefully select the small text to copy it. This feature adds a click-to-copy interaction with toast feedback.

## Success Criteria

- Single click copies step ID to clipboard
- Toast notification confirms copy (shows copied text)
- Hover state indicates the ID is clickable
- Works consistently across all browsers
