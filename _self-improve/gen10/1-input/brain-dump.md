# Self-Improvement Brain Dump - Generation 10

**Date:** 2026-02-13
**Generation:** 10
**Goal:** Plugin architecture, Rust CLI sync, and final polish for v1.0 readiness

## Accomplished through gen9
- 490 tests + 31 snapshots across 20 suites
- ~50 atomic commits across 9 generations
- Complete feature set for orchestration, observability, DX, and testing
- Error catalog, dependency graph, cascade limits, gate timeouts
- Progressive context loading, performance benchmarks, snapshot tests

## Gen10: Making it production-ready

### Plugin Architecture
1. **Plugin system** - Create lib/plugin.js with a PluginManager that supports hooks at key lifecycle points: beforeLayerStart, afterLayerEnd, beforeSpawn, afterSpawn, onVerdict, onError. Plugins register via `ralph.use(myPlugin)`. Each plugin is an object with optional hook methods.
2. **Built-in plugins** - Create 2-3 example plugins: a logging plugin (writes detailed logs to file), a metrics plugin (tracks and reports orchestration metrics), and a guard plugin (custom validation rules).

### Rust CLI Sync
3. **Deprecation notice** - The Rust CLI (src/) is stale. Add a clear deprecation notice to src/main.rs and CLAUDE.md explaining that the JS orchestration layer (lib/) is the active implementation.
4. **Feature parity doc** - Create docs/rust-to-js-migration.md documenting which Rust features are now in JS and what's different.

### Final Polish
5. **TypeScript type definitions** - Create types/ralph.d.ts with TypeScript declarations for the public API (Ralph class, options, events, CostTracker, etc.) for users who want type safety.
6. **package.json bin entry** - Add "bin" field pointing to bin/ralph-cli.js so `npx ralph` works after install.
7. **CHANGELOG.md** - Create a changelog documenting all improvements across gen1-gen10.

## Improvement Targets for Gen10
1. Create lib/plugin.js with PluginManager and lifecycle hooks
2. Create 2 example plugins (lib/plugins/logger-plugin.js, lib/plugins/metrics-plugin.js)
3. Add deprecation notice to Rust src/main.rs header comment
4. Create types/ralph.d.ts with TypeScript type definitions for public API
5. Add "bin" field to package.json for `npx ralph` support
6. Create CHANGELOG.md documenting gen1-gen10 improvements
7. Write tests for plugin system
