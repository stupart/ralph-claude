/**
 * PluginManager - Extensible plugin system for Layer Cake orchestration
 *
 * Plugins are objects with optional lifecycle hook methods that receive
 * context about the current orchestration state. They can observe, log,
 * or modify behavior at key points in the pipeline.
 *
 * Supported hooks:
 *   beforeLayerStart({ layerId, layer, position })
 *   afterLayerEnd({ layerId, next, result })
 *   beforeSpawn({ layerId, spawnConfig })
 *   afterSpawn({ layerId, spawnConfig, artifacts })
 *   onVerdict({ layerId, verdict, issues })
 *   onError({ type, layerId, error, meta })
 *
 * Usage:
 *   const pm = new PluginManager();
 *   pm.register({ name: 'my-plugin', beforeLayerStart(ctx) { ... } });
 *   await pm.run('beforeLayerStart', { layerId: 'L1', layer, position });
 */

/**
 * Valid lifecycle hook names that plugins can implement.
 */
const HOOKS = [
  'beforeLayerStart',
  'afterLayerEnd',
  'beforeSpawn',
  'afterSpawn',
  'onVerdict',
  'onError'
];

class PluginManager {
  constructor() {
    /** @type {Array<Object>} Registered plugins */
    this.plugins = [];
  }

  /**
   * Register a plugin. Each plugin must have a `name` property and
   * one or more hook methods matching the HOOKS list.
   *
   * @param {Object} plugin - Plugin object with name and hook methods
   * @throws {Error} If plugin is invalid (no name, not an object, duplicate name)
   */
  register(plugin) {
    if (!plugin || typeof plugin !== 'object') {
      throw new Error('Plugin must be a non-null object');
    }
    if (!plugin.name || typeof plugin.name !== 'string') {
      throw new Error('Plugin must have a string "name" property');
    }

    // Check for duplicate plugin names
    if (this.plugins.some(p => p.name === plugin.name)) {
      throw new Error(`Plugin "${plugin.name}" is already registered`);
    }

    // Validate that at least one hook is implemented
    const implementedHooks = HOOKS.filter(h => typeof plugin[h] === 'function');
    if (implementedHooks.length === 0) {
      throw new Error(
        `Plugin "${plugin.name}" must implement at least one hook: ${HOOKS.join(', ')}`
      );
    }

    this.plugins.push(plugin);
  }

  /**
   * Unregister a plugin by name.
   *
   * @param {string} name - Plugin name to remove
   * @returns {boolean} True if plugin was found and removed
   */
  unregister(name) {
    const index = this.plugins.findIndex(p => p.name === name);
    if (index === -1) return false;
    this.plugins.splice(index, 1);
    return true;
  }

  /**
   * Run a lifecycle hook across all registered plugins.
   * Plugins are called in registration order. Errors in one plugin
   * do not prevent subsequent plugins from running.
   *
   * @param {string} hookName - One of the HOOKS values
   * @param {Object} context - Data passed to the hook
   * @returns {Promise<Array<{plugin: string, error?: Error}>>} Results from each plugin
   */
  async run(hookName, context = {}) {
    if (!HOOKS.includes(hookName)) {
      throw new Error(`Unknown hook: "${hookName}". Valid hooks: ${HOOKS.join(', ')}`);
    }

    const results = [];

    for (const plugin of this.plugins) {
      if (typeof plugin[hookName] === 'function') {
        try {
          await plugin[hookName](context);
          results.push({ plugin: plugin.name });
        } catch (err) {
          results.push({ plugin: plugin.name, error: err });
        }
      }
    }

    return results;
  }

  /**
   * Get list of registered plugin names.
   * @returns {string[]}
   */
  list() {
    return this.plugins.map(p => p.name);
  }

  /**
   * Get a registered plugin by name.
   * @param {string} name
   * @returns {Object|undefined}
   */
  get(name) {
    return this.plugins.find(p => p.name === name);
  }

  /**
   * Remove all registered plugins.
   */
  clear() {
    this.plugins = [];
  }

  /**
   * Get the count of registered plugins.
   * @returns {number}
   */
  get size() {
    return this.plugins.length;
  }
}

module.exports = { PluginManager, HOOKS };
