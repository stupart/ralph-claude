# Jobs to Be Done

Actionable jobs derived from Layer Cake decomposition analysis, organized by phase.

---

## Planning-Phase Jobs (L1-L7)

These jobs generate the full decomposition and specifications. They can be run independently of execution ("just plan, don't build yet") and work for both NEW projects and EXISTING projects adding features.

---

### Job 1: Plan a New Project

**When:** I have a new product idea, feature request, or greenfield project

**I want to:** Generate a complete, approved plan from brain dump through subtask specifications

**So that:** I have a thorough, reviewable plan before writing any code

**Success Criteria:**
- Brain dump captured in 1-input/
- Decomposition complete (quotes, patterns, affinities, tensions)
- Synthesis artifacts created (JTBD, journeys, architecture, constraints)
- L3 human gate passed (understanding confirmed)
- Full hierarchy created: 3+ epics, 3+ features/epic, 3+ tasks/feature, 2+ subtasks/task
- L7 human gate passed (plan approved)
- All artifacts in numbered folders, _status.md at layer: 7, position: approved

**Triggers:**
- New product feature idea
- Greenfield project starting
- Decision to use Layer Cake for upcoming work
- Requirement for detailed planning before resource commitment

**Outputs:**
- 1-input/*.md (brain dumps, research, designs)
- 2-decomposition/ (quotes.md, patterns.md, affinities.md, tensions.md)
- 3-synthesis/ (jtbd.md, journeys.md, architecture.md, constraints.md)
- 4-epics/epics.md
- 5-features/feature-*.md (9+ files for small project)
- 6-tasks/task-*.md (27+ files for small project)
- 7-subtasks/subtask-*.md (54+ files for small project)

**Phase Boundary:** Stops at L7 approval. Does NOT proceed to L8 (Build).

---

### Job 2: Plan a Feature for Existing Project

**When:** I have an existing codebase (with or without Layer Cake) and want to add a new feature

**I want to:** Create a plan for the new feature that integrates with existing architecture

**So that:** I can add functionality methodically without disrupting what already works

**Success Criteria:**
- Existing codebase context captured or referenced in 1-input/
- If first time: Layer Cake folders created alongside existing project
- If first time: Reverse-engineered synthesis reflects current system state
- New feature decomposed through full hierarchy (L4-L7)
- Plan references existing code where integration needed
- L7 human gate passed (plan approved for this feature)

**Triggers:**
- Feature request for existing product
- Enhancement to current system
- Decision to adopt Layer Cake mid-project
- Technical debt initiative requiring planned approach

**Key Differences from New Project:**
- 1-input/ may reference existing docs rather than creating new brain dumps
- 3-synthesis/ may already exist or need updating for new feature context
- L4 Epics may be adding to existing epic structure or creating new epic
- Dependency analysis includes existing code, not just new specs

**Outputs:**
- Updated or new input files reflecting feature request
- Feature-specific specs in 5-features/, 6-tasks/, 7-subtasks/
- _status.md indicating: context_type: existing_codebase, feature: "{new feature name}"

**Phase Boundary:** Stops at L7 approval. Ready for execution phase.

---

### Job 3: Initialize Layer Cake Structure

**When:** Starting any Layer Cake project (fresh or onboarding existing code)

**I want to:** Set up the folder structure and tracking files correctly

**So that:** I have a solid foundation for methodical development

**Success Criteria:**
- All 12 layer folders created with correct naming (1-input/, 2-decomposition/, etc.)
- _status.md initialized with layer: 1, position: starting, project_type: {fresh|onboarded}
- Git repository initialized or verified (if applicable)
- Project tier identified or proposed (micro/small/medium/large)

**Triggers:**
- Beginning Job 1 (Plan New Project)
- Beginning Job 2 (Plan Feature for Existing Project)
- Decision to retrofit Layer Cake on existing codebase

**Folder Structure:**
```
project-root/
  1-input/
  2-decomposition/
  3-synthesis/
  4-epics/
  5-features/
  6-tasks/
  7-subtasks/
  8-build/          # (notes only - code lives in main project tree)
  9-reviews/
  10-reviews/
  11-reviews/
  12-retrospective/
  _status.md        # Current position tracker
```

---

## Execution-Phase Jobs (L8-L12)

These jobs take an approved plan and build it. They can be run on a plan generated earlier (even in a different session) and work for both NEW projects and EXISTING projects.

---

### Job 4: Execute an Approved Plan

**When:** I have an approved plan (L7 complete with human approval) and want to build it

**I want to:** Implement all subtasks, pass all review gates, and ship the code

**So that:** The planned features become working software

**Prerequisites:**
- L1-L7 complete
- L7 human gate passed (APPROVE verdict)
- _status.md shows layer: 7, position: approved or layer: 8+

**Success Criteria:**
- All subtasks implemented per specs
- Tests passing at each task boundary
- L9 Feature Reviews passing for each feature
- L10 Epic Reviews passing for each epic
- L11 Final Review passing (ship-worthy)
- L12 Retrospective documented
- _status.md shows layer: 12, position: complete

**Triggers:**
- Human approves plan at L7 gate
- Resuming execution after pause
- New session on approved plan

**Outputs:**
- Working code in project tree
- Git commits at task boundaries
- 9-reviews/feature-review-*.md
- 10-reviews/epic-review-*.md
- 11-reviews/final-review.md
- 12-retrospective/retrospective.md

**Key Phases:**
1. **Build (L8)**: Implement each subtask, commit per task
2. **Feature Review (L9)**: Judge tests each feature via /chrome
3. **Epic Review (L10)**: Judge tests feature integration
4. **Final Review (L11)**: Judge performs full UX walkthrough
5. **Retrospective (L12)**: Document learnings, improve methodology

---

### Job 5: Run Complete Project (L1-L12)

**When:** I want to execute the full Layer Cake methodology from idea to shipped code in one flow

**I want to:** Plan AND build a complete feature or project

**So that:** I get end-to-end quality without managing separate plan/execute phases

**Success Criteria:**
- All criteria from Job 1 (Plan New Project) met
- All criteria from Job 4 (Execute Approved Plan) met
- Single continuous flow with human gates at L3 and L7
- Final L12 retrospective complete

**Triggers:**
- New feature request with time to execute immediately
- Small projects where splitting plan/execute adds overhead
- Demonstrations of full Layer Cake capability

**This job combines:** Job 1 (or Job 2) + Job 4 in sequence.

---

## Session Management Jobs

These jobs handle the realities of interrupted work and context transitions.

---

### Job 6: Resume an Existing Layer Cake Project

**When:** I return to a project that already has Layer Cake structure

**I want to:** Quickly orient to current state and continue work seamlessly

**So that:** I can pick up exactly where I (or a previous session) left off

**Success Criteria:**
- _status.md read and understood in under 30 seconds
- Current layer, chunk, and item identified
- Phase identified: Planning (L1-L7) or Execution (L8-L12)
- Any pending iteration context loaded (issues to address)
- No duplicate work performed
- Next action is clear immediately

**Context Loading Per Phase:**
| Phase | Context Needed |
|-------|---------------|
| Planning (L1-L3) | Input files, decomposition/synthesis so far |
| Planning (L4-L7) | Synthesis, current level specs |
| Execution (L8) | Current task spec, relevant code files |
| Execution (L9-L11) | Feature spec, implementation diff, test results |
| Closure (L12) | All review results, key artifacts |

**Triggers:**
- Returning after time away
- New Claude session on existing project
- Switching back from another project

---

### Job 7: Resume After Session Crash or Context Loss

**When:** My Claude session ends unexpectedly mid-work

**I want to:** Quickly understand where I left off and continue without duplicating work

**So that:** Session boundaries don't cause lost progress or inconsistent state

**Success Criteria:**
- Session resume takes less than 1 minute of orientation
- _status.md accurately reflects current position
- Folder structure and _status.md are consistent (reconciliation if needed)
- No work is duplicated after resume
- Next action is clear immediately upon reading handoff context

**Reconciliation Rules:**
- Folder structure is authoritative for *what exists*
- _status.md is authoritative for *where we are*
- If mismatch: trust folders, update _status.md, log warning

**Triggers:**
- Claude session timeout
- API error or disconnection
- Human decides to stop and come back later

---

### Job 8: Handoff Context to a New Agent or Session

**When:** Transitioning from one agent role to another (Planner -> Builder -> Judge) or starting a new session

**I want to:** Provide exactly the context needed without overloading or under-informing

**So that:** The receiving agent can work effectively without asking clarifying questions

**Success Criteria:**
- Handoff prompt includes: layer, position, relevant artifacts, next action
- Context package is role-appropriate:
  - Planner: Synthesis, current layer specs
  - Builder: Task spec, relevant code files
  - Judge: Spec + implementation to review
- No duplication of full project history when not needed
- Receiving agent can start immediately without additional reads
- Token count stays within context limits

**Triggers:**
- Layer transition requiring different agent
- Session ending with work in progress
- Human returning to project after pause
- Iteration request requiring handoff back to earlier layer

---

## Review and Iteration Jobs

---

### Job 9: Address Review Iteration Requests

**When:** The Judge requests iteration at any review layer (L3, L7, L9, L10, or L11)

**I want to:** Understand what needs refinement, route to the correct layer for updates, and track iteration count

**So that:** Issues get addressed systematically without infinite loops or giving up prematurely

**Philosophy:** An iteration request is not a failure - it's the system working as designed, prompting deeper thinking and refinement.

**Success Criteria:**
- Iteration type (MINOR/MAJOR/ESCALATE) is clear within 30 seconds of review
- Correct cascade layer is identified per severity rules
- Iteration count is tracked (max 3 before escalation)
- After escalation, human is notified and involved
- Second pass addresses the specific issues identified

**Cascade Routing:**
| Iteration Type | Planning Phase Routes To | Execution Phase Routes To |
|----------------|--------------------------|---------------------------|
| MINOR | Same layer (fix and retry) | L8 (code fix only) |
| MAJOR | Previous hierarchy level | L7/L6 (spec update needed) |
| ESCALATE (3x) | L4 or earlier | L5 or earlier |

**Triggers:**
- Judge returns ITERATE verdict
- Build review identifies issues needing attention
- Plan review finds gaps or areas for improvement
- Tests reveal implementation issues

---

### Job 10: Judge Work as Adversarial Reviewer

**When:** A layer of work is complete and ready for review (plans at L3/L7, builds at L9-L11)

**I want to:** Evaluate the work with appropriate rigor, finding real issues without creating paralysis

**So that:** Quality gates catch real problems while allowing "good enough" work to proceed

**Success Criteria:**
- Review verdict is rendered (PASS/ITERATE) with clear reasoning
- All acceptance criteria are explicitly verified, not assumed
- For UI features, /chrome testing is performed
- Iteration number affects rigor level (graduated approach)
- _review.md is produced with structured output including cascade decision

**Graduated Rigor:**
- Iteration 1: Comprehensive - identify all issues
- Iteration 2: Focused - blockers and significant issues
- Iteration 3: Pragmatic - must-haves only
- After 3: Human decides next steps

**Triggers:**
- Planner marks layer complete
- Builder marks all subtasks complete
- Previous iteration request has been addressed

---

## Methodology Evolution Job

---

### Job 11: Improve the Layer Cake Methodology Itself

**When:** A project completes (L12 retrospective) or we notice friction during execution

**I want to:** Capture learnings and update the methodology documentation

**So that:** Future projects benefit from past experience and the system evolves

**Success Criteria:**
- Retrospective identifies at least 3 actionable improvements
- Tension resolutions are documented and tested
- Minimum counts and layer structure are calibrated based on real usage
- Agent prompt updates are captured and version-controlled
- Next project shows measurable improvement (fewer iteration cycles, faster completion)

**Triggers:**
- L12 retrospective phase
- Repeated iterations at the same layer
- Human feedback during gates
- Observed inefficiency in execution

---

## Summary Table

| Job | Phase | Primary Actor | Key Output | Gates |
|-----|-------|---------------|------------|-------|
| 1. Plan New Project | Planning | Planner | L7 subtask specs | L3, L7 |
| 2. Plan Feature for Existing | Planning | Planner | Feature specs integrated | L3, L7 |
| 3. Initialize Structure | Setup | Planner | Folder structure | None |
| 4. Execute Approved Plan | Execution | Builder + Judge | Working code | L9, L10, L11 |
| 5. Run Complete Project | Full | All | L12 retrospective | L3, L7, L11 |
| 6. Resume Existing Project | Any | Context-dependent | Continued progress | Per layer |
| 7. Resume After Crash | Any | Context-dependent | State recovery | Per layer |
| 8. Handoff Context | Transition | Outgoing agent | Handoff prompt | None |
| 9. Address Iteration | Any | Planner/Builder | Refined work | Per cascade |
| 10. Judge Work | Review | Judge | _review.md | N/A (is gate) |
| 11. Improve Methodology | Meta | Planner | retrospective.md | L12 |

---

## Job Flow Diagram

```
                    START
                      |
        +-------------+-------------+
        |                           |
        v                           v
   NEW PROJECT              EXISTING PROJECT
        |                           |
        v                           v
+---------------+           +---------------+
| Job 3: Init   |           | Job 3: Init   |
| Structure     |           | (if needed)   |
+---------------+           +---------------+
        |                           |
        v                           v
+---------------+           +---------------+
| Job 1: Plan   |           | Job 2: Plan   |
| New Project   |           | Feature       |
| (L1-L7)       |           | (L1-L7)       |
+---------------+           +---------------+
        |                           |
        +-----------+---------------+
                    |
                    v
            [L7 HUMAN GATE]
                    |
        +-----------+-----------+
        |                       |
        v                       v
   PLAN ONLY              EXECUTE NOW
   (stop here)                  |
                                v
                        +---------------+
                        | Job 4: Execute|
                        | Approved Plan |
                        | (L8-L12)      |
                        +---------------+
                                |
                                v
                           COMPLETE
```
