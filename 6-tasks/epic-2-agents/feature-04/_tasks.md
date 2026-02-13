# Tasks: Agent Handoff Protocol

## Task 1: Define Handoff Data Structure Schema

**What it accomplishes:** Creates a formal schema for handoff data including: current layer, iteration count, project context, recent artifacts, feedback history, and next agent type.

**Time estimate:** ~25 minutes

**Files to create/modify:**
- `/Users/tylerstupart/ralph-claude/schemas/handoff-schema.json` (create JSON Schema)
- `/Users/tylerstupart/ralph-claude/docs/handoff-schema.md` (create documentation)

**Dependencies:** None

**Verification:** Schema defines all required fields; schema is valid JSON Schema; documentation explains each field's purpose.

---

## Task 2: Map All Transition Points

**What it accomplishes:** Documents every agent-to-agent transition in the Layer Cake flow with specific handoff requirements for each: what data must be passed and what format.

**Time estimate:** ~20 minutes

**Files to create/modify:**
- `/Users/tylerstupart/ralph-claude/docs/transition-map.md` (create)

**Dependencies:** Task 1 (need schema as foundation)

**Verification:** All transitions documented: Planner->Judge, Judge->Planner, Planner->Builder, Builder->Judge, Judge->Builder; each specifies required handoff contents.

---

## Task 3: Implement Planner-Judge Handoff (Plan Review Cycle)

**What it accomplishes:** Creates serialization functions for Planner-to-Judge (spec + requirements + iteration count) and Judge-to-Planner (feedback + issues + severity) handoffs.

**Time estimate:** ~25 minutes

**Files to create/modify:**
- `/Users/tylerstupart/ralph-claude/src/handoff/planner-judge.js` (create)

**Dependencies:** Tasks 1-2 (need schema and transition map)

**Verification:** Functions exist for both directions; output matches schema; includes iteration count preservation.

---

## Task 4: Implement Planner-Builder Handoff (Start Build)

**What it accomplishes:** Creates serialization for Planner-to-Builder handoff: task specification, file paths to modify, and acceptance criteria in minimal focused format.

**Time estimate:** ~20 minutes

**Files to create/modify:**
- `/Users/tylerstupart/ralph-claude/src/handoff/planner-builder.js` (create)

**Dependencies:** Tasks 1-2 (need schema and transition map)

**Verification:** Function outputs task-focused context; includes only files mentioned in spec; excludes broader project context.

---

## Task 5: Implement Builder-Judge Handoff (Build Review Cycle)

**What it accomplishes:** Creates serialization for Builder-to-Judge (implementation diff + test results) and Judge-to-Builder (specific fixes needed) handoffs.

**Time estimate:** ~25 minutes

**Files to create/modify:**
- `/Users/tylerstupart/ralph-claude/src/handoff/builder-judge.js` (create)

**Dependencies:** Tasks 1-2 (need schema and transition map)

**Verification:** Builder-to-Judge includes diff and test output; Judge-to-Builder includes specific actionable fixes; both match schema.

---

## Task 6: Test Full Handoff Chain

**What it accomplishes:** Creates integration test procedure that simulates a complete layer progression, verifying handoffs preserve necessary context and no information is lost.

**Time estimate:** ~20 minutes

**Files to create/modify:**
- `/Users/tylerstupart/ralph-claude/tests/handoff-integration-test.md` (create)

**Dependencies:** Tasks 3-5 (all handoff implementations)

**Verification:** Test covers L4->L5 (within Planner), L7->L8 (Planner->Builder), L8->L9 (Builder->Judge), and iteration (Judge->Builder); context is preserved.
