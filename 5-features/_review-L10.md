# L10 Epic Integration Review

## Overall Verdict: PASS

All three epics demonstrate strong internal cohesion. There are a handful of minor inconsistencies (primarily naming mismatches between the HTML blueprint actor terminology and the orchestration code), but nothing that would prevent the system from functioning as designed. The cross-epic integration is also solid -- the 12-layer structure is consistently defined across all three epics with only cosmetic differences.

---

## Epic 1 Integration: PASS

**Features reviewed:** Validation script (F01), Blueprint HTML (F02), Export/Import (F03), Hierarchy calculator (F05)

### Does the validation script validate what the blueprint renders?

Yes. The validation script at `/Users/tylerstupart/ralph-claude/scripts/validate-layer-cake.js` extracts the `LAYER_CAKE` object from `/Users/tylerstupart/ralph-claude/docs/v3-system-blueprint.html` and validates:
- All 12 layers with required fields (`id`, `name`, `phase`, `actor`, `action`, `description`, `outputs`, `check`, `reviewType`, `humanGate`, `onPass`, `onFail`, `prompt`)
- 6 actors (`ralph_start`, `planner`, `builder`, `reviewer`, `ralph_check`, `human`)
- 4 hierarchy levels (`epic`, `feature`, `task`, `subtask`)
- 3 gate types (`humanApproval`, `ganPlanReview`, `ganBuildReview`)
- Fail cascade rules with `minor`, `major`, `escalate`, `maxRetries`

The validator correctly targets the same data structure the blueprint renders. The manual extraction fallback (line 130) is a pragmatic design choice given the complexity of parsing JS objects from HTML.

### Does the export function export what the blueprint contains?

Yes. The `sanitizeForExport()` function (line 1388 of the HTML) deep-clones the `LAYER_CAKE` object, replaces functions with descriptive strings, and adds export metadata. The `importLayerCake()` function validates the required keys (`meta`, `actors`, `hierarchy`, `layers`, `gates`, `failCascade`) and checks for exactly 12 layers. This matches the LAYER_CAKE structure.

### Does the hierarchy calculator connect to the tier system?

Yes. The `TIER_PRESETS` (line 1319 of HTML) defines `micro`, `small`, `medium`, `large` tiers with `epics`, `features`, `tasks`, `subtasks` counts. The `getTierTotal()` function calculates total minimum subtasks. The hierarchy section of LAYER_CAKE defines: epic (min 3), feature (min 3), task (min 3), subtask (min 2) -- these match the `small` tier preset exactly.

### Are BLUEPRINT_CONFIG and LAYER_CAKE synchronized?

Yes. `BLUEPRINT_CONFIG.layers` lists all 12 layers `['L1'...'L12']`. The `BLUEPRINT_CONFIG.rows` map actors to layer actions, and these correctly correspond to the `actor` fields in LAYER_CAKE's layer definitions (planner for L1-L7, builder for L8, reviewer for L9-L11, planner for L12).

### Minor issue noted

The validation script's `REQUIRED_ACTORS` includes `ralph_start`, `ralph_check`, and `human` -- these are "meta-actors" in the blueprint's visualization but not referenced as `actor` values in any layer definition. The layers use only `planner`, `builder`, and `reviewer`. This is fine for completeness validation but could cause confusion about what constitutes an "actor."

---

## Epic 2 Integration: PASS

**Features reviewed:** Planner prompt (planner-base.md), Builder prompt (builder.md), Judge prompt (judge-base.md), Layer-specific fragments (judge-L5-features.md, etc.), Handoff protocol, Tool permissions document

### Does the Planner's output match what the Judge expects to review?

Yes. The Planner creates structured artifacts in numbered folders (e.g., `3-synthesis/jtbd.md`, `4-epics/epics.md`, `5-features/{epic}/feature-*.md`). The Judge's layer-specific prompts (e.g., `judge-L5-features.md`) explicitly reference these exact paths and check for the same required fields the Planner is instructed to produce (overview, requirements, acceptance criteria, planned tasks).

