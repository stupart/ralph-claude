# Subtasks: Redesign Modal Layout

**Parent Feature:** Layer Detail Modal Enhancement
**Parent Epic:** Blueprint Integrity

---

## Subtask 1: Restructure Modal HTML with Fixed Header

**Action:** Modify the modal HTML structure to have a fixed header div containing layer ID, name, and actor badge, and a scrollable body div for content sections.

**Files:**
- MODIFY: `/Users/tylerstupart/ralph-claude/v3-system-blueprint.html` - Update modal HTML template structure

**Code Pattern/API:** <div class="modal-header">{id} - {name} <span class="actor-badge">{actor}</span></div><div class="modal-body scrollable">{content}</div>

**Verification:** Modal has visually distinct header; header stays fixed when body content is scrolled; actor badge shows with correct color

---

## Subtask 2: Add CSS for Sticky Header and Scrollable Body

**Action:** Add CSS rules for modal layout: fixed header with border-bottom, scrollable body with max-height and overflow-y: auto, color-coded actor badge styling.

**Files:**
- MODIFY: `/Users/tylerstupart/ralph-claude/v3-system-blueprint.html` - Add modal layout CSS

**Code Pattern/API:** .modal-header { position: sticky; top: 0; } .modal-body { max-height: 70vh; overflow-y: auto; } .actor-badge { background-color: var(--actor-color); }

**Verification:** Long content causes only body to scroll; header remains visible; actor badge background matches LAYER_CAKE.actors[].color

---

## Completion Checklist
- [ ] Subtask 1 complete
- [ ] Subtask 2 complete
- [ ] Task verification criteria met
