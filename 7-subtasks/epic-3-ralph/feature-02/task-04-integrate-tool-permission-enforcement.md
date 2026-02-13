# Subtasks: Integrate Tool Permission Enforcement

**Parent Feature:** Agent Spawning System
**Parent Epic:** Ralph Orchestration

---

## Subtask 1: Create Main Agent Spawner

**Action:** Create agent-spawner.js module with spawnAgent(layerId, projectPath) function that combines agent mapping, prompt loading, context assembly, and permission enforcement.

**Files:**
- CREATE: `/Users/tylerstupart/ralph-claude/src/spawner/agent-spawner.js` - Main agent spawner

**Code Pattern/API:** function spawnAgent(layerId, projectPath) { const agentType = getAgentType(layerId); const prompt = loadPrompt(agentType, layerId); const context = assembleContext(agentType, layerId, projectPath); ... }

**Verification:** Spawner calls all component functions; spawned agents have correct prompts and contexts

---

## Subtask 2: Connect Permission Enforcement

**Action:** Integrate the permission enforcement wrapper from Epic 2 Feature 05, ensuring spawned agents have tool restrictions applied based on their role.

**Files:**
- MODIFY: `/Users/tylerstupart/ralph-claude/src/spawner/agent-spawner.js` - Add permission integration

**Code Pattern/API:** const enforcer = enforcePermissions(agentType); // Apply enforcer to agent tool calls

**Verification:** Spawned Planner cannot use Bash; spawned Builder has all tools; spawned Judge cannot Write; permissions logged

---

## Completion Checklist
- [ ] Subtask 1 complete
- [ ] Subtask 2 complete
- [ ] Task verification criteria met
