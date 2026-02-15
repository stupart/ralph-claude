# System Architecture

## Overview

Layer Cake v6 is a bug-fix and hardening release targeting three subsystems: verdict parsing, pipeline routing, and documentation sync. The system is a 12-layer autonomous software improvement pipeline where AI agents plan, build, review, and reflect on code changes. v6 modifies existing modules rather than introducing new ones, following the constraint "Do NOT re-implement modules that exist."

The architecture changes are scoped to:
1. **Verdict Parser** — Consolidate two divergent implementations into one, extend issue extraction
2. **Pipeline Routing** — Fix L12 directory context, COMPLETE terminal state, and GenerationTracker field gaps
3. **Documentation** — Update stale test counts, document template variants

## Components

### Component 1: VerdictParser (`lib/verdict-parser.js`)
- **Purpose**: Extract structured review verdicts from judge agent output text
- **Responsibilities**:
  - Match verdict (PASS/ITERATE) across 4+ markdown format patterns
  - Use last-occurrence semantics (judges discuss verdicts before stating final one)
  - Extract severity-classified issues (`[MAJOR]`, `[MINOR]`, `[ESCALATE]`)
  - Default to ITERATE when no verdict is parseable (fail-closed)
  - **NEW in v6**: Scan for severity markers even without a verdict line — force ITERATE when `[MAJOR]`/`[ESCALATE]` markers exist in text
- **Interfaces**:
  - `VerdictParser.parse(output)` → `{ verdict: 'PASS'|'ITERATE', issues: Array, rawOutput: string }`
  - Consumed by: `bin/run-layer-cake-on-self.js` (v6: replaces inline parser), `lib/router.js` (via `parseReviewFile`)
  - Constants exported: `VERDICT_PATTERNS`, `ISSUE_PATTERN`, `ISSUE_PATTERN_NO_COLON`
- **JTBD Served**: JTBD 1 (Ensure Judge Verdicts Are Never Silently Ignored)

### Component 2: Runner (`bin/run-layer-cake-on-self.js`)
- **Purpose**: Execute the Layer Cake pipeline on its own codebase (self-improvement bootstrap)
- **Responsibilities**:
  - Orchestrate per-epic build cycling via `runProject()`
  - Parse judge output to determine pass/iterate decisions
  - **v6 change**: Remove inline `parseVerdict()` function, import and use `VerdictParser.parse()` from library
- **Interfaces**:
  - Calls: `VerdictParser.parse()` (v6: new dependency)
  - Calls: `ralph.js` runProject(), onLayerComplete()
  - Reads: `_events.jsonl`, `_status.md`
- **JTBD Served**: JTBD 1

### Component 3: State Machine (`lib/state-machine.js`)
- **Purpose**: Manage project state transitions through 12 layers using filesystem persistence
- **Responsibilities**:
  - Define layer graph (`LAYERS` with `onPass`/`onFail` transitions)
  - Track position (layer, epic, feature, task, iteration)
  - Handle human gates (L3, L7)
  - `advance()` — move to next layer on PASS
  - `cascade()` — return to earlier layer on ITERATE
  - **v6 observation**: `advance()` already handles `'COMPLETE'` sentinel correctly (sets `position.layer = 'COMPLETE'`, returns `{ action: 'complete', layer: 'COMPLETE' }`). The bug is in how `ralph.js` consumes the return value.
- **Interfaces**:
  - `LAYERS.L12.onPass = 'COMPLETE'` — terminal transition
  - `LAYER_DEPS` — dependency graph for context loading
  - `LAYER_FOLDERS` — maps layer IDs to folder names
  - Consumed by: `ralph.js`, `router.js`, `agent-spawner.js`
- **JTBD Served**: JTBD 2

### Component 4: Orchestrator (`lib/ralph.js`)
- **Purpose**: Main pipeline orchestrator — spawns agents, handles results, manages flow
- **Responsibilities**:
  - `onLayerComplete()` — process agent output, route via state machine
  - `runProject()` — main loop: spawn agent → collect output → route → repeat
  - **v6 fix**: Ensure `onLayerComplete('L12')` handles the `{ action: 'complete', layer: 'COMPLETE' }` return from `state.advance()` correctly, mapping it to `{ to: 'COMPLETE' }` for the `runProject()` loop
- **Interfaces**:
  - Calls: `state.advance()`, `state.cascade()`, `agentSpawner.createSpawnConfig()`
  - Returns: `{ status: 'complete' }` to caller when pipeline finishes
  - Emits events to `_events.jsonl` via EventLogger
- **JTBD Served**: JTBD 2

### Component 5: Agent Spawner (`lib/agent-spawner.js`)
- **Purpose**: Configure and prepare agent spawn configurations with prompt assembly and context injection
- **Responsibilities**:
  - Load prompt templates for each layer/agent type
  - Resolve context dependencies via `LAYER_DEPS`
  - Inject iteration learning, human feedback, execution reports
  - **v6 fix**: Inject `projectDir` into L12 agent context so the retrospective template can write to the correct directory
