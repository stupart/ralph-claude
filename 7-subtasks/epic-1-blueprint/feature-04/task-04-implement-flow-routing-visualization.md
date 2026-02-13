# Subtasks: Implement Flow Routing Visualization

**Parent Feature:** Layer Detail Modal Enhancement
**Parent Epic:** Blueprint Integrity

---

## Subtask 1: Create Flow Section with Pass/Fail Routing

**Action:** Implement renderFlowSection(layer) that displays onPass target (green) and onFail routing including handling of complex onFail objects with minor/major/escalate.

**Files:**
- MODIFY: `/Users/tylerstupart/ralph-claude/v3-system-blueprint.html` - Add renderFlowSection() function

**Code Pattern/API:** Check if layer.onFail is object or string; render each routing option with appropriate styling: {minor: yellow, major: orange, escalate: red}

**Verification:** Flow section shows onPass with green styling; simple onFail shows single target; complex onFail shows all three cascade options

---

## Subtask 2: Add Color-Coded CSS for Flow Routing

**Action:** Add CSS classes for flow routing visualization: .flow-pass (green), .flow-minor (yellow), .flow-major (orange), .flow-escalate (red) with arrow indicators.

**Files:**
- MODIFY: `/Users/tylerstupart/ralph-claude/v3-system-blueprint.html` - Add flow routing CSS

**Code Pattern/API:** .flow-pass { color: #28a745; } .flow-minor { color: #ffc107; } .flow-major { color: #fd7e14; } .flow-escalate { color: #dc3545; }

**Verification:** Pass routing is green; cascade options are color-coded; target layer IDs are clearly displayed

---

## Completion Checklist
- [ ] Subtask 1 complete
- [ ] Subtask 2 complete
- [ ] Task verification criteria met
