# Agent Handoff Protocol

This protocol defines how agents transfer work and context to each other in the Layer Cake methodology.

## Overview

Layer Cake uses three specialized agents with distinct responsibilities:
- **Planner**: Creates plans (L1-L7, L12)
- **Builder**: Implements code (L8)
- **Judge**: Reviews work (plan reviews + L9-L11)

Handoffs occur at layer transitions. Each handoff must transfer sufficient context for the receiving agent to continue effectively.

## Handoff Types

### 1. Planner → Judge (Plan Review)

**When:** After Planner completes L3-L7 planning work
**Purpose:** Judge verifies plan quality before proceeding

#### Handoff Data

```yaml
handoff_type: plan_review
from_agent: planner
to_agent: judge
layer: L{N}
iteration: {1, 2, 3}

context:
  current_layer: L{N}
  artifacts_to_review:
    - path: /path/to/artifact
      type: {synthesis|epic|feature|task|subtask}
  parent_artifacts:
    - path: /path/to/parent
  synthesis_refs:
    - /3-synthesis/jtbd.md
    - /3-synthesis/journeys.md

expectations:
  minimum_counts: {from LAYER_CAKE}
  scope_coverage: required

previous_feedback: |
  {If iteration > 1, include previous review feedback}
```

### 2. Judge → Planner (Iterate)

**When:** Judge finds issues requiring plan revision
**Purpose:** Planner addresses specific issues and resubmits

#### Handoff Data

```yaml
handoff_type: iterate_plan
from_agent: judge
to_agent: planner
layer: L{target_layer}
iteration: {previous + 1}

issues:
  - severity: {MINOR|MAJOR|ESCALATE}
    description: {what's wrong}
    location: {where}
    recommendation: {how to fix}

scope:
  fix_only: true  # Don't make unrelated changes
  focus_areas:
    - {specific item to fix}

previous_review:
  path: /path/to/review.md
  verdict: ITERATE
```

### 3. Planner → Builder (L7 → L8)

**When:** Plan is approved and ready for implementation
**Purpose:** Builder receives spec to implement

#### Handoff Data

```yaml
handoff_type: start_build
from_agent: planner
to_agent: builder
layer: L8

task_spec:
  epic: {epic_name}
  feature: {feature_name}
  task: {task_name}
  subtasks_path: /7-subtasks/{epic}/{feature}/task-{n}.md

context:
  feature_spec: /5-features/{epic}/{feature}.md
  task_list: /6-tasks/{epic}/{feature}/_tasks.md

constraints:
  follow_spec_exactly: true
  commit_granularity: subtask
  test_before_commit: true
```

### 4. Builder → Judge (L8 → L9)

**When:** Builder completes feature implementation
**Purpose:** Judge verifies implementation quality

#### Handoff Data

```yaml
handoff_type: build_review
from_agent: builder
to_agent: judge
layer: L9

completed_work:
  feature: {feature_name}
  tasks_completed:
    - task: {name}
      commits: [{hash}, {hash}]
      status: complete

artifacts:
  feature_spec: /5-features/{epic}/{feature}.md
  implementation_files:
    - path: {file}
      changes: {description}

test_status:
  all_passing: true|false
  test_output: |
    {test results summary}

review_focus:
  acceptance_criteria: /5-features/{epic}/{feature}.md#acceptance
  ux_testing_required: true
```

### 5. Judge → Builder (Iterate)

**When:** Judge finds issues requiring code fixes
**Purpose:** Builder addresses specific issues

#### Handoff Data

```yaml
handoff_type: iterate_build
from_agent: judge
to_agent: builder
layer: L8
iteration: {previous + 1}

issues:
  - severity: {MINOR|MAJOR}
    description: {what's wrong}
    location: {file:line or UI}
    evidence: {what was observed}
    recommendation: {how to fix}

scope:
  fix_only: true
  do_not_refactor: true
  focus_on:
    - {specific issue}

previous_review:
  path: /5-features/{epic}/{feature}/_review.md
  verdict: ITERATE
```

### 6. Judge L9 → Judge L10 (Feature → Epic Integration Review)

**When:** All features within an epic have passed L9 review
**Purpose:** Aggregate feature reviews for epic-level integration assessment

#### Handoff Data

