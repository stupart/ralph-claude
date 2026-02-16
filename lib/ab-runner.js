'use strict';

const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const { AgentSpawner, LAYER_AGENTS } = require('./agent-spawner');
const { PromptRegistry } = require('./prompt-registry');

/**
 * Layer type classification for comparison judge rubric selection.
 */
const LAYER_TYPES = {
  L1: 'planning', L2: 'planning', L3: 'planning', L4: 'planning',
  L5: 'planning', L6: 'planning', L7: 'planning',
  L8: 'build',
  L9: 'review', L10: 'review', L11: 'review',
  L12: 'analysis'
};

/**
 * Parse the comparison judge's structured output.
 * Extracts Winner, Confidence, and Reasoning from the expected format.
 *
 * @param {string} output - Raw output from comparison judge
 * @returns {{ winner: string, confidence: string, reasoning: string }}
 */
function parseComparisonResult(output) {
  const result = { winner: 'TIE', confidence: 'LOW', reasoning: 'Failed to parse comparison result' };

  const winnerMatch = output.match(/Winner:\s*(A|B|TIE)/i);
  if (winnerMatch) {
    result.winner = winnerMatch[1].toUpperCase();
  }

  const confidenceMatch = output.match(/Confidence:\s*(HIGH|MEDIUM|LOW)/i);
  if (confidenceMatch) {
    result.confidence = confidenceMatch[1].toUpperCase();
  }

  const reasoningMatch = output.match(/Reasoning:\s*(.+?)(?:\n\n|$)/s);
  if (reasoningMatch) {
    result.reasoning = reasoningMatch[1].trim();
  }

  return result;
}

class ABRunner {
  /**
   * @param {string} projectRoot - Path to the ralph-claude project root
   * @param {Object} options
   * @param {string} options.variant - Name of variant to test (e.g., 'vivid')
   * @param {string[]} [options.layers] - Which layers to A/B test (default: all)
   * @param {string} [options.comparisonModel] - Model for comparison judge (default: 'opus')
   * @param {boolean} [options.dryRun] - If true, don't actually spawn agents
   * @param {boolean} [options.verbose] - Verbose output
   * @param {string} [options.resultsDir] - Directory for A/B results (default: _ab-results/)
   */
  constructor(projectRoot, options = {}) {
    this.projectRoot = projectRoot;
    this.variant = options.variant;
    this.layers = options.layers || null; // null = all layers
    this.comparisonModel = options.comparisonModel || 'opus';
    this.dryRun = options.dryRun || false;
    this.verbose = options.verbose !== false;
    this.resultsDir = options.resultsDir || path.join(projectRoot, '_ab-results');

    this.templatesPath = path.join(projectRoot, 'templates', 'agents');
    this.spawner = new AgentSpawner(projectRoot, this.templatesPath);
    this.registry = new PromptRegistry(this.templatesPath);

    this.sessionId = options.sessionId;
    this.brainDumpFile = options.brainDumpFile;

    this._comparisonTemplate = null;
    this._registryScanned = false;
  }

  /**
   * Check if a layer should be A/B tested.
   * @param {string} layerId
   * @returns {boolean}
   */
  shouldABTest(layerId) {
    if (!this.layers) return true;
    return this.layers.includes(layerId);
  }

  /**
   * Load the comparison judge template (cached).
   * @returns {Promise<string>}
   */
  async getComparisonTemplate() {
    if (this._comparisonTemplate) return this._comparisonTemplate;
    const templatePath = path.join(this.templatesPath, 'comparison-judge.md');
    this._comparisonTemplate = await fs.readFile(templatePath, 'utf8');
    return this._comparisonTemplate;
  }

  /**
   * Ensure the registry is scanned.
   */
  async ensureRegistry() {
    if (!this._registryScanned) {
      await this.registry.scan();
      this._registryScanned = true;
    }
  }

  /**
   * Ensure the results directory exists.
   */
  async ensureResultsDir() {
    await fs.mkdir(this.resultsDir, { recursive: true });
  }

  /**
   * Load the variant template for a given layer.
   * Looks up the base template's filename and finds the matching variant.
   *
   * @param {string} layerId - Layer ID (e.g., 'L9')
   * @returns {Promise<string|null>} Variant template content, or null if not found
   */
  async loadVariantTemplate(layerId) {
    await this.ensureRegistry();

    const agentType = LAYER_AGENTS[layerId] || 'planner';
    const entries = this.registry.filter({ agentType, variantStatus: 'hasVariants' });

    for (const entry of entries) {
      const variantInfo = entry.variants.find(v => v.name === this.variant);
      if (variantInfo) {
        // Check if this entry applies to the given layer
        const appliesToLayer = entry.layerMapping.length === 0 || entry.layerMapping.includes(layerId);
        if (appliesToLayer) {
          return await fs.readFile(variantInfo.filePath, 'utf8');
        }
      }
    }

    // Also check base templates that have variants
    const baseEntries = this.registry.filter({ agentType, variantStatus: 'hasVariants' });
    for (const entry of baseEntries) {
      if (entry.layerMapping.length === 0) {
        // This is a base template (e.g., judge-base.md) — check its variants
        const variantInfo = entry.variants.find(v => v.name === this.variant);
        if (variantInfo) {
          return await fs.readFile(variantInfo.filePath, 'utf8');
        }
      }
    }

    return null;
  }

