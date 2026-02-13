# Service Blueprint Specification

The service blueprint visualization is THE canonical representation of the Layer Cake methodology. This document defines how the blueprint works, how to read it, and how it maps to the underlying data structures.

---

## Overview

The service blueprint is an interactive visualization implemented in `docs/v3-system-blueprint.html`. It renders from a single source of truth: the `LAYER_CAKE` JavaScript object.

**Key Principle:** The blueprint IS the method specification. Changes to the methodology = changes to the blueprint.

---

## Blueprint Structure

### Visual Layout

```
                L1    L2    L3    L4    L5    L6    L7    L8    L9    L10   L11   L12
              +-----+-----+-----+-----+-----+-----+-----+-----+-----+-----+-----+-----+
Ralph Start   |spawn|spawn|spawn|spawn|spawn|spawn|spawn|spawn|spawn|spawn|spawn|spawn|
              +-----+-----+-----+-----+-----+-----+-----+-----+-----+-----+-----+-----+
Planner       |gather|decomp|synth|epic|feat|task|sub  |     |     |     |     |retro|
              +-----+-----+-----+-----+-----+-----+-----+-----+-----+-----+-----+-----+
Builder       |     |     |     |     |     |     |     |build|     |     |     |     |
              +-----+-----+-----+-----+-----+-----+-----+-----+-----+-----+-----+-----+
Judge         |     |     | GAN | GAN | GAN | GAN | GAN |     | L9  | L10 | L11 |     |
              +-----+-----+-----+-----+-----+-----+-----+-----+-----+-----+-----+-----+
Ralph Check   |     |     |chk  |chk  |chk  |chk  |chk  |test |P/F  |P/F  |P/F  |done |
              +-----+-----+-----+-----+-----+-----+-----+-----+-----+-----+-----+-----+
Human         |input|     |gate |     |     |     |gate |     |     |     |     |accept
              +-----+-----+-----+-----+-----+-----+-----+-----+-----+-----+-----+-----+
```

### Swimlanes (Rows)

Each horizontal row represents an actor in the system:

| Swimlane | Actor | Color | Role |
|----------|-------|-------|------|
| Ralph Start | Orchestrator | #ff6b35 (orange) | Spawns Claude agents, initiates each layer |
| Planner | Claude Planner | #10b981 (green) | Understands requirements, creates nested plans |
| Builder | Claude Builder | #3b82f6 (blue) | Implements code from subtask specs |
| Judge | Claude Reviewer | #8b5cf6 (purple) | GAN critic - reviews plans and builds |
| Ralph Check | Orchestrator | #ff6b35 (orange) | Validates outputs, routes pass/fail, manages state |
| Human | User | #f59e0b (amber) | Provides input, approves at gates, accepts final output |

### Columns (Layers)

Each vertical column represents one of the 12 layers:

| Column | Layer | Phase | Color (from actor) |
|--------|-------|-------|-------------------|
| L1 | Input | Understand | Green (Planner) |
| L2 | Decompose | Understand | Green (Planner) |
| L3 | Synthesize | Understand | Green (Planner) |
| L4 | Epics | Plan | Green (Planner) |
| L5 | Features | Plan | Green (Planner) |
| L6 | Tasks | Plan | Green (Planner) |
| L7 | Subtasks | Plan | Green (Planner) |
| L8 | Build | Build | Blue (Builder) |
| L9 | Feature Review | Review | Purple (Judge) |
| L10 | Epic Review | Review | Purple (Judge) |
| L11 | Final Review | Review | Purple (Judge) |
| L12 | Analysis | Learn | Green (Planner) |

### Cells

Each cell at the intersection of swimlane and column represents an activity:

**Cell Properties:**
- `action`: Primary verb (e.g., "Gather", "Build", "GAN")
- `detail`: Supporting text (e.g., "Read inputs", "3+ epics")
- `clickable`: Boolean - if true, clicking opens layer modal
- `highlight`: Boolean - if true, cell has emphasized background
- `gate`: Boolean - if true, styled as approval gate

**Empty Cells:** Shown with diagonal stripe pattern, indicating that actor has no activity at that layer.

---

## LAYER_CAKE Data Structure

The `LAYER_CAKE` JavaScript object is the single source of truth for all methodology data.

### Top-Level Structure

```javascript
const LAYER_CAKE = {
  meta: {
    version: "3.0",
    name: "Layer Cake",
    description: "Autonomous code generation through nested planning and adversarial review"
  },

  actors: { /* Actor definitions */ },
  hierarchy: { /* Hierarchy minimums */ },
  layers: [ /* Layer specifications */ ],
  gates: { /* Gate definitions */ },
  failCascade: { /* Cascade rules */ },

  // Helper functions
  getLayer(id) { /* ... */ },
  getActor(id) { /* ... */ },
  getHierarchyLevel(type) { /* ... */ },
  getMinSubtasks(epics, features, tasks, subtasks) { /* ... */ }
};
```

