# Layer Specifications

Detailed specs for each layer's behavior, inputs, outputs, and done criteria.

## Hierarchy Overview

Ralph V3 uses a **4-level nested hierarchy** to maximize surface area and thoroughness:

```
Epic (L4)
└── Feature (L5)         # 3-5+ features per epic
    └── Task (L6)        # 3-5+ tasks per feature
        └── Subtask (L7) # 2-4+ subtasks per task
```

**Minimum counts are enforced.** More nesting = more thinking = more thorough output.

---

## Layer 1: Input

### Purpose
Gather all raw material that will inform the project.

### Entry Criteria
- Project initiated
- User has ideas/requirements to share

### Process
1. Create `/1-input/` folder
2. Capture brain dumps (text, transcribed audio)
3. Gather research (web searches, docs, references)
4. Collect designs (screenshots, mockups, inspirations)
5. Note existing code/systems to analyze

### Artifacts
```
/1-input/
├── brain-dump-001.md       # User's raw thoughts
├── brain-dump-002.md       # Follow-up thoughts
├── research/
│   ├── competitor-analysis.md
│   └── tech-research.md
├── designs/
│   ├── inspiration-1.png
│   └── mockup-v1.png
└── existing-system-notes.md
```

### Done Criteria
- [ ] At least one substantial brain dump captured
- [ ] All referenced materials gathered
- [ ] No obvious gaps in input material

### Exit
Update `_status.md` → Layer 2

---

## Layer 2: Decomposition

### Purpose
Break down raw input into atomic, organized pieces.

### Entry Criteria
- Layer 1 complete
- Sufficient raw material to analyze

### Process
1. Read all input materials
2. Extract key quotes/statements
3. Identify patterns across inputs
4. Group related items (affinity mapping)
5. Note contradictions or tensions

### Artifacts
```
/2-decomposition/
├── quotes.md               # Key extracted statements
├── patterns.md             # Recurring themes
├── affinities.md           # Grouped related items
└── tensions.md             # Contradictions to resolve
```

### quotes.md Format
```markdown
# Extracted Quotes

## User Desires
> "I want it to work longer and write more code"
Source: brain-dump-001.md

> "Need clear visibility into the system"
Source: brain-dump-001.md

## Constraints
> "Should be simple and elegant"
Source: brain-dump-001.md

## Technical Notes
...
```

### Done Criteria
- [ ] All input materials processed
- [ ] Quotes extracted and categorized (minimum 10 quotes)
- [ ] Patterns identified (minimum 5 patterns)
- [ ] Affinities grouped
- [ ] Tensions noted

### Exit
Update `_status.md` → Layer 3

---

## Layer 3: Synthesis

### Purpose
Transform decomposed pieces into actionable understanding.

### Entry Criteria
- Layer 2 complete
- Patterns and affinities identified

### Process
1. Define Jobs to Be Done (what user is trying to accomplish)
2. Map customer/user journeys
3. Analyze current state (if existing system)
4. Make architecture decisions
5. Identify technical constraints

### Artifacts
```
/3-synthesis/
├── jtbd.md                 # Jobs to be done
├── journeys.md             # User journeys/flows
├── current-state.md        # Analysis of existing system
├── architecture.md         # Technical decisions
└── constraints.md          # Limitations and boundaries
```

### jtbd.md Format
```markdown
# Jobs to Be Done

## Primary Jobs

### Job 1: Get Ralph to work longer
**When:** User starts Ralph on a project
**I want to:** Have it continue working autonomously
**So that:** More gets done without babysitting

**Success criteria:**
- Works for hours, not minutes
- Produces substantial code
- Doesn't stop prematurely

### Job 2: ...
```

### Done Criteria
- [ ] JTBD defined (minimum 3 jobs)
- [ ] Key user journeys mapped (minimum 2 journeys)
- [ ] Current state analyzed (if applicable)
- [ ] Architecture approach decided
- [ ] Constraints documented

