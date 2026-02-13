# Tasks: Agent Spawning System

## Task 1: Create Layer-to-Agent Mapping

**What it accomplishes:** Implements configuration mapping each layer to its agent type: L1-L7 and L12 to Planner, L8 to Builder, L9-L11 to Judge.

**Time estimate:** ~15 minutes

**Files to create/modify:**
- `/Users/tylerstupart/ralph-claude/config/layer-agent-map.json` (create)
- `/Users/tylerstupart/ralph-claude/src/spawner/agent-mapper.js` (create)

**Dependencies:** None

**Verification:** getAgentType("L4") returns "planner"; getAgentType("L8") returns "builder"; getAgentType("L9") returns "judge"; all 12 layers mapped.

---

## Task 2: Implement Prompt Template Loading

**What it accomplishes:** Creates function to load agent prompt templates from templates/agents/ directory, combining base prompts with layer-specific fragments.

**Time estimate:** ~20 minutes

**Files to create/modify:**
- `/Users/tylerstupart/ralph-claude/src/spawner/prompt-loader.js` (create)

**Dependencies:** Task 1 (need agent type to know which template)

**Verification:** loadPrompt("planner", "L4") returns complete assembled prompt; missing templates produce clear error; fragments are correctly injected.

---

## Task 3: Implement Context Assembly

**What it accomplishes:** Creates functions to assemble the appropriate context package for each agent/layer combination following the context loading rules from Epic 2.

**Time estimate:** ~25 minutes

**Files to create/modify:**
- `/Users/tylerstupart/ralph-claude/src/spawner/context-assembler.js` (create)

**Dependencies:** Task 1 (need agent type), Epic 2 (need context rules)

**Verification:** Context for Planner L4 includes synthesis and architecture; context for Builder includes only task spec; context respects size limits.

---

## Task 4: Integrate Tool Permission Enforcement

**What it accomplishes:** Connects the spawner to the permission system from Epic 2 Feature 05, ensuring spawned agents have correct tool restrictions applied.

**Time estimate:** ~20 minutes

**Files to create/modify:**
- `/Users/tylerstupart/ralph-claude/src/spawner/agent-spawner.js` (create main spawner with permission integration)

**Dependencies:** Tasks 1-3, Epic 2 Feature 05 (permissions)

**Verification:** Spawned Planner cannot use Bash; spawned Builder has all tools; spawned Judge cannot Write; permissions logged.

---

## Task 5: Implement Output Capture and Completion Detection

**What it accomplishes:** Creates mechanism to capture agent outputs on completion, detect when agent has finished, and package results for handoff or state update.

**Time estimate:** ~25 minutes

**Files to create/modify:**
- `/Users/tylerstupart/ralph-claude/src/spawner/output-handler.js` (create)

**Dependencies:** Task 4 (need spawner base)

**Verification:** Agent outputs are captured; completion is detected reliably; outputs are structured for handoff protocol.

---

## Task 6: Add Timeout Handling and Logging

**What it accomplishes:** Implements timeout detection for stalled agents and comprehensive logging of spawn events with timestamps, agent type, layer, and configuration.

**Time estimate:** ~15 minutes

**Files to create/modify:**
- `/Users/tylerstupart/ralph-claude/src/spawner/agent-spawner.js` (extend with timeout and logging)

**Dependencies:** Task 4 (need spawner base)

**Verification:** Agent timeout after configurable duration triggers error; all spawn events logged with timestamp; logs are readable.
