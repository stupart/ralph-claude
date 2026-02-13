# Subtasks: Implement Filesystem Artifact Scanning

**Parent Feature:** Session Recovery and Status Reconciliation
**Parent Epic:** Ralph Orchestration

---

## Subtask 1: Create Artifact Scanner Module

**Action:** Create artifact-scanner.js with scanArtifacts(projectPath) function that examines project folders (1-intake/ through 12-retrospective/) and catalogs existing artifacts.

**Files:**
- CREATE: `/Users/tylerstupart/ralph-claude/src/recovery/artifact-scanner.js` - Artifact scanning functions

**Code Pattern/API:** function scanArtifacts(path) { const layers = ['1-intake', '2-research', ...]; return layers.map(l => ({ layer: l, files: glob(path + '/' + l + '/*') })); }

**Verification:** Scanner finds all layer folders; counts artifacts in each; returns structured result

---

## Subtask 2: Add Completion Status Detection

**Action:** Enhance scanner to determine completion status for each layer: complete, partial, or empty, based on expected artifact counts.

**Files:**
- MODIFY: `/Users/tylerstupart/ralph-claude/src/recovery/artifact-scanner.js` - Add completion detection

**Code Pattern/API:** function getCompletionStatus(layer, fileCount) { const expected = EXPECTED_COUNTS[layer]; return fileCount >= expected ? 'complete' : fileCount > 0 ? 'partial' : 'empty'; }

**Verification:** Correctly identifies complete layers; detects partial completions; empty folders marked appropriately

---

## Completion Checklist
- [ ] Subtask 1 complete
- [ ] Subtask 2 complete
- [ ] Task verification criteria met
