'use strict';

const fs = require('fs');
const path = require('path');
const { Ralph } = require('./ralph');
const { ABRunner } = require('./ab-runner');
const { EvolutionTracker } = require('./evolution-tracker');
const { BrainDumpGenerator } = require('./brain-dump-generator');
const { PromptRegistry } = require('./prompt-registry');

const BUFFER_MS = 1800000; // 30-minute safety buffer for time budget

class EvolutionRunner {
  constructor(projectRoot, options = {}) {
    this.projectRoot = projectRoot;
    this.variant = options.variant;
    this.hours = options.hours || 8;
    this.brainDumpDir = options.brainDumpDir || path.join(projectRoot, '_evolution', 'brain-dumps');
    this.verbose = options.verbose !== false;
    this.quiet = options.quiet || false;
    this.timeout = options.timeout || 1800000;
    this.maxTurns = options.maxTurns;
    this.sessionId = `evo-${new Date().toISOString()}`;
    this.deadline = Date.now() + (this.hours * 3600000);
    this.promotedSet = new Set();
    this.runs = [];
    this.promotions = [];
    this.errorCount = 0;
    this.successCount = 0;
  }

  log(msg) {
    if (this.verbose && !this.quiet) console.log(msg);
  }

  // === Feature 01: Main Evolution Loop ===

