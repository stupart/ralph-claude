# Extracted Quotes

Extracted from Layer Cake input documents for decomposition analysis.

---

## Problems with Current Approach

### Quote 1: Scope Problem
> "Scope problem: Doesn't do enough features, stops too early"
Source: `1-input/00-brain-dump.md:9`

### Quote 2: Depth Problem
> "Depth problem: Features are shallow, not thorough"
Source: `1-input/00-brain-dump.md:10`

### Quote 3: Verification Gap
> "Verification gap: Code compiles but UX isn't 'felt' - no taste"
Source: `1-input/00-brain-dump.md:11`

### Quote 4: Context Loss
> "Context loss: Separate AI chats lose conversation context"
Source: `1-input/00-brain-dump.md:12`

### Quote 5: Planning Too Fast
> "Plan -> Implement is too fast: Jumps straight to code without enough thinking"
Source: `1-input/00-brain-dump.md:13`

### Quote 6: Keep Going Problem
> "Current Ralph stops too early."
Source: `1-input/00-brain-dump.md:117`

---

## Key Insights and Principles

### Quote 7: Adversarial Review
> "GAN system where another AI reviews everything"
Source: `1-input/00-brain-dump.md:17`

### Quote 8: Folder as Control Flow
> "Folder structure can BE the control flow / loop mechanism"
Source: `1-input/00-brain-dump.md:19`

### Quote 9: More Layers = More Thoroughness
> "More layers of generation = more code, more thought, more thoroughness"
Source: `1-input/00-brain-dump.md:20`

### Quote 10: Forcing Function
> "Each layer is a forcing function for quality"
Source: `1-input/00-brain-dump.md:21`

### Quote 11: Failure Cascade
> "Whatever layer it gets stopped at, it pushes back down to reanalyze and rebuild"
Source: `1-input/00-brain-dump.md:45`

### Quote 12: Adversarial Mindset
> "Assume there are bugs until proven otherwise"
Source: `1-input/04-gan-reviewer.md:34`

### Quote 13: Beyond Functional
> "'Works' is not good enough - it must work WELL"
Source: `1-input/04-gan-reviewer.md:35`

### Quote 14: User Perspective
> "Think like a frustrated user, not a proud developer"
Source: `1-input/04-gan-reviewer.md:36`

### Quote 15: Enforced Thoroughness
> "Minimum counts are enforced. More nesting = more thinking = more thorough output."
Source: `1-input/02-layer-specs.md:16-17`

---

## Technical Requirements

### Quote 16: Status as Source of Truth
> "`_status.md` is the source of truth for position"
Source: `1-input/03-session-management.md:19`

### Quote 17: Commit as Checkpoint
> "Every commit is a potential resume point."
Source: `1-input/03-session-management.md:196`

### Quote 18: Session Handoff
> "Need a 'task prompt' format that includes: Where we are in the layer stack, What's been done, What's in progress, Relevant files/context, What to do next"
Source: `1-input/00-brain-dump.md:93-99`

### Quote 19: Test via Chrome
> "USE the feature via /chrome - don't just read code"
Source: `1-input/04-gan-reviewer.md:52`

### Quote 20: Iteration Limits
> "Max iterations (3?) to prevent infinite loops"
Source: `1-input/00-brain-dump.md:44`

### Quote 21: Severity Classification
> "MINOR issues: Return to Layer 6, fix specific items. MAJOR issues: Return to Layer 5, Update _index.md with new/revised specs"
Source: `1-input/01-architecture.md:162-167`

---

## Orchestration and Agent Coordination

### Quote 22: Agent Spawning Question
> "How does Ralph actually spawn these agents?"
Source: `1-input/brain-dump-meta-test.md:27`

### Quote 23: Handoff Protocol
> "What's the handoff protocol between agents?"
Source: `1-input/brain-dump-meta-test.md:28`

### Quote 24: State Tracking
> "How do we track state across agent invocations?"
Source: `1-input/brain-dump-meta-test.md:29`

### Quote 25: Context Passing
> "What context gets passed to each agent?"
Source: `1-input/brain-dump-meta-test.md:30`

---

## GAN/Reviewer System

### Quote 26: Reviewer Independence
> "The reviewer should act as if they didn't build it: Don't remember implementation decisions, Don't give benefit of doubt, Judge only by observable behavior"
Source: `1-input/04-gan-reviewer.md:257-262`

### Quote 27: Judge Aggression Question
> "How aggressive should the Judge be?"
Source: `1-input/brain-dump-meta-test.md:34`

### Quote 28: Mercy Rule Question
> "Should there be a 'mercy rule' after N failures?"
Source: `1-input/brain-dump-meta-test.md:37`

### Quote 29: Default to Fail
> "When in doubt, FAIL - better to iterate than ship broken"
Source: `1-input/04-gan-reviewer.md:64`

---

## Open Questions

### Quote 30: Layer Count Question
> "Is 12 layers too many? Should some be combined?"
Source: `1-input/brain-dump-meta-test.md:57`

### Quote 31: Minimums Calibration
> "Are the enforced minimums (3+ epics, etc.) the right numbers?"
Source: `1-input/brain-dump-meta-test.md:58`

### Quote 32: Human Gate Placement
> "Is the human gate at L3 and L7 optimal?"
Source: `1-input/brain-dump-meta-test.md:59`

### Quote 33: Builder-Judge Communication
> "Should the Builder ever talk directly to the Judge?"
Source: `1-input/brain-dump-meta-test.md:60`

### Quote 34: Cost Management
> "Cost management - reviews add API calls"
Source: `1-input/brain-dump-meta-test.md:40`

### Quote 35: Context Limits
> "Context limits - how much can each agent hold?"
Source: `1-input/brain-dump-meta-test.md:41`

---

## Anti-Goals and Constraints

### Quote 36: Avoid Over-Engineering
> "Don't over-engineer this - keep it practical"
Source: `1-input/brain-dump-meta-test.md:52`

### Quote 37: No Complexity for Complexity's Sake
> "Don't add complexity for complexity's sake"
Source: `1-input/brain-dump-meta-test.md:53`

### Quote 38: Avoid Analysis Paralysis
> "Don't get stuck in analysis paralysis"
Source: `1-input/brain-dump-meta-test.md:54`

---

## Summary Statistics

- **Total Quotes Extracted:** 38
- **Categories:** 7
- **Source Files:** 6
