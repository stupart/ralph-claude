# Feature: Planner Agent Prompt and Context Package

## Overview
Create the complete Planner agent configuration including its system prompt, context loading rules, tool permissions, and layer-specific variations. The Planner handles understanding (L1-L3), planning (L4-L7), and analysis (L12), focusing on thorough decomposition and specification creation.

## User Value
A well-configured Planner agent ensures thorough requirements gathering, comprehensive decomposition, and detailed specifications. Users get plans that are complete enough to hand off to builders without ambiguity, reducing rework and miscommunication.

## Requirements
1. System prompt must establish Planner identity, cognitive mode (plan_mode), and core responsibilities
2. Prompt must include layer-specific instructions that can be parameterized per layer (L1-L7, L12)
3. Context loading rules must specify what files to read at each layer
4. Tool permissions must be limited to: Read, Write, Glob, Grep (no Edit, no Bash)
5. Prompt must enforce minimum counts from LAYER_CAKE.hierarchy (3+ epics, 3+ features, etc.)
6. Prompt must instruct Planner to create artifacts using defined templates
7. Prompt must reference LAYER_CAKE layer specifications for accurate behavior
8. Include explicit instructions for handling GAN review feedback (iteration response)
9. Context package must be minimal - only what's needed for current layer
10. Prompt must emphasize thoroughness over speed

## Technical Approach
1. Create base Planner prompt template with parameterizable sections
2. Define context loading functions that determine files to include per layer
3. Create layer-specific prompt fragments that inject into base template
4. Store prompts as markdown files in templates/agents/ directory
5. Include LAYER_CAKE reference data in context when needed
6. Test prompt with each layer to verify behavior

## Acceptance Criteria
- [ ] Planner system prompt exists and covers all Planner responsibilities
- [ ] Prompt can be parameterized with current layer (L1, L2, etc.) and project context
- [ ] Context loading rules specify exactly which files to read at each layer
- [ ] Tool permissions are explicitly stated (Read, Write, Glob, Grep only)
- [ ] Minimum counts are enforced in prompt instructions
- [ ] Prompt references correct output paths from LAYER_CAKE.layers[].outputs
- [ ] Planner produces correctly formatted artifacts when tested

## Planned Tasks
1. Design base Planner system prompt template structure
2. Create layer-specific prompt fragments for L1-L3 (Understand phase)
3. Create layer-specific prompt fragments for L4-L7 (Plan phase)
4. Create layer-specific prompt fragment for L12 (Analysis phase)
5. Define context loading rules per layer
6. Test Planner prompt at each layer with sample inputs

## Edge Cases
- **L12 after failed reviews**: Planner at L12 writes retrospective - must handle both success path and cases where project had many iterations
- **First layer (L1)**: No prior artifacts exist - context package is just input files
- **Iteration response**: Planner receiving feedback from Judge must incorporate specific feedback, not just re-run
- **Large projects**: Context package could grow large - implement summarization or selective loading
- **Missing input files**: L1 Planner must handle case where 1-input/ is empty or incomplete

## Dependencies
- Epic 1 Feature 01 (LAYER_CAKE Data Audit) - need accurate layer specs to build prompts
- Epic 1 Feature 03 (JSON Export) - may want to include LAYER_CAKE JSON in context
