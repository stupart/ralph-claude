# Subtasks: Design _status.md Schema

**Parent Feature:** Filesystem State Machine
**Parent Epic:** Ralph Orchestration

---

## Subtask 1: Create Status Schema Document

**Action:** Create schema document defining all _status.md fields: current_layer, current_item, iteration_count, phase, last_agent, timestamp, human_gate_status, with types and valid values.

**Files:**
- CREATE: `/Users/tylerstupart/ralph-claude/schemas/status-schema.md` - Status file schema documentation

**Code Pattern/API:** YAML-like format: current_layer: L1-L12; iteration_count: integer >= 0; phase: understand|plan|build|review|analyze

**Verification:** Schema documents all fields; types specified; valid values listed; nested position tracking covered

---

## Subtask 2: Create Status Template File

**Action:** Create a template _status.md file showing the exact format with example values and comments explaining each field.

**Files:**
- CREATE: `/Users/tylerstupart/ralph-claude/templates/status-template.md` - Example _status.md file

**Code Pattern/API:** ```\ncurrent_layer: L4\niteration_count: 0\nphase: plan\n...\n```

**Verification:** Template is valid parseable format; includes all schema fields; comments explain each field

---

## Completion Checklist
- [ ] Subtask 1 complete
- [ ] Subtask 2 complete
- [ ] Task verification criteria met
