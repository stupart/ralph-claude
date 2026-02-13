# Subtasks: Map All Transition Points

**Parent Feature:** Agent Handoff Protocol
**Parent Epic:** Agent Specialization

---

## Subtask 1: Document Forward Flow Transitions

**Action:** Create transition map document covering all forward-flow transitions: Planner->Judge (plan review), Planner->Builder (start build), Builder->Judge (build review).

**Files:**
- CREATE: `/Users/tylerstupart/ralph-claude/docs/transition-map.md` - Transition map documentation

**Code Pattern/API:** Table: | From | To | Trigger | Required Data | Format |

**Verification:** All forward transitions documented; each specifies trigger condition and required handoff data

---

## Subtask 2: Document Iteration Flow Transitions

**Action:** Add iteration flow transitions: Judge->Planner (plan iteration), Judge->Builder (build iteration), and cascade transitions (major/escalate routing).

**Files:**
- MODIFY: `/Users/tylerstupart/ralph-claude/docs/transition-map.md` - Add iteration transitions

**Code Pattern/API:** Iteration transitions include: previous feedback, iteration count, specific issues to address

**Verification:** Iteration transitions documented; cascade routing specified; handoff contents for each defined

---

## Completion Checklist
- [ ] Subtask 1 complete
- [ ] Subtask 2 complete
- [ ] Task verification criteria met
