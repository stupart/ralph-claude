# Feature: JSON Export/Import for Ralph

## Overview
Add robust JSON export functionality that produces a clean, well-structured JSON file from LAYER_CAKE, and add import functionality to load external JSON configurations. This enables Ralph (the orchestrator) to programmatically consume methodology data without parsing HTML/JavaScript.

## User Value
Ralph and other automated tools need machine-readable access to the Layer Cake methodology. By providing clean JSON export/import, the blueprint becomes not just a visual reference but a functional data source that can drive automation, validation, and tooling.

## Requirements
1. Export button must produce valid, well-formatted JSON with 2-space indentation
2. Exported JSON must exclude JavaScript functions (convert to descriptive strings or omit)
3. Exported JSON must include a schema version for forward compatibility
4. Export filename must include timestamp: `layer-cake-v{version}-{timestamp}.json`
5. Import functionality must validate JSON against expected schema before applying
6. Import must handle version mismatches gracefully with warnings
7. Import must not corrupt existing LAYER_CAKE if validation fails
8. Add a "Copy to Clipboard" option alongside file download
9. Add visual feedback (toast/notification) on successful export/import
10. Exported JSON must be importable by Ralph without modification

## Technical Approach
1. Create a sanitization function that converts LAYER_CAKE to export-safe JSON
2. Add schema version field to exported JSON
3. Implement exportLayerCake() with proper Blob creation and download trigger
4. Create importLayerCake() with file input handling and validation
5. Add JSON Schema definition for validation
6. Implement clipboard API integration for copy functionality

## Acceptance Criteria
- [ ] Clicking export produces a valid JSON file download
- [ ] Exported JSON parses successfully with JSON.parse()
- [ ] Exported JSON contains all layer data (12 layers with full specs)
- [ ] Exported JSON contains all actor data (6 actors)
- [ ] Exported JSON contains hierarchy, gates, and failCascade data
- [ ] Import accepts a valid exported JSON and updates the visualization
- [ ] Import rejects invalid JSON with clear error message
- [ ] Copy to clipboard works and shows success feedback

## Planned Tasks
1. Design JSON schema for LAYER_CAKE export format
2. Implement sanitizeForExport() function to prepare data
3. Upgrade exportLayerCake() with versioning and timestamped filename
4. Implement importLayerCake() with file picker and validation
5. Add clipboard copy functionality and toast notifications
6. Write schema validation tests

## Edge Cases
- **Function serialization**: LAYER_CAKE contains helper functions (getLayer, getActor, etc.) - these should be excluded or converted to metadata
- **Circular references**: Ensure no circular references exist in the data structure that would break JSON.stringify
- **Large file handling**: Exported JSON could be large - ensure no browser memory issues
- **Import version mismatch**: If importing older/newer version, show warning but allow with user confirmation
- **Partial import**: Consider whether to allow importing just layers or just actors

## Dependencies
- Feature 01 (LAYER_CAKE Data Audit) - need complete data before export is meaningful
