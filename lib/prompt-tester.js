'use strict';

const { PromptRegistry } = require('./prompt-registry');
const { VerdictParser } = require('./verdict-parser');
const fs = require('fs').promises;
const path = require('path');

class PromptTester {
  constructor(projectRoot) {
    this.projectRoot = projectRoot || process.cwd();
    this.registry = new PromptRegistry(
      path.join(this.projectRoot, 'templates', 'agents')
    );
  }

  async test(identifier, variantNames, options = {}) {
    const { baseEntry, resolved } = await this._resolveVariants(identifier, variantNames);
    const configs = await this._buildSpawnConfigs(baseEntry, resolved);

    // Ensure _prompt-tests/ directory exists
    const resultsDir = path.join(this.projectRoot, '_prompt-tests');
    try {
      await fs.mkdir(resultsDir, { recursive: true });
    } catch (err) {
      throw new Error(
        `Cannot create _prompt-tests/ directory at ${resultsDir}: ${err.message}. ` +
        `Check directory permissions.`
      );
    }

    const executor = options.real
      ? this._createRealExecutor()
      : this._createMockExecutor();

    const executionResults = await this._executeVariants(configs, executor);
    const parsedResults = this._parseResults(executionResults, baseEntry);
    const comparison = this._computeComparison(parsedResults);
    const { filename, result } = await this._storeResults(
      baseEntry, parsedResults, comparison, options
    );

    return { filename, result };
  }

  async _resolveVariants(identifier, variantNames) {
    const entries = await this.registry.scan();
    const baseEntry = this._findBaseEntry(entries, identifier);
    if (!baseEntry) {
      throw new Error(`Unknown template: '${identifier}'`);
    }

    const resolved = [];
    for (const name of variantNames) {
      if (name === 'original') {
        const content = await fs.readFile(baseEntry.filePath, 'utf-8');
        resolved.push({ name: 'original', templatePath: baseEntry.filePath, content });
      } else {
        const variantEntry = entries.find(
          e => e.isVariant && e.variantName === name &&
               e.baselinePath === baseEntry.filePath
        );
        if (!variantEntry) {
          const available = baseEntry.variants.map(v => v.name);
          throw new Error(
            `Unknown variant '${name}' for ${identifier}. ` +
            `Available: original${available.length ? ', ' + available.join(', ') : ''}`
          );
        }
        const content = await fs.readFile(variantEntry.filePath, 'utf-8');
        resolved.push({ name, templatePath: variantEntry.filePath, content });
      }
    }
    return { baseEntry, resolved };
  }

  _findBaseEntry(entries, identifier) {
    // Try L{N}-{type} pattern
    const layerMatch = identifier.match(/^(L\d+)-(\w+)$/);
    if (layerMatch) {
      const [, layer, type] = layerMatch;
      const match = entries.find(e =>
        e.agentType === type && e.layerMapping.includes(layer) && !e.isVariant
      );
      if (match) return match;
      const baseMatch = entries.find(e =>
        e.agentType === type && e.layerMapping.length === 0 && !e.isVariant
      );
      if (baseMatch) return baseMatch;
    }
    // Try direct filename match
    const directMatch = entries.find(e =>
      (e.filename === identifier + '.md' || e.filename === identifier) && !e.isVariant
    );
    return directMatch || null;
  }

  async _buildSpawnConfigs(baseEntry, resolvedVariants) {
    const { AgentSpawner } = require('./agent-spawner');
    const spawner = new AgentSpawner(this.projectRoot);
    const layerId = baseEntry.layerMapping[0] ||
      this._defaultLayerForType(baseEntry.agentType);
    const position = { epic: 'e1', feature: 'f1' };

    const configs = [];
    for (const variant of resolvedVariants) {
      const originalLoad = spawner.loadPromptTemplate.bind(spawner);
      spawner.loadPromptTemplate = async () => variant.content;
      try {
        const config = await spawner.createSpawnConfig(layerId, position);
        configs.push({ ...variant, spawnConfig: config });
      } finally {
        spawner.loadPromptTemplate = originalLoad;
      }
    }
    return configs;
  }

