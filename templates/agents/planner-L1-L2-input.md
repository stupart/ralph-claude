# Planner L1-L2: Input Gathering & Decomposition

## Layer Purpose

**L1 (Input Gathering)**: Read and collect all raw inputs - PRDs, research documents, user interviews, competitive analysis, stakeholder requirements, and any other source material.

**L2 (Decomposition)**: Break raw input into structured atoms: direct quotes, behavioral patterns, user affinities, pain points, and opportunity signals.

## What to Read

1. All files in the project input directory (e.g., `/0-input/`)
2. PRD or requirements documents referenced by the project
3. Any user research, interview transcripts, or survey data
4. Competitive analysis or market research
5. Stakeholder notes or meeting transcripts

## What to Produce

### L1 Output: `/1-input/sources.md`

A catalog of all input sources with metadata:

```markdown
# Input Sources

## Source 1: {Name}
- **Type**: {PRD | Interview | Research | Competitive | Stakeholder}
- **Path**: {file path}
- **Key Topics**: {comma-separated}
- **Date**: {if known}

{Repeat for each source}
```

### L2 Output: `/2-decomposition/`

Create the following decomposition files:

#### `quotes.md` - Direct Quotes (Minimum 10)
```markdown
# Direct Quotes

## Quote 1
- **Text**: "{exact quote}"
- **Source**: {source name}
- **Speaker/Context**: {who said it, when}
- **Theme**: {what this relates to}
- **Signal**: {what this tells us}
```

#### `patterns.md` - Behavioral Patterns (Minimum 5)
```markdown
# Behavioral Patterns

## Pattern 1: {Name}
- **Observed In**: {which sources}
- **Description**: {what users do}
- **Frequency**: {how common}
- **Implication**: {what this means for design}
```

#### `affinities.md` - Affinity Groups (Minimum 3)
```markdown
# Affinity Groups

## Group 1: {Theme Name}
- **Related Quotes**: {quote IDs}
- **Related Patterns**: {pattern IDs}
- **Core Insight**: {what this cluster tells us}
- **Design Direction**: {what to do about it}
```

#### `pain-points.md` - Pain Points (Minimum 5)
```markdown
# Pain Points

## Pain Point 1: {Name}
- **Severity**: {High | Medium | Low}
- **Sources**: {where identified}
- **Current Workaround**: {what users do now}
- **Opportunity**: {how we can address this}
```

## Minimum Counts

| Artifact | Minimum Count |
|----------|--------------|
| Sources cataloged | All available |
| Direct quotes | 10 |
| Behavioral patterns | 5 |
| Affinity groups | 3 |
| Pain points | 5 |

## Verification Criteria

Before completing L1-L2:
- [ ] Every input source is cataloged with metadata
- [ ] Quotes are exact (not paraphrased) with attribution
- [ ] Patterns are supported by multiple sources
- [ ] Affinity groups cluster related insights coherently
- [ ] Pain points have severity ratings and opportunities
- [ ] No input source was overlooked or skipped
- [ ] Decomposition covers all major themes from input
- [ ] Each atom traces back to a specific source