The minimum counts are consistent:
- Planner base: "Epics: Minimum 3, Features: Minimum 3 per epic, Tasks: Minimum 3 per feature, Subtasks: Minimum 2 per task"
- Judge L5: "Minimum 3 features per epic"
- LAYER_CAKE hierarchy: epic min 3, feature min 3, task min 3, subtask min 2

### Does the Builder's commit protocol match what the Judge checks?

Yes. The Builder prompt specifies: commit after each subtask, message format `[L8] {task}: {subtask description}`, WIP prefix for incomplete work. The Judge's L9 review (`judge-L9-feature-review.md`) checks completeness, code quality, tests, and acceptance criteria -- it does not explicitly verify commit message format, which is appropriate since the Judge focuses on outcomes not process.

### Do handoff protocols bridge all agent transitions?

Yes. The `agent-handoff-protocol.md` covers all 8 handoff types:
1. Planner -> Judge (plan review)
2. Judge -> Planner (iterate plan)
3. Planner -> Builder (L7 -> L8)
4. Builder -> Judge (L8 -> L9)
5. Judge -> Builder (iterate build)
6. Judge L9 -> Judge L10 (feature -> epic)
7. Judge L10 -> Judge L11 (epic -> final)
8. Escalate/cascade handoff

Each handoff includes YAML-structured context packages. The protocol correctly identifies `_status.md` as the primary handoff mechanism, which aligns with how the state machine persists state.

### Are tool permissions consistent across prompts and the permissions document?

Mostly consistent, with one notable discrepancy:

| Tool | Planner (prompt) | Builder (prompt) | Judge (prompt) | tool-permissions.md | agent-spawner.js |
|------|-------------------|-------------------|----------------|---------------------|------------------|
| /chrome | Not mentioned | Forbidden | Allowed (line 48) | Planner: NO, Builder: NO, Judge: YES | Not in code |

The `/chrome` tool is NOT represented in the `agent-spawner.js` `TOOL_PERMISSIONS` constant at all. The code only tracks `Read`, `Write`, `Edit`, `Bash`, `Glob`, `Grep`, `NotebookEdit`. This is a minor gap because `/chrome` is a runtime capability invoked by agents, not enforced by the spawner. But the tool-permissions document lists it as part of the matrix, so there is a documentation-to-code inconsistency.

Additionally, the Builder prompt (line 44) explicitly forbids `/chrome`, while the Builder's `TOOL_PERMISSIONS` in code has an empty `forbidden` array. The code-level enforcement doesn't capture the `/chrome` restriction.

### Do layer-specific fragments fit the {{LAYER_INSTRUCTIONS}} placeholder pattern?

Yes. Both `planner-base.md` (line 61) and `judge-base.md` (line 155) contain the `{{LAYER_INSTRUCTIONS}}` placeholder. The `AgentSpawner.createSpawnConfig()` method (line 302 of agent-spawner.js) calls `prompt.replace('{{LAYER_INSTRUCTIONS}}', layerInstructions)`.

The spawner's `loadPromptTemplate()` method attempts to load layer-specific prompts (e.g., `judge-L9-feature-review.md`) before falling back to the base prompt. However, the naming convention in the code's `variations` array (line 172-177) doesn't perfectly match all existing template filenames. For example, it looks for `judge-L5-synthesis.md` but the actual file is `judge-L5-features.md`. The spawner handles this gracefully by falling back to the base prompt with dynamically generated `LAYER_INSTRUCTIONS`, so this is not a functional issue.

---

## Epic 3 Integration: PASS

**Features reviewed:** state-machine.js, router.js, validator.js, agent-spawner.js, recovery.js, ralph.js, and all test files

### Does the state machine's layer definitions match what the router routes to?

Yes. The `LAYERS` constant in `state-machine.js` defines all 12 layers with `onPass` and `onFail` routing targets. The `Router` class imports `LAYERS` from state-machine (line 8 of router.js) and uses these definitions directly for routing decisions:
- L9 `onFail`: `{ minor: "L8", major: "L7", escalate: "L6" }` -- router correctly reads `.minor`, `.major`, `.escalate`
- L10 `onFail`: `{ minor: "L8", major: "L6", escalate: "L5" }` -- matches HTML blueprint L10
- L11 `onFail`: `{ minor: "L8", major: "L5", escalate: "L4" }` -- matches HTML blueprint L11

