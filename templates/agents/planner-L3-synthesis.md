# Planner L3: Synthesis

## Layer Purpose

Synthesize the decomposed atoms from L2 into strategic planning documents: Jobs to Be Done (JTBD), user journeys, and system architecture. This layer transforms raw insights into actionable strategy.

## What to Read

1. `/2-decomposition/quotes.md` - Direct quotes from research
2. `/2-decomposition/patterns.md` - Behavioral patterns
3. `/2-decomposition/affinities.md` - Affinity groups
4. `/2-decomposition/pain-points.md` - Identified pain points
5. `/1-input/sources.md` - Source catalog for reference

## What to Produce

All outputs go in `/3-synthesis/`.

### `jtbd.md` - Jobs to Be Done (Minimum 3)

```markdown
# Jobs to Be Done

## JTBD 1: {Job Statement}

**When** {situation}, **I want to** {motivation}, **so I can** {expected outcome}.

- **Functional Aspects**: {what the user needs to accomplish}
- **Emotional Aspects**: {how the user wants to feel}
- **Social Aspects**: {how the user wants to be perceived}
- **Supporting Evidence**: {quotes, patterns, pain points that support this}
- **Current Alternatives**: {how users solve this today}
- **Underserved Needs**: {where current solutions fall short}

{Repeat for each JTBD}
```

### `journeys.md` - User Journeys (Minimum 2)

```markdown
# User Journeys

## Journey 1: {Name}

**Persona**: {who}
**Goal**: {what they're trying to achieve}
**JTBD**: {which JTBD this serves}

### Steps

| Step | Action | Touchpoint | Emotion | Pain Point | Opportunity |
|------|--------|------------|---------|------------|-------------|
| 1    | ...    | ...        | ...     | ...        | ...         |

### Edge Cases
- {What could go wrong at each step}

### Success Criteria
- {How we know the journey succeeded}
```

### `architecture.md` - System Architecture

```markdown
# System Architecture

## Overview
{High-level description of the system}

## Components
### Component 1: {Name}
- **Purpose**: {what it does}
- **Responsibilities**: {specific duties}
- **Interfaces**: {how it connects to other components}
- **JTBD Served**: {which jobs this enables}

## Data Model
{Key entities and relationships}

## Integration Points
{External systems, APIs, services}

## Technical Constraints
{Performance, security, compatibility requirements}

## Architecture Decisions
### Decision 1: {Title}
- **Context**: {why this decision matters}
- **Decision**: {what was decided}
- **Rationale**: {why this option}
- **Tradeoffs**: {what we give up}
```

## Minimum Counts

| Artifact | Minimum Count |
|----------|--------------|
| JTBD statements | 3 |
| User journeys | 2 |
| Journey steps per journey | 5 |
| Architecture components | 3 |
| Architecture decisions | 2 |

## Verification Criteria

Before completing L3:
- [ ] Every JTBD traces to specific decomposition atoms (quotes, patterns, pain points)
- [ ] User journeys cover the primary use cases
- [ ] Journey edge cases are identified
- [ ] Architecture supports all identified JTBD
- [ ] Architecture decisions have explicit rationale
- [ ] No major theme from decomposition is unaddressed
- [ ] Synthesis documents are internally consistent
- [ ] Documents are detailed enough for epic definition in L4
