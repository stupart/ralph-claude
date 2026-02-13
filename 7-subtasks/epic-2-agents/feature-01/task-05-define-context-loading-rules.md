# Subtasks: Define Context Loading Rules

**Parent Feature:** Planner Agent Prompt and Context Package
**Parent Epic:** Agent Specialization

---

## Subtask 1: Create Context Rules Document

**Action:** Create configuration document specifying exactly which files the Planner should read at each layer (L1-L7 and L12), implementing minimal context loading strategy.

**Files:**
- CREATE: `/Users/tylerstupart/ralph-claude/templates/agents/planner-context-rules.md` - Context loading rules by layer

**Code Pattern/API:** Table format: | Layer | Required Files | Optional Files | Excluded |

**Verification:** Rules exist for each Planner layer; L1 loads only input; later layers reference prior outputs; rules are specific file paths

---

## Subtask 2: Document Rationale and Implementation Notes

**Action:** Add rationale for minimal context loading (token efficiency, focus) and implementation notes for how to enforce these rules in the spawner.

**Files:**
- MODIFY: `/Users/tylerstupart/ralph-claude/templates/agents/planner-context-rules.md` - Add rationale and implementation notes

**Code Pattern/API:** Rationale section explaining why; Implementation section with code hints for spawner

**Verification:** Document explains why minimal context matters; implementation notes are actionable for spawner development

---

## Completion Checklist
- [ ] Subtask 1 complete
- [ ] Subtask 2 complete
- [ ] Task verification criteria met
