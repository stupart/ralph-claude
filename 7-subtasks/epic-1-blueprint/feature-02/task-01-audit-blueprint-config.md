# Subtasks: Audit BLUEPRINT_CONFIG Against LAYER_CAKE

**Parent Feature:** Visual Rendering Fixes
**Parent Epic:** Blueprint Integrity

---

## Subtask 1: Extract and Compare Data from Both Objects

**Action:** Create an audit document by extracting all cell contents, colors, and labels from BLUEPRINT_CONFIG and comparing them against corresponding LAYER_CAKE data (actors, phases, actions).

**Files:**
- CREATE: `/Users/tylerstupart/ralph-claude/docs/blueprint-audit-report.md` - Audit report with comparison tables and discrepancy list

**Code Pattern/API:** Markdown table format: | Cell Location | BLUEPRINT_CONFIG Value | LAYER_CAKE Value | Match? |

**Verification:** Audit report exists with comparison for all cells; each discrepancy has specific line references in v3-system-blueprint.html

---

## Subtask 2: Document Specific Discrepancies with Fix Recommendations

**Action:** For each mismatch found, document the exact fix needed including which value is correct (LAYER_CAKE is source of truth) and the code change required.

**Files:**
- MODIFY: `/Users/tylerstupart/ralph-claude/docs/blueprint-audit-report.md` - Add fix recommendations section

**Code Pattern/API:** N/A - documentation

**Verification:** Each discrepancy has a recommended fix; fixes reference LAYER_CAKE as authority; document is actionable

---

## Completion Checklist
- [ ] Subtask 1 complete
- [ ] Subtask 2 complete
- [ ] Task verification criteria met