The router's severity-based routing (lines 130-215) correctly handles string onFail (planning layers) vs. object onFail (review layers).

### Does the agent spawner's layer mapping align with state machine LAYERS?

Yes. The `LAYER_AGENTS` constant in `agent-spawner.js` maps:
- L1-L7: planner
- L8: builder
- L9-L11: judge
- L12: planner

This matches the `agent` field in every layer of `state-machine.js`'s `LAYERS` constant exactly.

### Does the validator's tier system match the hierarchy calculator's TIER_PRESETS?

Yes. The validator's `MINIMUMS` constant matches `TIER_PRESETS` in the HTML:

| Tier | Validator (validator.js) | Blueprint (HTML) |
|------|-------------------------|-------------------|
| micro | epics:1, features:2, tasks:2, subtasks:1 | epics:1, features:2, tasks:2, subtasks:1 |
| small | epics:3, features:3, tasks:3, subtasks:2 | epics:3, features:3, tasks:3, subtasks:2 |
| medium | epics:4, features:4, tasks:4, subtasks:2 | epics:4, features:4, tasks:4, subtasks:2 |
| large | epics:5, features:5, tasks:5, subtasks:3 | epics:5, features:5, tasks:5, subtasks:3 |

All four tiers match exactly.

### Does recovery.js properly use the state machine?

Yes. `RecoveryManager` imports `StateManager`, `LAYERS`, `LAYER_FOLDERS`, and `createDefaultState` from state-machine (line 10). It:
- Creates a `StateManager` instance in its constructor (line 33)
- Uses `LAYERS[lastCompleted]?.onPass` for layer inference (line 107)
- Sets `LAYERS[action.targetLayer]?.phase` and `.agent` when creating/rewinding state (lines 244-258)
- Uses `createDefaultState()` for clean starts (line 298)

The `SCAN_FOLDERS` constant in recovery.js matches `LAYER_FOLDERS` from state-machine exactly for all layers that have folders (L1-L7, L12). The omission of L8-L11 folders is intentional and matches `LAYER_FOLDERS` where those are `null`.

### Does ralph.js correctly orchestrate all modules together?

Yes. Ralph imports and initializes all four components:
- `StateManager` (line 9) -- used as `this.state`
- `Validator` (line 10) -- used as `this.validator`
- `Router` (line 11) -- used as `this.router`, constructed with `this.state`
- `AgentSpawner` (line 12) -- used as `this.spawner`

The orchestration flow in `runLayerCycle()` (line 292) correctly chains: spawn -> execute -> validate -> route. The `onLayerComplete()` method (line 182) validates with `this.validator`, then routes review results through `this.router`. The `handleReviewResult()` method (line 226) delegates to `this.router.route()`.

One observation: `ralph.js` does not import or use `RecoveryManager`. Recovery is a separate entry point rather than being integrated into Ralph's `initialize()` method. This is a design choice, not a bug -- but it means a user must explicitly invoke recovery rather than having Ralph auto-detect inconsistencies on startup.

### Do the tests cover integration scenarios?

Partially. The tests are structured as unit tests per module:
- `state-machine.test.js` -- 13 tests, covers CRUD, advance, iterate, cascade, gates, progress
- `router.test.js` -- 16 tests, covers verdict parsing, severity routing, max retries, review file parsing
- `agent-spawner.test.js` -- ~18 tests, covers layer mapping, permissions, tool validation, prompt loading, context assembly
- `validator.test.js` -- tests for ValidationResult and tier system
- `recovery.test.js` -- tests for filesystem scanning, reconciliation, resume

The router tests DO test integration with state-machine (they create real `StateManager` instances and verify state transitions). The agent-spawner tests also test end-to-end spawn config creation. However, there is no `ralph.test.js` testing the full orchestration loop, and no test verifies that all modules work together through a complete layer cycle. This is a gap but understandable given the complexity.

---

## Cross-Epic Integration