  _createProjectDir() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const dirName = `_layer-cake-ab-${timestamp}`;
    const projectDir = path.join(this.projectRoot, dirName);
    const subdirs = ['1-input', '2-decomposition', '3-synthesis', '4-epics', '5-features', '6-tasks', '7-subtasks'];
    for (const sub of subdirs) {
      fs.mkdirSync(path.join(projectDir, sub), { recursive: true });
    }
    return projectDir;
  }

  _copyBrainDump(projectDir, brainDumpFile) {
    const source = path.join(this.brainDumpDir, brainDumpFile);
    const dest = path.join(projectDir, '1-input', 'brain-dump.md');
    fs.copyFileSync(source, dest);
  }

  async run() {
    this.log(`Starting evolution session ${this.sessionId}`);
    this.log(`Variant: ${this.variant}, Hours: ${this.hours}, Deadline: ${new Date(this.deadline).toISOString()}`);

    while (this.hasTimeRemaining()) {
      const pipelineTimeout = this.computePipelineTimeout();
      if (pipelineTimeout <= 0) break;

      let brainDumpFile = 'unknown';
      let projectDir = '';
      const startTime = Date.now();

      try {
        brainDumpFile = this.selectBrainDump();
        projectDir = this._createProjectDir();
        this._copyBrainDump(projectDir, brainDumpFile);

        await this._executePipeline(projectDir, brainDumpFile, pipelineTimeout);
        const durationMs = Date.now() - startTime;
        this.runs.push({ brainDumpFile, durationMs, success: true, projectDir });
        this.successCount++;
        await this.checkAndPromote();
      } catch (err) {
        const durationMs = Date.now() - startTime;
        console.error(`Pipeline run failed: ${err.message}`);
        this.runs.push({ brainDumpFile, durationMs, success: false, error: err.message, projectDir });
        this.errorCount++;
      }
    }

    this.generateReport();
    this.log(`Session complete. ${this.runs.length} runs (${this.successCount} success, ${this.errorCount} errors)`);
  }

  async _executePipeline(projectDir, brainDumpFile, pipelineTimeout) {
    const abRunner = new ABRunner(this.projectRoot, {
      variant: this.variant,
      comparisonModel: 'opus',
      verbose: this.verbose,
      sessionId: this.sessionId,
      brainDumpFile
    });

    const ralph = new Ralph(projectDir, {
      verbose: this.verbose,
      agentTimeout: this.timeout,
      maxRetries: 2,
      maxCascadeDepth: 5
    });

    // Point spawner at codebase templates, not the isolated project dir
    ralph.spawner.templatesPath = path.join(this.projectRoot, 'templates', 'agents');

    await ralph.initialize();

    // Base executor uses Ralph's agent spawner
    const baseExecutor = async (spawnConfig) => {
      return ralph.spawner.spawnAgent(spawnConfig);
    };

    // Wrap with A/B testing (pattern from bin/ab-test.js)
    const abExecutor = async function(spawnConfig) {
      const layerId = spawnConfig.layerId;
      const context = {
        position: spawnConfig.context?.position || {},
        handoff: spawnConfig.handoff
      };
      const result = await abRunner.runDualLayer(layerId, context, baseExecutor);
      if (result.artifacts) return result.artifacts;
      return { output: result.output || '' };
    };

    await ralph.runProject(abExecutor);
  }

  // === Feature 02: Brain Dump Management ===

  selectBrainDump() {
    let files = [];
    try {
      files = fs.readdirSync(this.brainDumpDir).filter(f => f.endsWith('.md'));
    } catch (err) {
      if (err.code !== 'ENOENT') throw err;
      // Directory does not exist — files stays empty, triggers auto-generation
    }

    // Count appearances in evolution.jsonl
    const counts = new Map();
    const evolutionPath = path.join(this.projectRoot, '_ab-results', 'evolution.jsonl');
    try {
      const content = fs.readFileSync(evolutionPath, 'utf8');
      const records = content.trim().split('\n').map(line => {
        try { return JSON.parse(line); } catch { return null; }
      }).filter(Boolean);
      for (const record of records) {
        if (record.brainDumpFile) {
          counts.set(record.brainDumpFile, (counts.get(record.brainDumpFile) || 0) + 1);
        }
      }
    } catch (err) {
      if (err.code !== 'ENOENT') throw err;
      // No evolution.jsonl yet — all counts are 0
    }

    if (files.length === 0) {
      return this._autoGenerateBrainDump();
    }

    // Sort by count ascending, then filename lexicographic
    files.sort((a, b) => {
      const countDiff = (counts.get(a) || 0) - (counts.get(b) || 0);
      if (countDiff !== 0) return countDiff;
      return a.localeCompare(b);
    });

    return files[0];
  }

  _autoGenerateBrainDump() {
    fs.mkdirSync(this.brainDumpDir, { recursive: true });
    const filename = `auto-${new Date().toISOString().replace(/[:.]/g, '-')}.md`;
    const filePath = path.join(this.brainDumpDir, filename);

    // BrainDumpGenerator requires generationHistory, convergenceReport, codebaseMetadata.
    // For auto-generation fallback, provide minimal defaults.
    const generator = new BrainDumpGenerator();
    const content = generator.generate(
      { generations: [], deferralCounts: {}, issueLedger: [] },
      { status: 'unknown', regressions: [], plateaus: [] },
      { moduleCount: '(auto)', testCount: '(auto)', recentChanges: '(auto)' }
    );

    fs.writeFileSync(filePath, content);
    this.log(`Auto-generated brain dump: ${filename}`);
    return filename;
  }

  // === Feature 03: Time Budget Management ===

  hasTimeRemaining() {
    const remaining = this.deadline - Date.now();
    this.log(`Time remaining: ${Math.round(remaining / 60000)} minutes`);
    return Date.now() + BUFFER_MS < this.deadline;
  }

  computePipelineTimeout() {
    const remaining = this.deadline - Date.now() - 300000;
    const timeout = Math.min(this.timeout, remaining);
    this.log(`Pipeline timeout: ${Math.round(timeout / 60000)} minutes`);
    return timeout;
  }

  // === Feature 04: Between-Run Promotion ===

  async checkAndPromote() {
    const tracker = new EvolutionTracker(path.join(this.projectRoot, '_ab-results'));
    const candidates = tracker.getPromotionCandidates();

    const eligible = candidates
      .filter(c => c.variant === this.variant)
      .filter(c => !this.promotedSet.has(`${c.layerId}:${c.variant}`));

    if (eligible.length === 0) return;

    const registry = new PromptRegistry(path.join(this.projectRoot, 'templates', 'agents'));
    const allEntries = await registry.scan();

    for (const candidate of eligible) {
      // Find base template for this layer
      const baseEntries = allEntries.filter(e =>
        e.layerMapping && e.layerMapping.includes(candidate.layerId) && !e.isVariant
      );
      if (baseEntries.length === 0) {
        this.log(`Warning: no base template found for ${candidate.layerId}, skipping promotion`);
        continue;
      }
      const baseEntry = baseEntries[0];

      // Find variant template for this layer+variant
      const variantEntries = allEntries.filter(e =>
        e.isVariant && e.variantName === this.variant &&
        e.layerMapping && e.layerMapping.includes(candidate.layerId)
      );
      if (variantEntries.length === 0) {
        this.log(`Warning: no variant template found for ${candidate.layerId}:${this.variant}, skipping`);
        continue;
      }
      const variantEntry = variantEntries[0];

      // Archive old base template
      const baseTemplatePath = baseEntry.filePath;
      const basename = path.basename(baseTemplatePath, '.md');

      const archiveDir = path.join(this.projectRoot, 'templates', 'agents', 'archive');
      fs.mkdirSync(archiveDir, { recursive: true });

      const dateStr = new Date().toISOString().slice(0, 10);
      const archivePath = path.join(archiveDir, `${basename}.${dateStr}.md`);
      fs.copyFileSync(baseTemplatePath, archivePath);
      this.log(`  Archived: ${path.basename(baseTemplatePath)} → archive/${basename}.${dateStr}.md`);

      // Copy variant to base
      const variantTemplatePath = variantEntry.filePath;
      fs.copyFileSync(variantTemplatePath, baseTemplatePath);
      this.log(`  Promoted: ${path.basename(variantTemplatePath)} → ${path.basename(baseTemplatePath)}`);

      // Log promotion record
      const promotionRecord = {
        timestamp: new Date().toISOString(),
        variant: this.variant,
        layerId: candidate.layerId,
        winRate: candidate.winRate,
        totalComparisons: candidate.total,
        baseTemplate: path.basename(baseTemplatePath),
        variantTemplate: path.basename(variantTemplatePath),
        archivedTo: archivePath,
        sessionId: this.sessionId
      };
      const promotionsPath = path.join(this.projectRoot, '_ab-results', 'promotions.jsonl');
      fs.appendFileSync(promotionsPath, JSON.stringify(promotionRecord) + '\n');
      this.promotions.push(promotionRecord);

      // Double-promotion prevention
      this.promotedSet.add(`${candidate.layerId}:${candidate.variant}`);
    }
  }

  // === Feature 06: Session Report Generation ===

  generateReport() {
    if (this.quiet) return;

    let evolutionRecords = [];
    let judgeErrors = [];
    const evolutionPath = path.join(this.projectRoot, '_ab-results', 'evolution.jsonl');

    try {
      const content = fs.readFileSync(evolutionPath, 'utf8');
      const allRecords = content.trim().split('\n')
        .map(line => { try { return JSON.parse(line); } catch { return null; } })
        .filter(Boolean)
        .filter(r => r.sessionId === this.sessionId);

      evolutionRecords = allRecords.filter(r => !r.type);
      judgeErrors = allRecords.filter(r => r.type === 'judge_error');
    } catch (err) {
      if (err.code === 'ENOENT') {
        console.log('No evolution data for this session');
        return;
      }
      throw err;
    }

    // Read promotions
    let promotionRecords = [];
    const promotionsPath = path.join(this.projectRoot, '_ab-results', 'promotions.jsonl');
    try {
      const content = fs.readFileSync(promotionsPath, 'utf8');
      promotionRecords = content.trim().split('\n')
        .map(line => { try { return JSON.parse(line); } catch { return null; } })
        .filter(Boolean)
        .filter(r => r.sessionId === this.sessionId);
    } catch (err) {
      if (err.code !== 'ENOENT') throw err;
      // No promotions file — promotionRecords stays empty
    }

    // Header
    console.log(`\n== Evolution Session Report ==`);
    console.log(`Session: ${this.sessionId}`);
    console.log(`Runs: ${this.runs.length} (${this.successCount} successful, ${this.errorCount} error)`);

    // Promotions
    console.log(`\n== Promotions ==`);
    if (promotionRecords.length === 0) {
      console.log('  None');
    } else {
      for (const p of promotionRecords) {
        console.log(`  ${p.layerId}: ${p.variantTemplate} → ${p.baseTemplate} (${Math.round(p.winRate * 100)}% win rate, archived to ${p.archivedTo})`);
      }
    }

    // Per-layer win rates
    const byLayer = new Map();
    for (const record of evolutionRecords) {
      if (!byLayer.has(record.layerId)) {
        byLayer.set(record.layerId, { wins: 0, losses: 0, ties: 0, total: 0 });
      }
      const stats = byLayer.get(record.layerId);
      stats.total++;
      if (record.actualWinner === this.variant) stats.wins++;
      else if (record.actualWinner === 'base') stats.losses++;
      else stats.ties++;
    }

    console.log(`\n== Per-Layer Win Rates ==`);
    const sortedLayers = [...byLayer.entries()].sort((a, b) => a[0].localeCompare(b[0]));
    for (const [layerId, stats] of sortedLayers) {
      const winRate = stats.total > 0 ? Math.round(stats.wins / stats.total * 100) : 0;
      console.log(`  ${layerId}: ${this.variant} ${stats.wins}/${stats.total} (${winRate}%) | ties: ${stats.ties}`);
    }
    if (byLayer.size === 0) {
      console.log('  No comparisons recorded');
    }

    // Judge reliability
    const totalComparisons = evolutionRecords.length + judgeErrors.length;
    const successRate = totalComparisons > 0 ? Math.round(evolutionRecords.length / totalComparisons * 100) : 100;
    console.log(`\n== Judge Reliability ==`);
    console.log(`  ${successRate}% (${evolutionRecords.length}/${totalComparisons} comparisons successful, ${judgeErrors.length} errors)`);

    // Error summary
    const failedRuns = this.runs.filter(r => !r.success);
    console.log(`\n== Error Summary ==`);
    if (failedRuns.length === 0) {
      console.log('  No errors');
    } else {
      for (const run of failedRuns) {
        console.log(`  ${run.brainDumpFile}: ${run.error}`);
      }
    }
  }
}

module.exports = EvolutionRunner;
