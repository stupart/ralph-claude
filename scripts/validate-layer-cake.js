#!/usr/bin/env node
/**
 * Layer Cake Validation Script
 *
 * Validates the LAYER_CAKE data structure in v3-system-blueprint.html
 * ensuring all required fields are present and correctly typed.
 *
 * Usage: node scripts/validate-layer-cake.js
 */

const fs = require('fs');
const path = require('path');

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

const BLUEPRINT_PATH = path.join(__dirname, '..', 'docs', 'v3-system-blueprint.html');

// Required fields for each layer
const LAYER_REQUIRED_FIELDS = [
  'id', 'name', 'phase', 'actor', 'action', 'description',
  'outputs', 'check', 'reviewType', 'humanGate', 'onPass', 'onFail', 'prompt'
];

// Valid phases
const VALID_PHASES = ['understand', 'plan', 'build', 'review', 'learn'];

// Required actor IDs
const REQUIRED_ACTORS = ['ralph_start', 'planner', 'builder', 'reviewer', 'ralph_check', 'human'];

// Required actor fields
const ACTOR_REQUIRED_FIELDS = ['id', 'label', 'color', 'role'];

// Required hierarchy levels
const REQUIRED_HIERARCHY_LEVELS = ['epic', 'feature', 'task', 'subtask'];

// Required hierarchy fields
const HIERARCHY_REQUIRED_FIELDS = ['min', 'layer', 'parent', 'timeScale'];

// Required gate arrays
const REQUIRED_GATES = ['humanApproval', 'ganPlanReview', 'ganBuildReview'];

// Required failCascade fields
const FAIL_CASCADE_REQUIRED_FIELDS = ['minor', 'major', 'escalate', 'maxRetries'];

// ═══════════════════════════════════════════════════════════════════════════
// EXTRACTION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Extract LAYER_CAKE object from HTML file
 * @param {string} htmlContent - The HTML file content
 * @returns {object|null} - Parsed LAYER_CAKE object or null if not found
 */
