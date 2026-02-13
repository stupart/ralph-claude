# Scope Coverage Protocol

This protocol defines how to verify that plans comprehensively cover all requirements from the synthesis phase.

## Purpose

Scope coverage verification ensures:
1. No requirements are dropped during planning
2. Every planning artifact traces back to a real need
3. Gaps are identified early before building begins

## When to Use

Apply scope coverage checking at:
- **L4 (Epics)**: Do epics cover all JTBD?
- **L5 (Features)**: Do features cover all epic requirements?
- **L6 (Tasks)**: Do tasks cover all feature requirements?
- **L7 (Subtasks)**: Are tasks fully decomposed?

## Protocol Steps

### Step 1: Load Synthesis Artifacts

Read and internalize all synthesis documents:

```
/3-synthesis/jtbd.md
/3-synthesis/journeys.md
/3-synthesis/architecture.md
/3-synthesis/constraints.md
```

Create a checklist of key items:
- [ ] JTBD 1: {description}
- [ ] JTBD 2: {description}
- [ ] Journey 1: {description}
- [ ] Architecture Decision 1: {description}
- [ ] Constraint 1: {description}

### Step 2: Create Traceability Matrix

Build a table mapping synthesis items to plan items:

| Source (Synthesis) | Type | Covered By (Plan) | Status |
|--------------------|------|-------------------|--------|
| JTBD 1: User login | JTBD | Epic 1: Auth System, Feature 1.1 | COVERED |
| JTBD 2: Dashboard access | JTBD | Epic 2: Dashboard | COVERED |
| Journey: First-time user | Journey | Epic 1 F2, Epic 2 F1 | PARTIAL |
| Decision: JWT auth | Arch | Epic 1 Feature 3 | COVERED |

### Step 3: Identify Gaps

For each item not fully covered, document:

```markdown
### Gap: {Synthesis Item}

**Source:** {file and section}
**Type:** JTBD | Journey | Architecture | Constraint
**Status:** MISSING | PARTIAL | IMPLICIT

**What's Missing:**
{Description of what's not covered}

**Severity:** MINOR | MAJOR
- MINOR: Edge case not explicitly addressed
- MAJOR: Core requirement not covered

**Recommendation:**
{Which plan item should address this}
```

### Step 4: Calculate Coverage

Compute coverage statistics:

```
JTBD Coverage: {covered}/{total} ({percentage}%)
Journey Coverage: {covered}/{total} ({percentage}%)
Architecture Coverage: {covered}/{total} ({percentage}%)
Constraint Coverage: {covered}/{total} ({percentage}%)

Overall: {covered}/{total} ({percentage}%)
```

### Step 5: Make Verdict

**PASS Threshold:**
- 100% JTBD coverage (all jobs must be addressed)
- 80%+ Journey coverage (main flows covered)
- 100% Architecture decision coverage
- 100% Constraint coverage

**ITERATE if:**
- Any JTBD is not covered
- Major journey gaps exist
- Architecture decisions not reflected in plan
- Constraints not acknowledged

## Traceability Matrix Template

```markdown
# Scope Coverage Review: {Layer}

**Date:** {date}
**Reviewer:** Judge Agent

## Traceability Matrix

### JTBD Coverage

| JTBD | Description | Covered By | Status | Notes |
|------|-------------|------------|--------|-------|
| Job 1 | {brief} | {plan items} | COVERED/PARTIAL/MISSING | |

### Journey Coverage

| Journey | Flow | Covered By | Status | Notes |
|---------|------|------------|--------|-------|
| Journey 1 | {brief} | {plan items} | COVERED/PARTIAL/MISSING | |

### Architecture Decision Coverage

| Decision | Choice | Implemented In | Status | Notes |
|----------|--------|----------------|--------|-------|
| Decision 1 | {brief} | {plan items} | COVERED/MISSING | |

### Constraint Coverage

| Constraint | Description | Addressed In | Status | Notes |
|------------|-------------|--------------|--------|-------|
| Constraint 1 | {brief} | {plan items} | COVERED/MISSING | |

## Coverage Statistics

- JTBD: {n}/{total} ({pct}%)
- Journeys: {n}/{total} ({pct}%)
- Architecture: {n}/{total} ({pct}%)
- Constraints: {n}/{total} ({pct}%)

## Gaps Identified

{List any gaps with severity and recommendations}

## Verdict

**PASS** / **ITERATE**

{Justification}
```

## Integration with Layer Reviews

### L4 Epic Review
Focus on: Do epics collectively address all JTBD?

### L5 Feature Review
Focus on: Does each epic's features fully cover its scope?

### L6 Task Review
Focus on: Do tasks cover all feature requirements?

### L7 Subtask Review
Focus on: Are tasks decomposed enough to be implementable?

## Common Gaps

Watch for these frequently missed items:

1. **Error handling** - Happy path covered, error paths not
2. **Edge cases** - Normal flow covered, boundaries not
3. **Non-functional requirements** - Features covered, performance/security not
4. **User states** - Logged-in user covered, anonymous not
5. **Data states** - Full data covered, empty/loading states not
