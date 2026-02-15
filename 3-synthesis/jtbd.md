# Jobs to Be Done

## JTBD 1: Ensure Judge Verdicts Are Never Silently Ignored

**When** the L9/L10/L11 judge produces a review with issues, **I want to** reliably extract the verdict regardless of formatting variations, **so I can** guarantee that flagged problems trigger iteration rather than silently shipping broken code.

- **Functional Aspects**: Parse verdict from multiple markdown formats (headings, bold, plain text, prose). Extract severity-classified issues even when the verdict line is malformed. Default to ITERATE when unparseable.
- **Emotional Aspects**: Confidence that the GAN loop's safety net is airtight. No anxiety about "did the judge catch something but the pipeline ignored it?"
- **Social Aspects**: Trust from the pipeline operator that review layers are meaningful, not theater.
- **Supporting Evidence**:
  - Q1: "the verdict parser couldn't extract a structured verdict from the output, so it defaulted to PASS"
  - Q2: "The GAN loop safety net has a hole"
  - Q3: "the safe default is ITERATE, not PASS"
  - P1 (Fail-Open Defaults): Runner treats null as PASS
  - P2 (Implementation Divergence): Library already handles 4 patterns and defaults to ITERATE
  - PP1, PP7: Runner's inline parser diverges from library
- **Current Alternatives**: The library `VerdictParser` in `lib/verdict-parser.js` already implements fail-closed defaults, 4 verdict patterns, last-match semantics, and dual issue patterns. The runner in `bin/run-layer-cake-on-self.js` ignores the library and uses its own 2-pattern inline `parseVerdict()` that fails open.
- **Underserved Needs**: The library lacks severity-marker-based override (scanning for `[MAJOR]`/`[ESCALATE]` to force ITERATE even without a verdict line). The runner doesn't use the library at all. The two implementations diverge silently.

## JTBD 2: Route Pipeline Transitions Cleanly at Boundaries

**When** the pipeline reaches its terminal layer (L12) or needs cross-generation context, **I want to** handle completion, directory routing, and module interfaces correctly, **so I can** avoid undefined transitions, misplaced artifacts, and degraded metrics.

- **Functional Aspects**: Handle L12→COMPLETE as an explicit terminal state. Pass project directory to L12 agent context. Ensure GenerationTracker produces fields that ConvergenceDetector expects.
- **Emotional Aspects**: Clean pipeline runs without "Advanced from L12 to undefined" warnings. Confidence that retrospective data lands in the right directory for cross-generation analysis.
- **Social Aspects**: Presentable pipeline output — clean completion logs, correct file locations, full convergence metrics.
- **Supporting Evidence**:
  - Q4: "The retrospective agent wrote to `_layer-cake-v3/12-retrospective/` instead of `_layer-cake-v5/`"
  - Q5: "`state.advance()` returns `to: undefined` because `LAYERS.L12.onPass` is `'COMPLETE'`"
  - Q6: "`generation-tracker.js` doesn't populate `testCount` or `timeoutWastePercentage`"
  - Q7: L11 flagged GenerationTracker mismatch as MINOR, passed anyway
  - P3 (Recurring Bugs): L12 directory bug persisted v4→v5
  - P4 (Module Interface Contracts): GenerationTracker/ConvergenceDetector field mismatch
  - P6 (Sentinel Values): COMPLETE not handled as terminal state
  - PP2, PP3, PP4: Three distinct routing bugs
- **Current Alternatives**: The pipeline completes but with warnings. L12 output lands in wrong directory (manually recoverable). ConvergenceDetector silently degrades (marks 2-3 of 5 metrics as `incomplete: true`). The `state.advance()` method already checks for `'COMPLETE'` — the bug may be in how `onLayerComplete()` in `ralph.js` consumes the result.
- **Underserved Needs**: No `projectDir` template variable injection for L12. GenerationTracker doesn't extract `testCount` or compute `timeoutWastePercentage`. The `COMPLETE` sentinel crosses module boundaries without consistent handling.

## JTBD 3: Keep Documentation Accurate Without Manual Intervention

**When** the codebase evolves (tests added, modules created, templates introduced), **I want to** automatically detect and update stale documentation values, **so I can** maintain trust in the README and architecture docs without manual count-updating each generation.

- **Functional Aspects**: Extract test counts from `npm test --json`. Find and update stale counts across all .md files. Document vivid template variants.
- **Emotional Aspects**: No embarrassment from publicly visible README claiming stale test counts. Confidence that docs reflect reality.
- **Social Aspects**: Professional project documentation that external observers can trust. Template discoverability for new contributors.
- **Supporting Evidence**:
  - Q8: "README stale test count — previously claimed stale counts, now corrected to 1054 tests across 50 suites"
  - Q10: "Do NOT hardcode test counts. Always extract from `npm test --json`"
  - Q11: "Runs 1054 tests across 50 suites" (README line 349, corrected)
  - P5 (Documentation Decay): Stale since at least v3, same wrong number in 4+ files
  - PP5: Multiple files contain stale counts
  - PP6: Vivid template variants undocumented
- **Current Alternatives**: Manual updates each generation — which has failed for 3+ generations. L11 flags stale counts as MINOR but passes, so they persist.
- **Underserved Needs**: No automated extraction step in the pipeline. No documentation of vivid template variants. `docs/architecture.md` doesn't exist and may need to be created (or the content goes in README).

## JTBD 4: Prevent Review Findings from Being Lost

**When** L11 identifies MINOR issues and still passes, **I want to** have those findings tracked in a persistent backlog, **so I can** ensure they're addressed in the next generation rather than rediscovered by monitoring.

- **Functional Aspects**: Track MINOR findings that pass the gate. Feed them into subsequent generation's brain dump or planning layers.
- **Emotional Aspects**: Assurance that nothing falls through the cracks. The pipeline's review effort has lasting value.
- **Social Aspects**: Demonstrable improvement trajectory — issues found once are fixed once, not refound every generation.
- **Supporting Evidence**:
  - Q7: L11 caught GenerationTracker mismatch as MINOR, still passed
  - Q8: L11 caught stale README as MINOR, still passed
  - Q12: "v5 was a breakthrough" but left MINOR findings unresolved
  - P3 (Recurring Bugs): Same bugs persist across generations
  - Affinity Group 4: Review findings don't drive fixes
- **Current Alternatives**: The brain dump is the workaround — a human manually collects unresolved L11 findings. This is how v6's targets were identified.
- **Underserved Needs**: No persistent backlog. No automated flow from L11 MINOR findings to next generation's planning input. **Note**: This is an observation for future improvement, not a v6 fix target. However, it validates the v6 approach and should inform architecture decisions.