  /**
   * Build the comparison judge prompt with anonymized outputs.
   *
   * @param {string} layerId - Layer that was tested
   * @param {string} taskDescription - Description of the layer's task
   * @param {string} outputA - First agent output
   * @param {string} outputB - Second agent output
   * @returns {Promise<string>} Assembled comparison prompt
   */
  async buildComparisonPrompt(layerId, taskDescription, outputA, outputB) {
    let template = await this.getComparisonTemplate();
    const layerType = LAYER_TYPES[layerId] || 'planning';

    template = template.replace('{{TASK_DESCRIPTION}}', taskDescription);
    template = template.replace('{{LAYER_TYPE}}', layerType);
    template = template.replace('{{OUTPUT_A}}', outputA);
    template = template.replace('{{OUTPUT_B}}', outputB);

    return template;
  }

  /**
   * Run a dual-prompt A/B test for a single layer.
   *
   * @param {string} layerId - Layer to test
   * @param {Object} context - Layer context (position, handoff, etc.)
   * @param {Function} agentExecutor - Function that spawns and runs an agent
   * @returns {Promise<Object>} Result with winner, outputs, comparison
   */
  async runDualLayer(layerId, context, agentExecutor) {
    const startTime = Date.now();
    const position = context.position || {};
    const handoff = context.handoff || null;

    if (!this.shouldABTest(layerId)) {
      // Not A/B testing this layer — run normally with base prompt
      const baseConfig = await this.spawner.createSpawnConfig(layerId, position, handoff);
      const result = await agentExecutor(baseConfig);
      return { abTested: false, output: result.output || '', artifacts: result };
    }

    this.log(`\n${'~'.repeat(60)}`);
    this.log(`  A/B TEST: Layer ${layerId} — base vs ${this.variant}`);
    this.log(`${'~'.repeat(60)}\n`);

    // 1. Load base template via normal AgentSpawner
    const baseConfig = await this.spawner.createSpawnConfig(layerId, position, handoff);
    const basePrompt = baseConfig.prompt;

    // 2. Load variant template
    const variantTemplate = await this.loadVariantTemplate(layerId);
    if (!variantTemplate) {
      this.log(`  No variant '${this.variant}' found for ${layerId} — using base only`);
      const result = await agentExecutor(baseConfig);
      return { abTested: false, output: result.output || '', artifacts: result };
    }

    // Build variant config by swapping the prompt template
    const variantConfig = { ...baseConfig };
    // Replace the prompt: take the variant template and apply the same substitutions
    let variantPrompt = variantTemplate;
    const layerInstructions = this.spawner.buildLayerInstructions(layerId, position);
    variantPrompt = variantPrompt.replace('{{LAYER_INSTRUCTIONS}}', layerInstructions);
    if (baseConfig.context?.resolvedContext) {
      if (variantPrompt.includes('{{CONTEXT}}')) {
        variantPrompt = variantPrompt.replace('{{CONTEXT}}', baseConfig.context.resolvedContext);
      } else {
        variantPrompt += `\n\n## Context from Previous Layers\n\n${baseConfig.context.resolvedContext}\n\n`;
      }
    }
    variantConfig.prompt = variantPrompt;

    if (this.dryRun) {
      this.log(`  [DRY RUN] Would spawn two agents for ${layerId}`);
      this.log(`  Base prompt: ${basePrompt.length} chars`);
      this.log(`  Variant prompt: ${variantPrompt.length} chars`);
      return {
        abTested: true,
        dryRun: true,
        basePromptLength: basePrompt.length,
        variantPromptLength: variantPrompt.length
      };
    }

    // 3. Randomize assignment (A/B) to prevent position bias
    const baseIsA = Math.random() < 0.5;
    const configA = baseIsA ? baseConfig : variantConfig;
    const configB = baseIsA ? variantConfig : baseConfig;
    const labelA = baseIsA ? 'base' : this.variant;
    const labelB = baseIsA ? this.variant : 'base';

    this.log(`  Spawning both agents in parallel...`);
    this.log(`  Output A = ${labelA}, Output B = ${labelB}`);

    // 4. Run both in parallel
    const [resultA, resultB] = await Promise.all([
      agentExecutor(configA).catch(err => ({ output: '', error: err.message })),
      agentExecutor(configB).catch(err => ({ output: '', error: err.message }))
    ]);

    const outputA = resultA.output || '';
    const outputB = resultB.output || '';

    this.log(`  Agent A finished: ${outputA.length} chars`);
    this.log(`  Agent B finished: ${outputB.length} chars`);

    // 5. Build comparison judge prompt
    const taskDescription = baseConfig.context?.description || `Layer ${layerId} task`;
    const comparisonPrompt = await this.buildComparisonPrompt(
      layerId, taskDescription, outputA, outputB
    );

    // 6. Spawn comparison judge
    this.log(`  Running comparison judge...`);
    const judgeConfig = {
      agentType: 'comparison-judge',
      model: this.comparisonModel,
      layerId: `${layerId}-comparison`,
      prompt: comparisonPrompt,
      toolPermissions: { allowed: ['Read'], forbidden: ['Write', 'Edit', 'Bash'] },
      context: {},
      timestamp: new Date().toISOString()
    };

    let judgeResult;
    try {
      judgeResult = await agentExecutor(judgeConfig);
    } catch (err) {
      this.log(`  Comparison judge failed: ${err.message}`);
      await this.logJudgeError(layerId, err.message);
      judgeResult = { output: '' };
    }

    // 7. Parse comparison result
    const comparison = parseComparisonResult(judgeResult.output || '');

    // Map anonymous winner back to base/variant
    let actualWinner;
    if (comparison.winner === 'A') {
      actualWinner = labelA;
    } else if (comparison.winner === 'B') {
      actualWinner = labelB;
    } else {
      actualWinner = 'tie';
    }

    this.log(`  Winner: ${actualWinner} (Confidence: ${comparison.confidence})`);
    this.log(`  Reasoning: ${comparison.reasoning}`);

    // 8. Log result
    const durationMs = Date.now() - startTime;
    await this.logResult({
      layerId,
      variant: this.variant,
      baseIsA,
      anonymousWinner: comparison.winner,
      actualWinner,
      confidence: comparison.confidence,
      reasoning: comparison.reasoning,
      baseOutputLength: (baseIsA ? outputA : outputB).length,
      variantOutputLength: (baseIsA ? outputB : outputA).length,
      judgeOutputLength: (judgeResult.output || '').length,
      durationMs
    });

    // 9. Return winner's output
    const winnerOutput = actualWinner === 'base'
      ? (baseIsA ? outputA : outputB)
      : actualWinner === this.variant
        ? (baseIsA ? outputB : outputA)
        : outputA; // tie: use A (which is random)

    const winnerArtifacts = actualWinner === 'base'
      ? (baseIsA ? resultA : resultB)
      : actualWinner === this.variant
        ? (baseIsA ? resultB : resultA)
        : resultA;

    return {
      abTested: true,
      actualWinner,
      comparison,
      output: winnerOutput,
      artifacts: winnerArtifacts
    };
  }

