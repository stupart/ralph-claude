# Subtasks: Implement Output Capture and Completion Detection

**Parent Feature:** Agent Spawning System
**Parent Epic:** Ralph Orchestration

---

## Subtask 1: Create Output Handler Module

**Action:** Create output-handler.js module with captureOutput() function that collects agent output and detectCompletion() function that identifies when agent has finished.

**Files:**
- CREATE: `/Users/tylerstupart/ralph-claude/src/spawner/output-handler.js` - Output handling module

**Code Pattern/API:** function captureOutput(agentStream) { let output = ''; agentStream.on('data', d => output += d); return () => output; }

**Verification:** Agent outputs are captured; completion is detected reliably; outputs are available after completion

---

## Subtask 2: Structure Output for Handoff

**Action:** Add function to parse and structure captured output into handoff-compatible format, extracting artifacts, status, and any error information.

**Files:**
- MODIFY: `/Users/tylerstupart/ralph-claude/src/spawner/output-handler.js` - Add output structuring

**Code Pattern/API:** function structureForHandoff(rawOutput) { return { artifacts: extractArtifacts(rawOutput), status: extractStatus(rawOutput), ... }; }

**Verification:** Structured output matches handoff schema; artifacts are correctly extracted; errors are captured

---

## Completion Checklist
- [ ] Subtask 1 complete
- [ ] Subtask 2 complete
- [ ] Task verification criteria met
