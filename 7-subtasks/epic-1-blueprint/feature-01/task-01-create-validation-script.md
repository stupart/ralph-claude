# Subtasks: Create Validation Script

**Parent Feature:** LAYER_CAKE Data Structure Audit
**Parent Epic:** Blueprint Integrity

---

## Subtask 1: Create Script File with Validation Framework

**Action:** Create the validation script file with the main structure including a validateLayerCake() function that iterates through all expected sections (layers, actors, hierarchy, gates, failCascade).

**Files:**
- CREATE: `/Users/tylerstupart/ralph-claude/scripts/validate-layer-cake.js` - Main validation script with validateLayerCake(), validateLayers(), validateActors(), validateHierarchy(), validateGates(), validateFailCascade() function stubs

**Code Pattern/API:** Node.js script using fs module to read v3-system-blueprint.html, regex to extract LAYER_CAKE object, validation functions returning {valid: boolean, errors: string[]}

**Verification:** Script file exists, runs with `node scripts/validate-layer-cake.js` without syntax errors, outputs "Validation framework ready"

---

## Subtask 2: Implement Layer Field Validation Logic

**Action:** Implement validateLayers() to check each layer (L1-L12) has all required fields: id, name, phase, actor, action, description, outputs, check, reviewType, humanGate, onPass, onFail, prompt.

**Files:**
- MODIFY: `/Users/tylerstupart/ralph-claude/scripts/validate-layer-cake.js` - Add complete validation logic for layer fields

**Code Pattern/API:** Array of required fields, forEach layer checking Object.hasOwnProperty(), collecting missing fields into errors array

**Verification:** Running script on current LAYER_CAKE reports specific missing or invalid fields with layer ID and field name

---

## Subtask 3: Implement Supporting Structure Validation

**Action:** Implement validation for actors (6 required with id, label, color, role), hierarchy (4 levels with minCount, timeScale), gates (array of layer IDs), and failCascade (maxRetries, routing rules).

**Files:**
- MODIFY: `/Users/tylerstupart/ralph-claude/scripts/validate-layer-cake.js` - Complete all validator functions

**Code Pattern/API:** Type checking with typeof, array length checks, nested object validation for failCascade routing

**Verification:** Script outputs comprehensive report listing all validation errors across all sections, or "All validations passed" if clean

---

## Completion Checklist
- [ ] Subtask 1 complete
- [ ] Subtask 2 complete
- [ ] Subtask 3 complete
- [ ] Task verification criteria met
