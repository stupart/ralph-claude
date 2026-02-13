# Tasks: Visual Rendering Fixes

## Task 1: Audit BLUEPRINT_CONFIG Against LAYER_CAKE

**What it accomplishes:** Creates a detailed comparison document identifying every mismatch between BLUEPRINT_CONFIG cell contents and the corresponding LAYER_CAKE data (actions, actors, phases, colors).

**Time estimate:** ~20 minutes

**Files to create/modify:**
- `/Users/tylerstupart/ralph-claude/docs/blueprint-audit-report.md` (create)

**Dependencies:** None (but benefits from Feature 01 being complete)

**Verification:** Audit report exists listing all discrepancies between BLUEPRINT_CONFIG and LAYER_CAKE with specific line references.

---

## Task 2: Update renderBlueprint() to Use LAYER_CAKE Data

**What it accomplishes:** Modifies the renderBlueprint() function to pull phase labels, actor colors, and activity names directly from LAYER_CAKE rather than hardcoded BLUEPRINT_CONFIG values where possible.

**Time estimate:** ~25 minutes

**Files to create/modify:**
- `/Users/tylerstupart/ralph-claude/v3-system-blueprint.html` (modify renderBlueprint function)

**Dependencies:** Task 1 (need audit to know what to change)

**Verification:** Phase labels display layer ID and name from LAYER_CAKE; actor colors match LAYER_CAKE.actors definitions.

---

## Task 3: Fix Cell Content and Highlighting Mismatches

**What it accomplishes:** Updates BLUEPRINT_CONFIG cell contents to match LAYER_CAKE layer.action values; ensures human gate cells at L3 and L7 have gate styling; ensures reviewer cells at plan review (L3-L7) and build review (L9-L11) layers are highlighted.

**Time estimate:** ~25 minutes

**Files to create/modify:**
- `/Users/tylerstupart/ralph-claude/v3-system-blueprint.html` (modify BLUEPRINT_CONFIG cells and CSS classes)

**Dependencies:** Task 2 (rendering changes must be in place)

**Verification:** Cell activities match LAYER_CAKE.layers[].action; L3 and L7 show gate styling; reviewer swimlane cells are highlighted at correct layers.

---

## Task 4: Update Cascade Section from LAYER_CAKE.failCascade

**What it accomplishes:** Modifies the cascade diagram section to render routing information dynamically from LAYER_CAKE.failCascade, showing accurate MINOR/MAJOR/ESCALATE routing rules.

**Time estimate:** ~20 minutes

**Files to create/modify:**
- `/Users/tylerstupart/ralph-claude/v3-system-blueprint.html` (modify cascade section rendering)

**Dependencies:** Feature 01 Task 4 (need accurate failCascade data)

**Verification:** Cascade diagram shows correct target layers for MINOR, MAJOR, and ESCALATE; values match LAYER_CAKE.failCascade.

---

## Task 5: Visual QA Pass

**What it accomplishes:** Performs a thorough visual review of all rendered elements, testing click interactions on every activity cell to verify correct layer modals open, and documenting any remaining visual issues.

**Time estimate:** ~15 minutes

**Files to create/modify:**
- `/Users/tylerstupart/ralph-claude/docs/visual-qa-checklist.md` (create with pass/fail for each element)

**Dependencies:** Tasks 2-4 (all rendering fixes must be complete)

**Verification:** QA checklist shows all items passing; clicking any activity cell opens the correct layer modal.
