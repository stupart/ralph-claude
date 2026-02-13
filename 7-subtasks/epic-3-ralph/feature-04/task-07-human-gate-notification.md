# Subtasks: Implement Human Gate Notification Mechanism

**Parent Feature:** Pass/Fail Routing and Cascade Logic
**Parent Epic:** Ralph Orchestration Engine

---

## Subtask 1: Define WAITING_HUMAN State in Status Schema

**Action:** Add WAITING_HUMAN as a valid state in the _status.md schema with associated fields.

**Files:**
- MODIFY: `/Users/tylerstupart/ralph-claude/schemas/status-schema.md` - Add WAITING_HUMAN state definition

**Schema Addition:**
```yaml
state: WAITING_HUMAN
waiting_for:
  gate_type: "L3_SYNTHESIS" | "L7_PLAN"
  artifacts_pending_review:
    - path: string
      description: string
  waiting_since: ISO-8601 timestamp
  resume_command: string
```

**Verification:** WAITING_HUMAN is documented as valid state; schema includes gate type and pending artifacts list.

---

## Subtask 2: Create Human Gate Notification Template

**Action:** Design the notification message template displayed when a human gate is reached.

**Files:**
- CREATE: `/Users/tylerstupart/ralph-claude/templates/human-gate-notification.md` - Notification template

**Template Structure:**
```markdown
# Human Review Required

## Gate: {gate_type}

Ralph has completed {layer_name} and requires human approval before proceeding.

### Artifacts for Review

{for each artifact}
- **{artifact_name}**: {artifact_path}
  {brief_description}
{end for}

### Review Checklist

{gate_specific_checklist}

### To Approve and Continue

Run: `ralph resume --approve`

### To Request Changes

Run: `ralph resume --iterate "{feedback}"`

### To Abort

Run: `ralph abort`
```

**Verification:** Template includes artifacts list, checklist, and all three action commands.

---

## Subtask 3: Implement Human Gate Notifier Module

**Action:** Create the module that triggers notifications and updates state on human gates.

**Files:**
- CREATE: `/Users/tylerstupart/ralph-claude/src/routing/human-gate-notifier.js` - Notification logic

**API:**
```javascript
class HumanGateNotifier {
  // Called when reaching L3 or L7 gate
  async notifyGate(gateType, artifacts) {
    // 1. Update _status.md to WAITING_HUMAN
    // 2. Build notification from template
    // 3. Output to terminal with clear formatting
    // 4. Log gate entry for audit
  }

  // Called when human responds
  async handleResponse(response) {
    // response: 'approve' | 'iterate' | 'abort'
    // Update state accordingly
  }
}
```

**Verification:** Module updates _status.md; outputs formatted notification; handles all three response types.

---

## Subtask 4: Implement Terminal Output Formatting

**Action:** Create clear, visually distinct terminal output for human gate notifications.

**Files:**
- MODIFY: `/Users/tylerstupart/ralph-claude/src/routing/human-gate-notifier.js` - Add terminal formatting

**Output Format:**
```
═══════════════════════════════════════════════════════════
  HUMAN REVIEW REQUIRED - L3 Synthesis Gate
═══════════════════════════════════════════════════════════

Ralph has completed the synthesis phase and needs your approval.

Artifacts pending review:
  1. 3-synthesis/jtbd.md        - Jobs to be done analysis
  2. 3-synthesis/journeys.md    - User journey maps
  3. 3-synthesis/architecture.md - Technical architecture

To approve:  ralph resume --approve
To iterate:  ralph resume --iterate "your feedback"
To abort:    ralph abort

═══════════════════════════════════════════════════════════
```

**Verification:** Output uses box characters for visibility; lists artifacts clearly; shows all action commands.

---

## Subtask 5: Integrate with Router Module

**Action:** Connect human gate notifier to the routing logic for L3 and L7 transitions.

**Files:**
- MODIFY: `/Users/tylerstupart/ralph-claude/src/routing/router.js` - Add gate check before advancement

**Integration Points:**
- After L3 Judge PASS: Check if L3 gate required, call notifier
- After L7 Judge PASS: Check if L7 gate required, call notifier
- Gate check respects project_mode (plan_only always gates at L7)

**Verification:** Router calls notifier at L3 and L7 transitions; respects project mode settings.

---

## Subtask 6: Implement Resume Command Handler

**Action:** Create the handler for `ralph resume` command with approval/iterate/abort options.

**Files:**
- CREATE: `/Users/tylerstupart/ralph-claude/src/commands/resume-command.js` - Resume command handler

**Command Options:**
```bash
ralph resume --approve              # Continue to next phase
ralph resume --iterate "feedback"   # Route back with feedback
ralph resume --status               # Show current waiting state
```

**Verification:** All three options work correctly; --iterate includes feedback in routing context; state is updated appropriately.
