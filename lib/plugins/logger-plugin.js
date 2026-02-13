/**
 * Logger Plugin - Writes detailed orchestration logs to a file
 *
 * Captures all lifecycle events with timestamps, layer IDs, and metadata.
 * Useful for post-mortem analysis, debugging, and audit trails.
 *
 * Usage:
 *   const { createLoggerPlugin } = require('./lib/plugins/logger-plugin');
 *   ralph.use(createLoggerPlugin({ filePath: './ralph-debug.log' }));
 */

const fs = require('fs');
const path = require('path');

/**
 * Create a logger plugin instance.
 *
 * @param {Object} [options]
 * @param {string} [options.filePath] - Path to log file (default: ./_ralph-debug.log)
 * @param {boolean} [options.timestamps=true] - Include ISO timestamps
 * @param {boolean} [options.verbose=true] - Include full context objects
 * @returns {Object} Plugin object
 */
function createLoggerPlugin(options = {}) {
  const filePath = options.filePath || './_ralph-debug.log';
  const timestamps = options.timestamps !== false;
  const verbose = options.verbose !== false;

  /** @type {string[]} In-memory log buffer (for testing) */
  const buffer = [];

  function formatEntry(hookName, context) {
    const parts = [];
    if (timestamps) {
      parts.push(`[${new Date().toISOString()}]`);
    }
    parts.push(`[${hookName}]`);

    if (context.layerId) {
      parts.push(`layer=${context.layerId}`);
    }
    if (context.verdict) {
      parts.push(`verdict=${context.verdict}`);
    }
    if (context.type) {
      parts.push(`type=${context.type}`);
    }
    if (context.error) {
      parts.push(`error="${context.error}"`);
    }
    if (context.next) {
      parts.push(`next=${context.next}`);
    }

    if (verbose && context.spawnConfig) {
      parts.push(`agent=${context.spawnConfig.agentType || 'unknown'}`);
      parts.push(`model=${context.spawnConfig.model || 'unknown'}`);
    }
    if (verbose && context.issues && context.issues.length > 0) {
      parts.push(`issues=${context.issues.length}`);
    }

    return parts.join(' ');
  }

  function writeLog(entry) {
    buffer.push(entry);
    try {
      fs.appendFileSync(filePath, entry + '\n', 'utf8');
    } catch {
      // Logging should never crash the orchestrator
    }
  }

  return {
    name: 'logger',

    /** Expose buffer for testing */
    _buffer: buffer,

    beforeLayerStart(context) {
      writeLog(formatEntry('beforeLayerStart', context));
    },

    afterLayerEnd(context) {
      writeLog(formatEntry('afterLayerEnd', context));
    },

    beforeSpawn(context) {
      writeLog(formatEntry('beforeSpawn', context));
    },

    afterSpawn(context) {
      writeLog(formatEntry('afterSpawn', context));
    },

    onVerdict(context) {
      writeLog(formatEntry('onVerdict', context));
    },

    onError(context) {
      writeLog(formatEntry('onError', context));
    }
  };
}

module.exports = { createLoggerPlugin };
