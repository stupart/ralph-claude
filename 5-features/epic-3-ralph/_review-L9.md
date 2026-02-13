# Review: L9 Feature Review - Epic 3: Orchestration Layer (Ralph)

**Date:** 2026-01-29
**Reviewer:** Judge Agent
**Iteration:** 1 of 3
**Review Type:** Build

---

## Verdict: ITERATE

---

## Summary

Epic 3 delivers a functional skeleton of the orchestration layer with a working state machine, router, validator, agent spawner, and Ralph coordinator. However, Feature 05 (Session Recovery) is entirely missing -- no RecoveryManager module exists anywhere in the codebase. Several acceptance criteria across the other features are also unmet, and test coverage is limited to a single module.

---

## Issues Found

### Issue 1: Feature 05 (Session Recovery) Is Completely Missing

- **Severity:** MAJOR
- **Location:** `/Users/tylerstupart/ralph-claude/lib/` (no recovery.js or session-recovery.js exists)
- **Category:** Completeness

**Description:**
Feature 05 specifies a RecoveryManager module with `reconcile()` and `resume()` functions, filesystem scanning for artifact evidence, status/filesystem mismatch detection, human-readable recovery summaries, clean start option, and recovery logging. None of this exists. There is no recovery module, no reconciliation logic, and no filesystem scanning anywhere in the codebase.

**Evidence:**
Searched for `recovery`, `reconcil`, `RecoveryManager` across `/lib/` -- zero results. Glob searches for `**/recovery*.js` and `**/session*.js` returned nothing relevant. The `ralph.js` `initialize()` method does a basic state read but performs zero reconciliation against actual filesystem state.

**Impact:**
Session recovery is a core value proposition of the filesystem-based approach. Without it, any crash or interruption during a layer leaves the project in an unknown state requiring manual intervention. This defeats the purpose of filesystem-based persistence.

**Recommendation:**
Implement the RecoveryManager as specified: filesystem scanning, status comparison, recovery plan generation, human confirmation, clean start option.

---

### Issue 2: No Tests for Validator, Router, AgentSpawner, or Ralph

- **Severity:** MAJOR
- **Location:** `/Users/tylerstupart/ralph-claude/tests/` (only `state-machine.test.js` exists)
- **Category:** Quality

**Description:**
Only the StateManager has tests (14 tests, all passing). The Validator, Router, AgentSpawner, and Ralph orchestrator have zero test coverage. The feature specs all include "Test" as planned tasks and the acceptance criteria require verified behavior.

**Evidence:**
`ls /Users/tylerstupart/ralph-claude/tests/` returns only `state-machine.test.js`. No test files exist for any other module.

**Impact:**
Without tests, there is no verification that the Router correctly handles MINOR/MAJOR/ESCALATE routing, that the Validator enforces tier-adjusted minimums, or that the AgentSpawner correctly maps layers to agents. The code may work but is unverified against acceptance criteria.

**Recommendation:**
Create test files for each module: `validator.test.js`, `router.test.js`, `agent-spawner.test.js`, `ralph.test.js`. Focus on acceptance criteria scenarios.

---

### Issue 3: Validator Missing Sections Treated as Warnings, Not Errors

- **Severity:** MINOR
- **Location:** `/Users/tylerstupart/ralph-claude/lib/validator.js`, lines 216-229
- **Category:** Quality

**Description:**
Feature 03 acceptance criteria state: "Missing required fields are flagged as errors" and "Template compliance is checked (required sections present)." But in `validateFeatureFile()`, missing required sections are added as warnings (`result.addWarning`), not errors. This means validation will PASS even when required sections like "acceptance criteria" or "requirements" are absent.

**Evidence:**
Line 224-228 of validator.js: `result.addWarning('Missing sections: ${missingKeys.join(', ')}', filePath)`. The spec says "Missing required fields are flagged as errors" (Feature 03, acceptance criterion 6).

**Impact:**
Artifacts with missing required sections will pass validation and proceed to the next layer, defeating the purpose of automated quality gates.

**Recommendation:**
Change `addWarning` to `addError` for missing required sections, or at minimum distinguish between "recommended" and "required" sections.

---

### Issue 4: Atomic Write Has No Error Recovery

- **Severity:** MINOR
- **Location:** `/Users/tylerstupart/ralph-claude/lib/state-machine.js`, lines 99-113
- **Category:** Quality

