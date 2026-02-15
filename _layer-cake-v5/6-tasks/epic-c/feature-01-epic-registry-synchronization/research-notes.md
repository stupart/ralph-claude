# Epic Registry Research Notes

## v2 Research

| Epic | Name | Status | Evidence |
|------|------|--------|----------|
| v2-E1 | Execution Layer: ClaudeExecutor, VerdictParser, and Context Resolution | Built | `lib/claude-executor.js`, `lib/verdict-parser.js`, context resolution in `lib/agent-spawner.js`; git commits: `b84f3d8`, `4e787e9`, `35f3b43`, `69e6207` |
| v2-E2 | Human Gate Interactive UX | Deferred | No v2 implementation artifacts; built later in v3 as E2 |
| v2-E3 | Pipeline Integrity: Validation, Integration Testing, and Observability | Deferred | No v2 implementation artifacts; built later in v3 as E1 |
| v2-E4 | Self-Improvement Bootstrap and Generation Management | Deferred | No implementation artifacts in v2; carried forward to v3-E3, v4-E3, v5-A |

**v2 Generation Summary**: 1 of 4 epics built (E1 Execution Layer). Pipeline completed L1-L12 per `_events.jsonl`. Remaining 3 epics deferred to v3.

## v3 Research

| Epic | Name | Status | Evidence |
|------|------|--------|----------|
| v3-E1 | Pipeline Integrity | Built (Delivered) | `tests/integration/` directory, `tests/helpers/mock-executor.js`; git commits: `8dcc6c6`, `b73f1a0`, `306f068`, `33ced94`, `c97edca`, `302912b`; v3 registry shows "Delivered" |
| v3-E2 | Human Gate UX | Built (Delivered) | `lib/gate-summarizer.js`, `lib/gate-prompt.js`; git commit: `23009fe`; v3 registry shows "Delivered" |
| v3-E3 | Self-Improvement Bootstrap | Deferred | No implementation artifacts; carried forward to v4-E3 |
| v3-E4 | Code Hygiene & Documentation Sync | Deferred | No implementation artifacts; carried forward to v4-E2 |

**v3 Generation Summary**: 2 of 4 epics built (E1 Pipeline Integrity, E2 Human Gate UX). Pipeline completed L1-L12 per `_events.jsonl` (including an L9 iterate cycle back to L8). Self-Improvement Bootstrap and Code Hygiene both deferred.

## v4 Research

| Epic | Name | Status | Evidence |
|------|------|--------|----------|
| v4-E1 | Prompt Lab | Built | `lib/prompt-registry.js`, `lib/prompt-editor.js`, `lib/prompt-tester.js`, `lib/prompt-metrics.js`; git commits: `ded1514`, `354a0cd`, `4e708f4`, `03a73f7`, `0921f7d`, `6771bc6`, `9d6e364` |
| v4-E2 | Code Hygiene | Partial | git commit `aa8e42e` "[L8] E2 code hygiene: README sync, CHANGELOG entries, jest config fix, dead code removal" — Some items addressed but epic registry status, .gitignore entries, and architecture doc drift were NOT fixed (flagged again by L11 judges) |
| v4-E3 | Self-Improvement Bootstrap | Deferred | No implementation artifacts; carried forward to v5-A |

**v4 Generation Summary**: 1.5 of 3 epics built (E1 Prompt Lab fully built, E2 Code Hygiene partially built). Pipeline completed L1-L12 per `_events.jsonl`. Self-Improvement Bootstrap deferred again.

## v5 Epics (Current)

| Epic | Name | Status | Prior History |
|------|------|--------|---------------|
| v5-A | Self-Improvement Bootstrap | Built | Deferred in v2 (E4), v3 (E3), v4 (E3). Finally built in v5. |
| v5-B | Pipeline Introspection | Built | New in v5 |
| v5-C | Code Hygiene | In Progress | Deferred in v3 (E4), partially built in v4 (E2), continued in v5 (C) |

## Deferral History by Epic Concept

| Epic Concept | v2 | v3 | v4 | v5 | Consecutive Deferrals Before Built |
|---|---|---|---|---|---|
| Execution Layer | Built (E1) | — | — | — | 0 |
| Pipeline Integrity | Planned (E3) | Built (E1) | — | — | 1 |
| Human Gate UX | Planned (E2) | Built (E2) | — | — | 1 |
| Self-Improvement Bootstrap | Planned (E4) | Deferred (E3) | Deferred (E3) | Built (A) | 2 |
| Code Hygiene | — | Planned (E4) | Partial (E2) | In Progress (C) | 1 (partial in v4) |
| Prompt Lab | — | — | Built (E1) | — | 0 |
| Pipeline Introspection | — | — | — | Built (B) | 0 (new in v5) |

## Verification Results

| Check | Expected | Actual | Pass/Fail |
|---|---|---|---|
| gate-summarizer exists | File present | `lib/gate-summarizer.js` exists | Pass |
| gate-prompt exists | File present | `lib/gate-prompt.js` exists | Pass |
| prompt-registry exists | File present | `lib/prompt-registry.js` exists | Pass |
| prompt-editor exists | File present | `lib/prompt-editor.js` exists | Pass |
| prompt-tester exists | File present | `lib/prompt-tester.js` exists | Pass |
| prompt-metrics exists | File present | `lib/prompt-metrics.js` exists | Pass |
| generation-tracker exists | File present | `lib/generation-tracker.js` exists | Pass |
| convergence-detector exists | File present | `lib/convergence-detector.js` exists | Pass |
| brain-dump-generator exists | File present | `lib/brain-dump-generator.js` exists | Pass |
| execution-analyzer exists | File present | `lib/execution-analyzer.js` exists | Pass |
| No stale "Planned" for shipped code | True | All built modules confirmed via filesystem | Pass |
