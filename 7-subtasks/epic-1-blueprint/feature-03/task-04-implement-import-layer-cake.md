# Subtasks: Implement importLayerCake() with Validation

**Parent Feature:** JSON Export/Import for Ralph
**Parent Epic:** Blueprint Integrity

---

## Subtask 1: Add File Input UI Element

**Action:** Add a file input element with "Import" button to the blueprint interface, styled consistently with the existing export button.

**Files:**
- MODIFY: `/Users/tylerstupart/ralph-claude/v3-system-blueprint.html` - Add file input HTML and CSS

**Code Pattern/API:** <input type="file" id="import-file" accept=".json" /><button onclick="importLayerCake()">Import</button>

**Verification:** Import button visible next to export button; file picker opens on click; accepts only .json files

---

## Subtask 2: Implement Import Function with Validation

**Action:** Create importLayerCake() function that reads selected file, validates JSON structure against expected schema, handles version mismatches with warnings, and updates visualization on success without corrupting state on failure.

**Files:**
- MODIFY: `/Users/tylerstupart/ralph-claude/v3-system-blueprint.html` - Add importLayerCake() function

**Code Pattern/API:** FileReader.readAsText(), JSON.parse() in try/catch, validate required fields exist, merge into LAYER_CAKE, re-render

**Verification:** Valid JSON imports successfully; invalid JSON shows clear error; version mismatch shows warning but allows import; failed import leaves state unchanged

---

## Completion Checklist
- [ ] Subtask 1 complete
- [ ] Subtask 2 complete
- [ ] Task verification criteria met
