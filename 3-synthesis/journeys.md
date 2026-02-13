# User Journeys

Maps of how actors flow through the Layer Cake system, organized by phase.

---

## Journey 0: Project Initialization

**Scenario:** Setting up Layer Cake for different starting conditions.

### Three Initialization Paths

```
                      START
                        |
          +-------------+-------------+
          |             |             |
          v             v             v

    PATH A:           PATH B:          PATH C:
    FRESH PROJECT     RESUME PROJECT   ONBOARD EXISTING
    ===============   ==============   ================

+------------------+ +------------------+ +------------------+
|  New idea, no    | |  Returning to    | |  Existing code   |
|  existing code   | |  Layer Cake      | |  without Layer   |
|  or structure    | |  project         | |  Cake structure  |
+------------------+ +------------------+ +------------------+
        |                   |                   |
        v                   v                   v
+------------------+ +------------------+ +------------------+
|  Create folder   | |  Read _status.md | |  Create folder   |
|  structure:      | |  Parse current   | |  structure       |
|  1-input/ thru   | |  layer, chunk,   | |  alongside       |
|  12-retrospective| |  item, iteration | |  existing code   |
+------------------+ +------------------+ +------------------+
        |                   |                   |
        v                   v                   v
+------------------+ +------------------+ +------------------+
|  Initialize      | |  Validate folder | |  Capture existing|
|  _status.md:     | |  structure       | |  docs/specs in   |
|  layer: 1        | |  matches status  | |  1-input/ as     |
|  position: start | |  (reconcile if   | |  reference       |
+------------------+ |  mismatch)       | +------------------+
        |            +------------------+         |
        v                   |                     v
+------------------+        |            +------------------+
|  Init git repo   |        |            |  Create reverse- |
|  (if needed)     |        |            |  engineered      |
|  First commit    |        |            |  synthesis (L3): |
+------------------+        |            |  "what exists"   |
        |                   |            +------------------+
        v                   |                     |
+------------------+        |                     v
|  Human provides  |        |            +------------------+
|  brain dump in   |        |            |  Mark _status.md:|
|  1-input/        |        |            |  "onboarded"     |
+------------------+        |            |  context_type:   |
        |                   |            |  existing_codebase
        v                   v            +------------------+
        |                   |                     |
        +-------------------+---------------------+
                            |
                            v
                    CONTINUE TO L1+
                    (or resume at
                     indicated layer)
```

### State Markers for Initialization Type

```yaml
# _status.md for fresh project
project_type: fresh
current_layer: 1
tier: small

# _status.md for resumed project
project_type: resumed
current_layer: 5
current_chunk: "feature-03"
last_session_end: "2024-01-15T14:30:00Z"

# _status.md for onboarded project
project_type: onboarded
onboarded_from: "existing codebase with 15k LOC"
existing_synthesis: true
current_layer: 4
first_new_feature: "Add user authentication"
```

---

## Journey 1: Plan Only (L1-L7)

**Scenario:** Generate a complete plan without building anything. Useful for review, budgeting, or handing off to another team.

### Actors
- **Human**: Provides input, approves at gates
- **Planner**: L1-L7
- **Judge**: Plan reviews at L3-L7

### Flow

