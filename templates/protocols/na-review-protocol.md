# N/A Appropriateness Review Protocol

This protocol defines when "N/A" (Not Applicable) is acceptable in planning artifacts and how the Judge should evaluate N/A usage.

## Background

Templates include many fields to ensure thoroughness. However, not every field applies to every situation. The Planner may mark sections as "N/A" when genuinely inapplicable.

**The Problem:** "N/A" can be:
1. **Appropriate** - The section truly doesn't apply
2. **Lazy** - The Planner is avoiding thinking about it
3. **Wrong** - The Planner misunderstands what the section asks

The Judge must distinguish between these.

## When N/A Is Appropriate

N/A is appropriate when:

| Situation | Example |
|-----------|---------|
| Genuinely inapplicable | "API Endpoints" for a pure frontend change |
| Already covered elsewhere | "Security Considerations" when security is the main topic |
| Premature at this layer | "File paths" in an epic (too early) |
| Zero instances exist | "Dependencies" for the first task |

## When N/A Is NOT Appropriate

N/A is lazy or wrong when:

| Situation | Example | Should Be |
|-----------|---------|-----------|
| Avoiding thought | "Edge cases: N/A" for a login form | List the edge cases |
| Misunderstanding | "Error handling: N/A" (everything has errors) | Describe error approach |
| Important omission | "Acceptance criteria: N/A" | Always required |
| Skipping required field | "Dependencies: N/A" when there are dependencies | List them |

## N/A Evaluation Checklist

When you encounter "N/A", ask:

1. **Is this field ever N/A for this type of item?**
   - Some fields should NEVER be N/A (e.g., description, verification criteria)
   - Some fields are commonly N/A (e.g., external dependencies for internal features)

2. **Does the context support N/A?**
   - Read the item and its parent
   - Is there truly nothing to say here?

3. **Is there a reason given?**
   - Good: "N/A: This is a data-only change with no UI"
   - Bad: "N/A" (no explanation)

4. **Would a Builder be confused?**
   - If a Builder might wonder "what about X?", then N/A isn't appropriate

## Required N/A Format

When N/A is used, it MUST include a brief justification:

**Acceptable:**
```
Edge Cases: N/A - This is a configuration change with no user input
```

**Unacceptable:**
```
Edge Cases: N/A
```

## Fields That Should Rarely Be N/A

These fields almost always have content:

| Field | Layer | Rarely N/A Because |
|-------|-------|-------------------|
| Description | All | Everything needs a description |
| Verification/Acceptance | All | You need to know when it's done |
| Requirements | Features | Features exist to fulfill requirements |
| Time Estimate | Tasks | Tasks have scope |
| Files to Modify | Subtasks | Subtasks change things |

## Fields That May Commonly Be N/A

These fields are legitimately N/A more often:

| Field | Layer | Common N/A Scenario |
|-------|-------|-------------------|
| External Dependencies | Any | Internal-only work |
| API Changes | Features | UI-only features |
| Database Changes | Tasks | Code-only changes |
| Security Considerations | Subtasks | No security surface |

## Judge Review Process

When reviewing artifacts with N/A:

### Step 1: Flag All N/A Instances
List every N/A in the artifact.

### Step 2: Evaluate Each N/A

| N/A Location | Has Justification? | Appropriate? | Issue? |
|--------------|-------------------|--------------|--------|
| {section} | Yes/No | Yes/No/Maybe | {if no} |

### Step 3: Categorize Issues

**MINOR Issue:** N/A is probably fine but lacks justification
- Action: Request the Planner add "N/A: {reason}"

**MAJOR Issue:** N/A appears to be avoiding necessary thought
- Action: Require the section be completed properly

### Step 4: Document in Review

```markdown
### N/A Appropriateness

| Section | Status | Notes |
|---------|--------|-------|
| {section} | Appropriate | {reason understood} |
| {section} | Missing justification | Add reason |
| {section} | Inappropriate | Complete this section |
```

## Integration with Reviews

Include N/A review in every plan review (L3-L7):

1. Scan for all N/A instances
2. Evaluate appropriateness
3. Include N/A issues in review output
4. Count unjustified N/As as MINOR issues
5. Count inappropriate N/As as MAJOR issues

## Example Review

```markdown
### N/A Review

Found 3 N/A instances:

1. **Security Considerations: N/A**
   - Justification: None provided
   - Evaluation: INAPPROPRIATE - This feature handles user passwords
   - Severity: MAJOR
   - Recommendation: Document security approach for credential handling

2. **External API Dependencies: N/A - All data is local**
   - Justification: Provided
   - Evaluation: APPROPRIATE
   - No action needed

3. **Edge Cases: N/A**
   - Justification: None provided
   - Evaluation: INAPPROPRIATE - Login forms have many edge cases
   - Severity: MAJOR
   - Recommendation: Document edge cases (empty fields, invalid email, etc.)
```
