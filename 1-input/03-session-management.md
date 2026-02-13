# Session Management & Context Handoff

How Ralph maintains state across Claude session restarts.

---

## The Problem

Claude sessions have context limits. Long-running projects need to:
1. Know where they left off
2. Have relevant context loaded
3. Continue seamlessly
4. Not lose progress

---

## Solution: Filesystem as State + Structured Handoff

1. **`_status.md`** is the source of truth for position
2. **Folder structure** encodes what's done/pending
3. **Handoff prompt** loads relevant context at session start
4. **Commits** checkpoint progress to git

---

## _status.md Specification

Location: Project root
Updated: After every state change

```markdown
# Project Status

## Meta
- **Project:** {project_name}
- **Started:** {ISO date}
- **Last Updated:** {ISO timestamp}

## Current Position
- **Layer:** {1-10}
- **Layer Name:** {name}
- **Chunk:** {chunk-id or "N/A"}
- **Item:** {spec filename or "N/A"}
- **Iteration:** {N} of 3

## Layer Progress
- [x] Layer 1: Input
- [x] Layer 2: Decomposition
- [x] Layer 3: Synthesis
- [x] Layer 4: Outline
- [ ] Layer 5-7: Chunks
  - [x] chunk-01-auth ✓ (passed review)
  - [ ] chunk-02-onboarding (in progress)
    - [x] spec-ditl.md
    - [ ] spec-thought-exp.md ← current
    - [ ] spec-celebration.md
  - [ ] chunk-03-daily
- [ ] Layer 8: Integration
- [ ] Layer 9: Final Review
- [ ] Layer 10: Analysis

## Current Context
{Brief description of what's happening right now}

## Next Action
{Specific next thing to do}

## Blockers
{Any blockers, or "None"}

## Recent History
- {timestamp}: Completed spec-ditl.md, committed abc123
- {timestamp}: Started spec-thought-exp.md
- {timestamp}: {action}
```

---

## Session Start: Handoff Prompt

When starting a new Claude session, Ralph constructs this prompt:

```markdown
# Ralph V3 Session Start

## Project: {project_name}

You are continuing work on this project using the V3 layered methodology.

---

## Current Status

{Full contents of _status.md}

---

## Relevant Files

### Current Layer Artifacts
{List files in current layer's folder}

### Current Chunk (if applicable)
**Index:**
{Contents of current chunk's _index.md}

**Current Spec:**
{Contents of current spec file, if in Layer 6}

**Review (if any):**
{Contents of _review.md if exists and relevant}

---

## Your Task

Continue from the current position following V3 methodology:

1. **Verify position** - Check _status.md matches what you see
2. **Complete current item** - Follow the spec exactly
3. **Commit after each item** - Use format: `[L{N}] description`
4. **Update _status.md** - After every state change
5. **Request review** - When chunk complete, switch to GAN reviewer

### Layer-Specific Rules

{Insert rules for current layer from 02-layer-specs.md}

---

## Important

- Don't skip layers
- Don't move to next item until current is committed
- Update _status.md timestamps
- If blocked, document in _status.md and stop

Begin.
```

---

## Context Loading Rules

What to include in handoff based on current layer:

| Layer | Include |
|-------|---------|
| 1 | Previous brain dumps (if any) |
| 2 | All of /1-input/, decomposition progress |
| 3 | /2-decomposition/, synthesis progress |
| 4 | /3-synthesis/, outline progress |
| 5 | /4-outline/, current chunk _index.md |
| 6 | Chunk _index.md, current spec, recent code changes |
| 7 | Chunk _index.md, all specs, implementation summary |
| 8 | All chunk reviews, integration plan |
| 9 | Integration results, all reviews |
| 10 | Everything (retrospective needs full context) |

---

## Session End: Checkpoint

Before ending a session (context limit approaching):

1. **Commit any uncommitted work**
   ```
   [checkpoint] WIP: {description}

   Session ending due to context limit.
   Current position: Layer {N}, {details}
   ```

2. **Update _status.md**
   - Set `Current Context` to describe WIP state
   - Set `Next Action` to specific resume point
   - Add to `Recent History`

3. **Output handoff summary**
   ```
   SESSION CHECKPOINT
   ==================
   Layer: {N}
   Position: {details}
   Last commit: {hash}
   Next action: {specific task}

   To resume, start new session with:
   ralph resume {project_path}
   ```

---

## Commit as Checkpoint

Every commit is a potential resume point. Commit messages include enough context:

```
[L6] Implement login form validation

Chunk: chunk-01-auth
Spec: spec-login-validation.md
Status: Complete

Implemented:
- Email format validation
- Password strength requirements
- Error message display

Tests: 3 added, all passing
Next: spec-session-management.md
```

---

## Handling Interruptions

If session ends unexpectedly (crash, timeout):

1. Ralph checks git status on resume
2. If uncommitted changes:
   - Review changes
   - Either commit as checkpoint or discard
3. Read _status.md for position
4. Continue from last known good state

---

## Manual Override

Human can manually edit _status.md to:
- Skip to a different layer
- Mark items complete
- Reset iteration counters
- Add blockers

Ralph respects _status.md as source of truth.

---

## Visibility: Status Dashboard

For human monitoring, _status.md is designed to be:
- Readable at a glance
- Clear on current position
- Shows progress visually (checkboxes)
- Includes timestamps for debugging

Optional: Ralph can output periodic status updates:
```
STATUS UPDATE
=============
Layer 6: Implementation
Chunk: chunk-02-onboarding (2 of 5)
Item: spec-thought-exp.md
Progress: 60% (3/5 requirements done)
Time in chunk: 45 minutes
```

---

## Error Recovery

### Scenario: _status.md corrupted
1. Check git history for last good version
2. Reconstruct from folder structure + commits
3. Resume from reconstructed state

### Scenario: Folder structure doesn't match _status.md
1. Trust folder structure over _status.md
2. Update _status.md to match reality
3. Continue

### Scenario: Review failed 3 times
1. Escalate to previous layer (documented in _review.md)
2. Update _status.md to reflect escalation
3. Human may need to intervene

---

## Implementation Notes

### Ralph needs to:
1. Parse _status.md reliably
2. Update _status.md atomically
3. Construct handoff prompts from templates
4. Track context size and checkpoint proactively

### File watching:
- _status.md changes trigger UI updates (if dashboard exists)
- Commits trigger progress notifications

### Git integration:
- Auto-commit at layer boundaries
- Meaningful commit messages with metadata
- Branch per project? Or all on main?
