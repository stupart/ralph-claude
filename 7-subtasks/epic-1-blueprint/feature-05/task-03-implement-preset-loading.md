# Subtasks: Implement Preset Loading

**Parent Feature:** Hierarchy Calculator with Tier Presets
**Parent Epic:** Blueprint Integrity

---

## Subtask 1: Create loadPreset() Function

**Action:** Implement loadPreset(tierName) function that sets calculator input values from TIER_PRESETS, updates active button styling, and triggers total recalculation.

**Files:**
- MODIFY: `/Users/tylerstupart/ralph-claude/v3-system-blueprint.html` - Add loadPreset() function

**Code Pattern/API:** function loadPreset(tier) { const preset = TIER_PRESETS[tier]; document.getElementById('epics').value = preset.epics; ... updateTotal(); }

**Verification:** loadPreset('small') sets inputs to 3,3,3,2; loadPreset('large') sets inputs to 5,5,5,3

---

## Subtask 2: Connect Buttons to Preset Loading

**Action:** Add click event handlers to tier buttons that call loadPreset() with the appropriate tier name and update the active button state.

**Files:**
- MODIFY: `/Users/tylerstupart/ralph-claude/v3-system-blueprint.html` - Add click handlers and active state management

**Code Pattern/API:** document.querySelectorAll('.tier-selector button').forEach(btn => btn.onclick = () => { loadPreset(btn.dataset.tier); setActiveButton(btn); });

**Verification:** Clicking "Small" sets inputs and shows 54; clicking "Large" sets inputs and shows 375; active button styling updates

---

## Completion Checklist
- [ ] Subtask 1 complete
- [ ] Subtask 2 complete
- [ ] Task verification criteria met
