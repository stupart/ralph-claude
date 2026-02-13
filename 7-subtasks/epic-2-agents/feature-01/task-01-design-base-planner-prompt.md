# Subtasks: Design Base Planner System Prompt Template

**Parent Feature:** Planner Agent Prompt and Context Package
**Parent Epic:** Agent Specialization

---

## Subtask 1: Create Base Planner Template File

**Action:** Create the foundational Planner system prompt file establishing identity ("You are the PLANNER..."), cognitive mode (plan_mode), and core responsibilities with clear placeholder markers for layer-specific content.

**Files:**
- CREATE: `/Users/tylerstupart/ralph-claude/templates/agents/planner-base.md` - Base Planner system prompt template

**Code Pattern/API:** Markdown with {{LAYER_INSTRUCTIONS}} placeholder; identity section, constraints section, output format section

**Verification:** Template file exists; includes identity section; has {{LAYER_INSTRUCTIONS}} placeholder; defines plan_mode cognitive approach

---

## Subtask 2: Add Tool Permissions and Constraints

**Action:** Add explicit tool permissions section (Read, Write, Glob, Grep only - NO Bash, NO Edit) and constraints section forbidding improvisation and requiring spec compliance.

**Files:**
- MODIFY: `/Users/tylerstupart/ralph-claude/templates/agents/planner-base.md` - Add permissions and constraints sections

**Code Pattern/API:** ## Allowed Tools\n- Read\n- Write\n- Glob\n- Grep\n\n## Forbidden Tools\n- Bash\n- Edit

**Verification:** Tool permissions section is explicit; constraints forbid improvisation; template is complete and usable

---

## Completion Checklist
- [ ] Subtask 1 complete
- [ ] Subtask 2 complete
- [ ] Task verification criteria met
