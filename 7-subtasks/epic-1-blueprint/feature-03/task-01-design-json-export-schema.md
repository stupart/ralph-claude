# Subtasks: Design JSON Export Schema

**Parent Feature:** JSON Export/Import for Ralph
**Parent Epic:** Blueprint Integrity

---

## Subtask 1: Create JSON Schema File

**Action:** Create a formal JSON Schema file defining the export format structure including $schema, type definitions for layers, actors, hierarchy, gates, and failCascade.

**Files:**
- CREATE: `/Users/tylerstupart/ralph-claude/schemas/layer-cake-export.schema.json` - JSON Schema defining export structure

**Code Pattern/API:** JSON Schema draft-07 format with definitions for LayerExport, ActorExport objects; required fields array

**Verification:** Schema file is valid JSON Schema (validates at jsonschema.dev); includes definitions for all LAYER_CAKE components

---

## Subtask 2: Document Schema with Excluded Fields

**Action:** Add description fields to the schema documenting what each field contains, and create a separate documentation note listing which fields are excluded from export (JavaScript functions) and why.

**Files:**
- MODIFY: `/Users/tylerstupart/ralph-claude/schemas/layer-cake-export.schema.json` - Add description fields throughout

**Code Pattern/API:** "description": "..." fields in JSON Schema; separate $comment for exclusions

**Verification:** Each schema field has a description; schema documents that getLayer, getActor functions are excluded; version field is required

---

## Completion Checklist
- [ ] Subtask 1 complete
- [ ] Subtask 2 complete
- [ ] Task verification criteria met