```
                           UNDERSTANDING PHASE
                           ==================
Step 1: Input (L1)
Actor: Human -> Planner
+------------------+     +------------------+
|  Human provides  | --> | Planner reads    |
|  brain dump      |     | 1-input/ files   |
+------------------+     +------------------+
Artifact: 1-input/*.md

                                |
                                v

Step 2: Decomposition (L2)
Actor: Planner
+------------------+     +------------------+
|  Extract quotes, | --> | Output to        |
|  patterns, etc   |     | 2-decomposition/ |
+------------------+     +------------------+
Artifact: quotes.md, patterns.md, affinities.md, tensions.md
Check: Minimum 10 quotes extracted

                                |
                                v

Step 3: Synthesis (L3)
Actor: Planner -> Judge -> Human
+------------------+     +------------------+     +------------------+
|  Create JTBD,    | --> | Judge reviews    | --> | Human approves   |
|  journeys, arch  |     | for completeness |     | at L3 gate       |
+------------------+     +------------------+     +------------------+
Artifact: jtbd.md, journeys.md, architecture.md, constraints.md
Check: Minimum 3 JTBD defined
Gate: HUMAN_APPROVAL (L3) - "Do I understand the problem correctly?"

                                |
                                v

                           PLANNING PHASE
                           ==============
Step 4: Epics (L4)
Actor: Planner -> Judge
+------------------+     +------------------+
|  Define 3+ epics | --> | Judge verifies   |
|  high-level      |     | minimums met     |
+------------------+     +------------------+
Artifact: 4-epics/epics.md
Check: Minimum 3 epics with dependencies

                                |
                                v

Step 5: Features (L5)
Actor: Planner -> Judge
+------------------+     +------------------+
|  Per epic, 3+    | --> | Judge reviews    |
|  feature specs   |     | completeness     |
+------------------+     +------------------+
Artifact: 5-features/feature-*.md (9+ files for small project)
Check: Minimum 3 features per epic, 5+ requirements each

                                |
                                v

Step 6: Tasks (L6)
Actor: Planner -> Judge
+------------------+     +------------------+
|  Per feature, 3+ | --> | Judge reviews    |
|  task specs      |     | completeness     |
+------------------+     +------------------+
Artifact: 6-tasks/task-*.md (27+ files for small project)
Check: Minimum 3 tasks per feature, files listed

                                |
                                v

Step 7: Subtasks (L7)
Actor: Planner -> Judge -> Human
+------------------+     +------------------+     +------------------+
|  Per task, 2+    | --> | Judge reviews    | --> | Human approves   |
|  subtask specs   |     | full plan        |     | before build     |
+------------------+     +------------------+     +------------------+
Artifact: 7-subtasks/subtask-*.md (54+ files for small project)
Check: Minimum 2 subtasks per task, atomic actions
Gate: HUMAN_APPROVAL (L7) - "Is this plan ready for implementation?"

                                |
                                v

                         PLAN COMPLETE
                         =============
                    _status.md updated:
                      layer: 7
                      position: approved
                      phase: plan_complete

              Human can now choose to:
              - Stop here (plan only)
              - Proceed to Execute (Journey 2)
              - Hand off plan to another team
```

### Decision Points
1. **L3 Gate**: Human confirms understanding is correct before detailed planning
2. **L7 Gate**: Human approves full plan (can stop here or proceed to build)

### Output Summary (Small Project Tier)
- 1 input bundle
- 4 decomposition files
- 4 synthesis files
- 1 epics file (3+ epics)
- 9+ feature specs
- 27+ task specs
- 54+ subtask specs

---

## Journey 2: Execute Only (L8-L12)

**Scenario:** Take an approved plan and build it. Can be run on a plan generated in a different session or by a different team.

### Prerequisites
- L1-L7 complete
- L7 human gate passed (APPROVE)
- _status.md shows layer: 7, position: approved OR layer: 8+

### Actors
- **Builder**: L8
- **Judge**: L9-L11
- **Planner**: L12 (retrospective only)

### Flow