### Exit
Update `_status.md` → Layer 4

---

## Layer 4: Epic Definition

### Purpose
Define high-level epics that organize all work into major themes.

### Entry Criteria
- Layer 3 complete
- Clear understanding of what to build

### Process
1. Identify major epics (large bodies of work)
2. Order by dependency (what must come first)
3. Estimate relative size/complexity
4. Identify risks per epic

### Artifacts
```
/4-outline/
└── epics.md
```

### epics.md Format
```markdown
# Project Epics

## Overview
Brief description of what we're building.

## Epics

### Epic 1: [Name]
**Description:** What this epic accomplishes
**Dependencies:** None / Epic N
**Risk:** Low/Medium/High
**Estimated Features:** 3-5
**Notes:** Any special considerations

### Epic 2: [Name]
**Description:** ...
**Dependencies:** Epic 1
**Risk:** ...
**Estimated Features:** 4-6

### Epic 3: [Name]
...

## Dependency Graph
```
Epic 1 (Foundation)
    ↓
Epic 2 ──→ Epic 3 (parallel)
    ↓         ↓
    └────→ Epic 4
              ↓
           Epic 5 (Polish)
```

## Open Questions
- Any unresolved decisions to make during implementation
```

### ENFORCED MINIMUMS
- **Minimum 3 epics** (small projects)
- **Typical 5-8 epics** (medium projects)
- **Large projects may have 10+ epics**

### Done Criteria
- [ ] Minimum 3 epics defined
- [ ] Each epic has clear description and scope
- [ ] Dependencies mapped
- [ ] Order determined
- [ ] No critical open questions

### Exit
Update `_status.md` → Layer 5 (first epic)

---

## Layer 5: Feature Planning

### Purpose
Break each epic into features with detailed specifications.

### Entry Criteria
- Layer 4 complete (or previous epic passed review)
- Epic's dependencies satisfied

### Process
1. Create epic folder in `/5-epics/`
2. Create `_index.md` with feature list
3. Create spec file for each feature
4. Ensure specs are detailed enough to break into tasks

### Artifacts
```
/5-epics/epic-NN-name/
├── _index.md               # Feature list for this epic
├── _review.md              # (created later by GAN)
├── feature-01-name.md      # Feature spec
├── feature-02-name.md
├── feature-03-name.md
└── ...
```

### _index.md Format
```markdown
# Epic: [Name]

## Overview
What this epic accomplishes.

## Features

### Feature 1: [Name]
**Spec:** feature-01-name.md
**Status:** todo | in-progress | done | review-failed
**Description:** Brief description
**Estimated Tasks:** 3-5

### Feature 2: [Name]
**Spec:** feature-02-name.md
**Status:** todo
**Description:** ...
**Estimated Tasks:** 4-6

### Feature 3: [Name]
...

## Dependencies
- Requires: epic-01-xxx (complete)
- Blocks: epic-03-xxx

## Notes
Any epic-level considerations.
```

### feature-*.md Format
```markdown
# Feature: [Name]

## Overview
What this feature accomplishes.

## User Value
Why this matters to the user.

## Requirements
- Requirement 1
- Requirement 2
- Requirement 3
- Requirement 4
- Requirement 5

## Technical Approach
How to implement this at a high level.

## Acceptance Criteria
- [ ] Criterion 1
- [ ] Criterion 2
- [ ] Criterion 3

## Tasks (to be detailed in L6)
1. Task name - brief description
2. Task name - brief description
3. Task name - brief description
4. Task name - brief description

## Edge Cases
- Edge case 1: how to handle
- Edge case 2: how to handle
```

### ENFORCED MINIMUMS
- **Minimum 3 features per epic**
- **Typical 4-6 features per epic**
- **Each feature must list 3+ planned tasks**

