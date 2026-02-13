# Subtasks: Implement Graduated Rigor Rules

**Parent Feature:** Judge Agent Prompt and Context Package
**Parent Epic:** Agent Specialization

---

## Subtask 1: Add Rigor Rules to Base Prompt

**Action:** Add graduated rigor section to the base Judge prompt specifying different review intensity based on iteration count.

**Files:**
- MODIFY: `/Users/tylerstupart/ralph-claude/templates/agents/judge-base.md` - Add graduated rigor section

**Code Pattern/API:** ## Graduated Rigor\n\n### Iteration 1 (First Review)\n- Comprehensive review of all criteria\n- Flag all issues found\n\n### Iteration 2 (Second Pass)\n- Focus on issues from previous review\n- Verify fixes are complete\n- May note new issues but prioritize original\n\n### Iteration 3+ (Convergence)\n- ONLY check original blocking issues\n- Ignore new minor issues\n- Goal is convergence, not perfection

**Verification:** Three rigor levels defined; iteration 3+ explicitly limits scope; convergence goal stated

---

## Subtask 2: Update All Layer Prompts to Reference Graduated Rigor

**Action:** Update each layer-specific Judge prompt to include a reference to the graduated rigor rules from the base prompt.

**Files:**
- MODIFY: `/Users/tylerstupart/ralph-claude/templates/agents/judge-L3-synthesis.md` - Add rigor reference
- MODIFY: `/Users/tylerstupart/ralph-claude/templates/agents/judge-L4-epics.md` - Add rigor reference
- MODIFY: `/Users/tylerstupart/ralph-claude/templates/agents/judge-L5-features.md` - Add rigor reference
- MODIFY: `/Users/tylerstupart/ralph-claude/templates/agents/judge-L6-tasks.md` - Add rigor reference
- MODIFY: `/Users/tylerstupart/ralph-claude/templates/agents/judge-L7-subtasks.md` - Add rigor reference
- MODIFY: `/Users/tylerstupart/ralph-claude/templates/agents/judge-L9-feature-review.md` - Add rigor reference
- MODIFY: `/Users/tylerstupart/ralph-claude/templates/agents/judge-L10-epic-review.md` - Add rigor reference
- MODIFY: `/Users/tylerstupart/ralph-claude/templates/agents/judge-L11-final-review.md` - Add rigor reference

**Code Pattern/API:** ## Review Context\n- **Iteration Number:** {{iteration}}\n- **Previous Issues:** {{previous_issues}}\n\nApply graduated rigor per base prompt guidelines.

**Verification:** All layer prompts reference graduated rigor; iteration context is injected; previous issues are available

---

## Completion Checklist
- [ ] Subtask 1 complete
- [ ] Subtask 2 complete
- [ ] Task verification criteria met