**Description:**
The `write()` method implements the temp-file-then-rename pattern for atomic writes, which is correct. However, there is no cleanup of the temp file if `fs.rename()` fails, and no retry logic. If the rename fails (disk full, permissions), the `.tmp` file is left on disk and subsequent reads will not detect this partial state.

**Evidence:**
Lines 110-112: `await fs.writeFile(tempPath, content, 'utf8'); await fs.rename(tempPath, this.statusPath);` -- no try/catch around rename, no temp file cleanup on failure.

**Impact:**
On rename failure, orphaned `.tmp` files accumulate. Not catastrophic but violates the "no partial updates" acceptance criterion since the system does not handle the partial state.

**Recommendation:**
Wrap rename in try/catch. On failure, attempt to delete the temp file and re-throw with context.

---

### Issue 5: State Parsing Loses Gate Information on Round-Trip

- **Severity:** MINOR
- **Location:** `/Users/tylerstupart/ralph-claude/lib/state-machine.js`, lines 118-168
- **Category:** Quality

**Description:**
The `parseStatusFile()` method does not parse the "Gates" section back from the formatted markdown. `setStateValue()` only handles "meta" and "current position" sections. Gate status written by `formatStatusFile()` (lines 205-208) is never read back by `parseStatusFile()`. This means after a write-then-read cycle, gate approvals are lost and reset to the DEFAULT_STATE values (both pending).

**Evidence:**
The `setStateValue()` switch statement (line 145) has cases for `'meta'` and `'current position'` but the `default` case is a no-op comment. The gates section header `## Gates` lowercases to `'gates'` which hits the default no-op. After write + read, `state.gates.L3.status` reverts to `'pending'` regardless of prior approval.

**Impact:**
Human gate approvals do not survive session restarts. After approving L3 and restarting, the system will demand re-approval. This is a functional bug that contradicts the filesystem-persistence model.

**Recommendation:**
Add gate parsing in `setStateValue()` for the `'gates'` section, or restructure to use JSON persistence instead of markdown parsing.

---

### Issue 6: DEFAULT_STATE Uses Runtime Timestamps as Defaults

- **Severity:** MINOR
- **Location:** `/Users/tylerstupart/ralph-claude/lib/state-machine.js`, lines 14-17
- **Category:** Quality

**Description:**
`DEFAULT_STATE` is defined at module load time with `new Date().toISOString()` for `started` and `lastUpdated`. Since this is a module-level constant, every new project initialized during the same process run shares the same "started" timestamp -- the timestamp of when the module was first loaded, not when the project was created.

**Evidence:**
Lines 16-17: `started: new Date().toISOString(), lastUpdated: new Date().toISOString()` are evaluated once at `require()` time.

**Impact:**
Multiple projects created in the same process session will have identical `started` timestamps. The shallow spread `{ ...DEFAULT_STATE }` in `read()` only creates a shallow copy, so nested objects (meta, position, gates) share references.

**Recommendation:**
Use a factory function `createDefaultState()` that generates fresh timestamps and deep-copies nested objects on each call.

---

### Issue 7: Router MAX_RETRIES Check Uses >= Instead of >

- **Severity:** MINOR
- **Location:** `/Users/tylerstupart/ralph-claude/lib/router.js`, line 56
- **Category:** Quality

**Description:**
The Router checks `if (iteration >= MAX_RETRIES)` where MAX_RETRIES is 3. This means the escalation/human notification triggers on the 3rd iteration, not after 3 retries. The spec says "enforce maxRetries (3)" meaning 3 attempts should be allowed before escalation.

**Evidence:**
Line 56: `if (iteration >= MAX_RETRIES)`. With MAX_RETRIES=3, iteration counts 1, 2, 3 -- the check fires when iteration is 3, allowing only 2 full retry attempts before escalation.

**Impact:**
Teams get one fewer retry than expected. The spec says max 3 retries; implementation allows only 2.

**Recommendation:**
Change to `iteration > MAX_RETRIES` to allow 3 full iterations before escalation.

---

### Issue 8: AgentSpawner Does Not Actually Spawn Agents

- **Severity:** MINOR
- **Location:** `/Users/tylerstupart/ralph-claude/lib/agent-spawner.js`
- **Category:** Completeness