  async _executeVariants(configs, executor) {
    const results = [];
    for (const config of configs) {
      const start = Date.now();
      let output;
      try {
        output = await executor.execute(config.spawnConfig);
      } catch (err) {
        output = { output: '', error: err.message };
      }
      const duration = Date.now() - start;

      const result = {
        name: config.name,
        templatePath: config.templatePath,
        rawOutput: output.output || '',
        duration,
        tokenUsage: output.tokenUsage || null,
        warnings: []
      };

      if (!result.rawOutput) {
        result.warnings.push('MockExecutor returned empty output');
      }

      results.push(result);
    }
    return results;
  }

  _parseResults(executionResults) {
    const parser = new VerdictParser();

    return executionResults.map(result => {
      const parsed = parser.parse(result.rawOutput);
      const specificIssues = parsed.issues.filter(issue => {
        const text = `${issue.title} ${issue.description || ''}`;
        return /[\w\/.]+:\d+/.test(text);
      });

      const hasParseError = parsed.issues.some(
        i => i.title && i.title.includes('Unparseable')
      );

      return {
        name: result.name,
        templatePath: result.templatePath,
        output: {
          verdict: parsed.verdict,
          issues: parsed.issues,
          rawOutput: result.rawOutput
        },
        metrics: {
          tokenCount: Math.ceil(result.rawOutput.length / 4),
          issueCount: parsed.issues.length,
          specificIssues: specificIssues.length,
          reliability: hasParseError ? 0 : 1
        },
        duration: result.duration,
        warnings: result.warnings
      };
    });
  }

  _computeComparison(parsedResults) {
    const specificity = {};
    const tokenEfficiency = {};
    for (const r of parsedResults) {
      specificity[r.name] = r.metrics.issueCount > 0
        ? r.metrics.specificIssues / r.metrics.issueCount : null;
      tokenEfficiency[r.name] = r.metrics.tokenCount > 0
        ? r.metrics.issueCount / r.metrics.tokenCount : 0;
    }

    // Determine winner by verdict quality
    const verdictRank = { 'PASS': 2, 'ITERATE': 1 };
    const sorted = [...parsedResults].sort(
      (a, b) => (verdictRank[b.output.verdict] || 0) - (verdictRank[a.output.verdict] || 0)
    );

    let winner;
    if (parsedResults.length === 1) {
      winner = parsedResults[0].name;
    } else {
      winner = sorted[0].output.verdict !== sorted[1].output.verdict
        ? sorted[0].name : 'tie';
    }

    return { winner, specificity, tokenEfficiency };
  }

  async _storeResults(baseEntry, parsedResults, comparison, options) {
    const timestamp = new Date().toISOString();
    const layer = baseEntry.layerMapping[0] || 'unknown';
    const variantNames = parsedResults.map(r => r.name).join('-');
    const filename = `${timestamp.replace(/:/g, '-')}-${layer}-${variantNames}.json`;

    const result = {
      timestamp,
      layer,
      agentType: baseEntry.agentType,
      mode: options.real ? 'real' : 'mock',
      variants: parsedResults,
      comparison
    };

    const resultsDir = path.join(this.projectRoot, '_prompt-tests');
    await fs.writeFile(
      path.join(resultsDir, filename),
      JSON.stringify(result, null, 2)
    );

    return { filename, result };
  }

  _createMockExecutor() {
    const { MockExecutor } = require('../tests/helpers/mock-executor');
    return new MockExecutor({ projectRoot: this.projectRoot });
  }

  _createRealExecutor() {
    const { ClaudeExecutor } = require('./claude-executor');
    console.warn('Using real API calls — this is non-deterministic and will incur costs');
    return new ClaudeExecutor({ projectRoot: this.projectRoot });
  }

  _defaultLayerForType(agentType) {
    switch (agentType) {
      case 'builder': return 'L8';
      case 'judge': return 'L9';
      case 'planner': return 'L4';
      default: return 'L1';
    }
  }
}

module.exports = { PromptTester };
