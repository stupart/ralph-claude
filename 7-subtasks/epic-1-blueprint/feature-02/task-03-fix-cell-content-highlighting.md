# Subtasks: Fix Cell Content and Highlighting Mismatches

**Parent Feature:** Visual Rendering Fixes
**Parent Epic:** Blueprint Integrity

---

## Subtask 1: Update Cell Contents to Match LAYER_CAKE Actions

**Action:** Update BLUEPRINT_CONFIG cell content strings to exactly match LAYER_CAKE.layers[].action values, or modify rendering to pull directly from LAYER_CAKE.

**Files:**
- MODIFY: `/Users/tylerstupart/ralph-claude/v3-system-blueprint.html` - Update BLUEPRINT_CONFIG cell values or renderBlueprint() cell generation

**Code Pattern/API:** Either BLUEPRINT_CONFIG.cells[row][col] = LAYER_CAKE.getLayer(layerId).action, or dynamic lookup

**Verification:** Every activity cell displays text matching its corresponding LAYER_CAKE.layers[].action

---

## Subtask 2: Add Gate and Reviewer Cell Styling

**Action:** Add CSS class assignments for human gate cells (L3, L7) with gate-cell styling and reviewer swimlane cells at L9-L11 with reviewer-active styling.

**Files:**
- MODIFY: `/Users/tylerstupart/ralph-claude/v3-system-blueprint.html` - Add CSS classes and update cell class assignment logic

**Code Pattern/API:** if (LAYER_CAKE.gates.human.includes(layerId)) addClass('gate-cell'); CSS: .gate-cell { border: 2px solid gold; }

**Verification:** L3 and L7 cells have visible gate styling; reviewer cells at L9-L11 are highlighted distinctly

---

## Completion Checklist
- [ ] Subtask 1 complete
- [ ] Subtask 2 complete
- [ ] Task verification criteria met
