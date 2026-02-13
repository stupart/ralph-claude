# Visual QA Checklist - Service Blueprint

**Date:** 2026-01-29
**Tester:** Layer Cake Builder Agent
**Version:** 3.0

---

## Test Environment

- File: `/Users/tylerstupart/ralph-claude/docs/v3-system-blueprint.html`
- Browser: Requires testing in Chrome/Safari/Firefox
- Resolution: Desktop (1920x1080) and responsive

---

## Visual Elements Checklist

### Header Section

| Element | Expected | Status | Notes |
|---------|----------|--------|-------|
| Title "Ralph V3" | Small caps, gray | PASS | |
| Title "Layer Cake" | Large, with emoji | PASS | |
| Background | Black (#1a1a1a) | PASS | |

### Service Blueprint Grid

#### Phase Labels (Header Row)

| Layer | Expected Color | Actor | Status |
|-------|---------------|-------|--------|
| L1 | Planner green (#10b981) | planner | PENDING |
| L2 | Planner green (#10b981) | planner | PENDING |
| L3 | Planner green (#10b981) | planner | PENDING |
| L4 | Planner green (#10b981) | planner | PENDING |
| L5 | Planner green (#10b981) | planner | PENDING |
| L6 | Planner green (#10b981) | planner | PENDING |
| L7 | Planner green (#10b981) | planner | PENDING |
| L8 | Builder blue (#3b82f6) | builder | PENDING |
| L9 | Reviewer purple (#8b5cf6) | reviewer | PENDING |
| L10 | Reviewer purple (#8b5cf6) | reviewer | PENDING |
| L11 | Reviewer purple (#8b5cf6) | reviewer | PENDING |
| L12 | Planner green (#10b981) | planner | PENDING |

#### Swimlane Labels

| Lane | Expected Style | Status |
|------|---------------|--------|
| Ralph Start | Orange border (#ff6b35) | PENDING |
| Claude Planner | Green border (#10b981) | PENDING |
| Claude Builder | Blue border (#3b82f6) | PENDING |
| Claude Reviewer | Purple border (#8b5cf6) | PENDING |
| Ralph Check | Orange border (#ff6b35) | PENDING |
| Human | Yellow/amber border (#f59e0b) | PENDING |

#### Human Gate Cells

| Layer | Expected Style | Status |
|-------|---------------|--------|
| L3 | Gold border, light amber background | PENDING |
| L7 | Gold border, light amber background | PENDING |

#### Reviewer Active Cells

| Layer | Expected Style | Status |
|-------|---------------|--------|
| L9 | Purple highlight background | PENDING |
| L10 | Purple highlight background | PENDING |
| L11 | Purple highlight background | PENDING |

### Cascade Section

| Element | Expected | Status |
|---------|----------|--------|
| Section toggle | Clickable, collapses/expands | PENDING |
| MINOR rule | Yellow badge, text from LAYER_CAKE | PENDING |
| MAJOR rule | Red badge, text from LAYER_CAKE | PENDING |
| ESCALATE rule | Purple badge, text from LAYER_CAKE | PENDING |
| MAX RETRIES | Shows "3" from LAYER_CAKE | PENDING |
| L9 fail targets | Shows minor/major/escalate targets | PENDING |
| L10 fail targets | Shows minor/major/escalate targets | PENDING |
| L11 fail targets | Shows minor/major/escalate targets | PENDING |

### Hierarchy Section

| Element | Expected | Status |
|---------|----------|--------|
| Section toggle | Clickable, collapses/expands | PENDING |
| Epic level | Clickable label opens L4 modal | PENDING |
| Feature level | Clickable label opens L5 modal | PENDING |
| Task level | Clickable label opens L6 modal | PENDING |
| Subtask level | Clickable label opens L7 modal | PENDING |

### Data Explorer Section

| Element | Expected | Status |
|---------|----------|--------|
| Layer buttons | 12 buttons, L1-L12 | PENDING |
| Button click | Opens layer modal | PENDING |
| Hierarchy calculator | Inputs update total | PENDING |
| Default total | 54 subtasks (3×3×3×2) | PENDING |
| Export button | Downloads JSON file | PENDING |

### Legend

| Element | Color | Status |
|---------|-------|--------|
| Ralph (Start/Check) | Orange | PENDING |
| Claude Planner | Green | PENDING |
| Claude Builder | Blue | PENDING |
| Claude Reviewer (GAN) | Purple | PENDING |
| Human | Amber/Yellow | PENDING |

---

## Click Interaction Tests

### Layer Modal Tests

| Layer | Click Target | Modal Shows | Status |
|-------|--------------|-------------|--------|
| L1 | Planner "Gather" cell | L1 Input modal | PENDING |
| L2 | Planner "Decompose" cell | L2 Decompose modal | PENDING |
| L3 | Planner "Synthesize" cell | L3 Synthesize modal | PENDING |
| L3 | Reviewer "GAN" cell | L3 Synthesize modal | PENDING |
| L4 | Planner "Define" cell | L4 Epics modal | PENDING |
| L5 | Planner "Plan" cell | L5 Features modal | PENDING |
| L6 | Planner "Spec" cell | L6 Tasks modal | PENDING |
| L7 | Planner "Subtasks" cell | L7 Subtasks modal | PENDING |
| L8 | Builder "Implement" cell | L8 Build modal | PENDING |
| L9 | Reviewer "Feature" cell | L9 Feature Review modal | PENDING |
| L10 | Reviewer "Epic" cell | L10 Epic Review modal | PENDING |
| L11 | Reviewer "Final" cell | L11 Final Review modal | PENDING |
| L12 | Planner "Retrospective" cell | L12 Analysis modal | PENDING |

### Modal Content Tests

| Element | Expected | Status |
|---------|----------|--------|
| Layer ID | Shows correct layer (L1-L12) | PENDING |
| Layer Name | Matches LAYER_CAKE | PENDING |
| Actor Badge | Correct color and label | PENDING |
| Description | From LAYER_CAKE.description | PENDING |
| Outputs | File paths listed | PENDING |
| Check criteria | Shows min counts or verdict type | PENDING |
| Tools | Correct tools for actor type | PENDING |
| Human Gate badge | Shows for L3, L7 only | PENDING |
| Review Type | Shows "Plan" or "Build" appropriately | PENDING |
| Flow section | Shows onPass and onFail targets | PENDING |
| Prompt template | Full prompt text | PENDING |
| Close button | X button closes modal | PENDING |
| Escape key | Closes modal | PENDING |
| Backdrop click | Closes modal | PENDING |

---

## Responsive Tests

| Viewport | Expected | Status |
|----------|----------|--------|
| Desktop (1920px) | Full layout, no horizontal scroll in main content | PENDING |
| Tablet (768px) | Blueprint scrollable, data explorer stacks | PENDING |
| Mobile (375px) | Readable, vertically stacked sections | PENDING |

---

## Issues Found

*Document any issues discovered during testing here*

| Issue | Severity | Location | Description | Fix Status |
|-------|----------|----------|-------------|------------|
| - | - | - | - | - |

---

## Test Summary

- **Total Tests:** 70+
- **Passed:** TBD
- **Failed:** TBD
- **Pending:** 70+

**QA Status:** AWAITING BROWSER TESTING

**Note:** This checklist requires manual browser testing. The code changes have been implemented but visual verification needs to be done in a browser.
