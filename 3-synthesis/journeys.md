# User Journeys

## Journey 1: Pipeline Run Encounters Malformed Judge Verdict

**Persona**: Ralph pipeline operator running Layer Cake on itself (v6 self-improvement cycle)
**Goal**: Complete a pipeline run where all judge verdicts are correctly parsed, issues are caught, and code quality is enforced
**JTBD**: JTBD 1 (Ensure Judge Verdicts Are Never Silently Ignored)

### Steps

| Step | Action | Touchpoint | Emotion | Pain Point | Opportunity |
|------|--------|------------|---------|------------|-------------|
| 1 | Operator launches `run-layer-cake-on-self.js` with a brain dump | CLI / runner script | Optimistic — pipeline has been reliable since v5 | None at this stage | N/A |
| 2 | Pipeline progresses through L1-L8, building code for an epic | State machine / agent spawner | Confident — build layers work correctly | None | N/A |
| 3 | L9 judge reviews the built feature and writes a review with MAJOR issues | Judge agent / judge-base template | N/A (automated step) | Judge may use non-standard verdict format (bold, different heading, inline) | Verdict format is documented in judge-base.md but not enforced |
| 4 | Runner's `parseVerdict()` attempts to extract verdict from judge output | `bin/run-layer-cake-on-self.js` parseVerdict() | N/A (automated) | PP1/PP7: Inline parser only matches 2 patterns; returns null on non-standard formats | Replace inline parser with `VerdictParser.parse()` from library |
| 5 | Null verdict is treated as PASS; pipeline advances past L9 | Runner main loop | Unaware — operator doesn't see the silent PASS | PP1: Fail-open default means judge's MAJOR findings are ignored | Default to ITERATE on null verdict; scan for severity markers |
| 6 | Code with known MAJOR issues ships through L10/L11 | Pipeline continuation | False confidence — operator thinks code was reviewed and approved | The GAN loop safety net has been bypassed | Issues extracted from text even without verdict line should force ITERATE |
| 7 | Operator discovers shipped bugs during manual monitoring or next generation | Manual inspection / L11 / brain dump | Frustrated — "the judge caught this, why did it ship?" | PP1: The review was performed but its results were lost | Comprehensive test suite for verdict parsing edge cases |

### Edge Cases
- Judge uses `### Verdict: ITERATE` (h3 instead of h2) — library handles this, runner doesn't
- Judge writes "My verdict is ITERATE" in prose — neither implementation handles this currently
- Judge uses `**Verdict**: PASS` with bold formatting — library handles, runner handles
- Judge output contains `[MAJOR]` markers but no verdict line at all — not handled by either
- Multiple verdict lines in output (e.g., "Verdict: PASS" early, "Verdict: ITERATE" at end) — library takes last match (correct), runner takes first match (wrong)
- Empty or null judge output — library returns ITERATE with synthetic issue, runner returns null→PASS

### Success Criteria
- Every verdict format documented in judge-base.md is parseable
- Null/missing verdict defaults to ITERATE (fail-closed)
- `[MAJOR]`/`[ESCALATE]` markers in text without a verdict line force ITERATE
- Runner delegates to `VerdictParser.parse()` — single implementation
- All edge cases have test coverage

---

## Journey 2: Pipeline Completes Full Run Through L12

**Persona**: Ralph pipeline operator running a full v6 cycle including L12 retrospective
**Goal**: Complete a full pipeline run where L12 writes its retrospective to the correct directory and the pipeline terminates cleanly
**JTBD**: JTBD 2 (Route Pipeline Transitions Cleanly at Boundaries)

### Steps

