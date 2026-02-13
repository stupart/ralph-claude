# Subtasks: Audit and Fix Layer Definitions L1-L6

**Parent Feature:** LAYER_CAKE Data Structure Audit
**Parent Epic:** Blueprint Integrity

---

## Subtask 1: Fix L1-L3 (Understand Phase) Layer Definitions

**Action:** Update LAYER_CAKE.layers for L1 (Intake), L2 (Research), L3 (Synthesis) ensuring all 13 fields are populated correctly with accurate phase="understand", correct actors, and complete onPass/onFail routing.

**Files:**
- MODIFY: `/Users/tylerstupart/ralph-claude/v3-system-blueprint.html` - Update layers array entries for L1, L2, L3 within LAYER_CAKE object

**Code Pattern/API:** Layer object structure: {id, name, phase, actor, action, description, outputs, check, reviewType, humanGate, onPass, onFail, prompt}

**Verification:** LAYER_CAKE.getLayer("L1"), getLayer("L2"), getLayer("L3") return objects with all 13 fields populated; L3.humanGate === true

---

## Subtask 2: Fix L4-L6 (Plan Phase) Layer Definitions

**Action:** Update LAYER_CAKE.layers for L4 (Epic Planning), L5 (Feature Planning), L6 (Task Planning) with phase="plan", correct hierarchy outputs (4-epics/, 5-features/, 6-tasks/), and accurate routing.

**Files:**
- MODIFY: `/Users/tylerstupart/ralph-claude/v3-system-blueprint.html` - Update layers array entries for L4, L5, L6 within LAYER_CAKE object

**Code Pattern/API:** outputs field should match folder naming convention, onPass points to next layer, onFail should reference cascade rules

**Verification:** Validation script reports no errors for L4-L6; outputs fields match expected folder patterns; routing is consistent

---

## Completion Checklist
- [ ] Subtask 1 complete
- [ ] Subtask 2 complete
- [ ] Task verification criteria met
