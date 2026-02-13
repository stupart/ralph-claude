# Subtasks: Implement Reconciliation Logic

**Parent Feature:** Session Recovery and Status Reconciliation
**Parent Epic:** Ralph Orchestration

---

## Subtask 1: Create Reconciler Module

**Action:** Create reconciler.js with reconcile(statusState, scanResult) function that compares _status.md state against filesystem artifacts.

**Files:**
- CREATE: `/Users/tylerstupart/ralph-claude/src/recovery/reconciler.js` - Reconciliation logic

**Code Pattern/API:** function reconcile(status, scan) { const statusLayer = layerToNumber(status.current_layer); const scanLayer = findHighestCompleteLayer(scan); return compare(statusLayer, scanLayer); }

**Verification:** Detects status ahead of filesystem; detects filesystem ahead of status; identifies consistent state

---

## Subtask 2: Generate Discrepancy Report

**Action:** Add generateReport(reconciliation) function that produces a clear discrepancy report identifying what's mismatched and why.

**Files:**
- MODIFY: `/Users/tylerstupart/ralph-claude/src/recovery/reconciler.js` - Add report generation

**Code Pattern/API:** function generateReport(result) { return { status: result.type, details: result.discrepancies, recommendation: getRecommendation(result) }; }

**Verification:** Report is clear and actionable; identifies specific discrepancies; provides recommendation

---

## Completion Checklist
- [ ] Subtask 1 complete
- [ ] Subtask 2 complete
- [ ] Task verification criteria met
