# Subtasks: Upgrade exportLayerCake() with Versioning

**Parent Feature:** JSON Export/Import for Ralph
**Parent Epic:** Blueprint Integrity

---

## Subtask 1: Update Export Function with Sanitization and Versioning

**Action:** Modify exportLayerCake() to call sanitizeForExport(), include schema version from a VERSION constant, and format the JSON with 2-space indentation.

**Files:**
- MODIFY: `/Users/tylerstupart/ralph-claude/v3-system-blueprint.html` - Update exportLayerCake() function

**Code Pattern/API:** const LAYER_CAKE_VERSION = "1.0.0"; const data = sanitizeForExport(); JSON.stringify(data, null, 2);

**Verification:** Exported JSON includes _meta.schemaVersion field; JSON is human-readable with indentation

---

## Subtask 2: Implement Timestamped Filename and Download

**Action:** Update exportLayerCake() to generate filename as layer-cake-v{version}-{YYYYMMDD-HHMMSS}.json and trigger browser download using Blob and URL.createObjectURL.

**Files:**
- MODIFY: `/Users/tylerstupart/ralph-claude/v3-system-blueprint.html` - Update filename generation and download trigger

**Code Pattern/API:** const filename = `layer-cake-v${version}-${new Date().toISOString().replace(/[:.]/g, '-')}.json`; const blob = new Blob([json], {type: 'application/json'});

**Verification:** Clicking export downloads file with versioned, timestamped filename; file contains valid JSON

---

## Completion Checklist
- [ ] Subtask 1 complete
- [ ] Subtask 2 complete
- [ ] Task verification criteria met
