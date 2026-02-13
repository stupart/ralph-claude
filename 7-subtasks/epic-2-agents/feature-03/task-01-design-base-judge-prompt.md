# Subtasks: Design Base Judge System Prompt

**Parent Feature:** Judge Agent Prompt and Context Package
**Parent Epic:** Agent Specialization

---

## Subtask 1: Create Judge Template with Critic Identity

**Action:** Create the foundational Judge prompt establishing "GAN critic" identity with rigorous mindset, emphasizing finding issues over rubber-stamping approvals.

**Files:**
- CREATE: `/Users/tylerstupart/ralph-claude/templates/agents/judge-base.md` - Base Judge system prompt template

**Code Pattern/API:** Identity: "You are the JUDGE, the critical reviewer"; Mindset: "Your job is to find problems, not approve work"

**Verification:** Template establishes Judge identity; emphasizes critical review mindset; sets expectations for thoroughness

---

## Subtask 2: Add Read-Only Tool Permissions

**Action:** Add tool permissions section explicitly granting Read, Glob, Grep, Bash (for running tests), and /chrome (for UX review), while explicitly excluding Write and Edit.

**Files:**
- MODIFY: `/Users/tylerstupart/ralph-claude/templates/agents/judge-base.md` - Add tool permissions

**Code Pattern/API:** ## Allowed Tools\n- Read, Glob, Grep (examine code)\n- Bash (run tests ONLY)\n- /chrome (visual review)\n\n## Forbidden\n- Write, Edit (you review, not modify)

**Verification:** Tool permissions are explicit; Write and Edit are forbidden; rationale for each tool provided

---

## Completion Checklist
- [ ] Subtask 1 complete
- [ ] Subtask 2 complete
- [ ] Task verification criteria met
