# Subtasks: Calculate and Display Time Estimates

**Parent Feature:** Hierarchy Calculator with Tier Presets
**Parent Epic:** Blueprint Integrity

---

## Subtask 1: Create Time Estimation Function

**Action:** Implement calculateTimeEstimate(subtaskCount) function using LAYER_CAKE.hierarchy timeScale data to estimate project duration based on subtask count.

**Files:**
- MODIFY: `/Users/tylerstupart/ralph-claude/v3-system-blueprint.html` - Add calculateTimeEstimate() function

**Code Pattern/API:** function calculateTimeEstimate(count) { const hoursPerSubtask = 0.5; const totalHours = count * hoursPerSubtask; return formatDuration(totalHours); }

**Verification:** Function returns formatted duration string; estimate scales with subtask count; uses LAYER_CAKE.hierarchy if available

---

## Subtask 2: Display Time Estimate with Disclaimer

**Action:** Add time estimate display element below subtask count, update it when inputs change, and include "approximate" disclaimer text.

**Files:**
- MODIFY: `/Users/tylerstupart/ralph-claude/v3-system-blueprint.html` - Add time display HTML and update logic

**Code Pattern/API:** <div class="time-estimate">Estimated time: <span id="estimate">{value}</span> <small>(approximate)</small></div>

**Verification:** Time estimate displays below subtask count; estimate updates as inputs change; disclaimer is visible

---

## Completion Checklist
- [ ] Subtask 1 complete
- [ ] Subtask 2 complete
- [ ] Task verification criteria met
