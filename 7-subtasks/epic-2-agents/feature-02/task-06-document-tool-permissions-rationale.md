# Subtasks: Document Tool Permission Rationale

**Parent Feature:** Builder Agent Prompt and Context Package
**Parent Epic:** Agent Specialization

---

## Subtask 1: Create Permissions Rationale Document

**Action:** Create documentation explaining why Builder has full tool access while other agents are restricted, detailing what each tool is used for in the Builder role.

**Files:**
- CREATE: `/Users/tylerstupart/ralph-claude/docs/builder-permissions-rationale.md` - Builder tool permissions rationale

**Code Pattern/API:** For each tool: what Builder uses it for, why it's necessary, what would break without it

**Verification:** Document explains each tool Builder needs; rationale is clear and justified

---

## Subtask 2: Add Comparison with Other Agents

**Action:** Add comparison table showing Builder vs Planner vs Judge permissions, explaining why Planner lacks Bash/Edit and Judge lacks Write/Edit.

**Files:**
- MODIFY: `/Users/tylerstupart/ralph-claude/docs/builder-permissions-rationale.md` - Add comparison table

**Code Pattern/API:** Table: | Tool | Planner | Builder | Judge | Reason |\n| Bash | No | Yes | Yes (read) | ...

**Verification:** Comparison shows all three agents; differences are explained; rationale supports permission enforcement feature

---

## Completion Checklist
- [ ] Subtask 1 complete
- [ ] Subtask 2 complete
- [ ] Task verification criteria met