- **Interfaces**:
  - `createSpawnConfig(layerId, position, handoff)` → spawn configuration object
  - Template variables: `{{LAYER_INSTRUCTIONS}}`, `{{CONTEXT}}`
  - L12-specific: `handoff.executionReport` injection
  - **v6 addition**: `projectDir` injection for L12 (via template variable or context section)
- **JTBD Served**: JTBD 2

### Component 6: L12 Retrospective Template (`templates/agents/planner-L12-retrospective.md`)
- **Purpose**: Instruct the L12 agent on what to analyze and where to write
- **Responsibilities**:
  - Guide retrospective analysis (JTBD fulfillment, process improvements, future recommendations)
  - Specify output directory for retrospective artifacts
  - **v6 fix**: Use `{projectDir}/12-retrospective/` instead of relative or hardcoded paths
- **Interfaces**:
  - Input: `{{CONTEXT}}` with execution report, `{{LAYER_INSTRUCTIONS}}`
  - Output: Retrospective markdown files in `{projectDir}/12-retrospective/`
- **JTBD Served**: JTBD 2

### Component 7: GenerationTracker (`lib/generation-tracker.js`)
- **Purpose**: Analyze cross-generation data for convergence analysis and L12 retrospective
- **Responsibilities**:
  - Discover `_layer-cake-vN/` directories
  - Parse `_events.jsonl` for each generation
  - Extract epic counts, execution times, timeout counts, review findings
  - Build issue ledger (cross-generation issue tracking)
  - Compute deferral counts
  - **v6 fix**: Add `testCount` (extracted from events or `npm test --json` snapshots) and `timeoutWastePercentage` (computed from timeout events vs total execution time) to generation records
- **Interfaces**:
  - `analyze()` → `{ generations: Array, issueLedger: Array, deferralCounts: Object }`
  - Generation record fields: `generation`, `dir`, `epics`, `epicList`, `builtEpics`, `executionTime`, `timeoutCount`, `reviewFindings`, `incomplete`, `malformedLineCount`
  - **v6 additions**: `testCount: number`, `timeoutWastePercentage: number`
  - Consumed by: `ConvergenceDetector.analyze()`, L12 agent
- **JTBD Served**: JTBD 2

### Component 8: ConvergenceDetector (`lib/convergence-detector.js`)
- **Purpose**: Detect whether the pipeline is improving, plateauing, or regressing across generations
- **Responsibilities**:
  - Compute trends for 5 metrics: `testsAdded`, `epicsDelivered`, `deferralCount`, `executionWaste`, `efficiencyPerEpic`
  - Detect plateaus, regressions, and health signals
  - Compute composite convergence score
  - Detect chronic deferrals
- **Interfaces**:
  - `analyze(generationHistory)` → `ConvergenceReport`
  - Expects from GenerationTracker: `testCount` (for `testsAdded`), `timeoutWastePercentage` (for `executionWaste`), `epics.built` (for `epicsDelivered`), `epics.deferred` (for `deferralCount`), `executionTime` (for `efficiencyPerEpic`)
  - Currently marks `testsAdded` and `executionWaste` as `incomplete: true` due to missing fields
- **JTBD Served**: JTBD 2

### Component 9: Router (`lib/router.js`)
- **Purpose**: Route pipeline flow based on judge verdicts and issue severities
- **Responsibilities**:
  - Parse verdict from structured review results
  - Determine cascade target based on severity (MINOR→L8, MAJOR→earlier, ESCALATE→even earlier)
  - Handle max retry escalation
  - **Note**: Router already defaults to ITERATE when no verdict is provided (line 77: `if (!reviewResult) return VERDICT.ITERATE`), but it receives already-parsed results, not raw text
- **Interfaces**:
  - `route(reviewResult)` → routing decision
  - Uses `LAYERS` from state-machine.js for cascade targets
- **JTBD Served**: JTBD 1, JTBD 2

## Data Model

### Key Entities

1. **Project State** (`_status.md`) — Current position in the layer graph
   - `position.layer`: L1-L12 or COMPLETE
   - `position.epic/feature/task`: Current work item
   - `position.iteration`: Retry count at current layer
   - `gates`: Human gate approval status for L3, L7

2. **Event Log** (`_events.jsonl`) — Append-only event stream
   - Layer start/complete events with timing
   - Verdict events with parsed issues
   - Timeout events
   - Cascade/iterate events

3. **Generation Record** (produced by GenerationTracker) — Per-generation summary
   - Epic planning/delivery counts
   - Execution metrics (time, timeouts, test count, waste percentage)
   - Review findings with severity
   - Issue recurrence tracking via ledger

4. **Review Result** (produced by VerdictParser) — Structured judge output
   - `verdict`: PASS or ITERATE
   - `issues`: Array of `{ severity, title, description }`
   - `rawOutput`: Original text for debugging

5. **Spawn Configuration** (produced by AgentSpawner) — Agent launch config
   - Assembled prompt with injected context
   - Tool permissions
   - Model selection
   - Handoff data (iteration learning, execution report)

## Integration Points

