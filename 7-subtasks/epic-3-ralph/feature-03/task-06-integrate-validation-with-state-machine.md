# Subtasks: Integrate Validation with State Machine

**Parent Feature:** Output Validation and Minimum Enforcement
**Parent Epic:** Ralph Orchestration

---

## Subtask 1: Add Validation Check to State Transitions

**Action:** Modify StateManager.advance() to run validation before allowing layer transition, blocking if validation fails.

**Files:**
- MODIFY: `/Users/tylerstupart/ralph-claude/src/state/state-manager.js` - Add validation before advance

**Code Pattern/API:** advance() { const validation = validateLayer(this.currentLayer); if (!validation.passed) throw new ValidationError(validation.errors); ... }

**Verification:** Attempting advance() with incomplete work fails with validation error; errors reported clearly

---

## Subtask 2: Add Validation Success Path

**Action:** Add logic to proceed with state transition when validation passes, logging validation success and continuing to next layer.

**Files:**
- MODIFY: `/Users/tylerstupart/ralph-claude/src/state/state-manager.js` - Add validation success handling

**Code Pattern/API:** if (validation.passed) { log('Validation passed, advancing to next layer'); this.currentLayer = nextLayer; ... }

**Verification:** Validation pass allows advancement; success is logged; advance() succeeds after requirements met

---

## Completion Checklist
- [ ] Subtask 1 complete
- [ ] Subtask 2 complete
- [ ] Task verification criteria met
