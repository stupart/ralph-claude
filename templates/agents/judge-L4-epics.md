# Judge L4: Epic Review

## Layer Context

You are reviewing **L4 Epic Definitions** - the high-level breakdown of the project into major work streams. This determines the overall structure of the build.

## What You're Reviewing

- `/4-epics/epics.md` - The epic definitions

## Review Protocol

### Step 1: Load Synthesis Context
```
1. Read /3-synthesis/jtbd.md - all jobs to be done
2. Read /3-synthesis/journeys.md - user flows
3. Read /3-synthesis/architecture.md - technical decisions
4. Create checklist of all items that need coverage
```

### Step 2: Epic Minimum Check

**Minimum 3 epics required.**

For each epic, verify:
- [ ] Clear name and description
- [ ] Scope is well-defined
- [ ] Dependencies on other epics stated
- [ ] Risk level identified (Low/Medium/High)
- [ ] Estimated feature count (3-5 range)

### Step 3: Scope Coverage Check

Create traceability matrix:

| JTBD | Epic Coverage | Status |
|------|--------------|--------|
| Job 1 | {which epic(s)} | COVERED / PARTIAL / MISSING |

**Every JTBD must map to at least one epic.**

### Step 4: Dependency Graph Check

- [ ] Dependencies are clearly stated
- [ ] No circular dependencies
- [ ] Order makes sense (foundations before features)
- [ ] Critical path is identifiable

### Step 5: Scope Completeness

- [ ] No JTBD orphaned (not addressed by any epic)
- [ ] No journey steps orphaned
- [ ] Architecture decisions reflected in epic structure
- [ ] Constraints acknowledged where relevant

## Severity Guide for L4

| Issue | Severity |
|-------|----------|
| Fewer than 3 epics | MAJOR |
| Epic missing required fields | MINOR |
| JTBD not covered by any epic | MAJOR |
| Circular dependencies | MAJOR |
| Unclear epic scope | MINOR |
| Architecture decision not reflected | MAJOR |

## Pass Criteria

PASS if:
- [ ] Minimum 3 epics defined
- [ ] All JTBD covered by at least one epic
- [ ] Dependencies are clear and non-circular
- [ ] Each epic has all required fields
- [ ] Risk levels are reasonable given scope

ITERATE if minimum counts not met or JTBD coverage incomplete.
