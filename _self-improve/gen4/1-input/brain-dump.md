# Self-Improvement Brain Dump - Generation 4

**Date:** 2026-02-12
**Generation:** 4
**Goal:** Continue improving Layer Cake methodology, prompts, and orchestration

## Interview Answers (User Perspective)

### What's working well?
- The 12-layer pipeline is solid and well-validated from the meta-test
- GAN-style judge/builder loop catches real problems
- Per-epic builder scoping (added in gen2) prevents the "missing features" problem
- The JS orchestration layer (ralph.js, state-machine, validator, router, recovery) is production-quality
- Self-improvement loop infrastructure is in place (self-improve.js, ralph-improve.js)

### What's NOT working or needs improvement?
1. **The Rust CLI is stale** - most real orchestration happens in JS now. Need to decide: migrate fully to JS/Node CLI, or sync the Rust code with the JS layer
2. **No real-world test beyond the meta-test** - Layer Cake built Layer Cake, but hasn't been used on an external project yet
3. **The planner prompts could be sharper** - they sometimes produce plans that are too generic. Need more examples of "good vs bad" output like the judge has
4. **Cost tracking is missing** - no way to know how much a project costs in tokens
5. **The builder sometimes ignores its own subtask specs** - needs stronger enforcement language in the prompt

### What should gen4 focus on?
1. **Prompt engineering** - Make the planner prompts as good as the judge prompts. Add "Good vs Bad" example tables.
2. **Builder discipline** - Strengthen the builder prompt to be more disciplined about following subtask specs exactly
3. **Error recovery** - The self-improvement loop should handle errors gracefully and continue
4. **Documentation** - Write a proper README.md or quickstart guide for the project
5. **Clean up tech debt** - The Porpus/ directory and other stale artifacts should be gitignored

## Current Bug Status (post-gen2)
- BUG-001: FIXED (cross-layer validation)
- BUG-002: OPEN (Claude can self-advance by editing _status.md)
- BUG-003: FIXED (subprocess timeout + /chrome optional)
- BUG-004: FIXED (/chrome made optional in prompts)

## Current Tech Debt (post-gen2)
- 4 items remain from original 12 (rest fixed in gen2)
- Naming inconsistency (reviewer vs judge in HTML) partially addressed
- Old V2 docs not present on this branch
- Integration tests exist but old module tests use custom runner (not jest)

## Codebase Metrics
- lib/ JS modules: ~2,400 lines across 7 files
- templates/agents/: ~1,900 lines across 18 prompt files
- templates/protocols/: ~400 lines across 4 protocol files
- tests/: 12 jest integration tests + ~91 legacy module tests
- Total: ~28,000 lines committed

## Improvement Targets for Gen4
1. Add "Good vs Bad" example tables to planner-base.md (like judge has)
2. Add specificity enforcement to planner prompts ("No vague words: improve, enhance, fix, update, handle")
3. Strengthen builder.md discipline section with concrete examples of spec-following
4. Add cost tracking to ralph.js (token counting per layer)
5. Convert old module tests to jest format
6. Write a README.md quickstart guide
7. Fix BUG-002: validate _status.md changes against filesystem before accepting
