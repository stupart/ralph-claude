# Subtasks: Add Tier Preset Selector UI

**Parent Feature:** Hierarchy Calculator with Tier Presets
**Parent Epic:** Blueprint Integrity

---

## Subtask 1: Add Tier Preset Buttons HTML

**Action:** Add a button group above the hierarchy calculator inputs with four buttons (Micro, Small, Medium, Large), each with data-tier attribute.

**Files:**
- MODIFY: `/Users/tylerstupart/ralph-claude/v3-system-blueprint.html` - Add tier selector button group HTML

**Code Pattern/API:** <div class="tier-selector"><button data-tier="micro">Micro</button><button data-tier="small" class="active">Small</button>...</div>

**Verification:** Four tier buttons visible above calculator inputs; buttons are horizontally aligned; Small is selected by default

---

## Subtask 2: Style Tier Buttons

**Action:** Add CSS for tier selector buttons including active state styling, hover effects, and visual indication of current tier selection.

**Files:**
- MODIFY: `/Users/tylerstupart/ralph-claude/v3-system-blueprint.html` - Add tier button CSS

**Code Pattern/API:** .tier-selector button { padding: 8px 16px; } .tier-selector button.active { background: #007bff; color: white; }

**Verification:** Buttons have consistent styling with blueprint; active tier is visually distinct; hover state provides feedback

---

## Completion Checklist
- [ ] Subtask 1 complete
- [ ] Subtask 2 complete
- [ ] Task verification criteria met
