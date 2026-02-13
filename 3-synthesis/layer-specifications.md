# Layer Specifications

Complete specifications for all 12 layers of the Layer Cake methodology, including entry criteria, exit criteria, outputs, prompts, and routing logic.

This document captures the full detail from the `LAYER_CAKE` data structure in `v3-system-blueprint.html`.

---

## Layer Overview

| Layer | Name | Phase | Actor | Primary Action |
|-------|------|-------|-------|----------------|
| L1 | Input | Understand | Planner | Gather |
| L2 | Decompose | Understand | Planner | Decompose |
| L3 | Synthesize | Understand | Planner | Synthesize |
| L4 | Epics | Plan | Planner | Define Epics |
| L5 | Features | Plan | Planner | Plan Features |
| L6 | Tasks | Plan | Planner | Spec Tasks |
| L7 | Subtasks | Plan | Planner | Define Subtasks |
| L8 | Build | Build | Builder | Implement |
| L9 | Feature Review | Review | Judge | Feature Gate |
| L10 | Epic Review | Review | Judge | Epic Gate |
| L11 | Final Review | Review | Judge | Final Gate |
| L12 | Analysis | Learn | Planner | Retrospective |

---

## Understanding Phase (L1-L3)

### L1: Input

**Purpose:** Gather all raw materials for the project.

**Actor:** Planner

**Entry Criteria:**
- Project folder structure exists
- Human has provided initial brain dump or requirements
- _status.md initialized

**Actions:**
1. Read all files in 1-input/ directory
2. Identify gaps in requirements
3. Ask clarifying questions if critical information is missing
4. Summarize what was learned

**Outputs:**
- `1-input/brain-dump-*.md` - Raw requirements and ideas
- `1-input/research/*` - Any research or reference material
- `1-input/designs/*` - Mockups, wireframes, design docs

**Completion Check:**
- None (proceed when input captured)

**Review Type:** None

**Human Gate:** No

**Routing:**
- On Pass: L2
- On Fail: N/A (re-gather input)

**Prompt Template:**
```
You are gathering input for a new project.

READ all files in /1-input/ directory.
IDENTIFY gaps in the requirements.
ASK clarifying questions if critical information is missing.

OUTPUT: Summary of what you learned and any questions.
```

**Tools Available:** Read, Write, Glob, Grep

---

### L2: Decompose

**Purpose:** Break raw input into atomic pieces for analysis.

**Actor:** Planner

**Entry Criteria:**
- L1 complete
- Brain dump and input files exist
- _status.md shows layer: 2

**Actions:**
1. Read all files in 1-input/
2. Extract key quotes with source attribution (minimum 10)
3. Identify patterns across inputs (minimum 5)
4. Group related items into affinities
5. Note contradictions or tensions

**Outputs:**
- `2-decomposition/quotes.md` - Key quotes with sources
- `2-decomposition/patterns.md` - Identified patterns
- `2-decomposition/affinities.md` - Grouped related items
- `2-decomposition/tensions.md` - Contradictions found

**Completion Check:**
- Type: quotes
- Minimum: 10

**Review Type:** None

**Human Gate:** No

**Routing:**
- On Pass: L3
- On Fail: L2 (extract more quotes)

**Prompt Template:**
```
You are decomposing raw input into atomic pieces.

READ all files in /1-input/.
EXTRACT key quotes (minimum 10) with source attribution.
IDENTIFY patterns (minimum 5) across the inputs.
GROUP related items into affinities.
NOTE any contradictions or tensions.

OUTPUT files:
- 2-decomposition/quotes.md
- 2-decomposition/patterns.md
- 2-decomposition/affinities.md
- 2-decomposition/tensions.md
```

**Tools Available:** Read, Write, Glob, Grep

---

### L3: Synthesize

**Purpose:** Create actionable understanding from decomposed input.

**Actor:** Planner -> Judge -> Human

**Entry Criteria:**
- L2 complete
- Minimum 10 quotes extracted
- Patterns and affinities documented
- _status.md shows layer: 3

