# Acceptance Criteria: Remove Teammates Section

## US-01: Remove Teammates Sidebar

### AC-01.1: No Sidebar Present
```gherkin
Given I navigate to the board view for any feature
When the page finishes loading
Then there should be no sidebar section visible
And the page should not contain a "Teammates" heading
```

### AC-01.2: Full-Width Board Layout
```gherkin
Given I am on the board view
When I inspect the Kanban board container
Then it should span the full available width
And it should not be constrained to 75% or 3/4 width
```

### AC-01.3: All Phases Visible
```gherkin
Given a roadmap with 5 phases
When I view the board
Then all 5 phases should be displayed
And each phase should have its 4 status columns (Pending, In Progress, Review, Done)
```

---

## US-02: Remove Agent Indicator from Cards

### AC-02.1: In Progress Card Without Agent
```gherkin
Given a step "Setup API routes" with status "in_progress"
And the step is assigned to agent "crafter-01"
When I view the board
Then the card for "Setup API routes" should be visible in the "In Progress" column
And the card should display the step name "Setup API routes"
And the card should not contain the text "crafter-01"
And the card should not contain any emoji character
```

### AC-02.2: Review Card Without Agent
```gherkin
Given a step "Validate schema" with status "review"
And the step is assigned to agent "researcher-02"
When I view the board
Then the card should be in the "Review" column
And the card should not display "researcher-02"
```

### AC-02.3: Pending Card Without Agent
```gherkin
Given a step "Deploy service" with status "pending"
And the step has no agent assigned (teammate_id is null)
When I view the board
Then the card should be in the "Pending" column
And the card should not display any agent indicator
```

### AC-02.4: Done Card Unchanged
```gherkin
Given a step "Init database" with status "approved"
When I view the board
Then the card should be in the "Done" column
And the card should not display any agent indicator
# Note: This was already the existing behavior
```

### AC-02.5: Status Colors Preserved
```gherkin
Given cards in various status columns
When I view the board
Then each card should have appropriate status-based color coding
And the color coding should match the column (pending=gray, in_progress=blue, review=yellow, done=green)
```

---

## US-03: Remove Agent from Step Detail Modal

### AC-03.1: Modal Header Without Agent
```gherkin
Given a step "Setup API routes" assigned to "crafter-01"
When I click on the card to open the modal
Then the modal should display "Setup API routes" as the title
And the modal should display the step ID
And the modal should display the status badge
And the modal header should not contain "crafter-01"
And the modal header should not contain any teammate emoji
```

### AC-03.2: Modal Sections Intact
```gherkin
Given a step with description, files, dependencies, and review history
When I open the step detail modal
Then the Description section should be visible with content
And the Files section should list files to modify
And the Dependencies section should show dependent steps
And the Review History section should show review entries
```

### AC-03.3: Modal Close Behavior Unchanged
```gherkin
Given the step detail modal is open
When I click the X button
Then the modal should close
When I press the Escape key
Then the modal should close
When I click the backdrop
Then the modal should close
```

---

## Cross-Cutting Acceptance Criteria

### AC-X1: No Regression in Board Functionality
```gherkin
Given the teammates section is removed
When I interact with the board
Then card clicking should still open the modal
And phase collapsing/expanding should still work (if applicable)
And progress header should still show accurate counts
```

### AC-X2: No Console Errors
```gherkin
Given the teammates-related code is removed
When I load the board view
Then there should be no JavaScript console errors
And there should be no React warnings about missing props
```

### AC-X3: Responsive Layout
```gherkin
Given I am on the board view
When I resize the browser to mobile width
Then the board should remain usable
And cards should stack appropriately
And no horizontal overflow should occur
```