### Does the agent spawner load actual prompt templates that exist?

Yes. The spawner's `loadPromptTemplate()` tries layer-specific files first, then falls back to base prompts. The actual template files exist at:
- `templates/agents/planner-base.md` (exists)
- `templates/agents/builder.md` (exists -- note: named `builder.md` not `builder-base.md`, but the spawner falls back to this on line 196)
- `templates/agents/judge-base.md` (exists)
- Layer-specific: `judge-L9-feature-review.md`, `judge-L5-features.md`, `judge-L6-tasks.md`, `judge-L7-subtasks.md`, etc. (all exist)

The builder template naming is a minor issue -- the spawner first tries `builder-base.md` (line 190), which does not exist, then falls back to `builder.md` (line 196). This works but adds an unnecessary failed file read.

### Does the state machine's LAYERS match the LAYER_CAKE in the HTML?

Yes, with minor terminology differences:

| Property | state-machine.js LAYERS | HTML LAYER_CAKE |
|----------|------------------------|-----------------|
| Layer count | 12 (L1-L12) | 12 (L1-L12) |
| L1 name | "Input" | "Input" |
| L3 humanGate | true | true |
| L7 humanGate | true | true |
| L8 agent | "builder" | "builder" |
| L9 agent | "judge" | "reviewer" |
| L9 onFail | {minor:"L8", major:"L7", escalate:"L6"} | {minor:"L8", major:"L7", escalate:"L6"} |
| L10 onFail | {minor:"L8", major:"L6", escalate:"L5"} | {minor:"L8", major:"L6", escalate:"L5"} |
| L11 onFail | {minor:"L8", major:"L5", escalate:"L4"} | {minor:"L8", major:"L5", escalate:"L4"} |

The agent naming differs: state-machine uses `"judge"` while the HTML uses `"reviewer"` for L9-L11. This is a deliberate normalization -- the orchestration code uses the role-based name `judge` while the blueprint visualization uses the more descriptive `reviewer`. These are logically the same agent.

### Are the 12 layers consistently defined across all three epics?

Yes. All 12 layers appear in:
1. **HTML LAYER_CAKE**: L1-L12 with full definitions including prompts
2. **State machine LAYERS**: L1-L12 with routing and phase info
3. **Agent spawner LAYER_AGENTS**: L1-L12 with agent type mapping
4. **Agent spawner LAYER_CONTEXT**: L1-L12 with context file patterns
5. **Validator**: Handles L3-L7 validation (correctly scoped)
6. **Recovery SCAN_FOLDERS**: L1-L7 + L12 (correctly omits L8-L11 which have no folders)

The phase assignments are consistent: understand (L1-L3), plan (L4-L7), build (L8), review (L9-L11), learn (L12).

---

## Issues Found

### Issue 1: Agent naming inconsistency between HTML and code

- **Severity:** MINOR
- **Category:** Integration
- **Location:** `docs/v3-system-blueprint.html` (L9-L11 actor: "reviewer") vs `lib/state-machine.js` (L9-L11 agent: "judge")
- **Description:** The HTML blueprint uses "reviewer" as the actor for L9-L11, while the orchestration code uses "judge". Both refer to the same agent role.
- **Impact:** Low. The systems don't need to share this string directly. The spawner uses its own `LAYER_AGENTS` mapping.
- **Recommendation:** Document the terminology mapping, or normalize to one term.

### Issue 2: /chrome tool not represented in agent-spawner.js TOOL_PERMISSIONS

- **Severity:** MINOR
- **Category:** Completeness
- **Location:** `lib/agent-spawner.js` lines 58-72, vs `templates/protocols/tool-permissions.md` line 7-16
- **Description:** The `/chrome` tool is documented in tool-permissions.md as forbidden for Planner/Builder and allowed for Judge, but it does not appear in the code's `TOOL_PERMISSIONS` constant or the `validateToolUsage()` method. The Builder prompt also explicitly forbids `/chrome` but the code's Builder forbidden list is empty.
- **Impact:** Low. `/chrome` is a runtime agent capability, not something the spawner enforces. But the code should match the documented permissions for consistency.
- **Recommendation:** Add `/chrome` to the TOOL_PERMISSIONS constant (planner: forbidden, builder: forbidden, judge: allowed).

