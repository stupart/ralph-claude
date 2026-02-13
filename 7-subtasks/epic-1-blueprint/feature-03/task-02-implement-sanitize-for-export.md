# Subtasks: Implement sanitizeForExport() Function

**Parent Feature:** JSON Export/Import for Ralph
**Parent Epic:** Blueprint Integrity

---

## Subtask 1: Create Function to Remove Functions and Add Metadata

**Action:** Implement sanitizeForExport() function that deep-clones LAYER_CAKE, removes all function properties (typeof === 'function'), and adds schemaVersion and exportTimestamp fields.

**Files:**
- MODIFY: `/Users/tylerstupart/ralph-claude/v3-system-blueprint.html` - Add sanitizeForExport() function

**Code Pattern/API:** JSON.parse(JSON.stringify()) for deep clone; recursive filter for functions; add _meta: {schemaVersion, exportTimestamp}

**Verification:** sanitizeForExport() returns object with no functions; JSON.stringify() succeeds without circular reference errors

---

## Subtask 2: Convert Function References to Descriptive Strings

**Action:** Enhance sanitizeForExport() to replace function values with descriptive strings (e.g., "[Function: getLayer]") so the export documents what was removed.

**Files:**
- MODIFY: `/Users/tylerstupart/ralph-claude/v3-system-blueprint.html` - Update sanitizeForExport() to replace functions with strings

**Code Pattern/API:** if (typeof value === 'function') return `[Function: ${value.name || 'anonymous'}]`;

**Verification:** Exported JSON contains "[Function: getLayer]" strings where functions existed; no actual functions in output

---

## Completion Checklist
- [ ] Subtask 1 complete
- [ ] Subtask 2 complete
- [ ] Task verification criteria met
