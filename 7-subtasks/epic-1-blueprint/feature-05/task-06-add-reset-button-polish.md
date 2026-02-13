# Subtasks: Add Reset Button and Polish UI

**Parent Feature:** Hierarchy Calculator with Tier Presets
**Parent Epic:** Blueprint Integrity

---

## Subtask 1: Add Reset Button and Input Validation

**Action:** Add "Reset to Small" button that restores default Small tier values, and add input validation preventing 0 or negative values (enforce minimum of 1).

**Files:**
- MODIFY: `/Users/tylerstupart/ralph-claude/v3-system-blueprint.html` - Add reset button and input validation

**Code Pattern/API:** <button onclick="loadPreset('small')">Reset to Small</button>; inputs.min = 1; oninput: if (value < 1) value = 1;

**Verification:** Reset button restores Small tier values (3,3,3,2); entering 0 is corrected to 1; negative values rejected

---

## Subtask 2: Final UI Polish

**Action:** Review and polish overall calculator styling: consistent spacing, aligned inputs, proper font sizes, and responsive layout for different screen sizes.

**Files:**
- MODIFY: `/Users/tylerstupart/ralph-claude/v3-system-blueprint.html` - Polish calculator CSS

**Code Pattern/API:** Flexbox layout, consistent padding, media queries for responsive behavior

**Verification:** Calculator looks polished and consistent with blueprint design; layout works on different screen widths; all elements properly aligned

---

## Completion Checklist
- [ ] Subtask 1 complete
- [ ] Subtask 2 complete
- [ ] Task verification criteria met
