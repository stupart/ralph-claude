# Review: L9 - Epic 1 Features

## Verdict: ITERATE

## Summary
The implementation covers the core requirements of all five features well. The LAYER_CAKE data structure is complete with all 12 layers, 6 actors, hierarchy, gates, and failCascade properly defined. The validation script passes cleanly. JSDoc documentation is thorough and well-structured. Export uses sanitizeForExport() correctly. TIER_PRESETS are defined and functional. However, there are several issues ranging from missing import UI to BLUEPRINT_CONFIG action text misalignment that prevent a clean PASS.

## Issues Found

### Issue 1: Import UI is missing -- importLayerCake() has no calling code or UI
- Severity: MAJOR
- Location: /Users/tylerstupart/ralph-claude/docs/v3-system-blueprint.html:1419
- Description: Feature 03 acceptance criteria require "Import accepts a valid exported JSON and updates the visualization" and "Import rejects invalid JSON with clear error message." The `importLayerCake()` function exists as a utility (line 1419), but there is no import button, no file picker input, and no UI to trigger it. The function is effectively dead code. There is no `<input type="file">` element or any button labeled "Import" anywhere in the HTML. The feature spec also requires "Import must handle version mismatches gracefully with warnings" and "Import must not corrupt existing LAYER_CAKE if validation fails" -- these cannot be tested because there is no way for users to invoke the import.
- Recommendation: Add an import button next to the export buttons (around line 2217). Create a hidden file input, wire it to read the selected JSON file, call importLayerCake(), and on success, update the in-memory LAYER_CAKE and re-render the blueprint. Show toast feedback for success/failure.

### Issue 2: BLUEPRINT_CONFIG cell actions do not exactly match LAYER_CAKE layer.action values
- Severity: MINOR
- Location: /Users/tylerstupart/ralph-claude/docs/v3-system-blueprint.html:1530-1534
- Description: Feature 02 acceptance criteria state "Cell activities (action text) align with LAYER_CAKE layer.action values." Several planner row cells use truncated action text that differs from LAYER_CAKE:
  - L4: BLUEPRINT_CONFIG action is "Define", LAYER_CAKE action is "Define Epics"
  - L5: BLUEPRINT_CONFIG action is "Plan", LAYER_CAKE action is "Plan Features"
  - L6: BLUEPRINT_CONFIG action is "Spec", LAYER_CAKE action is "Spec Tasks"
  - L7: BLUEPRINT_CONFIG action is "Subtasks", LAYER_CAKE action is "Define Subtasks"
  - L12: BLUEPRINT_CONFIG action is "Retrospective", LAYER_CAKE action is "Retrospective" (this one matches)

  This means BLUEPRINT_CONFIG is not fully synchronized with LAYER_CAKE, which contradicts the requirement at Feature 02 line "BLUEPRINT_CONFIG must stay synchronized with LAYER_CAKE data."
- Recommendation: Either update BLUEPRINT_CONFIG cell actions to exactly match LAYER_CAKE layer.action values, or better yet, have renderBlueprint() pull the action text directly from LAYER_CAKE.getLayer(layerId).action instead of duplicating it in BLUEPRINT_CONFIG.

### Issue 3: ralph_check row fail routing details are oversimplified
- Severity: MINOR
- Location: /Users/tylerstupart/ralph-claude/docs/v3-system-blueprint.html:1571-1573
- Description: The ralph_check row cells for L9, L10, L11 show simplified fail routing that only mentions one target (the major route), omitting minor and escalate routes. For example, L9 says "-> L10 or L7" but LAYER_CAKE defines `{ minor: "L8", major: "L7", escalate: "L6" }`. The minor route to L8 and escalate route to L6 are not reflected in the cell detail text. This is a data alignment issue per Feature 02 requirements.
- Recommendation: Update the detail text to either show all three routes (e.g., "L8/L7/L6") or reference LAYER_CAKE data dynamically in the rendering.