**Description:**
The AgentSpawner creates spawn configurations but has no `spawn()` or `execute()` method. The `ralph.js` orchestrator's `runLayerCycle()` delegates agent execution to an external `agentExecutor` callback. This is an acceptable architectural choice but Feature 02 acceptance criteria include "Agent outputs are captured on completion" and "Agent spawning is logged with timestamps." The logging happens in ralph.js but output capture is entirely delegated.

**Evidence:**
AgentSpawner has `createSpawnConfig()`, `getAgentType()`, `getToolPermissions()`, `loadPromptTemplate()`, `assembleContext()`, `validateToolUsage()`, and `buildLayerInstructions()` -- but no actual spawning. Feature 02 spec says "Handle agent completion and capture outputs" and "Include timeout handling for agents that stall."

**Impact:**
Timeout handling for stalled agents is not implemented anywhere. Output capture depends entirely on the external executor conforming to an undocumented interface contract.

**Recommendation:**
Document the executor interface contract. Add timeout handling wrapper in Ralph or AgentSpawner. Consider at minimum a `spawn()` method that wraps the executor with timeout.

---

## What's Working Well

- **State machine core is solid.** All 14 tests pass. The advance/iterate/cascade transitions work correctly. Human gate blocking/approval logic functions as designed. Atomic writes use the correct temp+rename pattern.
- **Router cascade logic is well-structured.** The MINOR/MAJOR/ESCALATE routing follows the LAYER_CAKE onFail definitions. The escalation-on-max-retries pattern (MINOR -> MAJOR -> ESCALATE -> human) is a thoughtful design that prevents infinite loops.
- **Layer-to-agent mapping is correct and complete.** L1-L7 and L12 map to planner, L8 to builder, L9-L11 to judge. Tool permissions are granular and enforce the correct constraints (judge cannot Write/Edit, builder has full access).
- **Ralph orchestrator provides clean event-driven architecture.** The handler registration pattern enables extensibility without tight coupling. The `runLayerCycle` / `runProject` methods show clear flow control.

---

## Scope Coverage Summary

| Feature | Status | Key Gaps |
|---------|--------|----------|
| F01: State Machine | Partial | Gate parsing bug, DEFAULT_STATE timestamp issue |
| F02: Agent Spawning | Partial | No actual spawning, no timeout handling, no output capture |
| F03: Output Validation | Partial | Missing sections as warnings not errors |
| F04: Routing Logic | Mostly Complete | Off-by-one on max retries |
| F05: Session Recovery | Missing | Entire feature not implemented |

---

## Cascade Decision

| Issue Severity | Count | Cascade Target |
|---------------|-------|----------------|
| MINOR | 6 | L8 (fix and retry) |
| MAJOR | 2 | L6 (spec revision needed for F05) |

**Primary cascade:** Return to **L8** because the majority of issues are implementation bugs and missing test coverage that can be fixed in code. Feature 05 (Session Recovery) is entirely missing and needs implementation, but the spec already exists at L5/L6 level so no re-planning is needed -- just building.

---

## Checklist for Next Iteration

- [ ] Implement RecoveryManager module (Feature 05) with reconcile(), resume(), clean start
- [ ] Add gate parsing to `parseStatusFile()` so approvals survive restarts
- [ ] Fix DEFAULT_STATE to use a factory function with fresh timestamps and deep copies
- [ ] Change missing required sections from warnings to errors in Validator
- [ ] Fix MAX_RETRIES off-by-one (use `>` instead of `>=`)
- [ ] Add error recovery to atomic write (cleanup temp file on rename failure)
- [ ] Create tests for Validator, Router, AgentSpawner, and Ralph modules
- [ ] Add timeout handling for agent execution
- [ ] Document the agentExecutor interface contract

---

## Reviewer Notes

The architecture is sound and the code is well-organized. The main gap is Feature 05 being entirely absent -- this is not a case of partial implementation but rather zero implementation. The state machine round-trip bug (gates not parsing) is the most dangerous of the MINOR issues because it silently discards approved gate state, which will cause user frustration in practice.

The decision to delegate actual agent spawning to an external executor is architecturally reasonable for a system that will run inside Claude Code, but the lack of any interface documentation or contract makes it fragile. The executor needs at minimum a documented return type and timeout behavior.

Test coverage at 1-of-5 modules (20%) is insufficient for an orchestration layer that the entire methodology depends on.
