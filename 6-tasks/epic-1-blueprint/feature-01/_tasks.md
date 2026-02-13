# Tasks: LAYER_CAKE Data Structure Audit

## Task 1: Create Validation Script

**What it accomplishes:** Creates a JavaScript validation script that programmatically checks every field in LAYER_CAKE for completeness, valid references, and consistency.

**Time estimate:** ~25 minutes

**Files to create/modify:**
- `/Users/tylerstupart/ralph-claude/scripts/validate-layer-cake.js` (create)

**Dependencies:** None

**Verification:** Script runs without errors, outputs a report listing any missing fields, invalid references, or inconsistencies.

---

## Task 2: Audit and Fix Layer Definitions L1-L6

**What it accomplishes:** Reviews and corrects all fields for layers L1-L6 in the LAYER_CAKE object, ensuring id, name, phase, actor, action, description, outputs, check, reviewType, humanGate, onPass, onFail, and prompt are complete and accurate.

**Time estimate:** ~30 minutes

**Files to create/modify:**
- `/Users/tylerstupart/ralph-claude/v3-system-blueprint.html` (modify LAYER_CAKE.layers for L1-L6)

**Dependencies:** Task 1 (validation script identifies what needs fixing)

**Verification:** Validation script reports no errors for L1-L6; LAYER_CAKE.getLayer("L1") through getLayer("L6") return complete data.

---

## Task 3: Audit and Fix Layer Definitions L7-L12

**What it accomplishes:** Reviews and corrects all fields for layers L7-L12 in the LAYER_CAKE object, including the complex onFail objects for L9-L11 with minor/major/escalate routing.

**Time estimate:** ~30 minutes

**Files to create/modify:**
- `/Users/tylerstupart/ralph-claude/v3-system-blueprint.html` (modify LAYER_CAKE.layers for L7-L12)

**Dependencies:** Task 1 (validation script identifies what needs fixing)

**Verification:** Validation script reports no errors for L7-L12; all conditional onFail objects have minor, major, and escalate keys.

---

## Task 4: Audit and Fix Actors, Hierarchy, Gates, and Cascade

**What it accomplishes:** Ensures all 6 actors have complete definitions (id, label, color, role), the hierarchy object has all 4 levels fully defined, gates lists all human and GAN review gates, and failCascade defines routing rules correctly.

**Time estimate:** ~20 minutes

**Files to create/modify:**
- `/Users/tylerstupart/ralph-claude/v3-system-blueprint.html` (modify LAYER_CAKE.actors, LAYER_CAKE.hierarchy, LAYER_CAKE.gates, LAYER_CAKE.failCascade)

**Dependencies:** Task 1 (validation script identifies what needs fixing)

**Verification:** LAYER_CAKE.getActor(id) returns valid data for all 6 actors; hierarchy has 4 levels with min counts and timeScale; validation passes.

---

## Task 5: Add JSDoc Documentation

**What it accomplishes:** Adds comprehensive JSDoc comments to the LAYER_CAKE structure documenting the expected shape of each object, required fields, and valid values.

**Time estimate:** ~15 minutes

**Files to create/modify:**
- `/Users/tylerstupart/ralph-claude/v3-system-blueprint.html` (add JSDoc comments above LAYER_CAKE declaration)

**Dependencies:** Tasks 2-4 (structure must be finalized before documenting)

**Verification:** JSDoc comments exist for LAYER_CAKE, each sub-object (layers, actors, hierarchy, gates, failCascade), and helper functions.