### Actor Definitions

```javascript
actors: {
  ralph_start: {
    id: "ralph_start",
    label: "Ralph Start",
    color: "#ff6b35",
    role: "Spawns Claude agents, initiates each layer"
  },
  planner: {
    id: "planner",
    label: "Claude Planner",
    color: "#10b981",
    role: "Understands requirements, creates nested plans"
  },
  builder: {
    id: "builder",
    label: "Claude Builder",
    color: "#3b82f6",
    role: "Implements code from subtask specs"
  },
  reviewer: {
    id: "reviewer",
    label: "Claude Reviewer",
    color: "#8b5cf6",
    role: "GAN critic - reviews plans and builds for thoroughness"
  },
  ralph_check: {
    id: "ralph_check",
    label: "Ralph Check",
    color: "#ff6b35",
    role: "Validates outputs, routes pass/fail, manages state"
  },
  human: {
    id: "human",
    label: "Human",
    color: "#f59e0b",
    role: "Provides input, approves plans, accepts final output"
  }
}
```

### Hierarchy Definitions

```javascript
hierarchy: {
  epic:    { min: 3, layer: "L4", parent: null,     timeScale: "weeks" },
  feature: { min: 3, layer: "L5", parent: "epic",   timeScale: "days" },
  task:    { min: 3, layer: "L6", parent: "feature", timeScale: "hours" },
  subtask: { min: 2, layer: "L7", parent: "task",   timeScale: "minutes" }
}
```

### Layer Specification Structure

Each layer in the `layers` array has this structure:

```javascript
{
  id: "L1",                    // Layer identifier
  name: "Input",               // Human-readable name
  phase: "understand",         // Phase: understand | plan | build | review | learn
  actor: "planner",            // Primary actor ID
  action: "Gather",            // Primary action verb
  description: "Read brain dumps, designs, existing code",
  outputs: ["1-input/brain-dump-*.md", "1-input/research/*"],
  check: { min: 10, type: "quotes" },  // Completion check (or null)
  reviewType: "plan",          // "plan" | "build" | null
  humanGate: false,            // Requires human approval?
  onPass: "L2",                // Next layer on success
  onFail: "L2",                // Return layer on failure (or object for cascade)
  prompt: `...`                // Full prompt template
}
```

### Cascade Routing for Review Layers

Review layers (L9, L10, L11) have complex fail routing:

```javascript
// L9 Feature Review
onFail: { minor: "L8", major: "L7", escalate: "L6" }

// L10 Epic Review
onFail: { minor: "L8", major: "L6", escalate: "L5" }

// L11 Final Review
onFail: { minor: "L8", major: "L5", escalate: "L4" }
```

### Gate Definitions

```javascript
gates: {
  humanApproval: ["L3", "L7"],           // Layers requiring human APPROVE
  ganPlanReview: ["L3", "L4", "L5", "L6", "L7"],  // Plan review layers
  ganBuildReview: ["L9", "L10", "L11"]   // Build review layers
}
```

### Fail Cascade Rules

```javascript
failCascade: {
  minor: "Same layer - fix and retry",
  major: "One level back in hierarchy - revise spec",
  escalate: "Two+ levels back - rethink approach",
  maxRetries: 3
}
```

---

## Mapping: Blueprint to Documentation

| Blueprint Element | Documentation File | Section |
|-------------------|-------------------|---------|
| Layer columns (L1-L12) | layer-specifications.md | Individual layer specs |
| Actor swimlanes | layer-specifications.md | Actor Capabilities Matrix |
| Cell activities | layer-specifications.md | Layer Actions |
| Phase groupings | journeys.md | Phase Boundaries Summary |
| Pass/Fail arrows | layer-specifications.md | Cascade Rules Summary |
| Human gates | architecture.md | Decision 4: Human Gates |
| Hierarchy minimums | architecture.md | Decision 9: Project Tiers |
| Iteration logic | journeys.md | Journey 4: Iteration Path |

---

## Reading the Blueprint

### Understanding Flow

1. **Left to Right**: Progress through layers L1 -> L12
2. **Top to Bottom**: Orchestration flow (Ralph Start -> Agents -> Ralph Check -> Human)
3. **Colored Headers**: Layer column headers show which actor owns that layer
4. **Highlighted Cells**: Purple highlighting indicates GAN review activities
5. **Gate Cells**: Amber cells indicate human approval checkpoints

### Tracing a Path

**Example: Planning Phase Flow**

