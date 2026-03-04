# US-2: Narrower Card Width for Higher Density

## Problem
Elena Ruiz is a project maintainer who manages 18 features in the "acme-platform" project. She finds that the current card layout wastes horizontal space -- cards are wider than they need to be for the information they display (name, status label, progress bar, badges). On her 1440px monitor, only 4 cards fit per row, forcing her to scroll vertically to see all features. She wants to see more features at a glance.

## Who
- Project maintainer | Using a standard desktop monitor (1280-1920px) | Wants maximum feature visibility without scrolling

## Job Story Trace
**When** I open the features page and have to scroll through multiple rows to see all 18 features,
**I want to** see more features per row without losing readability,
**so I can** scan the full project status with minimal scrolling.

## Solution
Reduce card width to approximately half the current size, increasing the number of visible cards per row. On XL screens (1280px+), fit 6-8 cards per row instead of the current 4. Maintain responsive behavior on smaller screens.

## Domain Examples

### 1: XL desktop (1440px viewport) shows 6+ cards per row
Elena opens the features page on her 1440px monitor. The grid shows 6 cards per row. With 18 features, she sees all of them in roughly 3 rows, requiring no or minimal scrolling. Each card still shows the feature name, status label, progress bar, and badges without truncation.

### 2: Medium desktop (1024px viewport) shows 4-5 cards per row
Carlos Mendez opens the features page on his 13-inch laptop with a 1024px viewport. The grid adapts to show 4-5 cards per row. Cards remain readable with all information visible.

### 3: Mobile viewport (375px) shows 1 card per row
Elena checks the board on her phone (375px viewport). Cards stack vertically, one per row, using full width. No horizontal scrolling needed.

## UAT Scenarios (BDD)

### Scenario: Six or more cards visible per row on XL screens
Given Elena Ruiz opens the features overview for "acme-platform"
And her viewport width is 1440px
When the features page loads
Then at least 6 feature cards are visible per row
And each card displays its full name without truncation

### Scenario: Cards remain readable at narrower width
Given Elena Ruiz opens the features overview for "acme-platform"
And her viewport width is 1440px
When the features page loads
Then each card shows the feature name, status label, progress count, and progress bar
And badge text ("2 in progress", "1 failed") is fully visible without wrapping

### Scenario: Responsive stacking on mobile
Given Elena Ruiz opens the features overview on a 375px viewport
When the features page loads
Then feature cards display one per row at full container width

### Scenario: Medium screens show intermediate density
Given Carlos Mendez opens the features overview on a 1024px viewport
When the features page loads
Then at least 4 feature cards are visible per row

## Acceptance Criteria
- [ ] On viewports 1280px and wider, at least 6 cards display per row
- [ ] On viewports 1024px, at least 4 cards display per row
- [ ] On viewports below 640px, cards stack one per row
- [ ] Card content (name, status, progress, badges) remains fully visible at the narrower width
- [ ] No horizontal scrolling occurs at any viewport width

## Technical Notes
- Current grid: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4`
- Target grid: increase column count at each breakpoint (e.g., `sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6` or similar)
- Alternative: use `grid-cols-[repeat(auto-fill,minmax(Xrem,1fr))]` with a smaller minimum width
- Card padding and font sizes may need minor adjustment at narrower widths
- No backend changes needed

## Definition of Ready Validation

| DoR Item | Status | Evidence |
|----------|--------|----------|
| Problem statement clear | PASS | Specific pain: 4 cards/row too sparse, vertical scrolling required |
| User/persona identified | PASS | Elena Ruiz (1440px monitor) and Carlos Mendez (1024px laptop) |
| 3+ domain examples | PASS | 3 examples across XL, medium, and mobile viewports |
| UAT scenarios (3-7) | PASS | 4 scenarios covering XL, readability, mobile, and medium |
| AC derived from UAT | PASS | 5 criteria mapping to scenario outcomes |
| Right-sized | PASS | ~0.5 day effort, 4 scenarios, CSS-only change |
| Technical notes | PASS | Current and target grid classes identified |
| Dependencies tracked | PASS | No dependencies |

**DoR Status**: PASSED
