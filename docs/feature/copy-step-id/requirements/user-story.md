# US-01: Click to Copy Step ID

## Problem

Jordan is a developer using the nw-teams board to track feature progress. They frequently run CLI commands that require the step ID as a parameter. The current step ID "01-03" displays in tiny text in the StepCard footer, forcing Jordan to carefully select the text with their mouse, which is fiddly and error-prone. They find it frustrating to waste time on precise text selection when they just need to copy a simple identifier.

## Who

- Developer using nw-teams board UI
- Needs to reference step IDs in CLI commands
- Switching frequently between browser and terminal

## Solution

Add click-to-copy behavior to the step ID in the StepCard footer. Clicking the step ID copies it to clipboard and displays a brief toast notification confirming the copy action.

## Domain Examples

### 1: Quick Copy for CLI Command

**Scenario**: Jordan viewing StepCard with ID "01-03", needs to run transition command

**Action**: Jordan clicks on "01-03" in the StepCard footer

**Outcome**:
- Step ID "01-03" copied to clipboard
- Toast appears: "Copied 01-03"
- Jordan can immediately paste into terminal command

### 2: Multiple Step References

**Scenario**: Jordan needs to reference step "02-05" in a git commit message

**Action**: Jordan clicks on "02-05" in the StepCard footer

**Outcome**:
- Step ID "02-05" copied to clipboard
- Toast confirmation appears
- Jordan pastes into commit message

### 3: Visual Feedback Clarity

**Scenario**: Jordan hovers over step ID "01-03" before clicking

**Action**: Jordan moves mouse over the step ID text

**Outcome**:
- Cursor changes to pointer (indicating clickability)
- Step ID text style changes (e.g., underline, color shift)
- Clear affordance that the element is interactive

## UAT Scenarios (BDD)

### Scenario 1: Copy step ID on click

**Given** Jordan is viewing a StepCard with step ID "01-03"
**When** Jordan clicks on the "01-03" text in the card footer
**Then** the step ID "01-03" is copied to the system clipboard
**And** a toast notification appears displaying "Copied 01-03"
**And** the toast disappears after 2 seconds

### Scenario 2: Hover state indicates clickability

**Given** Jordan is viewing a StepCard with step ID "02-05"
**When** Jordan hovers over the "02-05" text in the card footer
**Then** the cursor changes to a pointer
**And** the text displays a hover style (underline or color change)

### Scenario 3: Multiple copies overwrite clipboard

**Given** Jordan has previously copied step ID "01-03"
**When** Jordan clicks on step ID "02-05"
**Then** the clipboard now contains "02-05" (replacing "01-03")
**And** toast confirms "Copied 02-05"

### Scenario 4: Copy persists for external paste

**Given** Jordan has clicked step ID "01-03" in the browser
**When** Jordan switches to terminal and executes paste (Cmd+V or Ctrl+V)
**Then** the terminal receives "01-03" as pasted text

### Scenario 5: Toast does not block UI

**Given** Jordan has just clicked step ID "01-03"
**And** the toast "Copied 01-03" is visible
**When** Jordan immediately clicks another step ID "02-01"
**Then** the new toast "Copied 02-01" replaces the previous toast
**And** Jordan can interact with other UI elements without obstruction

## Acceptance Criteria

- [ ] Clicking step ID text in StepCard footer copies ID to clipboard
- [ ] Toast notification appears after click, showing "Copied {stepId}"
- [ ] Toast auto-dismisses after 2 seconds
- [ ] Hover state on step ID shows pointer cursor and visual affordance
- [ ] Clipboard copy works across all major browsers (Chrome, Firefox, Safari)
- [ ] Multiple sequential copies replace clipboard content (no accumulation)
- [ ] Toast notifications do not block other UI interactions

## Technical Notes

**Constraints**:
- Use React state or context for toast notification management
- Clipboard API (`navigator.clipboard.writeText()`) requires HTTPS or localhost
- Toast component should be lightweight (avoid heavy dependencies if possible)
- Consider accessibility: toast should announce to screen readers

**Dependencies**:
- None — pure UI feature, no backend or API changes required
- StepCard component already renders step ID in footer
