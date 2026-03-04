# US-03: Copy File Path for AI Agent Prompting

## Problem
Andres Dandrea is a solo developer who reviews documentation in the board app and then prompts AI agents (Claude) to rewrite or add content to those documents. To tell the agent which file to read or modify, he needs the file path. Currently, he must switch to the IDE, find the file in the file tree, right-click, and "Copy Path." This multi-step context switch interrupts the review-then-prompt workflow.

## Who
- Solo developer | Reviewing docs and prompting AI agents | Wants frictionless transition from reading a doc to prompting an agent about it

## Solution
Display the document's relative file path (from project root) prominently above the rendered content. A copy button next to the path copies it to the clipboard with a brief "Copied!" confirmation that reverts after 2 seconds.

## Job Story Traceability
- **JS-03**: Bridge Documentation to AI Agent Workflow (primary)

## Domain Examples

### 1: Happy Path -- Copy an ADR path
Andres is viewing "ADR-001-multi-project-state-management.md". The path `adrs/ADR-001-multi-project-state-management.md` (relative from the project's documentation root) is shown above the content. He clicks the copy button. The button text changes to "Copied!" for 2 seconds. He switches to his terminal and pastes the path into a prompt: "Read `docs/adrs/ADR-001-multi-project-state-management.md` and update the status from Proposed to Accepted."

### 2: Edge Case -- Copy a deeply nested feature doc path
Andres is viewing a user story at `docs/feature/card-redesign/discuss/US-01-card-title-and-layout.md`. He copies the path. The clipboard contains the full relative path including nested folders. He pastes it into an agent prompt to request changes to the acceptance criteria.

### 3: Error/Boundary -- Clipboard API unavailable
Andres is using a browser that does not support the Clipboard API (or has denied clipboard permissions). He clicks the copy button. The path text becomes selected (text selection fallback) so he can manually Ctrl+C. A tooltip suggests "Select All + Copy."

## UAT Scenarios (BDD)

### Scenario: Copy file path with one click
Given Andres is viewing the document "adrs/ADR-001-multi-project-state-management.md"
And the file path is displayed above the rendered content
When he clicks the copy button next to the path
Then the document's relative file path is copied to the clipboard
And the button shows "Copied!" text

### Scenario: Copy confirmation reverts after delay
Given Andres has just clicked the copy button
And the button shows "Copied!" text
When 2 seconds have elapsed
Then the button reverts to its default copy icon

### Scenario: Copied path is relative from project root
Given Andres is viewing a document located at "docs/feature/card-redesign/discuss/jtbd-analysis.md"
When he copies the file path
Then the clipboard contains "docs/feature/card-redesign/discuss/jtbd-analysis.md"
And the path does not contain absolute filesystem prefixes like "/Users/" or "C:\\"

### Scenario: File path always visible when viewing a document
Given Andres has selected any document from the tree
Then the file path is visible above the rendered content
And the copy button is positioned next to the path
And the path remains visible when scrolling through document content

### Scenario: Keyboard shortcut for copy (accessibility)
Given Andres is viewing a document and the copy button is focused
When he presses Enter or Space
Then the file path is copied to the clipboard
And the "Copied!" confirmation appears

## Acceptance Criteria
- [ ] File path displayed above rendered content when a document is selected
- [ ] Path is relative from project root (not absolute)
- [ ] Copy button copies the path to clipboard on click
- [ ] "Copied!" confirmation shown for 2 seconds then reverts
- [ ] Copy button is keyboard-accessible (focusable, activated by Enter/Space)
- [ ] File path remains visible when scrolling document content

## Technical Notes
- Uses the Clipboard API (`navigator.clipboard.writeText()`)
- Path must be relative from the project root directory, not from `docs/` sub-directory
- Confirmation timing uses a simple 2-second timeout, no complex animation
- Depends on US-02 (document rendering) being in place -- path is shown above rendered content
