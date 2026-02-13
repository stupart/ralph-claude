# Subtasks: Create Analysis Phase Prompt Fragment (L12)

**Parent Feature:** Planner Agent Prompt and Context Package
**Parent Epic:** Agent Specialization

---

## Subtask 1: Create L12 Retrospective Fragment

**Action:** Create prompt fragment for L12 (Retrospective) specifying how to write project analysis covering what was built, what worked, what didn't, and lessons learned.

**Files:**
- CREATE: `/Users/tylerstupart/ralph-claude/templates/agents/planner-L12.md` - L12 Retrospective layer instructions

**Code Pattern/API:** Sections for: project summary, successes, challenges, iteration count analysis, recommendations; output to 12-retrospective/

**Verification:** L12 fragment exists; covers success and iteration-heavy cases; outputs to 12-retrospective/

---

## Subtask 2: Add Iteration Analysis Guidance

**Action:** Enhance L12 fragment with specific guidance for analyzing iteration patterns: which layers had most iterations, why, and what could improve the process.

**Files:**
- MODIFY: `/Users/tylerstupart/ralph-claude/templates/agents/planner-L12.md` - Add iteration analysis section

**Code Pattern/API:** Include iteration count thresholds; guidance for high-iteration scenarios; metrics to capture

**Verification:** Fragment handles both smooth (few iterations) and rough (many iterations) project histories; provides actionable insights

---

## Completion Checklist
- [ ] Subtask 1 complete
- [ ] Subtask 2 complete
- [ ] Task verification criteria met
