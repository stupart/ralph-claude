# Subtasks: Implement Human Notification for Exceeded Retries

**Parent Feature:** Pass/Fail Routing and Cascade Logic
**Parent Epic:** Ralph Orchestration

---

## Subtask 1: Create Human Notifier Module

**Action:** Create human-notifier.js with notifyHuman(context) function that alerts when max retries exceeded, providing failure context and requesting manual decision.

**Files:**
- CREATE: `/Users/tylerstupart/ralph-claude/src/routing/human-notifier.js` - Human notification functions

**Code Pattern/API:** function notifyHuman(context) { return { type: 'humanRequired', message: formatNotification(context), options: ['override', 'abort', 'reassign'] }; }

**Verification:** Notification includes iteration history; includes failure reasons; provides decision options

---

## Subtask 2: Implement Decision Handling

**Action:** Add functions to handle human decisions: override (force continue), abort (stop project), reassign (change approach).

**Files:**
- MODIFY: `/Users/tylerstupart/ralph-claude/src/routing/human-notifier.js` - Add decision handlers

**Code Pattern/API:** function handleDecision(decision, context) { switch(decision) { case 'override': return forceAdvance(); case 'abort': return markAborted(); ... } }

**Verification:** Override forces continuation; abort stops project; reassign allows new approach; decisions are logged

---

## Completion Checklist
- [ ] Subtask 1 complete
- [ ] Subtask 2 complete
- [ ] Task verification criteria met
