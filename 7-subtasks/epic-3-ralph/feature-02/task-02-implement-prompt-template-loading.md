# Subtasks: Implement Prompt Template Loading

**Parent Feature:** Agent Spawning System
**Parent Epic:** Ralph Orchestration

---

## Subtask 1: Create Prompt Loader Module

**Action:** Create prompt-loader.js module with loadPrompt(agentType, layerId) function that loads base template from templates/agents/ and returns combined prompt.

**Files:**
- CREATE: `/Users/tylerstupart/ralph-claude/src/spawner/prompt-loader.js` - Prompt loader module

**Code Pattern/API:** function loadPrompt(agentType, layerId) { const base = fs.readFileSync(`templates/agents/${agentType}-base.md`); return base; }

**Verification:** loadPrompt("planner", "L4") returns complete prompt; missing templates produce clear error

---

## Subtask 2: Add Layer Fragment Injection

**Action:** Enhance loadPrompt to inject layer-specific fragments into the base template at the {{LAYER_INSTRUCTIONS}} placeholder.

**Files:**
- MODIFY: `/Users/tylerstupart/ralph-claude/src/spawner/prompt-loader.js` - Add fragment injection

**Code Pattern/API:** const fragment = fs.readFileSync(`templates/agents/${agentType}-${layerId}.md`); return base.replace('{{LAYER_INSTRUCTIONS}}', fragment);

**Verification:** Fragments are correctly injected; placeholder is replaced; complete prompt is returned

---

## Completion Checklist
- [ ] Subtask 1 complete
- [ ] Subtask 2 complete
- [ ] Task verification criteria met
