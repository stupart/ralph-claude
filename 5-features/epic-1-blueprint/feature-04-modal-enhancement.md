# Feature: Layer Detail Modal Enhancement

## Overview
Enhance the layer detail modals to display comprehensive, well-formatted information about each layer including the full prompt template, all checks and validations, outputs with descriptions, and cascade routing rules. Make modals the primary reference for understanding any layer.

## User Value
When users click on a layer, they need to see everything relevant to that layer in one place. Enhanced modals eliminate the need to cross-reference multiple documents and provide a complete, authoritative view of what each layer does, expects, and produces.

## Requirements
1. Modal header must show layer ID, name, phase, and actor with color-coded badge
2. Description section must display layer.description with any additional context
3. Actor section must show full actor details including role description
4. Outputs section must list all expected outputs with file path patterns
5. Check section must clearly explain what validation is performed and minimum counts
6. Tools section must list all tools available to the actor at this layer
7. Human Gate indicator must be prominent for L3 and L7
8. Review Type section must indicate plan review vs build review
9. Flow section must show all routing paths (onPass, onFail with minor/major/escalate)
10. Prompt section must display the full prompt template with syntax highlighting
11. Modal must be scrollable for long content while header stays fixed
12. Close on Escape key and backdrop click must work reliably

## Technical Approach
1. Restructure modal HTML to support fixed header and scrollable body
2. Enhance openLayerModal() to pull complete data from LAYER_CAKE
3. Add syntax highlighting for prompt templates (or styled code block)
4. Create helper functions for formatting complex data (checks, flow routing)
5. Add tool permission data to LAYER_CAKE or derive from actor role
6. Implement proper focus management for accessibility

## Acceptance Criteria
- [ ] Modal displays all 11 required sections for each layer
- [ ] Prompt template is readable with proper formatting (monospace, line breaks preserved)
- [ ] Outputs are displayed as clickable/copyable file path patterns
- [ ] Check validation rules are clearly explained in plain language
- [ ] Flow routing shows all possible paths with color coding (green pass, yellow minor, red major, purple escalate)
- [ ] Human gate badge is visible and prominent on L3 and L7 modals
- [ ] Modal scrolls content while keeping header fixed
- [ ] Escape key and backdrop click close the modal

## Planned Tasks
1. Redesign modal layout with fixed header and scrollable body
2. Create section renderer functions for each modal section type
3. Add prompt template formatting with code styling
4. Implement flow routing visualization with color-coded paths
5. Add keyboard and focus management for accessibility
6. Polish styling and test all 12 layer modals

## Edge Cases
- **Very long prompts**: Some layer prompts are extensive - ensure scrolling works and prompt doesn't overflow
- **Null fields**: Some layers have null check or null onFail - display "N/A" or omit section gracefully
- **Object-type onFail**: L9-L11 have complex onFail objects - must render all three cascade options
- **Multiple review types**: Same layer can have both reviewType and humanGate - show both clearly
- **Missing tool data**: If tool permissions aren't in LAYER_CAKE, derive from actor or hardcode

## Dependencies
- Feature 01 (LAYER_CAKE Data Audit) - modals display LAYER_CAKE data, so data must be complete
