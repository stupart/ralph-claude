# Tasks: Planner Agent Prompt and Context Package

## Task 1: Design Base Planner System Prompt Template

**What it accomplishes:** Creates the foundational Planner system prompt establishing identity, cognitive mode (plan_mode), core responsibilities, and parameterizable sections for layer-specific instructions.

**Time estimate:** ~25 minutes

**Files to create/modify:**
- `/Users/tylerstupart/ralph-claude/templates/agents/planner-base.md` (create)

**Dependencies:** None

**Verification:** Base prompt exists; includes identity section, cognitive mode, tool permissions (Read, Write, Glob, Grep only); has clear placeholder markers for layer-specific content.

---

## Task 2: Create Understand Phase Prompt Fragments (L1-L3)

**What it accomplishes:** Creates layer-specific prompt fragments for L1 (Intake), L2 (Research), and L3 (Synthesis) that inject into the base template with specific instructions for each understanding layer.

**Time estimate:** ~25 minutes

**Files to create/modify:**
- `/Users/tylerstupart/ralph-claude/templates/agents/planner-L1.md` (create)
- `/Users/tylerstupart/ralph-claude/templates/agents/planner-L2.md` (create)
- `/Users/tylerstupart/ralph-claude/templates/agents/planner-L3.md` (create)

**Dependencies:** Task 1 (need base template structure)

**Verification:** Each fragment contains layer-specific instructions; fragments reference correct outputs from LAYER_CAKE; L3 includes synthesis requirements.

---

## Task 3: Create Plan Phase Prompt Fragments (L4-L7)

**What it accomplishes:** Creates layer-specific prompt fragments for L4 (Epic Planning), L5 (Feature Planning), L6 (Task Planning), and L7 (Subtask Specification) with minimum count enforcement.

**Time estimate:** ~30 minutes

**Files to create/modify:**
- `/Users/tylerstupart/ralph-claude/templates/agents/planner-L4.md` (create)
- `/Users/tylerstupart/ralph-claude/templates/agents/planner-L5.md` (create)
- `/Users/tylerstupart/ralph-claude/templates/agents/planner-L6.md` (create)
- `/Users/tylerstupart/ralph-claude/templates/agents/planner-L7.md` (create)

**Dependencies:** Task 1 (need base template structure)

**Verification:** Each fragment enforces minimum counts (3+ epics, 3+ features, 3+ tasks, 2+ subtasks); references correct hierarchy level; outputs match LAYER_CAKE.

---

## Task 4: Create Analysis Phase Prompt Fragment (L12)

**What it accomplishes:** Creates the L12 (Retrospective) prompt fragment for writing project analysis, handling both success paths and cases with many iterations.

**Time estimate:** ~15 minutes

**Files to create/modify:**
- `/Users/tylerstupart/ralph-claude/templates/agents/planner-L12.md` (create)

**Dependencies:** Task 1 (need base template structure)

**Verification:** Fragment covers retrospective writing; handles success and iteration-heavy cases; outputs 12-retrospective/ artifacts.

---

## Task 5: Define Context Loading Rules

**What it accomplishes:** Creates a configuration document specifying exactly which files the Planner should read at each layer, implementing minimal context loading for efficiency.

**Time estimate:** ~20 minutes

**Files to create/modify:**
- `/Users/tylerstupart/ralph-claude/templates/agents/planner-context-rules.md` (create)

**Dependencies:** Tasks 2-4 (need to know what each layer needs)

**Verification:** Rules specify files for each layer L1-L7 and L12; L1 loads only input files; later layers load prior layer outputs; rules are implementable.

---

## Task 6: Test Planner Prompt Integration

**What it accomplishes:** Creates a test script or manual test procedure that assembles the complete Planner prompt for each layer and verifies it produces correctly formatted artifacts.

**Time estimate:** ~20 minutes

**Files to create/modify:**
- `/Users/tylerstupart/ralph-claude/tests/planner-prompt-test.md` (create test procedure)

**Dependencies:** Tasks 1-5 (all prompt components must exist)

**Verification:** Test procedure documents how to verify each layer; sample inputs and expected outputs are defined; test can be run manually.

---

## Task 7: Implement Retrospective Improvement Loop

**What it accomplishes:** Extends the L12 prompt to include a methodology improvement section that captures patterns, anti-patterns, and suggested changes to templates/prompts based on project execution experience. Creates a feedback loop for continuous Layer Cake improvement.

**Time estimate:** ~25 minutes

**Files to create/modify:**
- `/Users/tylerstupart/ralph-claude/templates/agents/planner-L12.md` (modify to add improvement section)
- `/Users/tylerstupart/ralph-claude/templates/retrospective-improvements-template.md` (create)
- `/Users/tylerstupart/ralph-claude/12-retrospective/improvements-log.md` (create running log)

**Dependencies:** Task 4 (L12 prompt)

**Verification:** L12 prompt includes section for surfacing methodology improvements; improvements template has fields for pattern type, evidence, and suggested change; improvements can reference specific templates or prompts; running log aggregates improvements across projects.
