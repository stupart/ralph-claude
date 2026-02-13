# Subtasks: Create Layer-to-Agent Mapping

**Parent Feature:** Agent Spawning System
**Parent Epic:** Ralph Orchestration

---

## Subtask 1: Create Layer-Agent Configuration File

**Action:** Create JSON configuration file mapping each layer (L1-L12) to its agent type: L1-L7 and L12 to Planner, L8 to Builder, L9-L11 to Judge.

**Files:**
- CREATE: `/Users/tylerstupart/ralph-claude/config/layer-agent-map.json` - Layer to agent mapping

**Code Pattern/API:** { "L1": "planner", "L2": "planner", ..., "L8": "builder", "L9": "judge", ..., "L12": "planner" }

**Verification:** All 12 layers mapped; L1-L7 = planner; L8 = builder; L9-L11 = judge; L12 = planner

---

## Subtask 2: Create Agent Mapper Module

**Action:** Create agent-mapper.js module with getAgentType(layerId) function that returns the agent type for a given layer.

**Files:**
- CREATE: `/Users/tylerstupart/ralph-claude/src/spawner/agent-mapper.js` - Agent mapper module

**Code Pattern/API:** function getAgentType(layerId) { return layerAgentMap[layerId] || throw new Error(`Unknown layer: ${layerId}`); }

**Verification:** getAgentType("L4") returns "planner"; getAgentType("L8") returns "builder"; getAgentType("L9") returns "judge"

---

## Completion Checklist
- [ ] Subtask 1 complete
- [ ] Subtask 2 complete
- [ ] Task verification criteria met
