# Tasks: Session Recovery and Status Reconciliation

## Task 1: Implement _status.md Detection and Parsing

**What it accomplishes:** Creates RecoveryManager module that detects existing _status.md, validates its format, and extracts current state including handling of missing or corrupted files.

**Time estimate:** ~20 minutes

**Files to create/modify:**
- `/Users/tylerstupart/ralph-claude/src/recovery/recovery-manager.js` (create)

**Dependencies:** Epic 3 Feature 01 (state schema)

**Verification:** Detects existing _status.md; parses valid files correctly; handles missing file gracefully; detects corruption.

---

## Task 2: Implement Filesystem Artifact Scanning

**What it accomplishes:** Creates scanner that examines project folders to detect what artifacts exist, building a picture of actual progress independent of _status.md.

**Time estimate:** ~25 minutes

**Files to create/modify:**
- `/Users/tylerstupart/ralph-claude/src/recovery/artifact-scanner.js` (create)

**Dependencies:** None

**Verification:** Scanner finds all layer folders; counts artifacts in each; detects partial completions; returns structured result.

---

## Task 3: Implement Reconciliation Logic

**What it accomplishes:** Creates comparison between _status.md state and scanned filesystem state, identifying discrepancies: status ahead of files, files ahead of status, or consistent.

**Time estimate:** ~25 minutes

**Files to create/modify:**
- `/Users/tylerstupart/ralph-claude/src/recovery/reconciler.js` (create)

**Dependencies:** Tasks 1-2 (need both status and scan)

**Verification:** Detects status ahead of filesystem; detects filesystem ahead of status; produces clear discrepancy report.

---

## Task 4: Generate and Display Recovery Plan

**What it accomplishes:** Creates human-readable recovery plan summarizing what was found, what discrepancies exist, and what will happen if recovery proceeds.

**Time estimate:** ~20 minutes

**Files to create/modify:**
- `/Users/tylerstupart/ralph-claude/src/recovery/recovery-planner.js` (create)

**Dependencies:** Task 3 (need reconciliation results)

**Verification:** Plan is human-readable; explains discrepancies clearly; states proposed resume point; states what data will be used.

---

## Task 5: Implement Resume Execution

**What it accomplishes:** Creates function to execute recovery plan: update _status.md to correct state and resume agent spawning from the identified resume point.

**Time estimate:** ~20 minutes

**Files to create/modify:**
- `/Users/tylerstupart/ralph-claude/src/recovery/recovery-manager.js` (extend with execute function)

**Dependencies:** Tasks 1-4, Epic 3 Feature 02 (agent spawning)

**Verification:** Recovery updates _status.md correctly; spawns correct agent for resume layer; handoff context is reconstructed.

---

## Task 6: Add Clean Start Option and Logging

**What it accomplishes:** Implements "clean start" flag that ignores existing state and starts fresh at L1, plus comprehensive logging of all recovery decisions and actions.

**Time estimate:** ~15 minutes

**Files to create/modify:**
- `/Users/tylerstupart/ralph-claude/src/recovery/recovery-manager.js` (extend with clean start and logging)

**Dependencies:** Task 5 (need recovery implementation)

**Verification:** Clean start flag wipes _status.md and starts at L1; all recovery decisions logged with timestamps; logs are useful for debugging.
