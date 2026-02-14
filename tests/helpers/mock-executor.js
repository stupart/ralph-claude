/**
 * MockExecutor - Test double for ClaudeExecutor
 *
 * Implements the agentExecutor callback interface for integration testing.
 * Maps layer IDs to artifact generators, supports configurable verdicts
 * and timing overrides, and tracks execution via callLog.
 */

const { LAYER_AGENTS } = require('../../lib/agent-spawner');
const { LAYER_FOLDERS } = require('../../lib/state-machine');
const { generatePlannerArtifact, generateBuilderArtifact, generateJudgeArtifact } = require('./artifact-generators');

class MockExecutor {
  /**
   * @param {Object} options
   * @param {string} [options.projectRoot] - Project root for artifact generation (injected as workingDir)
   * @param {Object} [options.verdictOverrides] - Static or function-based verdict overrides per layer
   * @param {Object} [options.timingOverrides] - Timing delays per layer { [layerId]: { delayMs, preWrite } }
   * @param {Array} [options.callLog] - Array to track execution calls (shared reference)
   */
  constructor(options = {}) {
    this.projectRoot = options.projectRoot || null;
    this.verdictOverrides = options.verdictOverrides || {};
    this.timingOverrides = options.timingOverrides || {};
    this.callLog = options.callLog || [];
    this.iterationCounts = {};
  }

  /**
   * Execute a mock agent for the given spawn configuration.
   * Implements the agentExecutor callback interface.
   *
   * @param {Object} spawnConfig - Spawn configuration from AgentSpawner
   * @param {Object} [options] - Execution options (signal, etc.)
   * @returns {Promise<Object>} Artifacts with output, files, tokenUsage
   */
  async execute(spawnConfig, options = {}) {
    // Handle malformed/empty spawnConfig gracefully
    if (!spawnConfig || typeof spawnConfig !== 'object') {
      return {
        output: '<!-- WARNING: Invalid spawnConfig -->\n# Mock Output\n## Description\nGeneric output.',
        files: [],
        tokenUsage: { inputTokens: 100, outputTokens: 50 }
      };
    }

    const layerId = spawnConfig.layerId || this._extractLayerFromPrompt(spawnConfig.prompt);

    // Track call in callLog
    if (layerId) {
      if (!this.iterationCounts[layerId]) {
        this.iterationCounts[layerId] = 0;
      }
      this.iterationCounts[layerId]++;
    }

    const iteration = layerId ? this.iterationCounts[layerId] : 0;

    this.callLog.push({
      layerId,
      iteration,
      timestamp: Date.now()
    });

    if (!layerId || !LAYER_AGENTS[layerId]) {
      return {
        output: '<!-- WARNING: Unknown layer ID -->\n# Mock Output\n## Description\nGeneric output.',
        files: [],
        tokenUsage: { inputTokens: 100, outputTokens: 50 }
      };
    }

    const agentType = LAYER_AGENTS[layerId];
    const generator = this._getGenerator(agentType);

    // Ensure workingDir is set (may not be in spawnConfig from AgentSpawner)
    const effectiveConfig = { ...spawnConfig };
    if (!effectiveConfig.workingDir && this.projectRoot) {
      effectiveConfig.workingDir = this.projectRoot;
    }

    // Pass executor context (this) to generator
    return await generator(layerId, effectiveConfig, options, this);
  }

  /**
   * Extract layer ID from prompt text as fallback.
   * @param {string} prompt
   * @returns {string|null}
   */
  _extractLayerFromPrompt(prompt) {
    if (!prompt) return null;
    const match = prompt.match(/Layer\s+(L\d+)/i);
    return match ? match[1] : null;
  }

  /**
   * Get the appropriate generator function for an agent type.
   * @param {string} agentType
   * @returns {Function}
   */
  _getGenerator(agentType) {
    switch (agentType) {
      case 'planner':
        return generatePlannerArtifact;
      case 'builder':
        return generateBuilderArtifact;
      case 'judge':
        return generateJudgeArtifact;
      default:
        return async () => ({
          output: '<!-- WARNING: Unknown agent type -->\n# Mock Output\n## Description\nGeneric output.',
          files: [],
          tokenUsage: { inputTokens: 100, outputTokens: 50 }
        });
    }
  }
}

module.exports = { MockExecutor };