```yaml
handoff_type: epic_integration_review
from_agent: judge
to_agent: judge
from_layer: L9
to_layer: L10
epic: {epic_name}

completed_features:
  - feature: {feature_name}
    review_verdict: PASS
    review_path: /5-features/{epic}/{feature}/_review.md
    issues_resolved: {count}
    iterations: {count}

aggregated_context:
  total_features: {count}
  total_iterations_across_features: {count}
  cross_cutting_issues:
    - {any issues that appeared in multiple feature reviews}

review_focus:
  integration_points: {features that interact}
  epic_scope_coverage: /4-epics/epic-{n}.md
  consistency_check: true
```

### 7. Judge L10 → Judge L11 (Epic → Final Review)

**When:** All epics have passed L10 integration review
**Purpose:** Aggregate epic reviews for final project-level assessment

#### Handoff Data

```yaml
handoff_type: final_review
from_agent: judge
to_agent: judge
from_layer: L10
to_layer: L11
project: {project_name}

completed_epics:
  - epic: {epic_name}
    review_verdict: PASS
    review_path: /4-epics/epic-{n}/_review.md
    features_count: {count}
    total_iterations: {count}

aggregated_context:
  total_epics: {count}
  total_features: {count}
  total_iterations_across_epics: {count}
  systemic_issues:
    - {patterns found across multiple epics}

review_focus:
  project_scope_coverage: /3-synthesis/jtbd.md
  cross_epic_integration: true
  ux_consistency: true
  overall_quality: true
```

### 8. ESCALATE / Cascade Handoff

**When:** Judge identifies an ESCALATE-severity issue requiring work to return to a much earlier layer
**Purpose:** Route work back to the correct agent and layer with full context about the escalation chain

#### Handoff Data

```yaml
handoff_type: escalate
from_agent: judge
to_agent: {planner|builder}
originating_layer: L{N}  # Where the issue was discovered
target_layer: L{M}       # Where work must return to (M < N)

escalation_chain:
  - layer: L{N}
    agent: judge
    finding: {what was found}
  - layer: L{N-1}
    impact: {what this means for this layer}
  - layer: L{M}
    required_action: {what must be redone}

issue:
  severity: ESCALATE
  description: {fundamental problem identified}
  evidence: {specific evidence}
  root_cause: {why this happened}
  blast_radius:
    layers_affected: [L{M}, L{M+1}, ..., L{N}]
    artifacts_invalidated:
      - {paths to artifacts that need rework}

recovery_plan:
  start_at: L{M}
  rework_scope: {what specifically needs to change}
  downstream_impact: {what will need to be regenerated}
  estimated_iterations: {how many layers need re-review}
```

## Handoff via _status.md

The `_status.md` file is the primary handoff mechanism:

```markdown
# Project Status

## Current Position
- Layer: L{N}
- Agent: {planner|builder|judge}
- Epic: {current_epic}
- Feature: {current_feature}
- Task: {current_task}
- Iteration: {1, 2, 3}

## Handoff Context
- From: {previous_agent}
- Reason: {completion|iterate}
- Key Files:
  - {relevant paths}

## Active Issues
{If iterating, list issues to address}

## Recent History
- {timestamp}: {agent} completed L{N}
- {timestamp}: {agent} started L{N}
```

## Context Package Contents

Each agent needs specific context. Here's what to include:

### For Planner
- Synthesis documents (JTBD, journeys, architecture)
- Parent layer outputs
- Previous review feedback (if iterating)
- Scope coverage matrix

### For Builder
- Subtask specifications
- Feature spec for context
- Any related existing code
- Test expectations

### For Judge
- Artifact(s) to review
- Specification to compare against
- Synthesis for scope verification
- Previous reviews (for iteration context)

## Handoff Validation

Before accepting a handoff, verify:

1. **Required files exist** - All referenced paths are valid
2. **Context is complete** - No missing information
3. **Layer is correct** - Handoff goes to the right layer
4. **Iteration is tracked** - Counter is updated correctly

## Error Handling

If handoff is invalid:

```yaml
handoff_error:
  type: {missing_context|invalid_path|wrong_layer}
  description: {what's wrong}
  required_action: {what the sending agent must do}
```

The receiving agent should NOT proceed with incomplete handoffs.

## Session Recovery

If a session ends mid-work:

1. Check `_status.md` for last known state
2. Verify artifact completeness
3. Resume at the recorded position
4. Don't repeat completed work

## Handoff Best Practices

1. **Be explicit** - Don't assume the next agent knows context
2. **Include paths** - Always provide full file paths
3. **Note iteration** - Track how many times we've been here
4. **Summarize previous** - Include relevant history
5. **Define scope** - Especially for iterations, what should be touched?
