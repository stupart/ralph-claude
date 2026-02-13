# Tasks: Hierarchy Calculator with Tier Presets

## Task 1: Define TIER_PRESETS Data Structure

**What it accomplishes:** Creates a TIER_PRESETS constant defining Micro, Small, Medium, and Large tier configurations with their minimum counts for epics, features, tasks, and subtasks, matching architecture.md definitions.

**Time estimate:** ~15 minutes

**Files to create/modify:**
- `/Users/tylerstupart/ralph-claude/v3-system-blueprint.html` (add TIER_PRESETS constant)

**Dependencies:** None

**Verification:** TIER_PRESETS exists with 4 tiers; Micro: {1,2,2,1}=4 subtasks; Small: {3,3,3,2}=54; Medium: {4,4,4,2}=128; Large: {5,5,5,3}=375.

---

## Task 2: Add Tier Preset Selector UI

**What it accomplishes:** Adds tier preset buttons (Micro, Small, Medium, Large) above the hierarchy calculator inputs, styled to match the existing blueprint design.

**Time estimate:** ~15 minutes

**Files to create/modify:**
- `/Users/tylerstupart/ralph-claude/v3-system-blueprint.html` (add preset buttons to hierarchy section HTML)

**Dependencies:** Task 1 (need tier data to display)

**Verification:** Four tier buttons visible in hierarchy section; buttons have appropriate styling; current tier is visually indicated.

---

## Task 3: Implement Preset Loading

**What it accomplishes:** Connects tier preset buttons to populate the calculator inputs with tier-appropriate values when clicked, updating the total calculation in real-time.

**Time estimate:** ~15 minutes

**Files to create/modify:**
- `/Users/tylerstupart/ralph-claude/v3-system-blueprint.html` (add loadPreset function and button handlers)

**Dependencies:** Task 2 (need buttons to attach handlers)

**Verification:** Clicking "Small" sets inputs to 3,3,3,2 and shows 54 subtasks; clicking "Large" sets 5,5,5,3 and shows 375 subtasks.

---

## Task 4: Add Validation Logic with Visual Feedback

**What it accomplishes:** Implements validation that checks current values against tier minimums, showing green when valid (meets or exceeds tier) and red when below minimums, with clear warning messages.

**Time estimate:** ~20 minutes

**Files to create/modify:**
- `/Users/tylerstupart/ralph-claude/v3-system-blueprint.html` (modify updateTotal function, add validation CSS)

**Dependencies:** Tasks 1-3 (need tiers and inputs working)

**Verification:** Values below Small tier minimums show red validation warning; values meeting minimums show green; warning message specifies what's wrong.

---

## Task 5: Calculate and Display Time Estimates

**What it accomplishes:** Uses LAYER_CAKE.hierarchy timeScale data to calculate and display an estimated project duration based on subtask count, with appropriate disclaimers about estimates.

**Time estimate:** ~15 minutes

**Files to create/modify:**
- `/Users/tylerstupart/ralph-claude/v3-system-blueprint.html` (add time estimate calculation and display)

**Dependencies:** Task 3 (need subtask count calculation)

**Verification:** Time estimate displays below subtask count; estimate updates as inputs change; estimate includes "approximate" disclaimer.

---

## Task 6: Add Reset Button and Polish UI

**What it accomplishes:** Adds a "Reset to Small" button that restores default tier values, enforces minimum of 1 for all inputs (preventing 0 or negative), and polishes overall calculator styling.

**Time estimate:** ~15 minutes

**Files to create/modify:**
- `/Users/tylerstupart/ralph-claude/v3-system-blueprint.html` (add reset button, input validation, final styling)

**Dependencies:** Tasks 2-5 (all calculator features must be working)

**Verification:** Reset button restores Small tier values; entering 0 is corrected to 1; negative values rejected; calculator looks polished and consistent.
