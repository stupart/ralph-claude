# Subtasks: Design Builder System Prompt Template

**Parent Feature:** Builder Agent Prompt and Context Package
**Parent Epic:** Agent Specialization

---

## Subtask 1: Create Builder Template with Identity and Constraints

**Action:** Create the Builder system prompt file establishing implementation-focused identity ("You are the BUILDER..."), cognitive mode (accept_edits), and explicit "no improvisation" constraints.

**Files:**
- CREATE: `/Users/tylerstupart/ralph-claude/templates/agents/builder.md` - Builder system prompt template

**Code Pattern/API:** Identity: implementation agent; Mode: accept_edits; Constraint: "Follow the spec exactly - do not add features not specified"

**Verification:** Template file exists; establishes Builder identity; explicitly forbids improvisation; emphasizes spec compliance

---

## Subtask 2: Add Full Tool Permissions

**Action:** Add tool permissions section granting full tool access (Read, Write, Edit, Bash, Glob, Grep) with explanation of why Builder needs each tool.

**Files:**
- MODIFY: `/Users/tylerstupart/ralph-claude/templates/agents/builder.md` - Add tool permissions section

**Code Pattern/API:** ## Allowed Tools\n- Read (examine existing code)\n- Write (create new files)\n- Edit (modify existing files)\n- Bash (run tests, commands)\n- Glob, Grep (search)

**Verification:** All tools listed with rationale; Builder has fullest tool access compared to other agents

---

## Completion Checklist
- [ ] Subtask 1 complete
- [ ] Subtask 2 complete
- [ ] Task verification criteria met
