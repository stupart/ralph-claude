# Feature: Visual Rendering Fixes

## Overview
Ensure the visual rendering of the service blueprint accurately reflects the LAYER_CAKE data structure. Fix any discrepancies between what the data says and what the visualization shows, including swimlane labels, cell contents, flow arrows, and highlighting.

## User Value
Users rely on the visual blueprint to understand the Layer Cake methodology at a glance. When the visual representation exactly matches the underlying data, users can trust that what they see is accurate and use the blueprint as a reliable reference for understanding system behavior.

## Requirements
1. Phase labels (header row) must render from LAYER_CAKE.layers using each layer's actor color
2. Swimlane labels must match LAYER_CAKE.actors labels and use correct colors
3. Cell contents (action, detail) must be derived from or consistent with LAYER_CAKE layer data
4. Empty cells must use the striped pattern to indicate no activity for that actor at that layer
5. Highlighted cells must correctly indicate review activities (reviewer swimlane) and routing decisions
6. Human gate cells (L3, L7) must be visually distinct with gate styling
7. The cascade section must accurately show the pass/fail routing defined in LAYER_CAKE.failCascade
8. The hierarchy diagram must reflect LAYER_CAKE.hierarchy with correct min counts
9. All clickable elements must have appropriate cursor and hover states
10. BLUEPRINT_CONFIG must stay synchronized with LAYER_CAKE data

## Technical Approach
1. Review BLUEPRINT_CONFIG structure and compare each cell against LAYER_CAKE
2. Modify renderBlueprint() function to pull more data directly from LAYER_CAKE where possible
3. Fix any hardcoded values in BLUEPRINT_CONFIG that don't match LAYER_CAKE
4. Add visual diff highlighting during development to spot mismatches
5. Update CSS classes to ensure consistent styling with LAYER_CAKE.actors colors

## Acceptance Criteria
- [ ] Every phase label shows correct layer ID, name, and actor-appropriate color
- [ ] Every swimlane row matches its actor definition in LAYER_CAKE
- [ ] Cell activities (action text) align with LAYER_CAKE layer.action values
- [ ] Human gate cells at L3 and L7 are visually marked as gates
- [ ] Reviewer cells at L3-L7 (plan review) and L9-L11 (build review) are highlighted
- [ ] Cascade diagram shows accurate routing for MINOR/MAJOR/ESCALATE
- [ ] Clicking any activity cell opens the correct layer modal

## Planned Tasks
1. Audit BLUEPRINT_CONFIG against LAYER_CAKE and document mismatches
2. Update renderBlueprint() to use LAYER_CAKE data directly where possible
3. Fix cell content mismatches (action, detail, highlighting)
4. Update cascade section to render from LAYER_CAKE.failCascade
5. Visual QA pass to verify all rendering matches data

## Edge Cases
- **Ralph Start vs Ralph Check rows**: Both use orchestrator styling but have different roles - ensure row labels distinguish them clearly
- **Reviewer acting at multiple layers**: Reviewer appears at L3-L7 (plan review) AND L9-L11 (build review) - both must be rendered correctly
- **Conditional highlighting**: Some cells only highlight under certain conditions - ensure logic handles all cases
- **Mobile responsiveness**: Blueprint has min-width - ensure scrolling works on smaller screens

## Dependencies
- Feature 01 (LAYER_CAKE Data Audit) - need accurate data before fixing rendering