```
                           BUILD PHASE
                           ===========
Step 1: Build (L8)
Actor: Builder
+------------------+     +------------------+
|  Read subtask    | --> | Implement code,  |
|  specs from L7   |     | write tests      |
+------------------+     +------------------+
                                |
                                v
+------------------+     +------------------+
|  Run tests for   | --> | Commit per task: |
|  each task       |     | "[L8] task-name" |
+------------------+     +------------------+
Artifact: Source code, tests, git commits
Check: Tests pass for each task

Repeat for each task in each feature in each epic:
  - Read task spec
  - Implement all subtasks
  - Run tests
  - Commit

                                |
                                v

                           REVIEW PHASE
                           ============
Step 2: Feature Review (L9)
Actor: Judge
+------------------+     +------------------+
|  Test feature    | --> | Verify acceptance|
|  via /chrome     |     | criteria met     |
+------------------+     +------------------+
Artifact: 9-reviews/feature-review-*.md
Check: Verdict = PASS

For each feature:
  - Load feature spec
  - Navigate to UI via /chrome
  - Test each acceptance criterion
  - Test edge cases
  - Render verdict: PASS or ITERATE

If ITERATE:
  - MINOR -> Return to L8 (fix code)
  - MAJOR -> Return to L7 (update subtasks)
  - 3x fails -> Escalate to L6

                                |
                                v

Step 3: Epic Review (L10)
Actor: Judge
+------------------+     +------------------+
|  Test feature    | --> | Ensure cohesion  |
|  integration     |     | across features  |
+------------------+     +------------------+
Artifact: 10-reviews/epic-review-*.md
Check: Verdict = PASS

For each epic:
  - Test cross-feature interactions
  - Verify data flows correctly
  - Check for conflicts/regressions

If ITERATE:
  - MINOR -> Return to L8
  - MAJOR -> Return to L6 (update tasks)
  - 3x fails -> Escalate to L5

                                |
                                v

Step 4: Final Review (L11)
Actor: Judge
+------------------+     +------------------+
|  Full system     | --> | Holistic quality |
|  walkthrough     |     | assessment       |
+------------------+     +------------------+
Artifact: 11-reviews/final-review.md
Check: Verdict = PASS

Full UX walkthrough:
  - Test every epic's main flows
  - Check design consistency
  - Verify performance acceptable
  - Test error states
  - Check accessibility basics
  - ASK: "Would I be proud to ship this?"

If ITERATE:
  - MINOR -> Return to L8
  - MAJOR -> Return to L5 (update features)
  - 3x fails -> Escalate to L4

                                |
                                v

                           CLOSURE PHASE
                           =============
Step 5: Retrospective (L12)
Actor: Planner
+------------------+     +------------------+
|  Document what   | --> | Update methodology|
|  worked/didn't   |     | for next time    |
+------------------+     +------------------+
Artifact: 12-retrospective/retrospective.md

                                |
                                v

                            SHIP IT!
                    _status.md updated:
                      layer: 12
                      position: complete
```

### State Tracking During Build
```yaml
# _status.md during L8
current_layer: 8
current_epic: "epic-01-auth"
current_feature: "feature-02-registration"
current_task: "task-03-validation"
tasks_completed: 7
tasks_total: 27
```

---

## Journey 3: Full Run (L1-L12)

**Scenario:** Complete project from brain dump to shipped code. Combines Journey 1 and Journey 2.

### Flow Summary

```
+------------------+
|  L1: Input       |  Understanding
|  L2: Decompose   |  Phase
|  L3: Synthesize  |  (L1-L3)
+------------------+
        |
        v
    [L3 GATE]
    Human: "Understanding correct?"
        |
        v
+------------------+
|  L4: Epics       |  Planning
|  L5: Features    |  Phase
|  L6: Tasks       |  (L4-L7)
|  L7: Subtasks    |
+------------------+
        |
        v
    [L7 GATE]
    Human: "Plan approved?"
        |
        v
+------------------+
|  L8: Build       |  Build
+------------------+  Phase
        |            (L8)
        v
+------------------+
|  L9: Feature Rev |  Review
|  L10: Epic Rev   |  Phase
|  L11: Final Rev  |  (L9-L11)
+------------------+
        |
        v
+------------------+
|  L12: Retro      |  Closure
+------------------+  Phase
        |            (L12)
        v
    COMPLETE
```

### Timeline Estimates by Tier

| Tier | Planning (L1-L7) | Building (L8) | Review (L9-L11) | Total |
|------|------------------|---------------|-----------------|-------|
| Micro | 30 min | 1 hour | 30 min | ~2 hours |
| Small | 2 hours | 4 hours | 2 hours | ~8 hours |
| Medium | 4 hours | 12 hours | 4 hours | ~20 hours |
| Large | 8 hours | 40+ hours | 8 hours | ~56+ hours |

