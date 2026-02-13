/**
 * Metrics Plugin - Tracks durations, counts, and success rates per layer
 *
 * Collects quantitative metrics about the orchestration pipeline:
 * - Layer execution counts and durations
 * - Verdict pass/iterate rates
 * - Error counts by type
 * - Spawn counts by agent type
 *
 * Usage:
 *   const { createMetricsPlugin } = require('./lib/plugins/metrics-plugin');
 *   const metrics = createMetricsPlugin();
 *   ralph.use(metrics);
 *   // ... run orchestration ...
 *   console.log(metrics.getReport());
 */

/**
 * Create a metrics plugin instance.
 *
 * @returns {Object} Plugin object with getReport() and reset() methods
 */
function createMetricsPlugin() {
  /** Per-layer metrics: { [layerId]: { starts, ends, totalDurationMs, verdicts, errors } } */
  const layers = {};

  /** Global counters */
  const global = {
    totalStarts: 0,
    totalEnds: 0,
    totalSpawns: 0,
    totalVerdicts: 0,
    totalPasses: 0,
    totalIterates: 0,
    totalErrors: 0
  };

  /** Per-layer start timestamps for duration tracking */
  const startTimes = {};

  /** Per-agent-type spawn counts */
  const spawnsByAgent = {};

  /** Error counts by type */
  const errorsByType = {};

  function ensureLayer(layerId) {
    if (!layers[layerId]) {
      layers[layerId] = {
        starts: 0,
        ends: 0,
        totalDurationMs: 0,
        passes: 0,
        iterates: 0,
        errors: 0
      };
    }
    return layers[layerId];
  }

  return {
    name: 'metrics',

    beforeLayerStart(context) {
      const { layerId } = context;
      const entry = ensureLayer(layerId);
      entry.starts++;
      global.totalStarts++;
      startTimes[layerId] = Date.now();
    },

    afterLayerEnd(context) {
      const { layerId } = context;
      const entry = ensureLayer(layerId);
      entry.ends++;
      global.totalEnds++;

      // Calculate duration if we have a start time
      if (startTimes[layerId]) {
        const durationMs = Date.now() - startTimes[layerId];
        entry.totalDurationMs += durationMs;
        delete startTimes[layerId];
      }
    },

    beforeSpawn(context) {
      global.totalSpawns++;
      if (context.spawnConfig && context.spawnConfig.agentType) {
        const agentType = context.spawnConfig.agentType;
        spawnsByAgent[agentType] = (spawnsByAgent[agentType] || 0) + 1;
      }
    },

    afterSpawn() {
      // No-op: afterSpawn is tracked via afterLayerEnd for duration
    },

    onVerdict(context) {
      const { layerId, verdict } = context;
      const entry = ensureLayer(layerId);
      global.totalVerdicts++;

      if (verdict === 'PASS') {
        entry.passes++;
        global.totalPasses++;
      } else if (verdict === 'ITERATE') {
        entry.iterates++;
        global.totalIterates++;
      }
    },

    onError(context) {
      const { layerId, type } = context;
      if (layerId) {
        const entry = ensureLayer(layerId);
        entry.errors++;
      }
      global.totalErrors++;
      if (type) {
        errorsByType[type] = (errorsByType[type] || 0) + 1;
      }
    },

    /**
     * Get a metrics report summarizing all collected data.
     *
     * @returns {{
     *   layers: Object,
     *   global: Object,
     *   spawnsByAgent: Object,
     *   errorsByType: Object,
     *   passRate: number|null
     * }}
     */
    getReport() {
      const passRate = global.totalVerdicts > 0
        ? Math.round((global.totalPasses / global.totalVerdicts) * 100) / 100
        : null;

      return {
        layers: JSON.parse(JSON.stringify(layers)),
        global: { ...global },
        spawnsByAgent: { ...spawnsByAgent },
        errorsByType: { ...errorsByType },
        passRate
      };
    },

    /**
     * Reset all metrics to zero.
     */
    reset() {
      for (const key of Object.keys(layers)) delete layers[key];
      for (const key of Object.keys(startTimes)) delete startTimes[key];
      for (const key of Object.keys(spawnsByAgent)) delete spawnsByAgent[key];
      for (const key of Object.keys(errorsByType)) delete errorsByType[key];
      global.totalStarts = 0;
      global.totalEnds = 0;
      global.totalSpawns = 0;
      global.totalVerdicts = 0;
      global.totalPasses = 0;
      global.totalIterates = 0;
      global.totalErrors = 0;
    }
  };
}

module.exports = { createMetricsPlugin };
