# Subtasks: Create Understand Phase Prompt Fragments (L1-L3)

**Parent Feature:** Planner Agent Prompt and Context Package
**Parent Epic:** Agent Specialization

---

## Subtask 1: Create L1 Intake and L2 Research Fragments

**Action:** Create prompt fragment files for L1 (Intake) specifying input parsing and project understanding, and L2 (Research) specifying codebase exploration and pattern identification.

**Files:**
- CREATE: `/Users/tylerstupart/ralph-claude/templates/agents/planner-L1.md` - L1 Intake layer instructions
- CREATE: `/Users/tylerstupart/ralph-claude/templates/agents/planner-L2.md` - L2 Research layer instructions

**Code Pattern/API:** Each fragment defines: layer name, specific action, expected outputs (1-intake/, 2-research/), completion criteria

**Verification:** Both fragments exist; L1 outputs match LAYER_CAKE.layers[0].outputs; L2 outputs match LAYER_CAKE.layers[1].outputs

---

## Subtask 2: Create L3 Synthesis Fragment

**Action:** Create prompt fragment for L3 (Synthesis) specifying how to combine intake and research into a coherent project understanding document, noting this is a human gate layer.

**Files:**
- CREATE: `/Users/tylerstupart/ralph-claude/templates/agents/planner-L3.md` - L3 Synthesis layer instructions with human gate note

**Code Pattern/API:** Fragment includes synthesis requirements; references both L1 and L2 outputs; notes human review required before proceeding

**Verification:** L3 fragment exists; includes synthesis instructions; mentions human gate; outputs 3-synthesis/ artifacts

---

## Completion Checklist
- [ ] Subtask 1 complete
- [ ] Subtask 2 complete
- [ ] Task verification criteria met