| Step | Action | Touchpoint | Emotion | Pain Point | Opportunity |
|------|--------|------------|---------|------------|-------------|
| 1 | Pipeline completes L11 final review with PASS verdict | State machine / router | Satisfied — all epics passed review | None | N/A |
| 2 | State machine advances from L11 to L12 | `state.advance()` in state-machine.js | Expectant — retrospective should capture learnings | None at this transition | N/A |
| 3 | L12 agent is spawned with retrospective template | Agent spawner / planner-L12-retrospective.md | N/A (automated) | PP2: Template uses relative paths, no `projectDir` variable injected | Inject `projectDir` into L12 context; template uses `{projectDir}/12-retrospective/` |
| 4 | L12 agent writes retrospective to hardcoded/relative path | L12 agent file writes | N/A (automated) | PP2: Output goes to `_layer-cake-v3/12-retrospective/` instead of `_layer-cake-v6/` | Agent context must include correct project directory |
| 5 | L12 completes; `onLayerComplete('L12')` is called | `ralph.js` onLayerComplete() | N/A (automated) | PP3: `state.advance()` returns `{ action: 'complete', layer: 'COMPLETE' }` but `onLayerComplete` may not handle this terminal result correctly | Handle COMPLETE as explicit terminal state |
| 6 | State machine sets `position.layer = 'COMPLETE'` | state-machine.js advance() | N/A (automated) | PP3: `runProject()` loop checks `result.to` but advance returns `result.layer`, causing "Advanced from L12 to undefined" | Align field names: ensure `result.to` is populated for COMPLETE transition |
| 7 | Pipeline logs completion and emits events | ralph.js runProject() | Relieved — run finished | Warning messages about undefined transitions | Clean completion event with explicit COMPLETE status |
| 8 | Operator runs cross-generation analysis | GenerationTracker + ConvergenceDetector | Curious about convergence trends | PP4: `testCount` and `timeoutWastePercentage` missing from generation records | GenerationTracker extracts test counts from events; computes timeout waste |
| 9 | ConvergenceDetector computes trends with degraded metrics | convergence-detector.js _computeTrends() | Disappointed — 2-3 of 5 metrics marked `incomplete: true` | PP4: Module interface contract mismatch | Populate all fields ConvergenceDetector expects |

### Edge Cases
- L12 agent fails or times out — pipeline should still complete cleanly (L12 failure is non-fatal)
- Multiple `_layer-cake-vN/` directories exist — L12 must write to the correct one for this generation
- No events.jsonl exists for a generation — GenerationTracker should handle gracefully
- `npm test --json` output format changes — test count extraction should be resilient
- Generation has zero timeouts — `timeoutWastePercentage` should be 0, not undefined/null

### Success Criteria
- L12 retrospective lands in `{projectDir}/12-retrospective/`
- Pipeline completes with clean "Project complete!" log, no undefined warnings
- Completion event emitted to `_events.jsonl`
- GenerationTracker records include `testCount` and `timeoutWastePercentage`
- ConvergenceDetector reports 5 of 5 metrics (no `incomplete: true`)

---

## Journey 3: Operator Updates Documentation After Pipeline Run

**Persona**: Pipeline operator or contributor updating project documentation after a successful v6 run
**Goal**: Ensure all documentation reflects the actual state of the codebase — correct test counts, complete module listings, discoverable templates
**JTBD**: JTBD 3 (Keep Documentation Accurate Without Manual Intervention)

### Steps

| Step | Action | Touchpoint | Emotion | Pain Point | Opportunity |
|------|--------|------------|---------|------------|-------------|
| 1 | Operator notices README claims stale test count (now corrected to 1054 across 50) | README.md line 349 | Mildly annoyed — this had been wrong for 3 generations | PP5: Stale count persisted despite L11 flagging it | Automated extraction from `npm test --json` |
| 2 | Operator runs `npm test --json` to get actual counts | CLI / Jest | Neutral — simple command | None | Script this as a repeatable step |
| 3 | Operator searches for stale counts across all .md files | Grep across codebase | Tedious — multiple files to check | PP5: Previously stale counts appeared in multiple files | Automated search-and-replace |
| 4 | Operator updates each file with correct count | Manual edits | Frustrated — this should be automated | PP5: Manual process will go stale again next generation | Build extraction into the pipeline or doc-sync task |
| 5 | Operator looks for vivid template documentation | README.md / docs/ | Confused — variants exist but aren't documented | PP6: `templates/agents/variants/` contents are undiscoverable | Add template variant listing to README |
| 6 | Operator adds vivid template documentation | README.md or new docs file | Satisfied — but unsure if this will persist | PP6: No standard location for template docs | Define canonical location in naming conventions |

### Edge Cases
- `npm test --json` output format varies between Jest versions — extraction must be resilient
- Some stale counts appear in `_layer-cake-vN/` archived directories — should these be updated or left as historical artifacts?
- `docs/architecture.md` doesn't exist — must be created or content goes in README
- Test count changes between when extraction runs and when docs are committed — accept point-in-time accuracy

### Success Criteria
- README.md reflects actual test count from `npm test --json`
- No instances of previously stale counts remain in active .md files (archived `_layer-cake-vN/` excluded)
- Vivid template variants (planner-base.vivid.md, builder.vivid.md, judge-base.vivid.md) are documented
- Update process is scriptable/repeatable for future generations
