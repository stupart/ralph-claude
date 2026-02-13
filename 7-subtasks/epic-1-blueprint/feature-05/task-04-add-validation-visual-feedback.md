# Subtasks: Add Validation Logic with Visual Feedback

**Parent Feature:** Hierarchy Calculator with Tier Presets
**Parent Epic:** Blueprint Integrity

---

## Subtask 1: Implement Tier Validation Function

**Action:** Create validateAgainstTier(values, tierName) function that checks if current input values meet or exceed the tier minimums, returning {valid, message}.

**Files:**
- MODIFY: `/Users/tylerstupart/ralph-claude/v3-system-blueprint.html` - Add validateAgainstTier() function

**Code Pattern/API:** function validateAgainstTier(values, tier) { const preset = TIER_PRESETS[tier]; if (values.epics < preset.epics) return {valid: false, message: `Epics below ${tier} minimum`}; ... }

**Verification:** Values below Small tier minimums return valid:false with specific message; values meeting minimums return valid:true

---

## Subtask 2: Add Visual Feedback CSS and Display

**Action:** Add CSS classes for valid/invalid states (green border vs red border with warning message) and update updateTotal() to call validation and apply appropriate styling.

**Files:**
- MODIFY: `/Users/tylerstupart/ralph-claude/v3-system-blueprint.html` - Add validation CSS and update updateTotal()

**Code Pattern/API:** .valid { border-color: #28a745; } .invalid { border-color: #dc3545; } .warning-message { color: #dc3545; }

**Verification:** Invalid inputs show red border; warning message appears below calculator specifying what's wrong; valid inputs show green

---

## Completion Checklist
- [ ] Subtask 1 complete
- [ ] Subtask 2 complete
- [ ] Task verification criteria met