  /**
   * Log an A/B result to the evolution JSONL file.
   * @param {Object} entry - Result entry to log
   */
  async logResult(entry) {
    await this.ensureResultsDir();
    const logPath = path.join(this.resultsDir, 'evolution.jsonl');
    const record = {
      timestamp: new Date().toISOString(),
      ...entry,
      ...(this.sessionId !== undefined && { sessionId: this.sessionId }),
      ...(this.brainDumpFile !== undefined && { brainDumpFile: this.brainDumpFile })
    };
    fsSync.appendFileSync(logPath, JSON.stringify(record) + '\n');
  }

  /**
   * Log a judge error to the evolution JSONL file.
   * @param {string} layerId - Layer where judge failed
   * @param {string} errorMessage - Error message from the judge failure
   */
  async logJudgeError(layerId, errorMessage) {
    const record = {
      type: 'judge_error',
      timestamp: new Date().toISOString(),
      layerId,
      variant: this.variant,
      error: errorMessage,
      ...(this.sessionId !== undefined && { sessionId: this.sessionId }),
      ...(this.brainDumpFile !== undefined && { brainDumpFile: this.brainDumpFile })
    };
    await this.ensureResultsDir();
    const logPath = path.join(this.resultsDir, 'evolution.jsonl');
    fsSync.appendFileSync(logPath, JSON.stringify(record) + '\n');
  }

  /**
   * Print a verbose log message.
   * @param {string} msg
   */
  log(msg) {
    if (this.verbose) console.log(msg);
  }
}

module.exports = { ABRunner, parseComparisonResult, LAYER_TYPES };
