# Changelog

All notable changes to the Ralph Layer Cake Orchestrator, documented by generation.

## [Gen 10] - 2026-02-13

Plugin architecture, TypeScript types, and v1.0 readiness polish.

### Added
- Plugin system (`lib/plugin.js`) with PluginManager class and six lifecycle hooks: `beforeLayerStart`, `afterLayerEnd`, `beforeSpawn`, `afterSpawn`, `onVerdict`, `onError`
- `ralph.use(plugin)` API for registering plugins with chaining support
- Logger plugin (`lib/plugins/logger-plugin.js`) for detailed file-based debug logging
- Metrics plugin (`lib/plugins/metrics-plugin.js`) for tracking durations, counts, and pass rates
- TypeScript type definitions (`types/ralph.d.ts`) for the full public API
- `package.json` with `bin` entry so `npx ralph` works after install
- 48 new tests for plugin system, logger plugin, and metrics plugin (538 total)

### Changed
- Updated README.md to reference Node.js instead of Rust for prerequisites and install
- Added deprecation notice to `src/main.rs` header pointing to the JS orchestration layer

## [Gen 9] - 2026-02-13

Protocol refinements, quality gates, and snapshot testing.

### Added
- Centralized error message catalog (`lib/errors.js`) with error codes and categories
- Layer dependency graph (`LAYER_DEPS`) for smarter resume and progressive context loading
- Cascade depth limit with automatic human escalation after N bounces
- Gate timeout with notification and configurable auto-approve behavior
- Progressive context loading using `LAYER_DEPS` to reduce prompt size
- Performance benchmark tests for critical paths (state read, validation, routing)
- Jest snapshot tests for prompt assembly stability

## [Gen 8] - 2026-02-12

Edge cases, developer experience, and observability depth.

### Added
- Dry-run mode (`--dry-run`) to inspect spawn configuration without executing
- Wall-clock layer timing via `LayerTimer` class with per-run duration tracking
- Colored CLI output with `--no-color` flag for accessibility
- Context window budget estimation to prevent prompt overflow
- Iteration learning: previous review issues passed to builder for re-prompting

### Fixed
- Router null `onFail` crash with boundary condition tests
- Validator regex injection bug in section pattern matching

## [Gen 7] - 2026-02-12

Parallelism, robustness, and configuration.

### Added
- Config file support (`ralph.config.json` / `.ralphrc`) with `loadConfig()`
- LRU template cache in `AgentSpawner` for faster prompt assembly
- Retry with exponential backoff (1s, 2s, 4s) for agent crashes/timeouts
- Advisory file locking for concurrent state access safety
- `ParallelExecutor` for concurrent epic building with bounded work queue
- Jest coverage configuration targeting 80% line coverage

## [Gen 6] - 2026-02-11

Templates, end-to-end testing, and CLI.

### Added
- Project template system with `web-app` template for `ralph init`
- End-to-end integration test for full L1-L12 pipeline
- Error recovery integration tests for crash scenarios
- Prompt template validation tests for all agent `.md` files
- CLI entry point (`bin/ralph-cli.js`) with init, run, status, resume, cost commands

## [Gen 5] - 2026-02-10

Observability and external integrations.

### Added
- `EventLogger` for structured JSONL event logging to `_events.jsonl`
- `StallDetector` watchdog that monitors `_status.md` for activity
- Terminal-notifier push notifications for key orchestration events (macOS)
- Webhook support for external integrations (Slack, Discord, etc.)

### Fixed
- Subprocess kill enforcement on agent timeout (SIGTERM then SIGKILL)

## [Gen 4] - 2026-02-09

Cost tracking, testing infrastructure, and documentation.

### Added
- Per-layer cost tracking via `CostTracker` class in Ralph
- Good vs Bad example tables in planner-base.md and builder.md prompts
- Layer Cake section in README with JS orchestration usage guide

### Changed
- Converted all legacy module tests to Jest format

### Fixed
- BUG-002: Validate `_status.md` layer advances against filesystem state

## [Gen 3] - 2026-02-08

Prompt quality, bug fixes, and self-improvement loop.

### Added
- Continuous self-improvement loop script (`bin/ralph-improve.js`)
- Scope-limiting rules in builder prompt to prevent sprawl
- Naming conventions requirement in L3 synthesis
- Anti-vagueness rules in planner base prompt
- `normalizeAgentType()` to resolve reviewer/judge naming gap

### Fixed
- BUG-001, BUG-003, BUG-004: Various naming and fallback issues
- `/chrome` fallback chain and doc check for L9, L10, L11 reviews

## [Gen 2] - 2026-02-07

V3.1 bug fixes and tech debt reduction.

### Added
- Self-improvement loop with brain dump, decomposition, and synthesis
- Jest test configuration and initial test suites

### Fixed
- Multiple V3.1 orchestration bugs and tech debt items

## [Gen 1] - 2026-02-06

Foundation: Layer Cake JS orchestration layer.

### Added
- `Ralph` class: main orchestrator for spawn, validate, route cycle
- `StateManager`: `_status.md` persistence with layer transitions
- `Validator`: minimum counts and required section enforcement
- `Router`: Judge verdict routing with PASS/ITERATE and cascade rules
- `AgentSpawner`: prompt assembly with tool permissions per agent type
- `RecoveryManager`: state/filesystem reconciliation on startup
- 12-layer pipeline: L1 Input through L12 Analysis
- Human approval gates at L3 (Synthesis) and L7 (Plan Approval)
- GAN-style adversarial loop: Builder builds, Judge reviews

## [Pre-Gen] - 2026-01-21 to 2026-02-05

Original Rust CLI implementation.

### Added
- Rust CLI (`src/main.rs`) for autonomous Claude Code loops
- V3 layered methodology design and core modules
- Brain dump, interview, and build loop workflow
- CLAUDE.md, PRD.json, and guardrails system
- Feature branch auto-creation and commit discipline
