# Subtasks: Add Clipboard Copy and Toast Notifications

**Parent Feature:** JSON Export/Import for Ralph
**Parent Epic:** Blueprint Integrity

---

## Subtask 1: Implement Clipboard Copy Button

**Action:** Add a "Copy to Clipboard" button that copies the sanitized JSON to clipboard using navigator.clipboard.writeText().

**Files:**
- MODIFY: `/Users/tylerstupart/ralph-claude/v3-system-blueprint.html` - Add copy button HTML and copyToClipboard() function

**Code Pattern/API:** navigator.clipboard.writeText(JSON.stringify(sanitizeForExport(), null, 2)).then(() => showToast('Copied!'));

**Verification:** Copy button visible; clicking copies JSON to clipboard; paste produces valid JSON

---

## Subtask 2: Implement Toast Notification Component

**Action:** Create a toast notification component with showToast(message, type) function supporting success/error/info types, auto-dismiss after 3 seconds, and CSS animations.

**Files:**
- MODIFY: `/Users/tylerstupart/ralph-claude/v3-system-blueprint.html` - Add toast HTML container, CSS, and showToast() function

**Code Pattern/API:** <div id="toast-container"></div>; showToast(msg, type='success'); setTimeout(() => toast.remove(), 3000);

**Verification:** Toast appears on export, import, and copy actions; success is green, error is red; toast auto-dismisses after 3 seconds

---

## Completion Checklist
- [ ] Subtask 1 complete
- [ ] Subtask 2 complete
- [ ] Task verification criteria met