**Actions:**
1. Read all files in 2-decomposition/
2. Create Jobs to Be Done (minimum 3)
3. Map user journeys (minimum 2)
4. Decide on architecture approach
5. Document constraints

**Outputs:**
- `3-synthesis/jtbd.md` - Jobs to be done
- `3-synthesis/journeys.md` - User journey maps
- `3-synthesis/architecture.md` - Architecture decisions
- `3-synthesis/constraints.md` - Project constraints

**Completion Check:**
- Type: JTBD
- Minimum: 3

**Review Type:** Plan review (GAN checks for thoroughness)

**Human Gate:** YES - Human approval required before L4

**Routing:**
- On Pass: L4
- On Fail: L3 (expand synthesis)

**Prompt Template:**
```
You are synthesizing decomposed input into actionable understanding.

READ all files in /2-decomposition/.

CREATE Jobs to Be Done (minimum 3):
For each job, define:
- When: [situation]
- I want to: [motivation]
- So that: [outcome]
- Success criteria: [measurable]

MAP user journeys (minimum 2).
DECIDE on architecture approach.
DOCUMENT constraints.

OUTPUT files:
- 3-synthesis/jtbd.md
- 3-synthesis/journeys.md
- 3-synthesis/architecture.md
- 3-synthesis/constraints.md
```

**Tools Available:** Read, Write, Glob, Grep

---

## Planning Phase (L4-L7)

### L4: Epics

**Purpose:** Define high-level work packages for the project.

**Actor:** Planner -> Judge

**Entry Criteria:**
- L3 complete and approved
- Human gate passed
- Synthesis artifacts exist
- _status.md shows layer: 4

**Actions:**
1. Read 3-synthesis/ to understand what we're building
2. Define epics (minimum 3)
3. For each epic: name, description, dependencies, risk level
4. Estimate features per epic (3-5)
5. Create dependency graph showing epic order

**Outputs:**
- `4-epics/epics.md` - Epic definitions with dependencies

**Completion Check:**
- Type: epics
- Minimum: 3

**Review Type:** Plan review (GAN checks for completeness)

**Human Gate:** No

**Routing:**
- On Pass: L5
- On Fail: L4 (define more epics)

**Prompt Template:**
```
You are defining high-level epics for the project.

READ /3-synthesis/ to understand what we're building.

DEFINE epics (minimum 3):
For each epic:
- Name and description
- Dependencies (what must come first)
- Risk level (Low/Medium/High)
- Estimated features (3-5)

CREATE dependency graph showing epic order.

OUTPUT: 4-epics/epics.md
```

**Tools Available:** Read, Write, Glob, Grep

---

### L5: Features

**Purpose:** Define features within each epic.

**Actor:** Planner -> Judge

**Entry Criteria:**
- L4 complete
- Minimum 3 epics defined
- _status.md shows layer: 5

**Actions:**
1. Read 4-epics/epics.md and 3-synthesis/
2. For each epic, define features (minimum 3)
3. For each feature: overview, user value, requirements (5+), technical approach, acceptance criteria (3+), planned tasks (3+), edge cases

**Outputs:**
- `5-features/{epic}/_index.md` - Feature list for epic
- `5-features/{epic}/feature-*.md` - Individual feature specs

**Completion Check:**
- Type: features
- Minimum: 3 per epic

**Review Type:** Plan review

**Human Gate:** No

**Routing:**
- On Pass: L6
- On Fail: L5 (define more features)

**Prompt Template:**
```
You are planning features for epic: {epic_name}

READ /4-epics/epics.md and /3-synthesis/.

For this epic, DEFINE features (minimum 3):
For each feature:
- Overview: what it accomplishes
- User value: why it matters
- Requirements (minimum 5)
- Technical approach
- Acceptance criteria (minimum 3)
- Planned tasks (minimum 3)
- Edge cases

OUTPUT:
- 5-features/{epic}/_index.md (feature list)
- 5-features/{epic}/feature-*.md (one per feature)
```

**Tools Available:** Read, Write, Glob, Grep

---

### L6: Tasks

**Purpose:** Define tasks within each feature.

