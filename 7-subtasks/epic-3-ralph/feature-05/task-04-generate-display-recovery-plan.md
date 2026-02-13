# Subtasks: Generate and Display Recovery Plan

**Parent Feature:** Session Recovery and Status Reconciliation
**Parent Epic:** Ralph Orchestration

---

## Subtask 1: Create Recovery Planner Module

**Action:** Create recovery-planner.js with generatePlan(reconciliation) function that produces a human-readable recovery plan based on reconciliation results.

**Files:**
- CREATE: `/Users/tylerstupart/ralph-claude/src/recovery/recovery-planner.js` - Recovery plan generation

**Code Pattern/API:** function generatePlan(recon) { return { summary: summarize(recon), actions: listActions(recon), resumePoint: determineResumePoint(recon) }; }

**Verification:** Plan is human-readable; explains discrepancies clearly; states proposed resume point

---

## Subtask 2: Add Plan Display and Confirmation

**Action:** Add displayPlan(plan) function that formats the plan for display and requestConfirmation() to get user approval before executing.

**Files:**
- MODIFY: `/Users/tylerstupart/ralph-claude/src/recovery/recovery-planner.js` - Add display and confirmation

**Code Pattern/API:** function displayPlan(plan) { console.log('Recovery Plan:\n' + formatPlan(plan)); return requestConfirmation('Proceed with recovery?'); }

**Verification:** Plan displays clearly; user can review before proceeding; confirmation required for execution

---

## Completion Checklist
- [ ] Subtask 1 complete
- [ ] Subtask 2 complete
- [ ] Task verification criteria met
