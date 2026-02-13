# Subtasks: Implement Iteration Counting and Max Retry Enforcement

**Parent Feature:** Pass/Fail Routing and Cascade Logic
**Parent Epic:** Ralph Orchestration

---

## Subtask 1: Create Retry Tracker Module

**Action:** Create retry-tracker.js that tracks iteration counts per layer and enforces maxRetries from LAYER_CAKE.failCascade.

**Files:**
- CREATE: `/Users/tylerstupart/ralph-claude/src/routing/retry-tracker.js` - Retry tracking functions

**Code Pattern/API:** function checkRetryLimit(layer, count) { const max = LAYER_CAKE.failCascade.maxRetries; return count < max; }

**Verification:** First iteration (count=0) is allowed; third failure (count=3) triggers max retry; count tracked per layer

---

## Subtask 2: Integrate Max Retry into Routing

**Action:** Modify router to check retry limits before routing iteration, triggering human notification when maxRetries exceeded.

**Files:**
- MODIFY: `/Users/tylerstupart/ralph-claude/src/routing/router.js` - Add retry limit check

**Code Pattern/API:** if (!RetryTracker.checkRetryLimit(layer, iterationCount)) { return { action: 'humanNotification', reason: 'Max retries exceeded' }; }

**Verification:** Third failure triggers max retry notification; count resets after layer change; notification includes context

---

## Completion Checklist
- [ ] Subtask 1 complete
- [ ] Subtask 2 complete
- [ ] Task verification criteria met
