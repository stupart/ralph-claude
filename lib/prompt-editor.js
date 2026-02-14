'use strict';

const { PromptRegistry } = require('./prompt-registry');
const { AgentSpawner } = require('./agent-spawner');
const { execFile } = require('child_process');
const fs = require('fs');
const fsPromises = require('fs').promises;
const path = require('path');

class PromptEditor {
  constructor(projectRoot, templatesPath) {
    this.projectRoot = projectRoot || process.cwd();
    this.registry = new PromptRegistry(
      templatesPath || path.join(this.projectRoot, 'templates', 'agents')
    );
  }

  async _resolveTemplate(identifier) {
    const entries = await this.registry.scan();

    // Try L{N}-{type} pattern
    const layerMatch = identifier.match(/^(L\d+)-(\w+)$/);
    if (layerMatch) {
      const [, layer, type] = layerMatch;
      const match = entries.find(e =>
        e.agentType === type && e.layerMapping.includes(layer)
      );
      if (match) return match;
      // Fall back to base template for that agent type
      const baseMatch = entries.find(e =>
        e.agentType === type && e.layerMapping.length === 0
      );
      if (baseMatch) return baseMatch;
    }

    // Try direct filename match
    const directMatch = entries.find(e =>
      e.filename === identifier + '.md' || e.filename === identifier
    );
    if (directMatch) return directMatch;

    return {
      error: `Unknown template identifier: '${identifier}'`,
      validIdentifiers: entries.map(e => e.filename.replace('.md', ''))
    };
  }

  async edit(identifier) {
    const entry = await this._resolveTemplate(identifier);
    if (entry.error) {
      console.error(entry.error);
      console.error('Valid identifiers:', entry.validIdentifiers.join(', '));
      return;
    }

    const filePath = entry.filePath;
    const editor = process.env.EDITOR;

    if (!editor) {
      console.log(`$EDITOR is not set. Edit the template at: ${filePath}`);
      return;
    }

    // Set up file watcher for live preview
    let debounceTimer;
    const watcher = fs.watch(filePath, () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => this._renderPreview(entry), 500);
    });

    try {
      await new Promise((resolve, reject) => {
        execFile(editor, [filePath], (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    } catch (err) {
      console.error(`$EDITOR exited with code ${err.code || 'unknown'}. File: ${filePath}`);
    } finally {
      watcher.close();
    }
  }

  async _renderPreview(entry) {
    try {
      const spawner = new AgentSpawner(this.projectRoot);
      const layerId = entry.layerMapping[0] || this._defaultLayerForType(entry.agentType);
      const epics = await fsPromises.readdir(
        path.join(this.projectRoot, '5-features')
      ).catch(() => []);
      const position = { epic: epics[0] || 'e1', feature: 'f1' };

      const spawnConfig = await spawner.createSpawnConfig(layerId, position);
      const budget = spawner.estimateContextBudget(spawnConfig);

      console.log('\n--- Assembled Prompt Preview ---');
      console.log(spawnConfig.prompt);
      console.log('--- End Preview ---');
      console.log(
        `~${budget.estimatedTokens.toLocaleString()} tokens, ` +
        `${Math.round(budget.budgetFraction * 100)}% of context budget`
      );

      // Warn about unresolved template variables
      const unresolved = spawnConfig.prompt.match(/\{\{[^}]+\}\}/g);
      if (unresolved) {
        console.warn(`\nWarning: Unresolved template variables: ${unresolved.join(', ')}`);
      }
    } catch (err) {
      console.error(`Preview error: ${err.message}`);
    }
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

module.exports = { PromptEditor };
