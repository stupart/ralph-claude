# Tasks: JSON Export/Import for Ralph

## Task 1: Design JSON Export Schema

**What it accomplishes:** Creates a formal JSON schema document defining the export format including version field, layer structure, actor structure, hierarchy, gates, and failCascade - with notes on which fields are excluded (functions).

**Time estimate:** ~20 minutes

**Files to create/modify:**
- `/Users/tylerstupart/ralph-claude/schemas/layer-cake-export.schema.json` (create)

**Dependencies:** None (but Feature 01 should be complete for accurate schema)

**Verification:** JSON schema file exists with definitions for all exportable LAYER_CAKE components; schema validates against JSON Schema spec.

---

## Task 2: Implement sanitizeForExport() Function

**What it accomplishes:** Creates a function that converts LAYER_CAKE to export-safe JSON by excluding JavaScript functions, converting them to descriptive strings, handling circular references, and adding schema version.

**Time estimate:** ~20 minutes

**Files to create/modify:**
- `/Users/tylerstupart/ralph-claude/v3-system-blueprint.html` (add sanitizeForExport function)

**Dependencies:** Task 1 (need schema to know export format)

**Verification:** sanitizeForExport() returns valid JSON with no functions; JSON.parse(JSON.stringify(result)) succeeds without errors.

---

## Task 3: Upgrade exportLayerCake() with Versioning

**What it accomplishes:** Enhances the existing exportLayerCake() function to use sanitizeForExport(), add schema version, generate timestamped filename (layer-cake-v{version}-{timestamp}.json), and trigger proper file download.

**Time estimate:** ~20 minutes

**Files to create/modify:**
- `/Users/tylerstupart/ralph-claude/v3-system-blueprint.html` (modify exportLayerCake function)

**Dependencies:** Task 2 (need sanitize function)

**Verification:** Clicking export button downloads a JSON file with versioned, timestamped filename; file contains valid JSON with all expected data.

---

## Task 4: Implement importLayerCake() with Validation

**What it accomplishes:** Creates file input UI and importLayerCake() function that validates uploaded JSON against the schema, handles version mismatches with warnings, and updates the visualization without corrupting state on failure.

**Time estimate:** ~25 minutes

**Files to create/modify:**
- `/Users/tylerstupart/ralph-claude/v3-system-blueprint.html` (add import UI and importLayerCake function)

**Dependencies:** Task 1 (need schema for validation)

**Verification:** Import button exists; valid JSON file imports successfully and updates visualization; invalid JSON shows clear error message without corrupting state.

---

## Task 5: Add Clipboard Copy and Toast Notifications

**What it accomplishes:** Adds a "Copy to Clipboard" button that copies the sanitized JSON, and implements toast notifications for successful export, successful import, copy success, and error states.

**Time estimate:** ~15 minutes

**Files to create/modify:**
- `/Users/tylerstupart/ralph-claude/v3-system-blueprint.html` (add clipboard button, toast component, and notification logic)

**Dependencies:** Tasks 2-4 (need export/import working first)

**Verification:** Copy button copies JSON to clipboard; toast appears on export, import, and copy actions; toast disappears after timeout.