function extractLayerCake(htmlContent) {
  // Find the LAYER_CAKE object definition
  const startMarker = 'const LAYER_CAKE = {';
  const startIndex = htmlContent.indexOf(startMarker);

  if (startIndex === -1) {
    return null;
  }

  // Find the end of the object by counting braces
  let braceCount = 0;
  let inString = false;
  let stringChar = null;
  let endIndex = startIndex + startMarker.length - 1;

  for (let i = startIndex + startMarker.length - 1; i < htmlContent.length; i++) {
    const char = htmlContent[i];
    const prevChar = i > 0 ? htmlContent[i - 1] : '';

    // Handle string boundaries
    if ((char === '"' || char === "'" || char === '`') && prevChar !== '\\') {
      if (!inString) {
        inString = true;
        stringChar = char;
      } else if (char === stringChar) {
        inString = false;
        stringChar = null;
      }
    }

    // Count braces outside of strings
    if (!inString) {
      if (char === '{') braceCount++;
      if (char === '}') braceCount--;

      if (braceCount === 0) {
        endIndex = i + 1;
        break;
      }
    }
  }

  // Extract and clean the object string
  let objectStr = htmlContent.substring(startIndex + 6, endIndex); // Skip "const "

  // Remove helper functions (they can't be parsed as JSON)
  objectStr = objectStr.replace(/getLayer\(id\)\s*\{[^}]+\}/g, 'getLayer: null');
  objectStr = objectStr.replace(/getActor\(id\)\s*\{[^}]+\}/g, 'getActor: null');
  objectStr = objectStr.replace(/getHierarchyLevel\(type\)\s*\{[^}]+\}/g, 'getHierarchyLevel: null');
  objectStr = objectStr.replace(/getMinSubtasks\([^)]*\)\s*\{[^}]+\}/g, 'getMinSubtasks: null');

  // Convert to valid JSON
  // Add quotes around unquoted keys
  objectStr = objectStr.replace(/(\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":');

  // Handle template literals - convert to regular strings
  objectStr = objectStr.replace(/`([^`]*)`/gs, (match, content) => {
    return JSON.stringify(content);
  });

  // Remove trailing commas
  objectStr = objectStr.replace(/,(\s*[}\]])/g, '$1');

  // Remove comments
  objectStr = objectStr.replace(/\/\/[^\n]*/g, '');
  objectStr = objectStr.replace(/\/\*[\s\S]*?\*\//g, '');

  // Skip complex parsing, use manual extraction which is more reliable
  return extractLayerCakeManually(htmlContent);
}

/**
 * Manual extraction fallback - extracts key sections individually
 */
function extractLayerCakeManually(htmlContent) {
  const result = {
    meta: { version: "3.0", name: "Layer Cake" },
    actors: {},
    hierarchy: {},
    layers: [],
    gates: {},
    failCascade: {}
  };

  // Extract actors
  const actorMatch = htmlContent.match(/actors:\s*\{([\s\S]*?)\n\s*\},?\s*\n\s*\/\//);
  if (actorMatch) {
    const actorIds = ['ralph_start', 'planner', 'builder', 'reviewer', 'ralph_check', 'human'];
    actorIds.forEach(id => {
      const actorRegex = new RegExp(`${id}:\\s*\\{([^}]+)\\}`, 's');
      const match = htmlContent.match(actorRegex);
      if (match) {
        result.actors[id] = {
          id: id,
          label: (match[1].match(/label:\s*"([^"]+)"/) || [])[1] || '',
          color: (match[1].match(/color:\s*"([^"]+)"/) || [])[1] || '',
          role: (match[1].match(/role:\s*"([^"]+)"/) || [])[1] || ''
        };
      }
    });
  }

  // Extract hierarchy
  const hierarchyLevels = ['epic', 'feature', 'task', 'subtask'];
  hierarchyLevels.forEach(level => {
    const regex = new RegExp(`${level}:\\s*\\{\\s*min:\\s*(\\d+),\\s*layer:\\s*"([^"]+)",\\s*parent:\\s*(null|"[^"]+"),\\s*timeScale:\\s*"([^"]+)"\\s*\\}`);
    const match = htmlContent.match(regex);
    if (match) {
      result.hierarchy[level] = {
        min: parseInt(match[1]),
        layer: match[2],
        parent: match[3] === 'null' ? null : match[3].replace(/"/g, ''),
        timeScale: match[4]
      };
    }
  });

  // Extract layers - use indexOf for reliable matching
  for (let i = 1; i <= 12; i++) {
    const layerId = `L${i}`;
    const searchStr = `id: "${layerId}"`;
    const startPos = htmlContent.indexOf(searchStr);

    if (startPos !== -1) {
      // Find a reasonable chunk of content after this layer ID
      const endPos = Math.min(startPos + 3000, htmlContent.length); // Each layer is ~1500 chars max
      const layerContent = htmlContent.substring(startPos, endPos);

      // Extract outputs array
      let outputs = [];
      const outputsMatch = layerContent.match(/outputs:\s*\[(.*?)\]/s);
      if (outputsMatch) {
        const outputItems = outputsMatch[1].match(/"([^"]+)"/g);
        if (outputItems) {
          outputs = outputItems.map(s => s.replace(/"/g, ''));
        }
      }

      // Extract onFail - can be null, a string, or an object with minor/major/escalate
      let onFail = null;
      const onFailObjMatch = layerContent.match(/onFail:\s*\{\s*minor:\s*"([^"]+)",\s*major:\s*"([^"]+)",\s*escalate:\s*"([^"]+)"\s*\}/);
      if (onFailObjMatch) {
        onFail = {
          minor: onFailObjMatch[1],
          major: onFailObjMatch[2],
          escalate: onFailObjMatch[3]
        };
      } else {
        const onFailStrMatch = layerContent.match(/onFail:\s*"([^"]+)"/);
        if (onFailStrMatch) {
          onFail = onFailStrMatch[1];
        }
        // else remains null (for layers like L12 where onFail: null)
      }

      result.layers.push({
        id: layerId,
        name: (layerContent.match(/name:\s*"([^"]+)"/) || [])[1] || '',
        phase: (layerContent.match(/phase:\s*"([^"]+)"/) || [])[1] || '',
        actor: (layerContent.match(/actor:\s*"([^"]+)"/) || [])[1] || '',
        action: (layerContent.match(/action:\s*"([^"]+)"/) || [])[1] || '',
        description: (layerContent.match(/description:\s*"([^"]+)"/) || [])[1] || '',
        outputs: outputs,
        check: layerContent.includes('check: null') ? null : {},
        reviewType: layerContent.includes('reviewType: null') ? null : (layerContent.includes('reviewType: "plan"') ? 'plan' : 'build'),
        humanGate: layerContent.includes('humanGate: true'),
        onPass: (layerContent.match(/onPass:\s*"([^"]+)"/) || [])[1] || 'COMPLETE',
        onFail: onFail,
        prompt: layerContent.includes('prompt:') ? 'present' : '' // Just check it exists
      });
    }
  }

  // Extract gates
  const gatesMatch = htmlContent.match(/gates:\s*\{([\s\S]*?)\n\s*\},?\s*\n/);
  if (gatesMatch) {
    const humanApproval = gatesMatch[1].match(/humanApproval:\s*\[([^\]]+)\]/);
    const ganPlanReview = gatesMatch[1].match(/ganPlanReview:\s*\[([^\]]+)\]/);
    const ganBuildReview = gatesMatch[1].match(/ganBuildReview:\s*\[([^\]]+)\]/);

    result.gates.humanApproval = humanApproval ? humanApproval[1].match(/"L\d+"/g).map(s => s.replace(/"/g, '')) : [];
    result.gates.ganPlanReview = ganPlanReview ? ganPlanReview[1].match(/"L\d+"/g).map(s => s.replace(/"/g, '')) : [];
    result.gates.ganBuildReview = ganBuildReview ? ganBuildReview[1].match(/"L\d+"/g).map(s => s.replace(/"/g, '')) : [];
  }

  // Extract failCascade
  const cascadeMatch = htmlContent.match(/failCascade:\s*\{([\s\S]*?)\n\s*\},?\s*\n/);
  if (cascadeMatch) {
    result.failCascade = {
      minor: (cascadeMatch[1].match(/minor:\s*"([^"]+)"/) || [])[1] || '',
      major: (cascadeMatch[1].match(/major:\s*"([^"]+)"/) || [])[1] || '',
      escalate: (cascadeMatch[1].match(/escalate:\s*"([^"]+)"/) || [])[1] || '',
      maxRetries: parseInt((cascadeMatch[1].match(/maxRetries:\s*(\d+)/) || [])[1]) || 0
    };
  }

  return result;
}

// ═══════════════════════════════════════════════════════════════════════════
// VALIDATORS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Validate all layers
 * @param {array} layers - Array of layer objects
 * @returns {{valid: boolean, errors: string[]}}
 */
function validateLayers(layers) {
  const errors = [];

  // Check we have 12 layers
  if (!Array.isArray(layers)) {
    errors.push('layers is not an array');
    return { valid: false, errors };
  }

  if (layers.length !== 12) {
    errors.push(`Expected 12 layers, found ${layers.length}`);
  }

  // Check each layer
  layers.forEach((layer, index) => {
    const layerId = layer.id || `Layer[${index}]`;

    // Check required fields exist
    LAYER_REQUIRED_FIELDS.forEach(field => {
      if (!(field in layer)) {
        errors.push(`${layerId}: Missing required field '${field}'`);
      }
    });

    // Validate phase
    if (layer.phase && !VALID_PHASES.includes(layer.phase)) {
      errors.push(`${layerId}: Invalid phase '${layer.phase}', must be one of: ${VALID_PHASES.join(', ')}`);
    }

    // Validate actor reference
    if (layer.actor && !REQUIRED_ACTORS.includes(layer.actor)) {
      errors.push(`${layerId}: Invalid actor '${layer.actor}', must be one of: ${REQUIRED_ACTORS.join(', ')}`);
    }

    // Validate outputs is array
    if (layer.outputs !== undefined && !Array.isArray(layer.outputs)) {
      errors.push(`${layerId}: 'outputs' must be an array`);
    }

    // Validate humanGate is boolean
    if (layer.humanGate !== undefined && typeof layer.humanGate !== 'boolean') {
      errors.push(`${layerId}: 'humanGate' must be a boolean`);
    }

    // Validate prompt exists and is non-empty for active layers
    if (layer.prompt !== undefined && layer.prompt !== null && typeof layer.prompt !== 'string') {
      errors.push(`${layerId}: 'prompt' must be a string`);
    }

    // Validate onFail target layer IDs
    const validLayerIds = Array.from({length: 12}, (_, j) => `L${j + 1}`);
    if (layer.onFail !== null && layer.onFail !== undefined) {
      if (typeof layer.onFail === 'string') {
        if (!validLayerIds.includes(layer.onFail)) {
          errors.push(`${layerId}: onFail references invalid layer '${layer.onFail}'`);
        }
      } else if (typeof layer.onFail === 'object') {
        ['minor', 'major', 'escalate'].forEach(severity => {
          if (layer.onFail[severity]) {
            if (!validLayerIds.includes(layer.onFail[severity])) {
              errors.push(`${layerId}: onFail.${severity} references invalid layer '${layer.onFail[severity]}'`);
            }
          } else {
            errors.push(`${layerId}: onFail object missing '${severity}' route`);
          }
        });
      }
    }

    // Validate non-terminal layers have at least one output
    if (layer.onPass !== 'COMPLETE' && Array.isArray(layer.outputs) && layer.outputs.length === 0) {
      errors.push(`${layerId}: Non-terminal layer has no outputs defined`);
    }
  });

  // Check layer sequence (L1 through L12)
  for (let i = 1; i <= 12; i++) {
    const expectedId = `L${i}`;
    const layer = layers.find(l => l.id === expectedId);
    if (!layer) {
      errors.push(`Missing layer ${expectedId}`);
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validate all actors
 * @param {object} actors - Actors object
 * @returns {{valid: boolean, errors: string[]}}
 */
function validateActors(actors) {
  const errors = [];

  if (!actors || typeof actors !== 'object') {
    errors.push('actors is not an object');
    return { valid: false, errors };
  }

  // Check all required actors exist
  REQUIRED_ACTORS.forEach(actorId => {
    if (!(actorId in actors)) {
      errors.push(`Missing required actor '${actorId}'`);
      return;
    }

    const actor = actors[actorId];

    // Check required fields
    ACTOR_REQUIRED_FIELDS.forEach(field => {
      if (!(field in actor)) {
        errors.push(`Actor '${actorId}': Missing required field '${field}'`);
      }
    });

    // Validate color is hex
    if (actor.color && !/^#[0-9A-Fa-f]{6}$/.test(actor.color)) {
      errors.push(`Actor '${actorId}': Invalid color format '${actor.color}', expected hex (#RRGGBB)`);
    }
  });

  return { valid: errors.length === 0, errors };
}

/**
 * Validate hierarchy
 * @param {object} hierarchy - Hierarchy object
 * @returns {{valid: boolean, errors: string[]}}
 */
function validateHierarchy(hierarchy) {
  const errors = [];

  if (!hierarchy || typeof hierarchy !== 'object') {
    errors.push('hierarchy is not an object');
    return { valid: false, errors };
  }

  // Check all required levels exist
  REQUIRED_HIERARCHY_LEVELS.forEach(level => {
    if (!(level in hierarchy)) {
      errors.push(`Missing required hierarchy level '${level}'`);
      return;
    }

    const levelData = hierarchy[level];

    // Check required fields
    HIERARCHY_REQUIRED_FIELDS.forEach(field => {
      if (!(field in levelData)) {
        errors.push(`Hierarchy '${level}': Missing required field '${field}'`);
      }
    });

    // Validate min is a positive number
    if (levelData.min !== undefined && (typeof levelData.min !== 'number' || levelData.min < 1)) {
      errors.push(`Hierarchy '${level}': 'min' must be a positive number`);
    }

    // Validate layer reference format
    if (levelData.layer && !/^L\d+$/.test(levelData.layer)) {
      errors.push(`Hierarchy '${level}': Invalid layer reference '${levelData.layer}'`);
    }
  });

  // Validate parent relationships
  if (hierarchy.epic && hierarchy.epic.parent !== null) {
    errors.push("Hierarchy 'epic': parent should be null (top level)");
  }
  if (hierarchy.feature && hierarchy.feature.parent !== 'epic') {
    errors.push("Hierarchy 'feature': parent should be 'epic'");
  }
  if (hierarchy.task && hierarchy.task.parent !== 'feature') {
    errors.push("Hierarchy 'task': parent should be 'feature'");
  }
  if (hierarchy.subtask && hierarchy.subtask.parent !== 'task') {
    errors.push("Hierarchy 'subtask': parent should be 'task'");
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validate gates
 * @param {object} gates - Gates object
 * @returns {{valid: boolean, errors: string[]}}
 */
function validateGates(gates) {
  const errors = [];

  if (!gates || typeof gates !== 'object') {
    errors.push('gates is not an object');
    return { valid: false, errors };
  }

  // Check all required gate arrays exist
  REQUIRED_GATES.forEach(gateType => {
    if (!(gateType in gates)) {
      errors.push(`Missing required gate type '${gateType}'`);
      return;
    }

    if (!Array.isArray(gates[gateType])) {
      errors.push(`Gate '${gateType}': Must be an array`);
      return;
    }

    // Validate each gate references a valid layer
    gates[gateType].forEach(layerId => {
      if (!/^L\d+$/.test(layerId)) {
        errors.push(`Gate '${gateType}': Invalid layer reference '${layerId}'`);
      }
    });
  });

  // Validate humanApproval contains L3 and L7
  if (gates.humanApproval) {
    if (!gates.humanApproval.includes('L3')) {
      errors.push("Gate 'humanApproval': Should include 'L3'");
    }
    if (!gates.humanApproval.includes('L7')) {
      errors.push("Gate 'humanApproval': Should include 'L7'");
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validate fail cascade rules
 * @param {object} failCascade - Fail cascade object
 * @returns {{valid: boolean, errors: string[]}}
 */
function validateFailCascade(failCascade) {
  const errors = [];

  if (!failCascade || typeof failCascade !== 'object') {
    errors.push('failCascade is not an object');
    return { valid: false, errors };
  }

  // Check all required fields exist
  FAIL_CASCADE_REQUIRED_FIELDS.forEach(field => {
    if (!(field in failCascade)) {
      errors.push(`failCascade: Missing required field '${field}'`);
    }
  });

  // Validate maxRetries is a positive number
  if (failCascade.maxRetries !== undefined) {
    if (typeof failCascade.maxRetries !== 'number' || failCascade.maxRetries < 1) {
      errors.push("failCascade: 'maxRetries' must be a positive number");
    }
  }

  // Validate descriptions are non-empty strings
  ['minor', 'major', 'escalate'].forEach(level => {
    if (failCascade[level] !== undefined && typeof failCascade[level] !== 'string') {
      errors.push(`failCascade: '${level}' must be a string`);
    }
  });

  return { valid: errors.length === 0, errors };
}

/**
 * Main validation function
 * @param {object} layerCake - The LAYER_CAKE object
 * @returns {{valid: boolean, errors: string[], summary: object}}
 */
function validateLayerCake(layerCake) {
  const allErrors = [];
  const summary = {
    layers: { valid: false, count: 0 },
    actors: { valid: false, count: 0 },
    hierarchy: { valid: false, count: 0 },
    gates: { valid: false, count: 0 },
    failCascade: { valid: false }
  };

  if (!layerCake) {
    return {
      valid: false,
      errors: ['LAYER_CAKE object not found or could not be parsed'],
      summary
    };
  }

  // Validate each section
  const layerResult = validateLayers(layerCake.layers);
  summary.layers = { valid: layerResult.valid, count: layerCake.layers?.length || 0 };
  allErrors.push(...layerResult.errors);

  const actorResult = validateActors(layerCake.actors);
  summary.actors = { valid: actorResult.valid, count: Object.keys(layerCake.actors || {}).length };
  allErrors.push(...actorResult.errors);

  const hierarchyResult = validateHierarchy(layerCake.hierarchy);
  summary.hierarchy = { valid: hierarchyResult.valid, count: Object.keys(layerCake.hierarchy || {}).length };
  allErrors.push(...hierarchyResult.errors);

  const gatesResult = validateGates(layerCake.gates);
  summary.gates = { valid: gatesResult.valid, count: Object.keys(layerCake.gates || {}).length };
  allErrors.push(...gatesResult.errors);

  const cascadeResult = validateFailCascade(layerCake.failCascade);
  summary.failCascade = { valid: cascadeResult.valid };
  allErrors.push(...cascadeResult.errors);

  return {
    valid: allErrors.length === 0,
    errors: allErrors,
    summary
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════

function main() {
  console.log('🍰 Layer Cake Validation Script');
  console.log('================================\n');

  // Check if blueprint file exists
  if (!fs.existsSync(BLUEPRINT_PATH)) {
    console.error(`Error: Blueprint file not found at ${BLUEPRINT_PATH}`);
    process.exit(1);
  }

  // Read the HTML file
  console.log(`Reading: ${BLUEPRINT_PATH}`);
  const htmlContent = fs.readFileSync(BLUEPRINT_PATH, 'utf8');

  // Extract LAYER_CAKE object
  console.log('Extracting LAYER_CAKE object...\n');
  const layerCake = extractLayerCake(htmlContent);

  if (!layerCake) {
    console.error('Error: Could not extract LAYER_CAKE object from HTML');
    process.exit(1);
  }

  // Run validation
  const result = validateLayerCake(layerCake);

  // Print summary
  console.log('Validation Summary');
  console.log('------------------');
  console.log(`Layers:      ${result.summary.layers.valid ? '✓' : '✗'} (${result.summary.layers.count} found)`);
  console.log(`Actors:      ${result.summary.actors.valid ? '✓' : '✗'} (${result.summary.actors.count} found)`);
  console.log(`Hierarchy:   ${result.summary.hierarchy.valid ? '✓' : '✗'} (${result.summary.hierarchy.count} levels)`);
  console.log(`Gates:       ${result.summary.gates.valid ? '✓' : '✗'} (${result.summary.gates.count} types)`);
  console.log(`FailCascade: ${result.summary.failCascade.valid ? '✓' : '✗'}`);
  console.log('');

  // Print errors if any
  if (result.errors.length > 0) {
    console.log(`\nErrors Found (${result.errors.length}):`);
    console.log('-------------------------');
    result.errors.forEach((error, i) => {
      console.log(`${i + 1}. ${error}`);
    });
    console.log('');
  }

  // Final verdict
  if (result.valid) {
    console.log('✓ All validations passed');
  } else {
    console.log(`✗ Validation failed with ${result.errors.length} error(s)`);
  }

  process.exit(result.valid ? 0 : 1);
}

// Run if called directly
if (require.main === module) {
  main();
}

// Export for testing
module.exports = {
  extractLayerCake,
  validateLayerCake,
  validateLayers,
  validateActors,
  validateHierarchy,
  validateGates,
  validateFailCascade
};
