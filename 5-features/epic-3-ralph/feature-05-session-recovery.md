# Feature: Session Recovery and Status Reconciliation

## Overview
Implement crash recovery that can resume from any interruption by reconciling _status.md with the actual filesystem state. This handles scenarios where the session ended mid-layer, mid-agent, or at various completion states.

## User Value
Session recovery means users never lose progress due to crashes, timeouts, or interruptions. They can stop and resume at any time, and the system picks up exactly where it left off without requiring manual intervention or status updates.

## Requirements
1. On startup, detect if _status.md exists and represents interrupted session
2. Validate _status.md against actual folder contents (reconciliation)
3. Detect artifacts created since last status update (incomplete layer)
4. Determine correct resume point based on reconciled state
5. Handle case where _status.md is ahead of filesystem (status updated, work not saved)
6. Handle case where filesystem is ahead of _status.md (work saved, status not updated)
7. Provide human-readable recovery summary (what was found, what will happen)
8. Allow human to confirm or override recovery decision
9. Support "clean start" option that ignores existing state
10. Log recovery decisions for debugging

## Technical Approach
1. Create RecoveryManager module with reconcile() and resume() functions
2. Implement filesystem scanning to detect existing artifacts
3. Compare scanned state against _status.md
4. Generate recovery plan describing what will happen
5. Present recovery plan to user before executing
6. Support flags for automatic vs interactive recovery

## Acceptance Criteria
- [ ] Recovery detects existing _status.md and reads current state
- [ ] Recovery scans filesystem for artifact evidence
- [ ] Recovery detects and reports status/filesystem mismatches
- [ ] Recovery generates clear summary of what was found
- [ ] Recovery correctly identifies resume point
- [ ] Human can confirm or override recovery plan
- [ ] "Clean start" option wipes state and starts fresh
- [ ] Recovery decisions are logged

## Planned Tasks
1. Implement _status.md detection and parsing
2. Implement filesystem artifact scanning
3. Implement reconciliation logic (compare status vs filesystem)
4. Generate and display recovery plan
5. Implement resume execution from recovered state
6. Add clean start option and logging

## Edge Cases
- **_status.md missing, folders exist**: Previous run didn't create status - infer state from folders
- **_status.md says L8, but L7 folder incomplete**: Status ahead of reality - roll back status
- **Multiple incomplete layers**: L4 started, L5 partially done - resume at earliest incomplete
- **Corrupted artifact files**: Files exist but are malformed - report but don't crash
- **Git conflicts**: Merged branch has different state - detect and request human decision
- **Mid-subtask interruption**: Task partially complete - resume at subtask level if possible
- **Old _status.md**: Status file is very old (days) - warn user, confirm before resuming

## Dependencies
- Epic 3 Feature 01 (State machine) - recovery updates state
- Epic 3 Feature 03 (Output validation) - validation helps determine completeness