### Issue 4: Validation script does not verify onFail object structure for L9-L11
- Severity: MINOR
- Location: /Users/tylerstupart/ralph-claude/scripts/validate-layer-cake.js:196
- Description: The validation script extracts `onFail` as simply `null` for all layers (line 196: `onFail: null, // Simplified`). This means it never validates the complex onFail routing objects `{ minor, major, escalate }` that L9, L10, and L11 define. Feature 01 acceptance criteria state "All cross-references (onPass, onFail, actor) resolve to valid IDs" -- the script cannot verify onFail cross-references because it skips them entirely.
- Recommendation: Extend the manual extraction to parse onFail objects for review layers (L9-L11) and validate that their target layer IDs (e.g., "L8", "L7", "L6") are valid layer references.

### Issue 5: Validation script does not verify outputs arrays
- Severity: MINOR
- Location: /Users/tylerstupart/ralph-claude/scripts/validate-layer-cake.js:191
- Description: The extraction sets `outputs: []` for all layers (line 191: `outputs: [], // Simplified`). The validate function checks that outputs is an array (line 272) but since extraction always provides an empty array, it never validates that layers actually have outputs defined. Feature 01 says "Every layer has all required fields populated (no nulls where data expected)."
- Recommendation: Extract actual output arrays from the HTML source and validate that non-terminal layers have at least one output defined.

### Issue 6: TIER_PRESETS total calculation discrepancy for Medium tier
- Severity: MINOR
- Location: /Users/tylerstupart/ralph-claude/docs/v3-system-blueprint.html:1339-1345
- Description: Feature 05 acceptance criteria state "Clicking Medium preset sets values to 4, 4, 4, 2 (yielding 128 subtasks)." The TIER_PRESETS object correctly defines `{ epics: 4, features: 4, tasks: 4, subtasks: 2 }` and `4 * 4 * 4 * 2 = 128`. This is correct. However, the acceptance criteria for Large says "5, 5, 5, 3 (yielding 375 subtasks)" and `5 * 5 * 5 * 3 = 375`. This is also correct. No issue here on review -- the math checks out. (Self-corrected during review.)
- Recommendation: N/A -- withdrawing this issue.

### Issue 7: Feature 04 (Layer Detail Modal Enhancement) has no feature spec file
- Severity: MINOR
- Location: /Users/tylerstupart/ralph-claude/5-features/epic-1-blueprint/
- Description: The _index.md lists 5 features including "Feature 04: Layer Detail Modal Enhancement" but there is no `feature-04-modal-enhancement.md` file. The user's review request also did not include it. This may indicate Feature 04 was skipped or deferred, but the _index.md claims "Total Features: 5" and Feature 04 is listed. If it was intentionally deferred, the index should note this.
- Recommendation: Either create the Feature 04 spec file or update _index.md to note it was deferred/descoped.

## What's Working Well

1. **JSDoc documentation is excellent.** The LAYER_CAKE object has comprehensive JSDoc type definitions (lines 758-834) covering LayerCakeMeta, Actor, HierarchyLevel, LayerCheck, FailRouting, Layer, Gates, FailCascade, and the full LayerCake type. Helper functions also have JSDoc with @param, @returns, and @example annotations. This exceeds the acceptance criteria.

2. **sanitizeForExport() is well-implemented.** The deep clone with function replacement approach (line 1388) correctly handles nested objects, arrays, and replaces functions with descriptive strings. It adds export metadata including schemaVersion, timestamp, and source. Both exportLayerCake() and copyLayerCakeToClipboard() use sanitizeForExport() as required.

3. **TIER_PRESETS are correctly defined** with all four tiers (Micro/Small/Medium/Large) matching the acceptance criteria values exactly. The preset buttons UI, real-time updates, and tier detection logic work as specified.

4. **Human gate and reviewer cell styling is implemented.** CSS classes `.human-gate` (gold border, line 656), `.gate-activity` (gold left border + warm background, line 661), and `.reviewer-active` (purple highlight, line 667) are defined and applied conditionally in renderBlueprint() using LAYER_CAKE.gates data.

5. **The validation script passes cleanly** with all five sections (Layers, Actors, Hierarchy, Gates, FailCascade) verified. The script structure is clean with modular validator functions and good error reporting.

6. **The cascade section renders dynamically from LAYER_CAKE.failCascade** via renderCascadeRules() and renderLayerFailTargets(), correctly pulling data at runtime rather than hardcoding.

7. **Export produces properly timestamped filenames** matching the required format `layer-cake-v{version}-{timestamp}.json`, with schema version included in the output.
