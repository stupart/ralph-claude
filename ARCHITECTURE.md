# Architecture

Layer Cake is a 12-layer autonomous software improvement pipeline orchestrated by Ralph. The system plans work (L1-L7), builds it (L8), reviews it via a GAN-style builder-judge feedback loop (L9-L11), and writes a retrospective (L12).

## Core Pipeline Components

### Ralph Orchestrator (`lib/ralph.js`)
- **Purpose**: Core pipeline coordinator
- **Responsibilities**: `runProject()`, `runEpicCycle()`, `runLayerCycle()`, `_executeAgent()` — manages the full L1-L12 pipeline execution with per-epic cycling, retry logic, and gate handling
- **Interfaces**: Input: project root, config, optional executor. Output: pipeline completion status.

### State Machine (`lib/state-machine.js`)
- **Purpose**: Layer definitions and pipeline state persistence
- **Responsibilities**: `LAYER_DEPS` dependency mapping, `_status.md` persistence with file locking, BUG-002 guard, layer transition validation
- **Interfaces**: Input: layer transitions. Output: `_status.md` updates, `_events.jsonl` entries.

### Agent Spawner (`lib/agent-spawner.js`)
- **Purpose**: Template loading and agent context assembly
- **Responsibilities**: Template loading with LRU cache, context resolution from `LAYER_DEPS` glob patterns, tool permissions configuration, iteration learning injection
- **Interfaces**: Input: layer ID, project root, epic context. Output: assembled spawn configuration for executor.

### Validator (`lib/validator.js`)
- **Purpose**: Layer artifact validation
- **Responsibilities**: Minimum artifact counts per layer, cross-layer epic count consistency (BUG-001 fix), heading format verification
- **Interfaces**: Input: layer ID, project root. Output: validation pass/fail with issue list.

### Verdict Parser (`lib/verdict-parser.js`) — v2
- **Purpose**: Extract structured review verdicts from judge agent text output
- **Responsibilities**: Multi-pattern PASS/ITERATE extraction, severity-classified issue parsing (MINOR/MAJOR/ESCALATE), graceful degradation on unparseable input
- **Interfaces**: Input: raw judge text output. Output: `{ verdict, issues }` object.

### Router (`lib/router.js`)
- **Purpose**: Cascade routing based on review severity
- **Responsibilities**: MINOR → L8 (rebuild), MAJOR → L7 (replan), ESCALATE → L6 (re-scope)
- **Interfaces**: Input: verdict with severity. Output: target layer for cascade.

### Claude Executor (`lib/claude-executor.js`) — v2
- **Purpose**: Spawn `claude -p` subprocesses for agent execution
- **Responsibilities**: Subprocess management with timeout, kill enforcement, stdout/stderr capture, AbortSignal support, token usage extraction
- **Interfaces**: Input: prompt, model, tool permissions. Output: `{ output, files, tokenUsage }`.

### Event Logger (`lib/event-logger.js`)
- **Purpose**: JSONL event writing for pipeline observability
- **Responsibilities**: Record layer_start, layer_end, verdict, error, gate_approval, stall_detected, layer_timing events to `_events.jsonl`
- **Interfaces**: Input: event type, metadata. Output: appended JSONL line.

### Recovery (`lib/recovery.js`)
- **Purpose**: State reconciliation and recovery plan generation
- **Responsibilities**: Detect inconsistent state, generate recovery steps, reconcile `_status.md` with filesystem artifacts
- **Interfaces**: Input: project root. Output: recovery plan or reconciled state.

## Human Gate Components (v3)

### Gate Summarizer (`lib/gate-summarizer.js`) — v3
- **Purpose**: Summarize L3/L7 gate artifacts for human review display
- **Responsibilities**:
  - Read layer artifacts from synthesis (L3) and subtask (L7) directories
  - Extract counts: JTBD count, journey names, architecture component/decision counts (L3); epic/feature/task/subtask counts, JTBD coverage (L7)
  - Format artifacts into structured summary objects for display
