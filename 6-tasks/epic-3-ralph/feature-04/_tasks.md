# Tasks: Pass/Fail Routing and Cascade Logic

## Task 1: Implement Verdict Parsing

**What it accomplishes:** Creates a parser that extracts the verdict (PASS/ITERATE) and severity (MINOR/MAJOR/ESCALATE) from Judge review output in the standard format.

**Time estimate:** ~20 minutes

**Files to create/modify:**
- `/Users/tylerstupart/ralph-claude/src/routing/verdict-parser.js` (create)

**Dependencies:** Epic 2 Feature 03 (Judge output format)

**Verification:** Parser extracts PASS correctly; extracts ITERATE with severity; handles ambiguous output with error.

---

## Task 2: Implement PASS Routing

**What it accomplishes:** Creates routing logic for PASS verdict: advances state to the next layer per LAYER_CAKE.layers[].onPass, updates _status.md.

**Time estimate:** ~15 minutes

**Files to create/modify:**
- `/Users/tylerstupart/ralph-claude/src/routing/router.js` (create)

**Dependencies:** Task 1, Epic 3 Feature 01 (state machine)

**Verification:** PASS at L9 advances to L10; PASS at L11 advances to L12; state is updated correctly.

---

## Task 3: Implement Cascade Routing (MINOR/MAJOR/ESCALATE)

**What it accomplishes:** Implements routing for iteration verdicts: MINOR stays at layer and routes to Builder, MAJOR goes back one hierarchy level, ESCALATE goes back two or more levels per LAYER_CAKE.

**Time estimate:** ~25 minutes

**Files to create/modify:**
- `/Users/tylerstupart/ralph-claude/src/routing/router.js` (extend with cascade logic)

**Dependencies:** Task 2 (base routing)

**Verification:** MINOR at L9 stays at L9, increments iteration, routes to L8; MAJOR goes to onFail.major target; ESCALATE goes to onFail.escalate target.

---

## Task 4: Implement Iteration Counting and Max Retry Enforcement

**What it accomplishes:** Adds iteration count tracking per layer, enforcing maxRetries (3) from LAYER_CAKE.failCascade, triggering human notification when exceeded.

**Time estimate:** ~20 minutes

**Files to create/modify:**
- `/Users/tylerstupart/ralph-claude/src/routing/router.js` (extend with iteration tracking)
- `/Users/tylerstupart/ralph-claude/src/routing/retry-tracker.js` (create)

**Dependencies:** Task 3 (cascade routing)

**Verification:** Iteration count increments on each iterate; third failure triggers max retry; count resets after layer change.

---

## Task 5: Implement Human Notification for Exceeded Retries

**What it accomplishes:** Creates notification mechanism that alerts human when max retries exceeded, providing context about what failed and requesting manual decision (override, abort, or reassign).

**Time estimate:** ~20 minutes

**Files to create/modify:**
- `/Users/tylerstupart/ralph-claude/src/routing/human-notifier.js` (create)

**Dependencies:** Task 4 (max retry detection)

**Verification:** Notification includes iteration history; notification includes failure reasons; human can respond with decision.

---

## Task 6: Test Routing Logic with Simulated Reviews

**What it accomplishes:** Creates comprehensive tests simulating various review outcomes, verifying correct routing decisions for PASS, MINOR, MAJOR, ESCALATE, and max retry scenarios.

**Time estimate:** ~20 minutes

**Files to create/modify:**
- `/Users/tylerstupart/ralph-claude/tests/routing-test.md` (create)

**Dependencies:** Tasks 1-5 (complete routing system)

**Verification:** Tests cover all verdict types; tests verify correct target layers; tests verify iteration counting; edge cases documented.

---

## Task 7: Implement Human Gate Notification Mechanism

**What it accomplishes:** Creates a comprehensive notification system for human gates (L3, L7) that updates _status.md with WAITING_HUMAN state, outputs clear terminal notifications, and provides context for what requires human approval.

**Time estimate:** ~25 minutes

**Files to create/modify:**
- `/Users/tylerstupart/ralph-claude/src/routing/human-gate-notifier.js` (create)
- `/Users/tylerstupart/ralph-claude/schemas/status-schema.md` (modify to add WAITING_HUMAN state)
- `/Users/tylerstupart/ralph-claude/templates/human-gate-notification.md` (create template)

**Dependencies:** Task 5 (human notification for retries), Epic 3 Feature 01 (state machine for _status.md)

**Verification:** WAITING_HUMAN state is documented in schema; terminal output clearly states what gate needs approval; notification includes context (what was produced, what needs review); resume instructions are provided.