---

## Journey 4: Iteration Path

**Scenario:** Judge requests iteration at a review layer. System cascades back, refines, and re-reviews.

**Philosophy:** An iteration request is not a failure - it's the system working as designed.

### Actors
- **Judge**: Identifies issues and severity
- **Builder**: Addresses MINOR issues (code fixes)
- **Planner**: Addresses MAJOR issues (spec updates)
- **Human**: Decides on ESCALATE situations

### Flow

```
                           ITERATION DETECTION
                           ===================
Step 1: Judge Reviews Work
+------------------+     +------------------+
|  Test via /chrome| --> | Find issues:     |
|  or verify spec  |     | - bugs           |
|                  |     | - missing reqs   |
|                  |     | - UX problems    |
+------------------+     +------------------+

                                |
                                v

Step 2: Classify Iteration Type
+------------------+
|  Is the problem  |
|  in the CODE or  |---> MINOR: Code fix only
|  in the SPEC?    |
|                  |---> MAJOR: Spec needs update
+------------------+

                                |
                    +-----------+-----------+
                    |                       |
                    v                       v

              MINOR PATH                MAJOR PATH
              ==========                ==========

Step 3a: Return to L8           Step 3b: Return to Spec Layer
+------------------+            +------------------+
|  Builder gets    |            |  Planner updates |
|  _review.md with |            |  L7/L6/L5 specs  |
|  specific issues |            |  per review      |
+------------------+            +------------------+
        |                               |
        v                               v
+------------------+            +------------------+
|  Fix code        |            |  Builder re-     |
|  Run tests       |            |  implements      |
+------------------+            +------------------+

                    |                       |
                    +-----------+-----------+
                                |
                                v

                           ITERATION TRACKING
                           ==================
Step 4: Increment Iteration Count
+------------------+
|  iteration++ in  |
|  _status.md      |
+------------------+

                                |
                    Is iteration > 3?
                    +-------+-------+
                    |               |
                    v               v
                   NO              YES

Step 5a: Re-submit          Step 5b: Escalate
+------------------+        +------------------+
|  Return to       |        |  Go back 2+      |
|  review layer    |        |  layers          |
+------------------+        |  Notify human    |
                            +------------------+

                    |               |
                    v               v

              (Loop back       HUMAN DECISION
              to Step 1)       ===============
                            +------------------+
                            |  Human reviews   |
                            |  full context    |
                            +------------------+
                                    |
                    +-------+-------+-------+
                    |               |       |
                    v               v       v
                Rethink        Continue  Abandon
                approach       anyway    feature
```

### Cascade Rules (Detailed)

| Review Layer | MINOR Routes To | MAJOR Routes To | ESCALATE Routes To |
|--------------|-----------------|-----------------|-------------------|
| L9 Feature   | L8 (fix code)   | L7 (update subtasks) | L6 (rethink tasks) |
| L10 Epic     | L8 (fix code)   | L6 (update tasks) | L5 (rethink features) |
| L11 Final    | L8 (fix code)   | L5 (update features) | L4 (rethink epics) |

### Graduated Rigor by Iteration

| Iteration | Rigor Level | Focus |
|-----------|-------------|-------|
| 1 | Comprehensive | All issues identified, full review |
| 2 | Focused | Blockers and significant issues only |
| 3 | Pragmatic | Must-haves only, accept "good enough" |
| 4+ | Human | Human decides path forward |

### Context Preservation Example

```yaml
# _status.md during iteration cycle
current_layer: 8
current_chunk: "feature-01"
current_item: "task-02"
iteration: 2
iteration_context:
  triggered_by: "L9 review"
  type: MINOR
  items_to_address:
    - "Button click handler missing null check"
    - "Error message not user-friendly"
  previous_iterations:
    - iteration: 1
      addressed: ["Initial implementation complete"]
      remaining: ["Null check", "Error messages"]
```

---

## Journey 5: Session Handoff

**Scenario:** Claude session ends mid-task. New session must pick up exactly where left off.

