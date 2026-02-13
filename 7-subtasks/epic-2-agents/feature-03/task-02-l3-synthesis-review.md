# Subtasks: Create L3 Synthesis Review Prompt

**Parent Feature:** Judge Agent Prompt and Context Package
**Parent Epic:** Agent Specialization

---

## Subtask 1: Create Prompt Structure with Brain Dump Loading

**Action:** Create the L3 Synthesis Review prompt with protocol for loading the original brain dump transcript alongside the synthesis artifacts for comparison.

**Files:**
- CREATE: `/Users/tylerstupart/ralph-claude/templates/agents/judge-L3-synthesis.md` - L3 Synthesis Review prompt

**Code Pattern/API:** ## Context Loading Protocol\n1. Read the original brain dump from `/3-input/`\n2. Read the synthesis from `/4-synthesis/`\n3. Compare for completeness

**Verification:** Prompt specifies exact paths to load; loading order is explicit; comparison criteria clear

---

## Subtask 2: Add Synthesis Completeness Checklist

**Action:** Add a checklist section verifying all patterns, tensions, quotes, and JTBD from the brain dump were captured in the synthesis.

**Files:**
- MODIFY: `/Users/tylerstupart/ralph-claude/templates/agents/judge-L3-synthesis.md` - Add completeness checklist

**Code Pattern/API:** ## Synthesis Completeness Checklist\n- [ ] All user quotes captured\n- [ ] All tensions identified\n- [ ] All patterns documented\n- [ ] All JTBD defined

**Verification:** Checklist covers all synthesis output types; gap identification criteria explicit; examples of what to flag included

---

## Completion Checklist
- [ ] Subtask 1 complete
- [ ] Subtask 2 complete
- [ ] Task verification criteria met