### Done Criteria
- [ ] `_index.md` created with minimum 3 features
- [ ] Spec file created for each feature
- [ ] Each feature has 5+ requirements
- [ ] Each feature lists 3+ planned tasks
- [ ] Acceptance criteria defined for each

### Exit
Update `_status.md` → Layer 6 (first feature)

---

## Layer 6: Task Specification

### Purpose
Break each feature into detailed, implementable tasks.

### Entry Criteria
- Layer 5 complete for current epic
- Feature spec exists

### Process
1. Create task folder under the feature
2. Create `_tasks.md` with task list
3. Create detailed spec for each task
4. Each task should be completable in 15-30 minutes

### Artifacts
```
/5-epics/epic-NN-name/feature-NN-name/
├── _tasks.md               # Task list for this feature
├── task-01-name.md         # Task spec
├── task-02-name.md
├── task-03-name.md
└── ...
```

### _tasks.md Format
```markdown
# Feature: [Name] - Tasks

## Tasks

### Task 1: [Name]
**Spec:** task-01-name.md
**Status:** todo | in-progress | done
**Time Estimate:** ~20 min
**Subtasks:** 3

### Task 2: [Name]
**Spec:** task-02-name.md
**Status:** todo
**Time Estimate:** ~15 min
**Subtasks:** 2

### Task 3: [Name]
...

## Notes
Any task-level considerations.
```

### task-*.md Format
```markdown
# Task: [Name]

## Overview
What this task accomplishes (one specific thing).

## Subtasks
1. [ ] Subtask 1 - specific action
2. [ ] Subtask 2 - specific action
3. [ ] Subtask 3 - specific action

## Files to Create/Modify
- `path/to/file.ts` - description of changes
- `path/to/new-file.ts` - new file purpose

## Implementation Details
Specific code patterns, APIs to use, etc.

## Acceptance Criteria
- [ ] Criterion 1
- [ ] Criterion 2

## Test Plan
How to verify this task is complete.
```

### ENFORCED MINIMUMS
- **Minimum 3 tasks per feature**
- **Typical 4-6 tasks per feature**
- **Each task must have 2+ subtasks**
- **Each task should take 15-30 minutes**

### Done Criteria
- [ ] `_tasks.md` created with minimum 3 tasks
- [ ] Spec file created for each task
- [ ] Each task has 2+ subtasks listed
- [ ] Files to modify identified
- [ ] Acceptance criteria defined

### Exit
Update `_status.md` → Layer 7 (implementation)

---

## Layer 7: Implementation

### Purpose
Implement each task by completing its subtasks.

### Entry Criteria
- Layer 6 complete for current feature
- Task specs exist with subtasks defined

### Process
1. Read task spec
2. Complete each subtask in order
3. Verify acceptance criteria
4. Run tests
5. Commit code
6. Update task status
7. Move to next task or Layer 8

### Commit Format
```
[L7] Implement {task-name}

Epic: {epic-name}
Feature: {feature-name}
Task: {task-file}

Subtasks completed:
- [x] Subtask 1
- [x] Subtask 2
- [x] Subtask 3

Tests: passing/added
```

### Done Criteria (per task)
- [ ] All subtasks completed
- [ ] All acceptance criteria met
- [ ] Tests passing
- [ ] Code committed
- [ ] Task status updated

### Done Criteria (feature)
- [ ] All tasks in feature implemented
- [ ] All tests passing
- [ ] Feature acceptance criteria met

### Exit
Update `_status.md` → Layer 8 (feature review)

---

## Layer 8: Feature Review (GAN)

### Purpose
Adversarial review of completed feature.

### Entry Criteria
- Layer 7 complete for feature
- All tasks implemented

### Process
1. Switch to GAN reviewer persona
2. Review each task vs implementation
3. Test functionality via /chrome
4. Assess UX quality (not just "works")
5. Check edge cases
6. Write `_review.md`

