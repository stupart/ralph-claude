'use strict';

const fs = require('fs').promises;
const path = require('path');

class PromptRegistry {
  constructor(templatesPath) {
    this.templatesPath = templatesPath || path.join(process.cwd(), 'templates', 'agents');
    this._entries = null;
  }

  async scan() {
    const entries = [];

    // Scan originals
    let files;
    try {
      files = await fs.readdir(this.templatesPath);
    } catch (err) {
      if (err.code === 'ENOENT') {
        this._entries = [];
        return [];
      }
      throw err;
    }
    const mdFiles = files.filter(f => f.endsWith('.md'));
    for (const file of mdFiles) {
      const entry = await this._extractMetadata(file);
      entries.push(entry);
    }

    // Scan variants
    const variantsPath = path.join(this.templatesPath, 'variants');
    let variantFiles;
    try {
      variantFiles = await fs.readdir(variantsPath);
    } catch (err) {
      if (err.code === 'ENOENT') variantFiles = [];
      else throw err;
    }

    for (const vFile of variantFiles.filter(f => f.endsWith('.md'))) {
      const entry = await this._extractMetadata(path.join('variants', vFile));

      const nameWithoutExt = vFile.replace(/\.md$/, '');
      const lastDot = nameWithoutExt.lastIndexOf('.');
      const originalBasename = nameWithoutExt.substring(0, lastDot);
      const variantName = nameWithoutExt.substring(lastDot + 1);

      entry.isVariant = true;
      entry.variantName = variantName;

      const original = entries.find(e => e.filename === originalBasename + '.md');
      if (original) {
        entry.baselinePath = original.filePath;
        original.variants.push({ name: variantName, filePath: entry.filePath });

        // Validate template variables
        const missing = original.templateVariables.filter(
          v => !entry.templateVariables.includes(v)
        );
        const extra = entry.templateVariables.filter(
          v => !original.templateVariables.includes(v)
        );
        if (missing.length > 0 || extra.length > 0) {
          entry.variableWarnings = { missing, extra };
        }
      } else {
        entry.baselinePath = null;
        entry.warnings = entry.warnings || [];
        entry.warnings.push(`No baseline found for variant '${vFile}'`);
      }
      entries.push(entry);
    }

    this._entries = entries;
    return entries;
  }

  filter(criteria = {}) {
    let results = [...(this._entries || [])];
    if (criteria.agentType) {
      results = results.filter(e => e.agentType === criteria.agentType);
    }
    if (criteria.layer) {
      results = results.filter(e => e.layerMapping.includes(criteria.layer));
    }
    if (criteria.variantStatus) {
      switch (criteria.variantStatus) {
        case 'hasVariants':
          results = results.filter(e => !e.isVariant && e.variants.length > 0);
          break;
        case 'isVariant':
          results = results.filter(e => e.isVariant);
          break;
        case 'originalsOnly':
          results = results.filter(e => !e.isVariant);
          break;
      }
    }
    return results;
  }

  async diff(variantPath, originalPath) {
    const [variantContent, originalContent] = await Promise.all([
      fs.readFile(variantPath, 'utf-8'),
      fs.readFile(originalPath, 'utf-8')
    ]);
    const variantLines = variantContent.split('\n');
    const originalLines = originalContent.split('\n');
    const originalSet = new Set(originalLines);
    const variantSet = new Set(variantLines);

    const added = variantLines.filter(l => !originalSet.has(l));
    const removed = originalLines.filter(l => !variantSet.has(l));
    const unchanged = variantLines.filter(l => originalSet.has(l));

    return {
      added,
      removed,
      unchanged,
      summary: {
        addedCount: added.length,
        removedCount: removed.length,
        unchangedCount: unchanged.length
      }
    };
  }

  async _extractMetadata(filename) {
    const filePath = path.join(this.templatesPath, filename);
    const [content, stat] = await Promise.all([
      fs.readFile(filePath, 'utf-8'),
      fs.stat(filePath)
    ]);

    const baseName = path.basename(filename);
    const agentType = this._detectAgentType(baseName);
    const layerMapping = this._detectLayerMapping(baseName, agentType);
    const templateVariables = [...content.matchAll(/\{\{([^}]+)\}\}/g)].map(m => m[1]);
    const uniqueVars = [...new Set(templateVariables)];

    return {
      filename: baseName,
      filePath,
      agentType,
      layerMapping,
      templateVariables: uniqueVars,
      charCount: content.length,
      estimatedTokens: Math.ceil(content.length / 4),
      lastModified: stat.mtime,
      isVariant: false,
      variantName: null,
      baselinePath: null,
      variants: []
    };
  }

  _detectAgentType(filename) {
    if (filename.startsWith('planner')) return 'planner';
    if (filename.startsWith('builder')) return 'builder';
    if (filename.startsWith('judge')) return 'judge';
    return 'unknown';
  }

  _detectLayerMapping(filename, agentType) {
    if (agentType === 'builder') return ['L8'];
    const layers = [...filename.matchAll(/L(\d+)/g)].map(m => `L${m[1]}`);
    return layers;
  }
}

module.exports = { PromptRegistry };
