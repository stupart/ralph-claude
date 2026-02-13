# Subtasks: Implement Scope Coverage Protocol

**Parent Feature:** Judge Agent Prompt and Context Package
**Parent Epic:** Agent Specialization

---

## Subtask 1: Create Protocol Document for Loading Synthesis

**Action:** Create the reusable scope coverage protocol document specifying how to load synthesis artifacts, what to compare at each layer, and how to identify gaps.

**Files:**
- CREATE: `/Users/tylerstupart/ralph-claude/templates/protocols/scope-coverage-protocol.md` - Reusable scope coverage protocol

**Code Pattern/API:** ## Scope Coverage Protocol\n\n### Step 1: Load Source Artifacts\n- L3: Brain dump from `/3-input/`\n- L4+: Synthesis from `/4-synthesis/`\n\n### Step 2: Load Target Layer\n- Current layer artifacts\n\n### Step 3: Map and Verify\n- Each source item has target coverage

**Verification:** Protocol is layer-agnostic where possible; loading paths explicit; comparison criteria clear

---

## Subtask 2: Create Traceability Matrix Template

**Action:** Create a template for generating traceability matrices showing how source concepts map to target artifacts with coverage status.

**Files:**
- CREATE: `/Users/tylerstupart/ralph-claude/templates/protocols/traceability-matrix-template.md` - Traceability matrix template

**Code Pattern/API:** ## Traceability Matrix\n\n| Source Concept | Target Artifact | Coverage | Notes |\n|----------------|-----------------|----------|-------|\n| JTBD-1: ...    | Epic-1: ...     | FULL     |       |\n| Pattern-2: ... | (none)          | GAP      | MAJOR |

**Verification:** Template is easy to fill; coverage status values defined (FULL/PARTIAL/GAP); severity guidance included

---

## Subtask 3: Add Gap Escalation Criteria

**Action:** Add criteria for when scope gaps should trigger ESCALATE vs ITERATE, based on gap severity and scope significance.

**Files:**
- MODIFY: `/Users/tylerstupart/ralph-claude/templates/protocols/scope-coverage-protocol.md` - Add escalation criteria

**Code Pattern/API:** ## Gap Escalation Criteria\n- ESCALATE: Core JTBD missing, architectural decision ignored\n- ITERATE: Secondary pattern not fully covered\n- ITERATE: Edge case not addressed

**Verification:** Escalation vs iteration clearly distinguished; examples provided; aligns with severity classification

---

## Completion Checklist
- [ ] Subtask 1 complete
- [ ] Subtask 2 complete
- [ ] Subtask 3 complete
- [ ] Task verification criteria met
