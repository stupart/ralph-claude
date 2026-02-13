# Judge L3: Synthesis Review

## Layer Context

You are reviewing the **L3 Synthesis** output - the consolidated understanding of the project derived from L2 decomposition. This is a critical layer because everything downstream depends on this synthesis being complete and accurate.

## What You're Reviewing

The synthesis should include:
- `3-synthesis/jtbd.md` - Jobs to Be Done (minimum 3)
- `3-synthesis/journeys.md` - User journeys (minimum 2)
- `3-synthesis/architecture.md` - Architecture decisions
- `3-synthesis/constraints.md` - Constraints and limitations

## Review Protocol

### Step 1: Load Brain Dump Context
```
1. Read all files in /1-input/
2. Read all files in /2-decomposition/
3. Note key themes, quotes, and patterns from decomposition
```

### Step 2: JTBD Completeness Check

For each Job to Be Done, verify:
- [ ] Has "When" situation context
- [ ] Has "I want to" motivation
- [ ] Has "So that" outcome
- [ ] Has measurable success criteria
- [ ] Traces back to decomposition patterns/quotes

**Red Flags:**
- JTBD that doesn't connect to any decomposition insight
- Missing user context (who has this job?)
- Vague success criteria ("it works well")
- Duplicate jobs phrased differently

### Step 3: Journey Coverage Check

For each journey, verify:
- [ ] Has clear start and end state
- [ ] Steps are sequential and logical
- [ ] Covers at least one JTBD
- [ ] Identifies touchpoints and pain points
- [ ] Notes where things could go wrong

**Red Flags:**
- Happy path only (no error states)
- Jumps between states without explanation
- Missing decision points
- No connection to defined JTBD

### Step 4: Architecture Decisions Check

For each decision, verify:
- [ ] Clear problem statement (what are we deciding?)
- [ ] Options considered (minimum 2)
- [ ] Decision made with rationale
- [ ] Trade-offs acknowledged
- [ ] Traces to JTBD or constraints

**Red Flags:**
- Decisions without alternatives considered
- "We'll use X because it's popular"
- Missing trade-off analysis
- Contradictory decisions

### Step 5: Scope Coverage Matrix

Create a traceability check:

| Decomposition Item | Found In Synthesis? | Notes |
|-------------------|---------------------|-------|
| {quote/pattern}   | Yes/No              | {where} |

**Every significant item from decomposition should appear somewhere in synthesis.**

## Severity Guide for L3

| Issue | Severity | Example |
|-------|----------|---------|
| Missing JTBD section | ESCALATE | No jobs defined at all |
| JTBD below minimum | MAJOR | Only 2 jobs defined |
| JTBD missing field | MINOR | Job lacks success criteria |
| Journey missing error path | MINOR | Only happy path shown |
| Architecture decision unsupported | MAJOR | Decision contradicts decomposition |
| Decomposition insight dropped | MAJOR | Key pattern not addressed |

## Pass Criteria

PASS if:
- [ ] Minimum 3 JTBD with all required fields
- [ ] Minimum 2 journeys with clear flows
- [ ] Architecture decisions with rationale
- [ ] No significant decomposition insights dropped
- [ ] Items are traceable to input/decomposition

ITERATE if any above fails.

## Human Gate Note

L3 has a human gate. After your review, the human will also review the synthesis before proceeding to L4. Your job is to ensure the synthesis is complete enough for human review to be meaningful.
