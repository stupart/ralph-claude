/**
 * Config File Support
 *
 * Reads project configuration from ralph.config.json or .ralphrc files.
 * Provides default options that can be overridden by CLI flags.
 *
 * Resolution order (last wins):
 *   1. Built-in defaults
 *   2. Config file (ralph.config.json or .ralphrc)
 *   3. Programmatic options passed to loadConfig()
 */

const fs = require('fs').promises;
const path = require('path');

/**
 * Built-in defaults for all configurable options.
 */
const DEFAULTS = {
  tier: 'small',
  timeout: 300000,
  webhookUrl: null,
  autoApproveGates: false,
  concurrency: 2,
  verbose: true,
  notifications: true,
  eventLog: true,
  stallThresholdMs: 600000,
  stallPollMs: 30000,
  maxRetries: 3
};

/**
 * Allowed config keys. Keys not in this list are ignored.
 */
const ALLOWED_KEYS = new Set(Object.keys(DEFAULTS));

/**
 * Config file names to search for, in priority order.
 * The first file found wins.
 */
const CONFIG_FILES = ['ralph.config.json', '.ralphrc'];

/**
 * Load configuration for a project directory.
 *
 * @param {string} projectRoot - Absolute path to the project root
 * @param {Object} [overrides={}] - Programmatic overrides (e.g. from CLI flags)
 * @returns {Promise<Object>} Merged configuration object
 */
async function loadConfig(projectRoot, overrides = {}) {
  const fileConfig = await readConfigFile(projectRoot);
  return mergeConfig(fileConfig, overrides);
}

/**
 * Search for and read a config file in the project root.
 *
 * @param {string} projectRoot - Absolute path to the project root
 * @returns {Promise<Object>} Parsed config from file, or empty object if none found
 */
async function readConfigFile(projectRoot) {
  for (const filename of CONFIG_FILES) {
    const filePath = path.join(projectRoot, filename);
    try {
      const content = await fs.readFile(filePath, 'utf8');
      const parsed = JSON.parse(content);

      if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
        throw new Error(`Config file ${filename} must contain a JSON object`);
      }

      // Filter to allowed keys only
      const filtered = {};
      for (const key of Object.keys(parsed)) {
        if (ALLOWED_KEYS.has(key)) {
          filtered[key] = parsed[key];
        }
      }

      return filtered;
    } catch (err) {
      if (err.code === 'ENOENT') {
        continue; // File not found, try next
      }
      if (err instanceof SyntaxError) {
        throw new Error(`Invalid JSON in ${filename}: ${err.message}`);
      }
      throw err;
    }
  }

  return {}; // No config file found
}

/**
 * Merge defaults, file config, and overrides.
 * Only defined (non-undefined) override values take precedence.
 *
 * @param {Object} fileConfig - Config from file
 * @param {Object} overrides - Programmatic overrides
 * @returns {Object} Merged config with all keys from DEFAULTS
 */
function mergeConfig(fileConfig, overrides) {
  const result = { ...DEFAULTS };

  // Apply file config
  for (const [key, value] of Object.entries(fileConfig)) {
    if (value !== undefined) {
      result[key] = value;
    }
  }

  // Apply overrides (CLI flags etc.)
  for (const [key, value] of Object.entries(overrides)) {
    if (value !== undefined && ALLOWED_KEYS.has(key)) {
      result[key] = value;
    }
  }

  return result;
}

module.exports = { loadConfig, readConfigFile, mergeConfig, DEFAULTS, CONFIG_FILES, ALLOWED_KEYS };
