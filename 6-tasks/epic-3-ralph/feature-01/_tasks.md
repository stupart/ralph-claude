# Tasks: Filesystem State Machine

## Task 1: Design _status.md Schema

**What it accomplishes:** Creates and documents the complete _status.md schema with all required fields: current_layer, current_item, iteration_count, phase, last_agent, timestamp, human_gate_status.

**Time estimate:** ~20 minutes

**Files to create/modify:**
- `/Users/tylerstupart/ralph-claude/schemas/status-schema.md` (create)
- `/Users/tylerstupart/ralph-claude/templates/status-template.md` (create example)

**Dependencies:** None

**Verification:** Schema documents all fields; example _status.md is valid; schema covers nested position tracking (epic/feature/task).

---

## Task 2: Implement StateManager Read and Write

**What it accomplishes:** Creates StateManager module with read() to parse _status.md and write() to update it atomically (temp file + rename pattern).

**Time estimate:** ~25 minutes

**Files to create/modify:**
- `/Users/tylerstupart/ralph-claude/src/state/state-manager.js` (create)

**Dependencies:** Task 1 (need schema to parse/write)

**Verification:** StateManager.read() returns current state object; StateManager.write() updates file atomically; corrupted file triggers error recovery.

---

## Task 3: Implement Layer Transition Functions

**What it accomplishes:** Creates advance(), iterate(), and cascade() functions that correctly update state for moving forward, staying in place with incremented count, or going back to earlier layers.

**Time estimate:** ~25 minutes

**Files to create/modify:**
- `/Users/tylerstupart/ralph-claude/src/state/state-manager.js` (extend with transition functions)

**Dependencies:** Task 2 (need base read/write)

**Verification:** advance() moves L4->L5; iterate() stays at L9 and increments count; cascade("L6") goes from L9 to L6; all update _status.md.

---

## Task 4: Implement Nested Hierarchy Position Tracking

**What it accomplishes:** Adds tracking for current position within nested hierarchy: which epic (of N), which feature (of M), which task (of P), enabling navigation through work items.

**Time estimate:** ~25 minutes

**Files to create/modify:**
- `/Users/tylerstupart/ralph-claude/src/state/state-manager.js` (extend with hierarchy position)

**Dependencies:** Task 2 (need base StateManager)

**Verification:** State tracks currentEpic, currentFeature, currentTask indices; advanceItem() moves to next item at current level; position validates against actual artifact counts.

---

## Task 5: Add Folder Creation on Layer Entry

**What it accomplishes:** Implements automatic creation of the appropriate folder (e.g., 4-epics/, 8-code/) when entering a new layer, following LAYER_CAKE.layers[].outputs patterns.

**Time estimate:** ~20 minutes

**Files to create/modify:**
- `/Users/tylerstupart/ralph-claude/src/state/folder-manager.js` (create)

**Dependencies:** Task 3 (need transition functions to trigger folder creation)

**Verification:** Entering L4 creates 4-epics/ folder; folder names match LAYER_CAKE output patterns; existing folders are not recreated.

---

## Task 6: Test State Machine with Simulated Progression

**What it accomplishes:** Creates test procedure simulating a full layer progression L1->L12, including iteration loops and cascades, verifying state consistency throughout.

**Time estimate:** ~20 minutes

**Files to create/modify:**
- `/Users/tylerstupart/ralph-claude/tests/state-machine-test.md` (create)

**Dependencies:** Tasks 2-5 (complete state machine)

**Verification:** Test covers forward progression; iteration at L9; cascade from L9 to L8; human gates at L3 and L7; final state matches expected.

---

## Task 7: Implement Project Mode Field

**What it accomplishes:** Adds explicit project_mode field to _status.md supporting three modes: plan_only (stop at L7 after human approval), full_run (complete L1-L12), execute_only (start at L8 with existing plans). This enables partial executions based on user intent.

**Time estimate:** ~25 minutes

**Files to create/modify:**
- `/Users/tylerstupart/ralph-claude/schemas/status-schema.md` (modify to add project_mode field)
- `/Users/tylerstupart/ralph-claude/src/state/state-manager.js` (modify to read/write project_mode)
- `/Users/tylerstupart/ralph-claude/src/state/mode-transitions.js` (create mode-specific transition rules)

**Dependencies:** Task 1 (status schema), Task 3 (transition functions)

**Verification:** project_mode field accepts plan_only, full_run, execute_only values; plan_only mode halts at L7 after approval; execute_only validates L7 artifacts exist before starting; mode is set during L1 intake.
