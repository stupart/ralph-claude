# Subtasks: Create L5-L7 Planning Review Prompts

**Parent Feature:** Judge Agent Prompt and Context Package
**Parent Epic:** Agent Specialization

---

## Subtask 1: Create L5 Features Prompt with Scope Coverage

**Action:** Create the L5 Features Review prompt verifying that all epic requirements trace forward to features, with scope coverage protocol for gap detection.

**Files:**
- CREATE: `/Users/tylerstupart/ralph-claude/templates/agents/judge-L5-features.md` - L5 Features Review prompt

**Code Pattern/API:** ## Context Loading\n1. Read parent epic from `/5-epics/`\n2. Read features from `/6-tasks/{epic}/`\n3. Verify each epic requirement has feature coverage

**Verification:** Prompt loads epic and features; scope coverage protocol included; gap identification criteria explicit

---

## Subtask 2: Create L6 Tasks and L7 Subtasks Prompts

**Action:** Create the L6 Tasks and L7 Subtasks Review prompts ensuring tasks cover feature scope and subtasks are builder-ready with concrete actions.

**Files:**
- CREATE: `/Users/tylerstupart/ralph-claude/templates/agents/judge-L6-tasks.md` - L6 Tasks Review prompt
- CREATE: `/Users/tylerstupart/ralph-claude/templates/agents/judge-L7-subtasks.md` - L7 Subtasks Review prompt

**Code Pattern/API:** L6: Verify task-to-feature traceability\nL7: Check builder-readiness criteria:\n- Single concrete action\n- Files specified with CREATE/MODIFY\n- Verification criteria actionable

**Verification:** L6 has task coverage checks; L7 emphasizes builder-readiness; both include scope coverage protocol

---

## Subtask 3: Add Layer-Specific Quality Criteria

**Action:** Add quality criteria unique to each layer: L5 (feature coherence), L6 (task dependency order), L7 (subtask atomicity and file specificity).

**Files:**
- MODIFY: `/Users/tylerstupart/ralph-claude/templates/agents/judge-L5-features.md` - Add feature quality criteria
- MODIFY: `/Users/tylerstupart/ralph-claude/templates/agents/judge-L6-tasks.md` - Add task quality criteria
- MODIFY: `/Users/tylerstupart/ralph-claude/templates/agents/judge-L7-subtasks.md` - Add subtask quality criteria

**Code Pattern/API:** L5: Feature independence, clear boundaries\nL6: Dependency graph valid, no cycles\nL7: One action per subtask, explicit file paths

**Verification:** Each layer has distinct quality criteria; criteria are actionable for Judge; examples of violations included

---

## Completion Checklist
- [ ] Subtask 1 complete
- [ ] Subtask 2 complete
- [ ] Subtask 3 complete
- [ ] Task verification criteria met
