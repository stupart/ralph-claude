# Subtasks: Add Iteration Response Handling

**Parent Feature:** Builder Agent Prompt and Context Package
**Parent Epic:** Agent Specialization

---

## Subtask 1: Add Judge Feedback Handling Section

**Action:** Add section to Builder prompt explaining how to receive and interpret Judge feedback, including understanding severity levels (MINOR/MAJOR/ESCALATE).

**Files:**
- MODIFY: `/Users/tylerstupart/ralph-claude/templates/agents/builder.md` - Add iteration handling section

**Code Pattern/API:** ## Receiving Judge Feedback\n- MINOR: Targeted fixes needed\n- Read each issue carefully\n- Focus on the specific problems identified

**Verification:** Feedback handling section exists; explains severity levels; sets expectations for iteration

---

## Subtask 2: Add Targeted Fix Instructions

**Action:** Add instructions for how to apply fixes: make targeted changes to address specific issues rather than re-implementing from scratch; preserve working code.

**Files:**
- MODIFY: `/Users/tylerstupart/ralph-claude/templates/agents/builder.md` - Add targeted fix instructions

**Code Pattern/API:** ## Applying Fixes\n- Address ONLY the issues raised\n- Do NOT rewrite working code\n- Make minimal changes to resolve each issue

**Verification:** Instructions prevent complete rewrites; emphasize targeted fixes; preserve working functionality

---

## Completion Checklist
- [ ] Subtask 1 complete
- [ ] Subtask 2 complete
- [ ] Task verification criteria met