**Actor:** Planner -> Judge

**Entry Criteria:**
- L5 complete
- Minimum 3 features per epic
- _status.md shows layer: 6

**Actions:**
1. Read the feature spec
2. Define tasks (minimum 3)
3. For each task: what it accomplishes, time estimate (~15-30 min), files to create/modify, dependencies on other tasks

**Outputs:**
- `6-tasks/{epic}/{feature}/_tasks.md` - Task list

**Completion Check:**
- Type: tasks
- Minimum: 3 per feature

**Review Type:** Plan review

**Human Gate:** No

**Routing:**
- On Pass: L7
- On Fail: L6 (define more tasks)

**Prompt Template:**
```
You are specifying tasks for feature: {feature_name}

READ the feature spec at /5-features/{epic}/{feature}.md.

DEFINE tasks (minimum 3):
For each task:
- What it accomplishes (one specific thing)
- Time estimate (~15-30 min)
- Files to create/modify
- Dependencies on other tasks

Each task should be completable in one focused session.

OUTPUT: 6-tasks/{epic}/{feature}/_tasks.md
```

**Tools Available:** Read, Write, Glob, Grep

---

### L7: Subtasks

**Purpose:** Define atomic subtasks within each task.

**Actor:** Planner -> Judge -> Human

**Entry Criteria:**
- L6 complete
- Minimum 3 tasks per feature
- _status.md shows layer: 7

**Actions:**
1. Read the task list
2. Define subtasks (minimum 2)
3. For each subtask: specific action, files to create/modify with paths, code patterns or APIs to use, how to verify completion

**Outputs:**
- `7-subtasks/{epic}/{feature}/task-{n}-{name}.md` - Subtask specifications

**Completion Check:**
- Type: subtasks
- Minimum: 2 per task

**Review Type:** Plan review (final plan review)

**Human Gate:** YES - Human approval required before L8 (build)

**Routing:**
- On Pass: L8
- On Fail: L7 (define more subtasks)

**Prompt Template:**
```
You are defining subtasks for task: {task_name}

READ the task list at /6-tasks/{epic}/{feature}/_tasks.md.

For this task, DEFINE subtasks (minimum 2):
For each subtask:
- [ ] Specific action to take
- Files to create/modify with paths
- Code patterns or APIs to use
- How to verify it's complete

Subtasks should be atomic - one clear action each.

OUTPUT: 7-subtasks/{epic}/{feature}/task-{n}-{name}.md
```

**Tools Available:** Read, Write, Glob, Grep

---

## Build Phase (L8)

### L8: Build

**Purpose:** Implement the planned subtasks.

**Actor:** Builder

**Entry Criteria:**
- L7 complete and approved
- Human gate passed
- Full plan exists
- _status.md shows layer: 8

**Actions:**
1. Read the task spec
2. For each subtask: implement the code change, verify it works, run tests, check off the subtask
3. When all subtasks complete: run full test suite, commit

**Outputs:**
- Git commits (one per task)
- Source code
- Tests

**Completion Check:**
- Type: tests_pass

**Review Type:** None (but tests must pass)

**Human Gate:** No

**Routing:**
- On Pass: L9
- On Fail: L8 (fix failing tests)

**Prompt Template:**
```
You are implementing task: {task_name}

READ the task spec at /7-subtasks/{epic}/{feature}/{task}.md.

For each subtask:
1. Implement the code change
2. Verify it works
3. Run tests
4. Check off the subtask

When all subtasks complete:
- Run full test suite
- Commit with message: "[L8] {task_name}"

Do NOT proceed if tests fail. Fix first.
```

**Tools Available:** Read, Write, Edit, Bash, Glob, Grep

---

## Review Phase (L9-L11)

### L9: Feature Review

**Purpose:** Verify each feature meets its specification via UX testing.

**Actor:** Judge (GAN Critic)

**Entry Criteria:**
- L8 complete for this feature
- Tests passing
- _status.md shows layer: 9

