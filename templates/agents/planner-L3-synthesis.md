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

### `naming-conventions.md` - Project Naming Conventions

This document prevents naming inconsistencies from propagating across epics. During the Layer Cake meta-test, accumulated naming mismatches (e.g., "reviewer" vs "judge", `7-analysis/` vs `8-analysis/`, `builder-base.md` vs `builder.md`) created terminology confusion and unnecessary failed file reads.

```markdown
# Naming Conventions

## Agent Names
| Concept | Canonical Name | Do NOT Use |
|---------|---------------|------------|
| {agent} | {name}        | {alternatives} |

## File Naming Patterns
| File Type | Pattern | Example |
|-----------|---------|---------|
| Feature specs | feature-NN-short-name.md | feature-01-login.md |
| Task lists | _tasks.md | |
| Subtask specs | task-NN-description.md | task-01-create-form.md |

## Folder Naming
| Layer | Folder | Notes |
|-------|--------|-------|
| L1 | 1-input/ | |
| L2 | 2-decomposition/ | |
| ... | ... | |
| L12 | 8-analysis/ | |

## Terminology
| Concept | Canonical Term | Avoid |
|---------|---------------|-------|
| {concept} | {preferred term} | {alternatives to avoid} |
```

**Why this matters:** L5-L7 planning layers and L9-L11 review layers will reference these conventions. Without a single source of truth, each epic may introduce its own naming, creating cross-epic inconsistencies that the Judge catches too late.

## Minimum Counts

| Artifact | Minimum Count |
|----------|--------------|
| JTBD statements | 3 |
| User journeys | 2 |
| Journey steps per journey | 5 |
| Architecture components | 3 |
| Architecture decisions | 2 |
| Naming convention entries | 1 per agent type, 1 per folder |

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
- [ ] `naming-conventions.md` defines canonical names for all agents, folders, and key concepts
- [ ] No ambiguous terminology remains (e.g., if both "reviewer" and "judge" appear, one must be chosen as canonical)
