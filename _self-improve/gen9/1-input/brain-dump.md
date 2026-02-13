# Self-Improvement Brain Dump - Generation 9

**Date:** 2026-02-13
**Generation:** 9
**Goal:** Multi-project support, plugin architecture, and protocol refinements

## Accomplished through gen8
- 407 tests across 18 suites
- Full feature set: observability, parallelism, caching, retry, config, templates, CLI, dry-run, timing, colored output, context budgets, iteration learning
- Bugs found and fixed: regex injection in validator, null onFail crash in router, BUG-001 through BUG-004
- CRLF normalization, boundary condition hardening

## The project is maturing - what's next?

### Protocol & Methodology Refinements
1. **Cascade depth limits** - Currently cascades can bounce back indefinitely between builder and judge. Add a configurable max cascade depth (default 5) that triggers human intervention when exceeded.
2. **Progressive context loading** - Instead of loading all context files at once, load them progressively based on what the agent actually needs. The planner at L1 doesn't need L8 artifacts.
3. **Gate timeout** - Human gates (L3, L7) block indefinitely. Add optional timeout with notification escalation.

### Architecture Improvements
4. **Plugin system** - Allow users to register custom validators, routers, or agent types via a plugin API. E.g., `ralph.registerPlugin({ validator: myCustomValidator })`.
5. **Multi-project workspace** - Support running multiple projects from a single ralph instance with shared config and independent state.
6. **Layer dependency graph** - Formalize which layers depend on which outputs, enabling smarter skip/resume logic.

### Quality & Polish
7. **Snapshot testing** - Add jest snapshot tests for prompt assembly to catch unintended prompt changes across generations.
8. **Performance benchmarks** - Add a benchmark test that measures prompt assembly time and state machine operations to catch regressions.
9. **Error message catalog** - Centralize all error messages into a single module with error codes for easier debugging.

## Improvement Targets for Gen9
1. Add cascade depth limit with configurable max (default 5) and human escalation
2. Add progressive context loading to agent-spawner (only load artifacts from relevant prior layers)
3. Add gate timeout with notification escalation
4. Add snapshot tests for prompt assembly (catch unintended prompt changes)
5. Add performance benchmarks for critical paths (prompt assembly, state transitions, validation)
6. Centralize error messages into lib/errors.js with error codes
7. Add layer dependency graph to lib/state-machine.js for smarter resume logic
