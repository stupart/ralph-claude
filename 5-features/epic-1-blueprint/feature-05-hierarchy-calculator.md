# Feature: Hierarchy Calculator with Tier Presets

## Overview
Upgrade the hierarchy calculator to include project tier presets (Micro, Small, Medium, Large) that automatically populate the calculator with tier-appropriate minimums. Add validation to show whether current values meet tier requirements and display the total work estimate.

## User Value
Project planners need to quickly understand the scope implications of their decomposition choices. Tier presets help users choose appropriate minimums for their project size, and validation ensures they meet the Layer Cake methodology requirements for their chosen tier.

## Requirements
1. Add tier preset buttons/dropdown: Micro, Small, Medium, Large
2. Clicking a tier preset populates all four inputs with that tier's minimums
3. Display current tier based on input values (may be between defined tiers)
4. Show validation status: whether current values meet minimum requirements
5. Display total subtask count prominently with calculation breakdown
6. Show time estimate based on subtask count (using LAYER_CAKE.hierarchy timeScale)
7. Color-code validation (green if valid, red if below minimums)
8. Presets must match architecture.md tier definitions exactly
9. Calculator must update in real-time as inputs change
10. Add "Reset to Minimums" button to restore default Small tier

## Technical Approach
1. Define tier configurations as a data object alongside LAYER_CAKE
2. Add preset selector UI (buttons or dropdown) above input fields
3. Modify updateTotal() to include validation logic
4. Calculate and display time estimates using hierarchy timeScale data
5. Add visual indicators (icons, colors) for validation state
6. Connect preset buttons to populate input fields

## Acceptance Criteria
- [ ] Four tier preset buttons are visible and clickable
- [ ] Clicking "Small" preset sets values to 3, 3, 3, 2 (yielding 54 subtasks)
- [ ] Clicking "Medium" preset sets values to 4, 4, 4, 2 (yielding 128 subtasks)
- [ ] Clicking "Large" preset sets values to 5, 5, 5, 3 (yielding 375 subtasks)
- [ ] Clicking "Micro" preset sets values to 1, 2, 2, 1 (yielding 4 subtasks)
- [ ] Values below tier minimums show red validation warning
- [ ] Total subtask count updates in real-time as inputs change
- [ ] Time estimate is displayed based on subtask count

## Planned Tasks
1. Define TIER_PRESETS data structure with all tier configurations
2. Add tier preset selector UI to hierarchy section
3. Implement preset loading into calculator inputs
4. Add validation logic with visual feedback
5. Calculate and display time estimates
6. Add Reset button and polish UI

## Edge Cases
- **Custom values between tiers**: User enters 4, 3, 4, 2 - show as "Custom" or nearest tier
- **Values exceeding Large tier**: User enters very high numbers - calculate correctly, no upper limit
- **Invalid input values**: User enters 0 or negative - enforce minimum of 1 for all fields
- **Non-integer inputs**: User enters 2.5 - round or reject with validation
- **Time estimate accuracy**: TimeScale is approximate - display as estimate with disclaimer

## Dependencies
- Feature 01 (LAYER_CAKE Data Audit) - need accurate hierarchy.timeScale data
