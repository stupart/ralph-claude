# Subtasks: Update renderBlueprint() to Use LAYER_CAKE Data

**Parent Feature:** Visual Rendering Fixes
**Parent Epic:** Blueprint Integrity

---

## Subtask 1: Modify Phase Label Rendering

**Action:** Update renderBlueprint() function to fetch phase labels (understand, plan, build, review, analyze) directly from LAYER_CAKE.layers[].phase rather than hardcoded strings in BLUEPRINT_CONFIG.

**Files:**
- MODIFY: `/Users/tylerstupart/ralph-claude/v3-system-blueprint.html` - Update renderBlueprint() phase label generation

**Code Pattern/API:** const phase = LAYER_CAKE.getLayer(layerId).phase; use phase for CSS class and display

**Verification:** Phase labels in rendered blueprint match LAYER_CAKE.layers[].phase values exactly

---

## Subtask 2: Modify Actor Color and Activity Rendering

**Action:** Update renderBlueprint() to pull actor colors from LAYER_CAKE.actors[].color and activity names from LAYER_CAKE.layers[].action for cell content.

**Files:**
- MODIFY: `/Users/tylerstupart/ralph-claude/v3-system-blueprint.html` - Update actor color assignment and cell content generation

**Code Pattern/API:** const color = LAYER_CAKE.getActor(actorId).color; const action = LAYER_CAKE.getLayer(layerId).action;

**Verification:** Actor swimlane colors match LAYER_CAKE.actors definitions; cell text matches LAYER_CAKE.layers[].action

---

## Completion Checklist
- [ ] Subtask 1 complete
- [ ] Subtask 2 complete
- [ ] Task verification criteria met
