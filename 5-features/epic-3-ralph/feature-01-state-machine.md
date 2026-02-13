# Feature: Filesystem State Machine

## Overview
Implement the state machine that uses the filesystem as the primary persistence layer. Folder existence indicates layer completion, file existence indicates artifact completion, and _status.md tracks the exact current position within the Layer Cake flow.

## User Value
Filesystem-based state means project progress is human-readable, Git-compatible, and survives session crashes automatically. Users can inspect the folder structure at any time to see exactly what's been completed, and the system can resume from any interruption.

## Requirements
1. Define canonical folder structure matching LAYER_CAKE layers (1-input/, 2-decomposition/, etc.)
2. _status.md must track: current_layer, current_item (epic/feature/task), iteration_count, phase (planning/execution), last_agent, timestamp
3. Create state transition functions for advancing to next layer
4. Create state transition functions for iteration (staying at layer, incrementing count)
5. Create state transition functions for cascade (going back to earlier layer)
6. Folder creation must happen when layer is entered, not when completed
7. State must support position within nested hierarchy (which epic -> which feature -> which task)
8. State must track human gate status (pending, approved, rejected)
9. State must be queryable: getCurrentState(), isLayerComplete(), getProgress()
10. All state changes must be atomic (no partial updates)

## Technical Approach
1. Define _status.md schema with all required fields
2. Create StateManager module with read/write/transition functions
3. Implement folder structure validation against LAYER_CAKE
4. Create position tracking for nested hierarchy navigation
5. Add atomic write with temp file + rename pattern
6. Include state validation on read (detect corruption)

## Acceptance Criteria
- [ ] _status.md schema is defined and documented
- [ ] StateManager can read current state from _status.md
- [ ] StateManager can advance to next layer (L1 -> L2, etc.)
- [ ] StateManager can handle iteration (stay at layer, increment count)
- [ ] StateManager can handle cascade (go back to specified layer)
- [ ] Folder structure is created when entering a layer
- [ ] Nested position is tracked (current epic, feature, task)
- [ ] Human gate status is tracked for L3 and L7
- [ ] State changes are atomic (no partial writes)

## Planned Tasks
1. Design _status.md schema and document all fields
2. Implement StateManager.read() and StateManager.write()
3. Implement layer transition functions (advance, iterate, cascade)
4. Implement nested hierarchy position tracking
5. Add folder creation on layer entry
6. Test state machine with simulated layer progression

## Edge Cases
- **_status.md missing**: First run or file deleted - initialize to L1
- **_status.md corrupted**: Invalid JSON/markdown - attempt recovery or error with instructions
- **Folder exists but _status.md says earlier layer**: Trust _status.md for position, folders are evidence
- **Layer skipped**: Folders exist for L5 but not L4 - detect inconsistency, report error
- **Nested position out of bounds**: Task 5 of 3 - validate against actual artifact counts
- **Concurrent access**: Two Ralph instances - detect via lock file or timestamp

## Dependencies
- Epic 1 Feature 01 (LAYER_CAKE Data Audit) - need layer definitions for folder structure
