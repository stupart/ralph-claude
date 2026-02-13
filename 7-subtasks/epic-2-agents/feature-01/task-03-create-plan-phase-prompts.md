# Subtasks: Create Plan Phase Prompt Fragments (L4-L7)

**Parent Feature:** Planner Agent Prompt and Context Package
**Parent Epic:** Agent Specialization

---

## Subtask 1: Create L4 and L5 Planning Fragments

**Action:** Create prompt fragments for L4 (Epic Planning) enforcing 3+ epics minimum, and L5 (Feature Planning) enforcing 3+ features per epic.

**Files:**
- CREATE: `/Users/tylerstupart/ralph-claude/templates/agents/planner-L4.md` - L4 Epic planning with minimum count
- CREATE: `/Users/tylerstupart/ralph-claude/templates/agents/planner-L5.md` - L5 Feature planning with minimum count

**Code Pattern/API:** MINIMUM: 3 epics/features; output format specification; folder structure (4-epics/, 5-features/)

**Verification:** L4 enforces minimum 3 epics; L5 enforces minimum 3 features per epic; outputs match LAYER_CAKE

---

## Subtask 2: Create L6 and L7 Planning Fragments

**Action:** Create prompt fragments for L6 (Task Planning) enforcing 3+ tasks per feature, and L7 (Subtask Specification) enforcing 2+ subtasks per task with human gate note.

**Files:**
- CREATE: `/Users/tylerstupart/ralph-claude/templates/agents/planner-L6.md` - L6 Task planning with minimum count
- CREATE: `/Users/tylerstupart/ralph-claude/templates/agents/planner-L7.md` - L7 Subtask specification with human gate

**Code Pattern/API:** MINIMUM: 3 tasks (L6), 2 subtasks (L7); L7 notes human review required; outputs 6-tasks/, 7-subtasks/

**Verification:** L6 enforces minimum 3 tasks; L7 enforces minimum 2 subtasks; L7 mentions human gate; all match LAYER_CAKE

---

## Completion Checklist
- [ ] Subtask 1 complete
- [ ] Subtask 2 complete
- [ ] Task verification criteria met
