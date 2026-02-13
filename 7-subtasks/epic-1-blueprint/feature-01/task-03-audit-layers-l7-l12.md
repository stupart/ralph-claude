# Subtasks: Audit and Fix Layer Definitions L7-L12

**Parent Feature:** LAYER_CAKE Data Structure Audit
**Parent Epic:** Blueprint Integrity

---

## Subtask 1: Fix L7-L8 (Subtask and Build) Layer Definitions

**Action:** Update LAYER_CAKE.layers for L7 (Subtask Specification) with humanGate=true and L8 (Implementation) with actor="builder", ensuring correct outputs (7-subtasks/, 8-code/) and routing.

**Files:**
- MODIFY: `/Users/tylerstupart/ralph-claude/v3-system-blueprint.html` - Update layers array entries for L7, L8 within LAYER_CAKE object

**Code Pattern/API:** L7.humanGate = true, L8.actor = "builder", onPass/onFail must be complete

**Verification:** L7.humanGate === true; L8.actor === "builder"; validation script reports no errors for L7-L8

---

## Subtask 2: Fix L9-L11 (Review Phase) with Complex onFail Objects

**Action:** Update LAYER_CAKE.layers for L9 (Task Review), L10 (Feature Review), L11 (Epic Review) with actor="judge", reviewType values, and complex onFail objects containing {minor, major, escalate} routing targets.

**Files:**
- MODIFY: `/Users/tylerstupart/ralph-claude/v3-system-blueprint.html` - Update layers array entries for L9, L10, L11 with proper onFail objects

**Code Pattern/API:** onFail: {minor: "L8", major: "L6", escalate: "L4"} pattern for L9, adjusted for L10 and L11

**Verification:** Each of L9, L10, L11 has onFail object with minor, major, escalate keys; targets are valid layer IDs

---

## Subtask 3: Fix L12 (Retrospective) Layer Definition

**Action:** Update LAYER_CAKE.layers for L12 (Retrospective) with phase="analyze", actor="planner", outputs (12-retrospective/), and terminal onPass (null or "complete").

**Files:**
- MODIFY: `/Users/tylerstupart/ralph-claude/v3-system-blueprint.html` - Update layers array entry for L12 within LAYER_CAKE object

**Code Pattern/API:** L12.phase = "analyze", L12.onPass = null (terminal), L12.onFail may loop or escalate

**Verification:** LAYER_CAKE.getLayer("L12") returns complete object; L12.onPass indicates completion; validation passes

---

## Completion Checklist
- [ ] Subtask 1 complete
- [ ] Subtask 2 complete
- [ ] Subtask 3 complete
- [ ] Task verification criteria met
