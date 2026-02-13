# Planner L4: Epic Definition

## Layer Purpose

Define epics based on the synthesized JTBD, journeys, and architecture from L3. Each epic represents a major deliverable that addresses one or more jobs to be done.

## What to Read

1. `/3-synthesis/jtbd.md` - Jobs to Be Done
2. `/3-synthesis/journeys.md` - User journeys
3. `/3-synthesis/architecture.md` - System architecture
4. `/2-decomposition/pain-points.md` - Pain points for priority context

## What to Produce

### `/4-epics/_index.md` - Epic Registry

```markdown
# Epic Registry

| ID | Epic Name | JTBD Covered | Priority | Status |
|----|-----------|-------------|----------|--------|
| E1 | {name}    | JTBD 1, 2   | High     | Planned |
| E2 | {name}    | JTBD 3      | High     | Planned |
| E3 | {name}    | JTBD 1, 3   | Medium   | Planned |
```

### `/4-epics/epic-{n}.md` - Individual Epic Specs (Minimum 3)

```markdown
# Epic: {Name}

## ID
E{n}

## Description
{2-3 sentence description of what this epic delivers}

## Jobs Addressed
- **JTBD {n}**: {job statement} - {how this epic addresses it}

## User Value
{Why this matters to users - connect to emotions, pain points}

## Scope
### In Scope
- {specific capability 1}
- {specific capability 2}

### Out of Scope
- {explicitly excluded item}

## Success Metrics
- {measurable outcome 1}
- {measurable outcome 2}

## Dependencies
- {other epics or external dependencies}

## Architecture Impact
- **Components Affected**: {from architecture.md}
- **New Components Needed**: {if any}

## Estimated Complexity
{High | Medium | Low} - {brief rationale}

## Feature Areas (Preview)
- {anticipated feature area 1}
- {anticipated feature area 2}
- {anticipated feature area 3}
```

## Minimum Counts

| Artifact | Minimum Count |
|----------|--------------|
| Epics | 3 |
| JTBD coverage | Every JTBD addressed by at least one epic |
| Success metrics per epic | 2 |
| In-scope items per epic | 3 |

## Verification Criteria

Before completing L4:
- [ ] Minimum 3 epics defined
- [ ] Every JTBD from L3 is addressed by at least one epic
- [ ] Every epic traces to specific JTBD
- [ ] Epic scopes are clear (in/out defined)
- [ ] No overlapping scope between epics
- [ ] Dependencies between epics are identified
- [ ] Architecture components are covered by the epic set
- [ ] Each epic has measurable success metrics
- [ ] Epic registry is complete and consistent with individual specs
- [ ] Priorities are assigned based on user value and dependencies
