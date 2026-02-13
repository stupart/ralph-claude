# Subtasks: Implement Resume Execution

**Parent Feature:** Session Recovery and Status Reconciliation
**Parent Epic:** Ralph Orchestration

---

## Subtask 1: Add Execute Recovery Function

**Action:** Add executeRecovery(plan) function to RecoveryManager that updates _status.md to correct state based on the recovery plan.

**Files:**
- MODIFY: `/Users/tylerstupart/ralph-claude/src/recovery/recovery-manager.js` - Add execute function

**Code Pattern/API:** function executeRecovery(plan) { StateManager.write(plan.resumeState); return { success: true, resumeLayer: plan.resumePoint }; }

**Verification:** Recovery updates _status.md correctly; state matches recovery plan; function returns success status

---

## Subtask 2: Integrate with Agent Spawner

**Action:** Add logic to spawn correct agent for resume layer after recovery completes, reconstructing handoff context as needed.

**Files:**
- MODIFY: `/Users/tylerstupart/ralph-claude/src/recovery/recovery-manager.js` - Add spawner integration

**Code Pattern/API:** function resumeProject(plan) { executeRecovery(plan); const context = reconstructContext(plan); return AgentSpawner.spawn(plan.resumeLayer, context); }

**Verification:** Correct agent spawned for resume layer; handoff context is reconstructed; project continues from resume point

---

## Completion Checklist
- [ ] Subtask 1 complete
- [ ] Subtask 2 complete
- [ ] Task verification criteria met
