# Subtasks: Implement Project Mode Field

**Parent Feature:** Filesystem State Machine
**Parent Epic:** Ralph Orchestration Engine

---

## Subtask 1: Define Project Mode Types in Schema

**Action:** Add project_mode field definition to the _status.md schema with all valid values.

**Files:**
- MODIFY: `/Users/tylerstupart/ralph-claude/schemas/status-schema.md` - Add project_mode field

**Schema Addition:**
```yaml
project_mode:
  type: enum
  values:
    - plan_only    # Run L1-L7, stop at L7 human gate, do not execute
    - full_run     # Run L1-L12 completely
    - execute_only # Start at L8 with existing L7 artifacts, run L8-L12
  default: full_run
  set_at: L1 intake
  immutable_after: L2
```

**Verification:** Schema documents all three modes; default is full_run; notes when mode is set.

---

## Subtask 2: Implement Mode Field in StateManager

**Action:** Add read/write support for project_mode in the StateManager.

**Files:**
- MODIFY: `/Users/tylerstupart/ralph-claude/src/state/state-manager.js` - Add mode field handling

**API Additions:**
```javascript
class StateManager {
  // Get current project mode
  getProjectMode() { }

  // Set project mode (only valid at L1-L2)
  setProjectMode(mode) {
    if (this.currentLayer > 2) {
      throw new Error('Project mode cannot be changed after L2');
    }
    // Validate mode is valid enum
    // Write to _status.md
  }

  // Check if mode allows proceeding to layer
  canProceedToLayer(targetLayer) {
    if (this.mode === 'plan_only' && targetLayer > 7) return false;
    if (this.mode === 'execute_only' && targetLayer < 8) return false;
    return true;
  }
}
```

**Verification:** getProjectMode returns current mode; setProjectMode enforces timing; canProceedToLayer respects mode.

---

## Subtask 3: Create Mode-Specific Transition Rules

**Action:** Implement transition logic that respects project mode boundaries.

**Files:**
- CREATE: `/Users/tylerstupart/ralph-claude/src/state/mode-transitions.js` - Mode-aware transitions

**Transition Rules:**
```javascript
const modeTransitions = {
  plan_only: {
    allowedLayers: [1, 2, 3, 4, 5, 6, 7],
    terminalLayer: 7,
    terminalMessage: 'Plan complete. Use full_run or execute_only to build.'
  },
  full_run: {
    allowedLayers: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    terminalLayer: 12,
    terminalMessage: 'Project complete.'
  },
  execute_only: {
    allowedLayers: [8, 9, 10, 11, 12],
    startLayer: 8,
    requiresArtifacts: ['7-subtasks/'],
    terminalLayer: 12,
    terminalMessage: 'Execution complete.'
  }
};
```

**Verification:** Each mode has defined layer boundaries; execute_only requires L7 artifacts.

---

## Subtask 4: Implement execute_only Artifact Validation

**Action:** Add validation that execute_only mode can only start if L7 artifacts exist.

**Files:**
- MODIFY: `/Users/tylerstupart/ralph-claude/src/state/mode-transitions.js` - Add artifact check
- MODIFY: `/Users/tylerstupart/ralph-claude/src/state/state-manager.js` - Call validation on mode set

**Validation:**
```javascript
function validateExecuteOnlyStart() {
  // Check 7-subtasks/ directory exists
  // Check at least one subtask file exists per task
  // Return { valid: boolean, missingArtifacts: [] }
}
```

**Verification:** execute_only mode fails to start without L7 artifacts; specific missing items reported.

---

## Subtask 5: Add Mode Setting to L1 Intake

**Action:** Ensure project mode is captured during L1 intake, either from user input or config.

**Files:**
- MODIFY: `/Users/tylerstupart/ralph-claude/templates/agents/planner-L1.md` - Add mode selection prompt
- MODIFY: `/Users/tylerstupart/ralph-claude/1-input/project-config.md` - Add mode field

**Intake Options:**
- User specifies mode in initial prompt
- Mode is read from project-config.md if present
- Default to full_run if not specified
- Planner confirms mode in L1 output

**Verification:** L1 prompt asks about or acknowledges mode; mode is written to _status.md by end of L1.

---

## Subtask 6: Implement Terminal Layer Behavior

**Action:** Add behavior for when project reaches terminal layer based on mode.

**Files:**
- MODIFY: `/Users/tylerstupart/ralph-claude/src/state/state-manager.js` - Add terminal check
- MODIFY: `/Users/tylerstupart/ralph-claude/src/routing/router.js` - Handle terminal layer

**Terminal Behavior:**
- plan_only at L7: Output completion message, halt
- full_run at L12: Output completion message, halt
- execute_only at L12: Output completion message, halt

**Verification:** Each mode halts at correct layer; appropriate completion message displayed.
