# Subtasks: Test State Machine with Simulated Progression

**Parent Feature:** Filesystem State Machine
**Parent Epic:** Ralph Orchestration

---

## Subtask 1: Create Progression Test Procedure

**Action:** Create test procedure document simulating a full layer progression L1->L12, including iteration loops at L9 and cascade scenarios.

**Files:**
- CREATE: `/Users/tylerstupart/ralph-claude/tests/state-machine-test.md` - State machine test procedure

**Code Pattern/API:** Test flow: L1->L2->L3 (gate)->L4->...->L8->L9 (iterate x2)->L10->L11->L12

**Verification:** Test covers forward progression; iteration at L9; cascade from L9 to L8; human gates at L3 and L7

---

## Subtask 2: Define Expected States and Verification Steps

**Action:** Document the expected state at each key point in the progression, enabling verification that state machine behaves correctly.

**Files:**
- MODIFY: `/Users/tylerstupart/ralph-claude/tests/state-machine-test.md` - Add expected states

**Code Pattern/API:** After L4: { current_layer: 'L4', iteration_count: 0, phase: 'plan', position: { epicIndex: 0, ... } }

**Verification:** Expected state documented for each test step; verification checks are specific; final state matches expected

---

## Completion Checklist
- [ ] Subtask 1 complete
- [ ] Subtask 2 complete
- [ ] Task verification criteria met