### _review.md Format
```markdown
# Review: [Feature Name]

**Reviewer:** GAN Critic
**Date:** YYYY-MM-DD
**Iteration:** N of 3

## Verdict
**PASS** or **FAIL**

## Tasks Reviewed

### task-01-name.md
**Status:** PASS / FAIL
**Notes:** ...

### task-02-name.md
**Status:** PASS / FAIL
**Issues:**
- Issue description (MINOR/MAJOR)

## Overall Issues

### Issue 1: [Title]
**Severity:** MINOR | MAJOR
**Task:** task-xxx.md
**Description:** What's wrong
**Evidence:** What I observed
**Recommendation:** How to fix

## What Worked Well
- Good thing 1
- Good thing 2

## Recommendations
- Even if PASS, suggestions for improvement
```

### On PASS
- Update task statuses to "done"
- Update `_status.md` → Layer 6 (next feature) or Layer 9 (if all features in epic done)

### On FAIL
- Increment iteration counter
- If iteration < 3:
  - MINOR issues → return to Layer 7
  - MAJOR issues → return to Layer 6, update task specs
- If iteration >= 3:
  - Escalate to Layer 5 (re-plan feature)

---

## Layer 9: Integration Testing

### Purpose
Verify all features in an epic work together.

### Entry Criteria
- All features in current epic passed Layer 8 review

### Process
1. Define integration test scenarios
2. Run end-to-end tests
3. Test cross-feature interactions
4. Document results

### Artifacts
```
/6-integration/
├── epic-NN-test-plan.md
└── epic-NN-test-results.md
```

### Done Criteria
- [ ] Integration tests defined
- [ ] All tests executed
- [ ] Results documented
- [ ] All tests passing

### Exit
- If more epics remain: Update `_status.md` → Layer 5 (next epic)
- If all epics complete: Update `_status.md` → Layer 10

---

## Layer 10: Final Review (GAN)

### Purpose
Full system review for quality, UX, design.

### Entry Criteria
- All epics complete
- All integration tests passing

### Process
1. Full walkthrough of all features
2. Assess overall UX coherence
3. Check design consistency
4. Identify any remaining issues
5. Make final recommendation

### On PASS
- Update `_status.md` → Layer 11

### On FAIL
- Identify which epics/features need rework
- Return to Layer 5 for those epics
- (Severe issues may require Layer 3 or 4 rework)

---

## Layer 11: Analysis

### Purpose
Retrospective and learnings.

### Entry Criteria
- Layer 10 passed

### Process
1. Review what was built
2. Document what worked well
3. Document what didn't work
4. Extract learnings for future projects
5. Note methodology improvements

### Artifacts
```
/7-analysis/
└── retrospective.md
```

### retrospective.md Format
```markdown
# Project Retrospective

## Summary
Brief description of what was built.

## Metrics
- Epics: N
- Features: N
- Tasks: N
- Total Subtasks: N
- Iterations: N

## Timeline
- Started: DATE
- Completed: DATE

## What Worked Well
- Thing 1
- Thing 2

## What Didn't Work
- Thing 1
- Thing 2

## Learnings
- Learning 1
- Learning 2

## Methodology Notes
Suggestions for improving the V3 process itself.
```

### Done Criteria
- [ ] Retrospective complete
- [ ] Project marked complete in `_status.md`

### Exit
Project complete.

---

## Summary: Enforced Minimums

| Level | Minimum Count | Parent |
|-------|---------------|--------|
| Epics | 3+ | Project |
| Features | 3+ per epic | Epic |
| Tasks | 3+ per feature | Feature |
| Subtasks | 2+ per task | Task |

**Example for a small project:**
- 3 epics × 3 features × 3 tasks × 2 subtasks = **54 subtasks minimum**

**Example for a medium project:**
- 5 epics × 4 features × 4 tasks × 3 subtasks = **240 subtasks**

This enforced decomposition ensures thorough thinking before implementation.
