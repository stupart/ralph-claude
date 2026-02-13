# Subtasks: Polish and Test All 12 Layer Modals

**Parent Feature:** Layer Detail Modal Enhancement
**Parent Epic:** Blueprint Integrity

---

## Subtask 1: Test and Fix Modal Content for All Layers

**Action:** Open modal for each of L1-L12, verify all sections populate correctly, fix any issues with missing data, and ensure null fields display "N/A" gracefully.

**Files:**
- MODIFY: `/Users/tylerstupart/ralph-claude/v3-system-blueprint.html` - Fix any issues found during testing

**Code Pattern/API:** Add null checks: ${layer.field || 'N/A'}; test openLayerModal() for each layer ID

**Verification:** Each of L1-L12 opens without JavaScript errors; all sections populate; null/undefined fields show "N/A"

---

## Subtask 2: Add Human Gate Badge and Final Polish

**Action:** Add special "Human Gate" badge indicator on L3 and L7 modals, verify styling consistency across all modals, and fix any visual issues.

**Files:**
- MODIFY: `/Users/tylerstupart/ralph-claude/v3-system-blueprint.html` - Add gate badge and final styling fixes

**Code Pattern/API:** if (layer.humanGate) { header += '<span class="gate-badge">Human Gate</span>'; } .gate-badge { background: gold; }

**Verification:** L3 and L7 show Human Gate badge in header; all 12 modals have consistent styling; no console errors

---

## Completion Checklist
- [ ] Subtask 1 complete
- [ ] Subtask 2 complete
- [ ] Task verification criteria met
