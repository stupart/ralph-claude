'use strict';

const fs = require('fs').promises;
const path = require('path');

class PromptMetrics {
  constructor(projectRoot) {
    this.projectRoot = projectRoot || process.cwd();
    this.resultsDir = path.join(this.projectRoot, '_prompt-tests');
  }

  async report(options = {}) {
    let results = await this._loadResults();

    if (options.layer) {
      results = results.filter(r => r.layer === options.layer);
    }
    if (options.variant) {
      results = results.filter(r =>
        r.variants.some(v => v.name === options.variant)
      );
    }
    if (options.last) {
      results = results.slice(0, options.last);
    }

    if (results.length === 0) {
      return { message: 'No results match the specified filters.', resultCount: 0 };
    }

    const winRate = this._computeWinRate(results);
    const specificity = this._computeSpecificity(results);
    const tokenEfficiency = this._computeTokenEfficiency(results);

    const report = {
      resultCount: results.length,
      winRate,
      specificity,
      tokenEfficiency,
      summary: this._determineSummary(winRate)
    };

    if (options.format === 'json') return report;
    return { ...report, formatted: this._formatTable(report) };
  }

  async _loadResults() {
    let files;
    try {
      files = await fs.readdir(this.resultsDir);
    } catch (err) {
      if (err.code === 'ENOENT') {
        console.log('No test results found. Run `ralph prompts test` first.');
        return [];
      }
      throw err;
    }

    const jsonFiles = files.filter(f => f.endsWith('.json'));
    if (jsonFiles.length === 0) {
      console.log('No test results found in _prompt-tests/.');
      return [];
    }

    const results = [];
    for (const file of jsonFiles) {
      try {
        const content = await fs.readFile(
          path.join(this.resultsDir, file), 'utf-8'
        );
        const parsed = JSON.parse(content);
        if (this._validateSchema(parsed)) {
          results.push(parsed);
        }
      } catch (err) {
        console.warn(`Skipping malformed file: ${file} (${err.message})`);
      }
    }

    return results.sort((a, b) =>
      new Date(b.timestamp) - new Date(a.timestamp)
    );
  }

  _validateSchema(result) {
    const required = ['timestamp', 'layer', 'agentType', 'variants'];
    const missing = required.filter(field => !(field in result));
    if (missing.length > 0) {
      console.warn(`Skipping result: missing fields [${missing.join(', ')}]`);
      return false;
    }
    if (!Array.isArray(result.variants) || result.variants.length === 0) {
      console.warn('Skipping result: variants must be a non-empty array');
      return false;
    }
    return true;
  }

  _computeWinRate(results) {
    const verdictRank = { 'PASS': 2, 'ITERATE': 1 };
    const wins = {};

    for (const result of results) {
      const variants = result.variants;
      for (const v of variants) {
        wins[v.name] = wins[v.name] || 0;
      }

      if (variants.length === 2) {
        const [a, b] = variants;
        const rankA = verdictRank[a.output?.verdict] || 0;
        const rankB = verdictRank[b.output?.verdict] || 0;
        if (rankA > rankB) wins[a.name] += 1;
        else if (rankB > rankA) wins[b.name] += 1;
        else { wins[a.name] += 0.5; wins[b.name] += 0.5; }
      }
    }

    const total = results.length;
    const rates = {};
    for (const [name, w] of Object.entries(wins)) {
      rates[name] = total > 0 ? Math.round((w / total) * 100) : 0;
    }
    return rates;
  }

  _computeSpecificity(results) {
    const totals = {};
    for (const result of results) {
      for (const v of result.variants) {
        if (!totals[v.name]) totals[v.name] = { specific: 0, total: 0 };
        totals[v.name].total += v.metrics?.issueCount || 0;
        totals[v.name].specific += v.metrics?.specificIssues || 0;
      }
    }
    const scores = {};
    for (const [name, t] of Object.entries(totals)) {
      scores[name] = t.total > 0
        ? Math.round((t.specific / t.total) * 100) / 100
        : 'N/A';
    }
    return scores;
  }

  _computeTokenEfficiency(results) {
    const totals = {};
    for (const result of results) {
      for (const v of result.variants) {
        if (!totals[v.name]) totals[v.name] = { issues: 0, tokens: 0 };
        totals[v.name].issues += v.metrics?.issueCount || 0;
        totals[v.name].tokens += v.metrics?.tokenCount || 0;
      }
    }
    const efficiency = {};
    for (const [name, t] of Object.entries(totals)) {
      efficiency[name] = t.tokens > 0
        ? Math.round((t.issues / t.tokens) * 10000) / 10000
        : 0;
    }
    return efficiency;
  }

  _determineSummary(winRate) {
    const entries = Object.entries(winRate);
    if (entries.length === 0) return 'No data';
    const sorted = entries.sort((a, b) => b[1] - a[1]);
    if (sorted.length >= 2 && sorted[0][1] === sorted[1][1]) {
      return 'No clear winner';
    }
    return `Winner: ${sorted[0][0]}`;
  }

  _formatTable(report) {
    const cols = { variant: 15, winRate: 12, specificity: 14, efficiency: 12 };
    const lines = [];

    lines.push(
      'Variant'.padEnd(cols.variant) +
      'Win Rate'.padEnd(cols.winRate) +
      'Specificity'.padEnd(cols.specificity) +
      'Token Eff.'.padEnd(cols.efficiency)
    );
    lines.push('-'.repeat(cols.variant + cols.winRate + cols.specificity + cols.efficiency));

    const variantNames = Object.keys(report.winRate);
    for (const name of variantNames) {
      const wr = `${report.winRate[name]}%`;
      const sp = report.specificity[name] === 'N/A'
        ? 'N/A' : report.specificity[name].toFixed(2);
      const te = report.tokenEfficiency[name].toFixed(4);

      lines.push(
        name.padEnd(cols.variant) +
        wr.padEnd(cols.winRate) +
        sp.padEnd(cols.specificity) +
        te.padEnd(cols.efficiency)
      );
    }

    lines.push('');
    lines.push(report.summary);
    lines.push(`(Based on ${report.resultCount} test run${report.resultCount !== 1 ? 's' : ''})`);

    return lines.join('\n');
  }
}

module.exports = { PromptMetrics };
