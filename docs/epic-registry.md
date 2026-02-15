# Epic Registry

Cross-generation epic tracking for the Layer Cake pipeline. This registry records the planned, built, deferred, and partial status of every epic across all generations (v2 through v5), providing deferral history visibility to break the rediscovery loop where judges repeatedly flag stale documentation.

## Registry

| ID | Epic Name | Status | Built In | Deferral History |
|---|---|---|---|---|
| v2-E1 | Execution Layer (ClaudeExecutor, VerdictParser, Context Resolution) | Built | v2 | Planned v2, Built v2 |
| v2-E2 | Human Gate Interactive UX | Built | v3 | Planned v2, Deferred v2, Built v3 (as v3-E2) |
| v2-E3 | Pipeline Integrity (Validation, Integration Testing, Observability) | Built | v3 | Planned v2, Deferred v2, Built v3 (as v3-E1) |
| v2-E4 | Self-Improvement Bootstrap and Generation Management | Built | v5 | Planned v2, Deferred v2, Deferred v3 (as v3-E3), Deferred v4 (as v4-E3), Built v5 (as v5-A) |
| v3-E1 | Pipeline Integrity | Built | v3 | See v2-E3 |
| v3-E2 | Human Gate UX | Built | v3 | See v2-E2 |
| v3-E3 | Self-Improvement Bootstrap | Built | v5 | See v2-E4 |
| v3-E4 | Code Hygiene & Documentation Sync | Partial | v4, v5 | Planned v3, Deferred v3, Partial v4 (as v4-E2), Continued v5 (as v5-C) |
| v4-E1 | Prompt Lab | Built | v4 | Planned v4, Built v4 |
| v4-E2 | Code Hygiene | Partial | v4 | Planned v4, Partial v4 (README sync, CHANGELOG, jest config fix, dead code removal done; epic registry status, .gitignore, architecture doc NOT fixed) |
| v4-E3 | Self-Improvement Bootstrap | Built | v5 | See v2-E4 |
| v5-A | Self-Improvement Bootstrap | Built | v5 | Planned v2 (E4), Deferred v3 (E3), Deferred v4 (E3), Built v5 — 2 consecutive deferrals |
| v5-B | Pipeline Introspection | Built | v5 | New in v5, Built v5 |
| v5-C | Code Hygiene | Built | v5 | Planned v3 (E4), Partial v4 (E2), Built v5 |

## Key Components by Generation

| Component | Module(s) | Built In | Epic |
|---|---|---|---|
| ClaudeExecutor | `lib/claude-executor.js` | v2 | v2-E1 |
| VerdictParser | `lib/verdict-parser.js` | v2 | v2-E1 |
| Context Resolution | `lib/agent-spawner.js` (context resolver) | v2 | v2-E1 |
| Integration Test Framework | `tests/integration/`, `tests/helpers/` | v3 | v3-E1 |
| Gate Summarizer | `lib/gate-summarizer.js` | v3 | v3-E2 |
| Gate Prompt | `lib/gate-prompt.js` | v3 | v3-E2 |
| Prompt Registry | `lib/prompt-registry.js` | v4 | v4-E1 |
| Prompt Editor | `lib/prompt-editor.js` | v4 | v4-E1 |
| Prompt Tester | `lib/prompt-tester.js` | v4 | v4-E1 |
| Prompt Metrics | `lib/prompt-metrics.js` | v4 | v4-E1 |
| Generation Tracker | `lib/generation-tracker.js` | v5 | v5-A |
| Convergence Detector | `lib/convergence-detector.js` | v5 | v5-A |
| Brain Dump Generator | `lib/brain-dump-generator.js` | v5 | v5-A |
| Execution Analyzer | `lib/execution-analyzer.js` | v5 | v5-B |
| Runner Health Check | `tests/runner-health-check.test.js` | v5 | v5-B |

## Deferral Summary

| Epic Concept | Consecutive Deferrals | Notes |
|---|---|---|
| Execution Layer | 0 | Built in first generation (v2) |
| Pipeline Integrity | 1 | Planned v2, deferred, built v3 |
| Human Gate UX | 1 | Planned v2, deferred, built v3 |
| Prompt Lab | 0 | New in v4, built immediately |
| Pipeline Introspection | 0 | New in v5, built immediately |
| Self-Improvement Bootstrap | 2 | Planned v2, deferred v3 and v4, finally built v5 — most-deferred epic |
| Code Hygiene | 1 partial + 1 | Planned v3, deferred, partially built v4, completed v5 |
