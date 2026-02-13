# Subtasks: Add Keyboard and Focus Management

**Parent Feature:** Layer Detail Modal Enhancement
**Parent Epic:** Blueprint Integrity

---

## Subtask 1: Implement Escape Key and Backdrop Click to Close

**Action:** Add event listeners for Escape key to close modal and click on backdrop (outside modal content) to close modal.

**Files:**
- MODIFY: `/Users/tylerstupart/ralph-claude/v3-system-blueprint.html` - Add keyboard and click event handlers

**Code Pattern/API:** document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && modalOpen) closeModal(); }); backdrop.onclick = closeModal;

**Verification:** Pressing Escape closes open modal; clicking backdrop closes modal; clicking modal content does not close

---

## Subtask 2: Implement Focus Trapping and Return

**Action:** Store triggering element reference on modal open, trap Tab key focus within modal elements, and return focus to triggering element on modal close.

**Files:**
- MODIFY: `/Users/tylerstupart/ralph-claude/v3-system-blueprint.html` - Add focus management logic

**Code Pattern/API:** let triggerElement; openModal() { triggerElement = document.activeElement; modal.focus(); } closeModal() { triggerElement.focus(); }

**Verification:** Tab cycles only through modal elements when open; focus returns to clicked cell after close; no focus escapes modal

---

## Completion Checklist
- [ ] Subtask 1 complete
- [ ] Subtask 2 complete
- [ ] Task verification criteria met
