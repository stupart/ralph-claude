# Feature: Output Validation and Minimum Enforcement

## Overview
Implement validation of agent outputs to ensure artifacts meet Layer Cake requirements. This includes minimum count enforcement (3+ epics, 3+ features per epic, etc.), template compliance verification, and completeness checks.

## User Value
Output validation ensures quality gates are enforced automatically. Users don't have to manually count epics or verify template compliance - Ralph catches insufficient work before it proceeds, maintaining the thoroughness that makes Layer Cake effective.

## Requirements
1. Validate minimum counts from LAYER_CAKE.hierarchy (3+ epics, 3+ features/epic, 3+ tasks/feature, 2+ subtasks/task)
2. Adjust minimums based on project tier (Micro/Small/Medium/Large)
3. Verify artifacts follow required templates (have all required sections)
4. Check for missing required fields (empty description, missing acceptance criteria)
5. Validate file naming conventions match expected patterns
6. Validate folder structure matches LAYER_CAKE.layers[].outputs patterns
7. Return specific validation errors, not just pass/fail
8. Distinguish between blocking errors and warnings
9. Support incremental validation (validate single artifact vs entire layer)
10. Cache validation results to avoid re-checking unchanged files

## Technical Approach
1. Create Validator module with validateLayer() and validateArtifact() functions
2. Parse artifact files to extract structured data
3. Implement count checking against LAYER_CAKE.hierarchy
4. Implement template compliance checking against defined templates
5. Return ValidationResult with errors, warnings, and pass/fail
6. Integrate with state machine to block advancement on failure

## Acceptance Criteria
- [ ] Validator correctly counts epics at L4 and rejects if < 3 (Small tier)
- [ ] Validator correctly counts features per epic at L5 and rejects if < 3
- [ ] Validator correctly counts tasks per feature at L6 and rejects if < 3
- [ ] Validator correctly counts subtasks per task at L7 and rejects if < 2
- [ ] Template compliance is checked (required sections present)
- [ ] Missing required fields are flagged as errors
- [ ] Validation errors include specific details (which file, what's wrong)
- [ ] Project tier adjusts minimum requirements appropriately

## Planned Tasks
1. Design ValidationResult schema with errors and warnings
2. Implement count validation for each hierarchy level
3. Implement template compliance checking
4. Implement required field validation
5. Integrate tier-based minimum adjustment
6. Integrate validation with state machine transitions

## Edge Cases
- **Partially complete layer**: 2 of 3 epics exist - report progress, not just failure
- **Extra items beyond minimum**: 5 epics when 3 required - should pass (minimum, not maximum)
- **Template variations**: Alternative valid templates exist - allow flexibility where appropriate
- **Empty files**: File exists but is empty - treat as incomplete, not as valid artifact
- **Malformed markdown**: File has broken syntax - attempt recovery, report what's parseable
- **Circular dependencies**: Artifacts reference each other - detect and report cycles

## Dependencies
- Epic 1 Feature 01 (LAYER_CAKE Data Audit) - need hierarchy minimums
- Epic 1 Feature 05 (Tier Presets) - need tier definitions for adjusted minimums
- Epic 3 Feature 01 (State machine) - validation blocks state transitions