### Actors
- **Outgoing Agent**: Current session about to end
- **Incoming Agent**: New session starting
- **Filesystem**: Persistent state

### Flow

```
                           SESSION ENDING
                           ==============
Step 1: Detect Session End
+------------------+
|  Agent realizes  |
|  session ending  |
|  (timeout, error)|
+------------------+

                                |
                                v

Step 2: Checkpoint
+------------------+     +------------------+
|  Commit WIP with | --> | Update _status.md|
|  "[WIP] Layer X" |     | with precise pos |
+------------------+     +------------------+

                                |
                                v

Step 3: (Optional) Generate Handoff
+------------------+
|  Output handoff  |
|  prompt if       |
|  time permits    |
+------------------+

                           SESSION STARTING
                           ================
Step 4: Read State
+------------------+     +------------------+
|  New session     | --> | Parse current    |
|  reads _status.md|     | layer, phase,    |
|                  |     | chunk, item      |
+------------------+     +------------------+

                                |
                                v

Step 5: Validate State
+------------------+     +------------------+
|  Check folder    | --> | Reconcile if     |
|  structure       |     | mismatch found   |
+------------------+     +------------------+

                                |
               Folders match _status.md?
                +-------+-------+
                |               |
                v               v
               YES              NO

Step 6a: Continue         Step 6b: Reconcile
+------------------+      +------------------+
|  Load context    |      |  Update _status  |
|  for current     |      |  to match folders|
|  layer/phase     |      |  Log warning     |
+------------------+      +------------------+

                                |
                                v

Step 7: Resume Work
+------------------+
|  Execute next    |
|  action per      |
|  layer rules     |
+------------------+
```

### Context Loading by Phase

| Phase | Layers | Context Needed |
|-------|--------|---------------|
| Understanding | L1-L3 | Input files, decomposition/synthesis so far |
| Planning | L4-L7 | Synthesis, current level specs |
| Building | L8 | Current task spec, relevant code files |
| Reviewing | L9-L11 | Feature spec, implementation diff, test results |
| Closure | L12 | All review results, key artifacts |

### Handoff Prompt Template

```markdown
## Layer Cake Session Resume

**Project:** {project_name}
**Phase:** {Planning | Execution}
**Current Layer:** L{N} - {layer_name}
**Position:** {chunk}/{item}
**Iteration:** {N} of 3

### Completed
- L1-L{N-1} complete with passing reviews
- Current layer progress: {X}% complete

### In Progress
- Working on: {current_item}
- Last action: {description}

### Context Files
Read these files to resume:
- {list of relevant files}

Skip these (not needed for this layer):
- {files not needed}

### Next Action
{specific instruction for what to do next}
```

---

## Journey Summary

| Journey | Trigger | Layers | Happy Ending | Needs Attention |
|---------|---------|--------|--------------|-----------------|
| 0. Initialization | Starting work | Setup | Structure ready | N/A |
| 1. Plan Only | Plan without build | L1-L7 | Approved plan | Stuck at gate |
| 2. Execute Only | Approved plan exists | L8-L12 | Shipped code | Review failures |
| 3. Full Run | New project | L1-L12 | Complete retro | Any gate blocked |
| 4. Iteration | ITERATE verdict | Varies | Refinement works | 3x escalation |
| 5. Session Handoff | Session ends | Any | Seamless resume | State corruption |

---

## Phase Boundaries Summary

```
                    PLANNING PHASE              EXECUTION PHASE
                    ==============              ===============

                    L1: Input
                    L2: Decompose
                    L3: Synthesize
                        [L3 GATE]
                    L4: Epics
                    L5: Features
                    L6: Tasks
                    L7: Subtasks
                        [L7 GATE]
                                  \____________/
                                        |
                                   PHASE BREAK
                                   Can stop here
                                   Plan is complete
                                        |
                                  /_____________\
                                                 L8: Build
                                                 L9: Feature Review
                                                 L10: Epic Review
                                                 L11: Final Review
                                                     [SHIP GATE]
                                                 L12: Retrospective
```
