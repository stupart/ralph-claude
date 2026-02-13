# Subtasks: Define TIER_PRESETS Data Structure

**Parent Feature:** Hierarchy Calculator with Tier Presets
**Parent Epic:** Blueprint Integrity

---

## Subtask 1: Create TIER_PRESETS Constant

**Action:** Add TIER_PRESETS constant defining four tiers (Micro, Small, Medium, Large) with their minimum counts for epics, features, tasks, and subtasks matching architecture.md definitions.

**Files:**
- MODIFY: `/Users/tylerstupart/ralph-claude/v3-system-blueprint.html` - Add TIER_PRESETS constant

**Code Pattern/API:** const TIER_PRESETS = { micro: {epics:1, features:2, tasks:2, subtasks:1}, small: {epics:3, features:3, tasks:3, subtasks:2}, medium: {epics:4, features:4, tasks:4, subtasks:2}, large: {epics:5, features:5, tasks:5, subtasks:3} };

**Verification:** TIER_PRESETS.micro calculates to 4 subtasks; TIER_PRESETS.small to 54; TIER_PRESETS.medium to 128; TIER_PRESETS.large to 375

---

## Subtask 2: Add Tier Descriptions and Validation

**Action:** Extend TIER_PRESETS with description and use case for each tier, and add getTierTotal() helper function to calculate total subtasks.

**Files:**
- MODIFY: `/Users/tylerstupart/ralph-claude/v3-system-blueprint.html` - Add descriptions and helper function

**Code Pattern/API:** Each tier object gets description field; function getTierTotal(tier) { return tier.epics * tier.features * tier.tasks * tier.subtasks; }

**Verification:** Each tier has description; getTierTotal(TIER_PRESETS.small) returns 54

---

## Completion Checklist
- [ ] Subtask 1 complete
- [ ] Subtask 2 complete
- [ ] Task verification criteria met