1. Start at L1, Human row: "Input" - Human provides brain dump
2. Move to L1, Planner row: "Gather" - Planner reads input
3. Continue L2-L3, Planner row: Decompose, Synthesize
4. L3, Judge row: "GAN" - Review for thoroughness
5. L3, Ralph Check row: "3+ JTBD?" - Validate minimum counts
6. L3, Human row: "Review?" - Human gate (optional review)
7. If pass: Proceed to L4...

### Interactive Features

**Click for Details:**
- Click any clickable cell to open a modal with full layer specification
- Modal shows: description, actor, outputs, check criteria, tools, flow routing, prompt template

**Hierarchy Calculator:**
- Adjust epic/feature/task/subtask counts
- See minimum subtask calculation in real-time
- Formula: Epics x Features/Epic x Tasks/Feature x Subtasks/Task

**Export:**
- Export LAYER_CAKE as JSON for programmatic use
- Can be imported into Ralph or other tooling

---

## Using the Blueprint for Methodology Thinking

### Identifying Bottlenecks

Look for:
- Sequential dependencies (single path through swimlanes)
- Human gate locations (L3, L7)
- Review layers that frequently cascade back

### Analyzing Handoffs

For each layer transition:
1. Which actor hands off to which?
2. What artifacts are passed?
3. What context is needed?

### Planning Changes

When modifying the methodology:

1. **Visual First**: How does the change appear in the blueprint?
2. **Data Impact**: What changes in LAYER_CAKE object?
3. **Documentation Sync**: What markdown files need updating?

### Example: Adding a New Gate

To add a human gate at L5:

1. Update blueprint: Add amber cell at L5/Human row
2. Update LAYER_CAKE: Set `humanGate: true` for L5
3. Update gates: Add "L5" to `humanApproval` array
4. Update docs: architecture.md Decision 4, journeys.md flows

---

## Blueprint Renderer Configuration

The blueprint is rendered by JavaScript from a configuration object:

```javascript
const BLUEPRINT_CONFIG = {
  layers: ['L1', 'L2', ..., 'L12'],
  rows: [
    {
      id: 'ralph_start',
      label: 'Ralph Start',
      class: 'orchestrator',
      cells: {
        L1: { action: 'Spawn', detail: 'Planner' },
        L2: { action: 'Spawn', detail: 'Planner' },
        // ... etc
      }
    },
    {
      id: 'planner',
      label: 'Claude Planner',
      class: 'planner',
      cells: {
        L1: { action: 'Gather', detail: 'Read inputs', clickable: true },
        // ...
      }
    },
    // ... other rows
  ]
};
```

**Rendering Process:**

1. Create phase label row (layer headers)
2. For each row in config:
   - Create swimlane label
   - For each layer:
     - If cell defined: render activity box
     - If no cell: render empty (striped) cell
3. Add click handlers for clickable cells
4. Initialize hierarchy calculator

---

## Synchronization Protocol

When the methodology changes:

### Step 1: Update LAYER_CAKE Object

Edit `docs/v3-system-blueprint.html`:
- Modify layer in `layers` array
- Update actor in `actors` object
- Adjust gates or cascade rules

### Step 2: Update BLUEPRINT_CONFIG (if needed)

If visual layout changes:
- Add/remove cells
- Change actions/details
- Modify clickable or highlight status

### Step 3: Update Markdown Documentation

Files to check:
- `layer-specifications.md` - Layer details
- `journeys.md` - Flow diagrams
- `architecture.md` - Decisions affected
- `jtbd.md` - Jobs if workflow changes
- `constraints.md` - If limits change

### Step 4: Visual Verification

1. Open blueprint in browser
2. Verify all layers render correctly
3. Click each clickable cell to verify modal content
4. Test hierarchy calculator
5. Export JSON and verify structure

---

## Blueprint CSS Classes

| Class | Purpose |
|-------|---------|
| `.phase-label` | Layer column headers |
| `.swimlane` | Actor row container |
| `.lane-label` | Actor name label |
| `.lane-cell` | Cell container |
| `.lane-cell.empty` | Empty cell (striped) |
| `.lane-cell.highlight` | Emphasized cell |
| `.activity` | Activity box |
| `.activity.clickable` | Clickable activity |
| `.activity.plan` | Planner activity |
| `.activity.build` | Builder activity |
| `.activity.review` | Judge activity |
| `.activity.orchestrator` | Ralph activity |
| `.activity.user` | Human activity |

---

## Summary

The service blueprint is:

1. **Canonical**: THE authoritative representation of the methodology
2. **Data-Driven**: Renders from LAYER_CAKE object
3. **Interactive**: Click for details, hierarchy calculator, JSON export
4. **Visual**: Swimlane diagram showing all actors and layers
5. **Synchronized**: Changes flow from blueprint to documentation

Use it to:
- Understand the methodology at a glance
- Explore layer specifications
- Think about methodology improvements
- Export data for programmatic use
- Ensure consistency across all documentation