**Actions:**
1. Use /chrome to test the feature
2. Navigate to relevant UI
3. Test each acceptance criterion from the spec
4. Test edge cases
5. Assess UX quality (not just "works")
6. For each issue: severity (MINOR/MAJOR), description, evidence, recommendation

**Outputs:**
- `9-reviews/{epic}/{feature}/_review.md` - Feature review

**Completion Check:**
- Type: verdict
- Value: PASS

**Review Type:** Build review

**Human Gate:** No

**Routing:**
- On Pass: L10
- On Fail (MINOR): L8 - fix code
- On Fail (MAJOR): L7 - update subtask specs
- On Fail (ESCALATE after 3x): L6 - rethink tasks

**Prompt Template:**
```
You are the GAN CRITIC reviewing feature: {feature_name}

Your job is to FIND PROBLEMS, not to approve.

USE /chrome to test the feature:
1. Navigate to the relevant UI
2. Test each acceptance criterion from the spec
3. Test edge cases
4. Assess UX quality (not just "works")

For each issue found:
- Severity: MINOR (code fix) or MAJOR (spec issue)
- Description: what's wrong
- Evidence: what you observed
- Recommendation: how to fix

VERDICT: PASS only if ALL criteria met AND UX is good.
Otherwise: FAIL with detailed issues.

OUTPUT: 9-reviews/{epic}/{feature}/_review.md
```

**Tools Available:** Read, Glob, Grep, /chrome (browser automation)

---

### L10: Epic Review

**Purpose:** Verify features integrate correctly within an epic.

**Actor:** Judge (GAN Critic)

**Entry Criteria:**
- All features in epic passed L9
- _status.md shows layer: 10

**Actions:**
1. Test cross-feature interactions
2. Verify data flows correctly between features
3. Check for conflicts or regressions
4. Use /chrome for end-to-end flow testing

**Outputs:**
- `10-reviews/{epic}/epic-review.md` - Epic integration review

**Completion Check:**
- Type: verdict
- Value: PASS

**Review Type:** Build review

**Human Gate:** No

**Routing:**
- On Pass: L11
- On Fail (MINOR): L8 - fix code
- On Fail (MAJOR): L6 - update task specs
- On Fail (ESCALATE after 3x): L5 - rethink features

**Prompt Template:**
```
You are the GAN CRITIC reviewing epic integration: {epic_name}

TEST cross-feature interactions:
1. Do features work together?
2. Is data flowing correctly between features?
3. Are there conflicts or regressions?

USE /chrome to test end-to-end flows.

VERDICT: PASS only if all features integrate correctly.

OUTPUT: 10-reviews/{epic}/epic-review.md
```

**Tools Available:** Read, Glob, Grep, /chrome (browser automation)

---

### L11: Final Review

**Purpose:** Full system review - is this ship-worthy?

**Actor:** Judge (GAN Critic)

**Entry Criteria:**
- All epics passed L10
- _status.md shows layer: 11

**Actions:**
1. Full UX walkthrough via /chrome
2. Test every epic's main flows
3. Check design consistency
4. Verify performance is acceptable
5. Test error states
6. Check accessibility basics
7. Ask: "Would I be proud to ship this?"

**Outputs:**
- `11-reviews/final-review.md` - Final review

**Completion Check:**
- Type: verdict
- Value: PASS

**Review Type:** Build review

**Human Gate:** No (but final gate before ship)

**Routing:**
- On Pass: L12
- On Fail (MINOR): L8 - fix code
- On Fail (MAJOR): L5 - update feature specs
- On Fail (ESCALATE after 3x): L4 - rethink epics

**Prompt Template:**
```
You are the GAN CRITIC doing FINAL REVIEW.

This is the last gate before shipping. Be thorough.

FULL WALKTHROUGH via /chrome:
1. Test every epic's main flows
2. Check design consistency
3. Verify performance is acceptable
4. Test error states
5. Check accessibility basics

ASK: Would I be proud to ship this?

VERDICT: PASS only if ship-worthy.

OUTPUT: 11-reviews/final-review.md
```

**Tools Available:** Read, Glob, Grep, /chrome (browser automation)

---

## Closure Phase (L12)