1. **Claude CLI** — `lib/claude-executor.js` invokes Claude via CLI for agent execution
2. **Filesystem** — All state persisted to `_status.md`, events to `_events.jsonl`, artifacts to numbered folders
3. **Jest** — `npm test --json` provides test counts for GenerationTracker and documentation sync
4. **Terminal** — `lib/notifier.js` sends macOS notifications for human gates and completion
5. **Webhooks** — `lib/webhook.js` posts pipeline events to configured endpoints

## Technical Constraints

1. **No turn limits** on agents — agents run until done (L8 has no timeout, review layers have 30-min default)
2. **Per-epic cycling** — v5 fixed: pipeline cycles through L8-L9 per epic, not all epics at once. Do NOT modify this.
3. **Filesystem-based state** — No database. `_status.md` is markdown, `_events.jsonl` is newline-delimited JSON.
4. **Single-process** — Pipeline runs in one Node.js process. File locking in state-machine.js prevents concurrent access.
5. **Existing test suite** — 1054 tests across 50 suites (Jest). All must pass after v6 changes.

## Architecture Decisions

### Decision 1: Consolidate Verdict Parsing into Library
- **Context**: Two implementations exist — `bin/run-layer-cake-on-self.js` (2 patterns, fail-open) and `lib/verdict-parser.js` (4 patterns, fail-closed). The library is strictly superior. The runner's inline version caused a v5 safety failure.
- **Decision**: Have the runner import and use `VerdictParser.parse()` from `lib/verdict-parser.js`. Remove the inline `parseVerdict()` from the runner. Extend the library to scan for `[MAJOR]`/`[ESCALATE]` markers when no verdict line is found.
- **Rationale**: Single source of truth. The library already implements most of the brain dump's fix items (broader patterns, fail-closed default, last-match semantics). The runner just needs to use it.
- **Tradeoffs**: Runner gains a dependency on the library module. If the library has a bug, both paths are affected. Mitigated by comprehensive test coverage.

### Decision 2: Fix L12→COMPLETE in ralph.js, Not state-machine.js
- **Context**: `state.advance()` already handles COMPLETE correctly (returns `{ action: 'complete', layer: 'COMPLETE' }`). The bug is in how `onLayerComplete()` and `runProject()` consume the result — they expect `result.to` but `advance()` returns `result.layer` for the COMPLETE case.
- **Decision**: Fix the field mapping in `ralph.js` — when `advance()` returns `{ action: 'complete' }`, propagate `to: 'COMPLETE'` so the `runProject()` loop exits cleanly.
- **Rationale**: The state machine's behavior is correct. Changing it risks breaking other callers. The fix belongs in the consumer.
- **Tradeoffs**: Requires understanding the contract between state-machine.js and ralph.js. May need to also emit a completion event to `_events.jsonl`.

### Decision 3: Inject projectDir via Agent Spawner Context, Not Template Hardcoding
- **Context**: L12 template uses relative paths. The agent writes retrospective to the wrong directory because it lacks project directory context. This has recurred in v4 and v5.
- **Decision**: Have the agent spawner inject `projectDir` into the L12 prompt context (either as a `{{PROJECT_DIR}}` template variable or as an explicit instruction in the assembled context). Update the L12 template to reference `{projectDir}/12-retrospective/`.
- **Rationale**: The spawner already knows the project root (`this.projectRoot`). Template variables are already used (`{{LAYER_INSTRUCTIONS}}`, `{{CONTEXT}}`). This is the most natural injection point.
- **Tradeoffs**: Adds a template variable that only L12 uses. Alternative: include it in the `{{CONTEXT}}` section. Either approach works; the key is that the value comes from the spawner, not the template.

### Decision 4: Extend GenerationTracker, Not ConvergenceDetector
- **Context**: ConvergenceDetector expects `testCount` and `timeoutWastePercentage` from generation records. GenerationTracker doesn't produce them. The detector gracefully degrades (marks metrics incomplete).
- **Decision**: Add `testCount` and `timeoutWastePercentage` computation to GenerationTracker's `analyze()` method. Extract test count from events or `npm test --json` snapshots. Compute timeout waste from timeout events relative to total execution time.
- **Rationale**: The data contract is correct in ConvergenceDetector. The producer (GenerationTracker) is the one that needs to fulfill it. The raw data (events, test output) is available to GenerationTracker.
- **Tradeoffs**: `testCount` extraction may be fragile if test output format changes. Mitigate by handling missing data gracefully (return null, not crash).

### Decision 5: Update Documentation In-Place, Defer Automation
- **Context**: Test counts are stale across multiple files. The brain dump says "Do NOT hardcode test counts." Fully automating doc-sync (e.g., a CI step that runs `npm test --json` and updates README) is beyond v6 scope.
- **Decision**: For v6, extract counts from `npm test --json` and update all stale references. Document vivid template variants. Accept that this is a point-in-time update. Automation is a future improvement.
- **Rationale**: v6 scope is bug fixes, not new features. The immediate fix is updating the values. A doc-sync automation step could be a future epic.
- **Tradeoffs**: Counts will go stale again in v7. But v6 establishes the pattern (extract, don't hardcode) and fixes the current values.
