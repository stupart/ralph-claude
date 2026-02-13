# Subtasks: Update Cascade Section from LAYER_CAKE.failCascade

**Parent Feature:** Visual Rendering Fixes
**Parent Epic:** Blueprint Integrity

---

## Subtask 1: Create Dynamic Cascade Rendering Function

**Action:** Create renderCascadeSection() function that reads LAYER_CAKE.failCascade and generates the cascade diagram HTML dynamically showing MINOR/MAJOR/ESCALATE routing rules.

**Files:**
- MODIFY: `/Users/tylerstupart/ralph-claude/v3-system-blueprint.html` - Add renderCascadeSection() function

**Code Pattern/API:** function renderCascadeSection() { const rules = LAYER_CAKE.failCascade; return `<div class="cascade-rule">${rules.minor} -> ...</div>`; }

**Verification:** Cascade section renders without hardcoded values; all routing rules come from LAYER_CAKE.failCascade

---

## Subtask 2: Style and Integrate Cascade Display

**Action:** Add CSS styling for cascade routing arrows (MINOR=yellow, MAJOR=orange, ESCALATE=red) and integrate renderCascadeSection() into the main page rendering.

**Files:**
- MODIFY: `/Users/tylerstupart/ralph-claude/v3-system-blueprint.html` - Add CSS for cascade styling and call renderCascadeSection() from main render

**Code Pattern/API:** .cascade-minor { color: #FFD700; }, .cascade-major { color: #FF8C00; }, .cascade-escalate { color: #DC143C; }

**Verification:** Cascade diagram shows color-coded routing; values match LAYER_CAKE.failCascade exactly

---

## Completion Checklist
- [ ] Subtask 1 complete
- [ ] Subtask 2 complete
- [ ] Task verification criteria met
