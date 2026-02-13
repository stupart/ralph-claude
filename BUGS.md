# Ralph V3 Bugs

## BUG-001: Orchestrator allows chunk count mismatch between L4 outline and L5 specs

**Severity:** MAJOR
**Found:** 2026-01-30 during skill tree meta-test
**Component:** Rust CLI orchestrator (`src/main.rs`, `src/layers/criteria.rs`)

**Description:**
L4 outline specified 6 chunks for the skill tree build. L5 (Chunk Planning) only created specs for 3 chunks. The orchestrator advanced to L6 without validating that all outlined chunks had specs.

**Root cause:**
`validate_layer_advancement()` in main.rs line 527 has a comment: "Layers 5-10 have more complex criteria, trust Claude for now" — and returns `true` unconditionally for layers 5+.

**Impact:**
3 features never got built (page/routing, mobile fallback, mini-map widget). The system advanced through L6→L7→L8→L9 with incomplete work.

**Fix needed:**
- L5 completion criteria should verify: number of chunk folders in `5-chunks/` matches the chunk count from `4-outline/implementation-plan.md`
- L6 completion should verify all chunks have committed code
- L7 should verify all chunks have `_review.md` with PASS verdict

---

## BUG-002: Claude can self-advance layers by editing _status.md

**Severity:** MINOR (by design, but risky)
**Found:** 2026-01-30

**Description:**
The orchestrator checks if Claude changed the layer (main.rs line 431) and mostly trusts it. Combined with BUG-001 (no validation for L5+), Claude can skip chunks by just updating `_status.md` to the next layer.

**Mitigation:**
The `validate_layer_advancement()` function exists but only validates L1-L4. Extend it to L5-L10 with filesystem-based checks.

---

## BUG-003: Chrome tool connection issues stall Claude subprocess indefinitely

**Severity:** MAJOR
**Found:** 2026-01-30

**Description:**
When Claude attempts to use `/chrome` for testing (as instructed by L7 Chunk Review prompt) and the Chrome extension is unresponsive, the Claude process hangs indefinitely. Ralph has no timeout on the subprocess — it waits forever.

**Impact:**
Ralph stalled for 5+ hours on a single iteration because Claude was stuck trying to use `/chrome`.

**Fix needed:**
- Add a configurable timeout to `run_claude()` in main.rs (currently just calls `cmd.status()` with no timeout)
- Consider removing `/chrome` from L7 review prompts, or making it optional
- Add a watchdog that kills Claude if no `_status.md` update in N minutes

---

## BUG-004: L9 Final Review prompt mandates /chrome as step 1, causing repeated stalls

**Severity:** MAJOR
**Found:** 2026-01-30

**Description:**
The L9 Final Review prompt (`src/prompts/`) says "Full walkthrough of all features via /chrome" as the first step in the review process. When Chrome extension is unavailable or unresponsive, Claude blocks on this step indefinitely. This happened twice during the meta-test — once stalling for 5+ hours (before disk space fix), and again immediately after restart.

**Root cause:**
The review prompt treats `/chrome` as mandatory rather than optional. Combined with BUG-003 (no subprocess timeout), this creates a guaranteed stall when Chrome isn't available.

**Fix needed:**
- Make `/chrome` verification optional in L7 and L9 prompts: "If /chrome is available, do a visual walkthrough. Otherwise, verify via curl/tests/code review."
- Or: detect Chrome availability before spawning review agents and adjust the prompt accordingly
- BUG-003's timeout fix would also mitigate this
