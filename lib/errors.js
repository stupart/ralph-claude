/**
 * Layer Cake Error Catalog
 *
 * Centralizes all error messages with error codes for easier debugging
 * and consistent error handling across the codebase.
 *
 * Error code format: ERR_<CATEGORY>_<SPECIFIC>
 * Categories: CASCADE, GATE, VALIDATION, STATE, AGENT, RECOVERY, SPAWN
 */

/**
 * Error codes and their message templates.
 * Use {{placeholder}} for dynamic values.
 */
const ERROR_CODES = {
  // Cascade errors
  ERR_CASCADE_DEPTH: {
    code: 'ERR_CASCADE_DEPTH',
    message: 'Cascade depth limit ({{maxDepth}}) exceeded at layer {{layer}}. Builder/judge bounced {{depth}} times without resolution. Human intervention required.',
    category: 'cascade'
  },
  ERR_CASCADE_INVALID_TARGET: {
    code: 'ERR_CASCADE_INVALID_TARGET',
    message: 'Invalid cascade target: {{target}}',
    category: 'cascade'
  },

  // Gate errors
  ERR_GATE_TIMEOUT: {
    code: 'ERR_GATE_TIMEOUT',
    message: 'Human gate at {{layer}} timed out after {{timeoutMs}}ms. {{action}}',
    category: 'gate'
  },
  ERR_GATE_PENDING: {
    code: 'ERR_GATE_PENDING',
    message: 'Layer {{layer}} requires human approval before proceeding',
    category: 'gate'
  },

  // Validation errors
  ERR_VALIDATION_FAILED: {
    code: 'ERR_VALIDATION_FAILED',
    message: 'Validation failed for layer {{layer}}: {{details}}',
    category: 'validation'
  },
  ERR_VALIDATION_MISSING_FILE: {
    code: 'ERR_VALIDATION_MISSING_FILE',
    message: 'Missing required file: {{file}}',
    category: 'validation'
  },
  ERR_VALIDATION_COUNT: {
    code: 'ERR_VALIDATION_COUNT',
    message: '{{type}} count ({{count}}) below minimum ({{minimum}})',
    category: 'validation'
  },
  ERR_VALIDATION_MISSING_SECTIONS: {
    code: 'ERR_VALIDATION_MISSING_SECTIONS',
    message: 'Missing required sections: {{sections}}',
    category: 'validation'
  },

  // State errors
  ERR_STATE_NO_STATE: {
    code: 'ERR_STATE_NO_STATE',
    message: 'No state to write. Call read() first.',
    category: 'state'
  },
  ERR_STATE_READ_FAILED: {
    code: 'ERR_STATE_READ_FAILED',
    message: 'Failed to read _status.md: {{details}}',
    category: 'state'
  },
  ERR_STATE_UNKNOWN_LAYER: {
    code: 'ERR_STATE_UNKNOWN_LAYER',
    message: 'Unknown layer: {{layer}}',
    category: 'state'
  },
  ERR_STATE_LOCK_TIMEOUT: {
    code: 'ERR_STATE_LOCK_TIMEOUT',
    message: 'Failed to acquire lock on {{path}} within {{timeoutMs}}ms',
    category: 'state'
  },
  ERR_STATE_BUG002_NO_FOLDER: {
    code: 'ERR_STATE_BUG002_NO_FOLDER',
    message: 'BUG-002 guard: Cannot advance from {{from}} to {{to}} -- folder "{{folder}}" does not exist. The agent must produce output before advancing.',
    category: 'state'
  },
  ERR_STATE_BUG002_EMPTY: {
    code: 'ERR_STATE_BUG002_EMPTY',
    message: 'BUG-002 guard: Cannot advance from {{from}} to {{to}} -- folder "{{folder}}" exists but has no artifacts. The agent must produce output before advancing.',
    category: 'state'
  },

  // Agent errors
  ERR_AGENT_TIMEOUT: {
    code: 'ERR_AGENT_TIMEOUT',
    message: 'Agent execution timed out after {{timeoutMs}}ms at layer {{layer}}',
    category: 'agent'
  },
  ERR_AGENT_FAILED: {
    code: 'ERR_AGENT_FAILED',
    message: 'Agent execution failed after {{attempts}} attempts: {{details}}',
    category: 'agent'
  },
  ERR_AGENT_MAX_RETRIES: {
    code: 'ERR_AGENT_MAX_RETRIES',
    message: 'Max retries ({{maxRetries}}) exceeded at {{severity}} severity at layer {{layer}}',
    category: 'agent'
  },

  // Spawn errors
  ERR_SPAWN_NO_TEMPLATE: {
    code: 'ERR_SPAWN_NO_TEMPLATE',
    message: 'No prompt template found for {{agentType}} (tried {{agentType}}-base.md and {{agentType}}.md)',
    category: 'spawn'
  },
  ERR_SPAWN_UNKNOWN_AGENT: {
    code: 'ERR_SPAWN_UNKNOWN_AGENT',
    message: 'Unknown agent type: {{agentType}}',
    category: 'spawn'
  },

  // Recovery errors
  ERR_RECOVERY_UNKNOWN_ACTION: {
    code: 'ERR_RECOVERY_UNKNOWN_ACTION',
    message: 'Unknown recovery action type: {{actionType}}',
    category: 'recovery'
  }
};

/**
 * Create an error message from a template by replacing {{placeholders}}.
 * @param {string} code - Error code (e.g., 'ERR_CASCADE_DEPTH')
 * @param {Object} params - Key-value pairs to substitute into the template
 * @returns {string} Formatted error message
 */
function formatError(code, params = {}) {
  const entry = ERROR_CODES[code];
  if (!entry) {
    return `Unknown error code: ${code}`;
  }

  let message = entry.message;
  for (const [key, value] of Object.entries(params)) {
    message = message.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), String(value));
  }
  return message;
}

/**
 * Create an Error object with an error code attached.
 * @param {string} code - Error code
 * @param {Object} params - Template parameters
 * @returns {Error} Error with .code property set
 */
function createError(code, params = {}) {
  const message = formatError(code, params);
  const error = new Error(message);
  error.code = code;
  error.category = ERROR_CODES[code]?.category || 'unknown';
  return error;
}

/**
 * Get all error codes for a specific category.
 * @param {string} category - Category name (e.g., 'cascade', 'gate')
 * @returns {string[]} Array of error codes in that category
 */
function getErrorsByCategory(category) {
  return Object.keys(ERROR_CODES).filter(
    code => ERROR_CODES[code].category === category
  );
}

module.exports = { ERROR_CODES, formatError, createError, getErrorsByCategory };