### L12: Analysis

**Purpose:** Document learnings and improve methodology.

**Actor:** Planner

**Entry Criteria:**
- L11 passed
- Project complete
- _status.md shows layer: 12

**Actions:**
1. Summarize what was built
2. Record metrics (epics, features, tasks, subtasks, iterations)
3. Document timeline
4. Reflect on what worked well
5. Reflect on what didn't work
6. Capture key learnings
7. Suggest improvements to Layer Cake methodology

**Outputs:**
- `12-retrospective/retrospective.md` - Project retrospective

**Completion Check:** None

**Review Type:** None

**Human Gate:** No

**Routing:**
- On Pass: COMPLETE
- On Fail: N/A

**Prompt Template:**
```
You are writing the project retrospective.

SUMMARIZE:
- What was built
- Metrics (epics, features, tasks, subtasks, iterations)
- Timeline

REFLECT:
- What worked well
- What didn't work
- Key learnings

IMPROVE:
- Suggestions for the Layer Cake methodology itself

OUTPUT: 12-retrospective/retrospective.md
```

**Tools Available:** Read, Write, Glob, Grep

---

## Cascade Rules Summary

### Fail Routing by Review Layer

| From Layer | MINOR | MAJOR | ESCALATE (3x fails) |
|------------|-------|-------|---------------------|
| L9 Feature Review | L8 | L7 | L6 |
| L10 Epic Review | L8 | L6 | L5 |
| L11 Final Review | L8 | L5 | L4 |

### Cascade Definitions

| Type | Definition | Action |
|------|-----------|--------|
| **MINOR** | Implementation issue, spec is correct | Return to L8, fix code |
| **MAJOR** | Spec has gaps or errors | Return to appropriate spec layer |
| **ESCALATE** | 3x failures at same layer | Go back 2+ layers, notify human |

### Maximum Retries
- 3 iterations per layer before escalation
- After escalation, iteration count resets at new layer

---

## Hierarchy Minimums by Tier

| Tier | Epics (L4) | Features/Epic (L5) | Tasks/Feature (L6) | Subtasks/Task (L7) | Total Subtasks |
|------|------------|-------------------|-------------------|-------------------|----------------|
| **Micro** | 1 | 2 | 2 | 1 | 4 |
| **Small** | 3 | 3 | 3 | 2 | 54 |
| **Medium** | 4 | 4 | 4 | 2 | 128 |
| **Large** | 5+ | 5+ | 5+ | 3 | 375+ |

**Calculation:** Total = Epics x Features x Tasks x Subtasks

---

## Gate Summary

### Human Approval Gates

| Gate | Layer | Purpose | Blocks Until |
|------|-------|---------|--------------|
| Understanding Gate | L3 | Confirm AI understood problem | Human APPROVE |
| Plan Gate | L7 | Approve plan before build | Human APPROVE |

### GAN Plan Review Gates

Layers: L3, L4, L5, L6, L7

Purpose: Verify thoroughness and completeness of plans

### GAN Build Review Gates

Layers: L9, L10, L11

Purpose: Verify implementation quality via /chrome testing

---

## Actor Capabilities Matrix

| Actor | Read | Write | Edit | Bash | /chrome | Glob | Grep |
|-------|------|-------|------|------|---------|------|------|
| **Planner** | Yes | Yes | No | No | No | Yes | Yes |
| **Builder** | Yes | Yes | Yes | Yes | No | Yes | Yes |
| **Judge** | Yes | No | No | Yes | Yes | Yes | Yes |

### Actor Responsibilities

**Planner (L1-L7, L12):**
- Understands requirements
- Creates nested plans
- Enforces minimum counts
- Writes specifications
- Documents retrospective

**Builder (L8):**
- Implements code from subtask specs
- Follows spec exactly, no improvisation
- Runs tests
- Commits at task boundaries

**Judge (Plan reviews, L9-L11):**
- GAN critic role
- Reviews plans for thoroughness
- Reviews builds for correctness
- Uses /chrome for UX testing
- Cannot modify code (only reports issues)
- Default: request iteration when issues found