- **Interfaces**:
  - Input: project root path
  - Output: Summary object (`{ jtbdCount, journeys, componentCount, decisionCount }` for L3; `{ epics, features, tasks, subtasks, jtbdCoverage }` for L7)
  - Integration: Called by gate approval flow in `lib/gate-prompt.js`

### Gate Prompt (`lib/gate-prompt.js`) — v3
- **Purpose**: Interactive terminal prompt for human approval at L3/L7 gates
- **Responsibilities**:
  - Format and display gate summary for human reviewer
  - Present approve/reject/feedback options via readline interface
  - Handle approval (advance pipeline), rejection (cascade), feedback (capture as text for iteration learning)
  - Auto-approve in non-TTY environments (CI) or when `--auto-approve` flag is set
  - Store/read/clear gate feedback to filesystem (`_gate-feedback.md`)
- **Interfaces**:
  - Input: gate summary object, gate type (L3/L7), options (input/output streams, autoApprove)
  - Output: `{ approved: boolean, feedback?: string }`
  - Integration: Gate checkpoints in `lib/ralph.js` pipeline flow

## Prompt Lab Subsystem (v4)

### Prompt Registry (`lib/prompt-registry.js`) — v4
- **Purpose**: Scan agent template directory, extract metadata, provide discovery API
- **Responsibilities**: Template scanning, metadata extraction (agent type, layer mapping, description), variant tracking, filtering, diff generation
- **Interfaces**:
  - Input: templates directory path
  - Output: Registry of templates with metadata
  - Integration: Used by Prompt Editor and Prompt Tester for template discovery

### Prompt Editor (`lib/prompt-editor.js`) — v4
- **Purpose**: Live prompt editing with preview
- **Responsibilities**: Template resolution via registry, `$EDITOR` invocation for in-place editing, rendered preview display, save changes
- **Interfaces**:
  - Input: template identifier (via registry)
  - Output: modified template file
  - Integration: Discovers templates via Prompt Registry

### Prompt Tester (`lib/prompt-tester.js`) — v4
- **Purpose**: A/B testing of prompt variants
- **Responsibilities**: Variant resolution via registry, spawn config building, execution of multiple prompt variants, output comparison, result storage to `_prompt-tests/`
- **Interfaces**:
  - Input: template identifier, variant names (via registry)
  - Output: test results per variant, stored as JSON
  - Integration: Discovers variants via Prompt Registry; results consumed by Prompt Metrics

### Prompt Metrics (`lib/prompt-metrics.js`) — v4
- **Purpose**: Compute quality and performance metrics across prompt variants
- **Responsibilities**: Load test results from `_prompt-tests/`, quality scoring, performance comparison, metric aggregation, filtering by layer/variant, formatted report generation
- **Interfaces**:
  - Input: test results directory, filter options
  - Output: metrics report object
  - Integration: Consumes results from Prompt Tester

#### Prompt Lab Relationships
```
Registry → Editor (editor discovers templates via registry)
Registry → Tester (tester discovers variants via registry)
Tester → Metrics (metrics computed from test results)
```

## Self-Improvement Bootstrap Subsystem (v5)

### Generation Tracker (`lib/generation-tracker.js`) — v5
- **Purpose**: Discover past generation directories and produce structured cross-generation history
- **Responsibilities**:
  - Discover `_layer-cake-v{N}/` directories in project root
  - Parse `4-epics/` to extract planned epics per generation
  - Parse `_events.jsonl` to extract built epics (L8 events), review findings, execution metrics
  - Maintain cross-generation issue ledger with recurrence tracking
  - Compute deferral counts per epic concept
- **Interfaces**:
  - Input: project root path
  - Output: `GenerationHistory` object (generations, issueLedger, deferralCounts)
  - Consumers: Brain Dump Generator, Convergence Detector

