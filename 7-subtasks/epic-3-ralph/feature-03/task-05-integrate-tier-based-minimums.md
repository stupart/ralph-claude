# Subtasks: Integrate Tier-Based Minimum Adjustment

**Parent Feature:** Output Validation and Minimum Enforcement
**Parent Epic:** Ralph Orchestration

---

## Subtask 1: Create Tier Adjuster Module

**Action:** Create tier-adjuster.js that reads project tier setting and returns adjusted minimum requirements based on TIER_PRESETS from Epic 1 Feature 05.

**Files:**
- CREATE: `/Users/tylerstupart/ralph-claude/src/validation/tier-adjuster.js` - Tier-based minimum adjustment

**Code Pattern/API:** function getMinimums(tier) { return TIER_PRESETS[tier] || TIER_PRESETS.small; } // { epics: 3, features: 3, tasks: 3, subtasks: 2 }

**Verification:** Micro tier returns {1,2,2,1}; Small returns {3,3,3,2}; Large returns {5,5,5,3}

---

## Subtask 2: Connect Tier Adjuster to Count Validator

**Action:** Modify count-validator.js to use tier-adjusted minimums instead of hardcoded values, reading tier from project configuration.

**Files:**
- MODIFY: `/Users/tylerstupart/ralph-claude/src/validation/count-validator.js` - Use tier-adjusted minimums

**Code Pattern/API:** const mins = TierAdjuster.getMinimums(projectTier); return count >= mins.epics ? pass() : fail(...);

**Verification:** Micro tier requires only 1 epic; Small requires 3; Large requires 5; validation respects project tier

---

## Completion Checklist
- [ ] Subtask 1 complete
- [ ] Subtask 2 complete
- [ ] Task verification criteria met