### Issue 3: Builder template naming mismatch

- **Severity:** MINOR
- **Category:** Integration
- **Location:** `lib/agent-spawner.js` line 190 vs `templates/agents/builder.md`
- **Description:** The spawner first tries `builder-base.md` (which does not exist) then falls back to `builder.md` (which does exist). This causes an unnecessary error catch on every builder spawn.
- **Impact:** Negligible. The fallback works correctly.
- **Recommendation:** Either rename `builder.md` to `builder-base.md` for consistency with `planner-base.md` and `judge-base.md`, or add `builder.md` as the primary lookup.

### Issue 4: No ralph.test.js for full orchestration testing

- **Severity:** MINOR
- **Category:** Quality
- **Location:** `tests/` directory
- **Description:** There are tests for state-machine, router, validator, agent-spawner, and recovery, but no test for ralph.js itself. The full orchestration loop (initialize -> runLayerCycle -> spawn -> validate -> route) is untested.
- **Impact:** Medium. The individual modules are well-tested, but integration bugs could hide in the orchestration glue.
- **Recommendation:** Add a `ralph.test.js` that tests `runLayerCycle()` with a mock `agentExecutor`.

### Issue 5: Recovery not integrated into Ralph initialization

- **Severity:** MINOR
- **Category:** Integration
- **Location:** `lib/ralph.js` `initialize()` method (line 82)
- **Description:** Ralph does not import or use `RecoveryManager`. If `_status.md` is inconsistent with the filesystem, Ralph will proceed from the potentially stale state without attempting reconciliation.
- **Impact:** Low for normal operation, medium for crash recovery scenarios.
- **Recommendation:** Consider adding an optional recovery check in `Ralph.initialize()`.

### Issue 6: HTML blueprint L12 output path mismatch

- **Severity:** MINOR
- **Category:** Integration
- **Location:** HTML L12 outputs: `["7-analysis/retrospective.md"]` vs state-machine `LAYER_FOLDERS.L12: '8-analysis'`
- **Description:** The HTML says L12 outputs go to `7-analysis/` but the state machine maps L12 to `8-analysis/`. The recovery module's `SCAN_FOLDERS` also uses `'8-analysis'`.
- **Impact:** Low. The HTML prompt text is informational; the actual folder creation uses the state-machine constant.
- **Recommendation:** Update the HTML blueprint's L12 `outputs` to use `8-analysis/` for consistency.

---

## What's Working Well

1. **Tier system consistency is excellent.** The four tier presets (micro, small, medium, large) are identically defined in the HTML TIER_PRESETS, the validator's MINIMUMS, and documented in the planner prompt. This is the kind of cross-epic consistency that matters.

2. **Routing logic is well-integrated.** The state machine defines onFail cascades as structured objects for review layers, and the router correctly interprets these. The cascade targets (L9 MINOR->L8, MAJOR->L7, ESCALATE->L6) are consistent between the HTML, state machine, and router tests.

3. **Agent prompts and the spawner have a clean contract.** The `{{LAYER_INSTRUCTIONS}}` placeholder pattern works elegantly -- base prompts define agent identity and rules, the spawner injects layer-specific context dynamically.

4. **The handoff protocol is comprehensive.** It covers all 8 transition types with structured YAML schemas. The `_status.md` handoff mechanism correctly bridges the protocol document with the state machine's persistence.

5. **Test coverage is solid for individual modules.** The router tests in particular are well-designed, testing verdict parsing, severity detection, cascade routing at each review layer, max retry escalation, and off-by-one boundary conditions.

6. **Recovery module correctly uses state machine primitives.** Rather than duplicating logic, it imports and uses `StateManager`, `LAYERS`, `LAYER_FOLDERS`, and `createDefaultState` directly.

7. **The validation script does real structural validation.** It parses the actual HTML file, extracts the LAYER_CAKE object, and validates it against well-defined schemas. This is a genuine quality gate, not a rubber stamp.