### Convergence Detector (`lib/convergence-detector.js`) — v5
- **Purpose**: Measure pipeline improvement trends across generations
- **Responsibilities**:
  - Compute per-metric trends (tests, epics delivered, deferrals, execution time)
  - Detect plateaus (metric flat for 2+ generations)
  - Detect regressions (metric worsens for 2+ generations)
  - Detect positive convergence (all metrics improve)
  - Compute composite convergence score (improving/plateauing/regressing)
  - Auto-flag epics deferred 3+ consecutive times
- **Interfaces**:
  - Input: `GenerationHistory` object
  - Output: `ConvergenceReport` (status, metrics, plateaus, regressions, healthSignals, chronicDeferrals)
  - Consumers: Brain Dump Generator

### Brain Dump Generator (`lib/brain-dump-generator.js`) — v5
- **Purpose**: Auto-generate brain dumps for next-generation pipeline input
- **Responsibilities**:
  - Identify chronically deferred epics and flag with urgency
  - Prioritize proposed epics by deferral count, unresolved issue severity, convergence flags
  - Surface recurring pain points from issue ledger
  - Generate constraints ("What NOT to Do") from past failure modes
  - Output formatted markdown matching human-authored brain dump structure
- **Interfaces**:
  - Input: `GenerationHistory`, `ConvergenceReport`, codebase metadata
  - Output: Markdown string (brain dump format)
  - Consumers: L1 input layer (human reviews before feeding to pipeline)

## Pipeline Introspection Subsystem (v5)

### Execution Analyzer (`lib/execution-analyzer.js`) — v5
- **Purpose**: Stream-parse `_events.jsonl` for execution diagnostics
- **Responsibilities**:
  - Stream-parse JSONL (line-by-line, handles large files)
  - Extract per-layer metrics: duration, timeout count, retry count, retry speedup ratio
  - Flag anomalies: context exhaustion (retry speedup >2x), consistent timeout, scope creep
  - Extract review findings from L9/L10/L11 verdict events
  - Compute aggregate metrics: total runtime, timeout waste percentage, first-attempt success rate
  - Compare against baseline if provided
- **Interfaces**:
  - Input: `_events.jsonl` path, optional baseline metrics
  - Output: `ExecutionReport` (perLayerMetrics, anomalies, reviewFindings, aggregateMetrics)
  - Consumers: L12 retrospective context (via agent-spawner), Generation Tracker

## Supporting Components

### Stall Detector (`lib/stall-detector.js`)
- **Purpose**: Watchdog monitoring `_status.md` modification time for pipeline stalls

### Notifier (`lib/notifier.js`)
- **Purpose**: macOS push notifications for layer transitions

### Webhook (`lib/webhook.js`)
- **Purpose**: HTTP POST notifications (Slack/Discord)

### Plugin Manager (`lib/plugin.js`)
- **Purpose**: 6 lifecycle hooks (beforeLayerStart, afterLayerEnd, beforeSpawn, afterSpawn, onVerdict, onError)

### Config (`lib/config.js`)
- **Purpose**: Configuration from `ralph.config.json` or `.ralphrc`

### Templates (`lib/templates.js`)
- **Purpose**: Project scaffolding

### Errors (`lib/errors.js`)
- **Purpose**: Centralized error catalog

### Self-Improve (`lib/self-improve.js`)
- **Purpose**: Self-improvement loop coordination

## Data Flow

```
Brain Dump (human) → L1-L3 (understand) → L4-L7 (plan) → L8 (build) → L9-L11 (review) → L12 (retrospective)
                                                                              ↑                    |
                                                                              |____ ITERATE ←______|
                                                                                  (cascade)

Generation Tracker ──→ Convergence Detector ──→ Brain Dump Generator ──→ Next generation L1 input
       |                                                 ↑
       └─────────────────────────────────────────────────┘

Execution Analyzer ──→ L12 Retrospective Context (via agent-spawner)
```
