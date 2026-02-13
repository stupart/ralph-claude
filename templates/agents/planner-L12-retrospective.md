# Planner L12: Retrospective & Analysis

## Layer Purpose

Write a comprehensive retrospective analyzing the entire project cycle. Document what worked, what did not, methodology effectiveness, and recommendations for future projects.

## What to Read

1. `_status.md` - Full project history and timeline
2. `/3-synthesis/jtbd.md` - Original JTBD for outcome assessment
3. `/4-epics/_index.md` - Epic registry for scope review
4. All review files (`_review.md`) across features - iteration patterns
5. All commit history - build velocity and patterns
6. `/5-features/{epic}/feature-{n}.md` - Feature specs for requirements fulfillment
7. Any escalation or cascade records

## What to Produce

### `/12-retrospective/retrospective.md`

```markdown
# Project Retrospective: {Project Name}

## Project Summary
- **Duration**: {start to end}
- **Epics Delivered**: {count}
- **Features Delivered**: {count}
- **Total Iterations**: {count across all reviews}
- **Escalations**: {count and brief descriptions}

## Outcomes vs. Goals

### JTBD Fulfillment
| JTBD | Status | Notes |
|------|--------|-------|
| {job statement} | {Fulfilled / Partially / Not Addressed} | {explanation} |

### Success Metrics
| Metric | Target | Actual | Assessment |
|--------|--------|--------|------------|
| {metric} | {target} | {actual} | {met/unmet} |

## What Worked Well
1. {Practice or decision that helped}
   - **Evidence**: {specific example}
   - **Recommendation**: {continue/expand}

2. {Practice or decision that helped}
   - **Evidence**: {specific example}
   - **Recommendation**: {continue/expand}

## What Did Not Work
1. {Practice or decision that caused problems}
   - **Evidence**: {specific example}
   - **Impact**: {what it cost in time/quality}
   - **Recommendation**: {change/stop}

2. {Practice or decision that caused problems}
   - **Evidence**: {specific example}
   - **Impact**: {what it cost in time/quality}
   - **Recommendation**: {change/stop}

## Iteration Analysis

### Review Pass Rates
| Layer | First-Pass Rate | Avg Iterations | Common Issues |
|-------|----------------|----------------|---------------|
| L3    | {%}            | {n}            | {themes}      |
| L4    | {%}            | {n}            | {themes}      |
| L5    | {%}            | {n}            | {themes}      |
| L6    | {%}            | {n}            | {themes}      |
| L7    | {%}            | {n}            | {themes}      |
| L9    | {%}            | {n}            | {themes}      |
| L10   | {%}            | {n}            | {themes}      |
| L11   | {%}            | {n}            | {themes}      |

### Most Common Issue Types
1. {issue type} - {frequency} - {root cause}
2. {issue type} - {frequency} - {root cause}

## Methodology Assessment

### Layer Cake Effectiveness
- **Planning Layers (L1-L7)**: {assessment}
- **Build Layer (L8)**: {assessment}
- **Review Layers (L9-L11)**: {assessment}
- **Human Gates**: {assessment - were they valuable?}

### Agent Performance
- **Planner**: {strengths and weaknesses observed}
- **Builder**: {strengths and weaknesses observed}
- **Judge**: {strengths and weaknesses observed}

### Process Improvements
1. {Suggested improvement to Layer Cake methodology}
2. {Suggested improvement to agent prompts or protocols}
3. {Suggested improvement to review criteria}

## Recommendations for Future Projects
1. {Actionable recommendation}
2. {Actionable recommendation}
3. {Actionable recommendation}

## Raw Data References
- Review files: {paths}
- Status history: {path}
- Commit log: {reference}
```

## Minimum Counts

| Artifact | Minimum Count |
|----------|--------------|
| JTBD fulfillment assessments | All JTBD from L3 |
| "What Worked Well" items | 2 |
| "What Did Not Work" items | 2 |
| Process improvement suggestions | 3 |
| Future recommendations | 3 |

## Verification Criteria

Before completing L12:
- [ ] Every JTBD from L3 has a fulfillment assessment
- [ ] Iteration data is accurate (cross-referenced with review files)
- [ ] Evidence is cited for all claims (not just opinions)
- [ ] Recommendations are actionable (not vague)
- [ ] Both positive and negative findings are documented
- [ ] Methodology assessment covers all three agent roles
- [ ] Future recommendations are specific enough to implement
- [ ] Raw data references are provided for traceability
