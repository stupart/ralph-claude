/**
 * Layer Cake Self-Improvement Loop
 *
 * Runs Layer Cake on itself in a continuous loop. Each generation:
 * 1. Runs L12 retrospective on current ralph codebase
 * 2. Feeds findings as L1 input for the next generation
 * 3. Plans improvements through L2-L7
 * 4. Builds improvements at L8
 * 5. Reviews at L9-L11
 * 6. Commits to a new generation branch
 * 7. Repeats forever
 *
 * "The program that improves itself."
 */

const fs = require('fs').promises;
const path = require('path');
const { execSync, spawn } = require('child_process');
const { Ralph } = require('./ralph');
const { StateManager, LAYERS } = require('./state-machine');

/**
 * Files that define ralph's "self" - the targets for self-improvement
 */
const SELF_TARGETS = {
  orchestration: [
    'lib/ralph.js',
    'lib/state-machine.js',
    'lib/validator.js',
    'lib/router.js',
    'lib/agent-spawner.js',
    'lib/recovery.js',
    'lib/self-improve.js'
  ],
  prompts: [
    'templates/agents/planner-base.md',
    'templates/agents/builder.md',
    'templates/agents/judge-base.md',
    'templates/agents/planner-L*.md',
    'templates/agents/judge-L*.md'
  ],
  protocols: [
    'templates/protocols/*.md',
    'templates/review-output-template.md'
  ],
  agents: [
    '.claude/agents/layer-cake-planner.md',
    '.claude/agents/layer-cake-builder.md',
    '.claude/agents/layer-cake-judge.md'
  ],
  tests: [
    'tests/*.test.js'
  ],
  docs: [
    'BUGS.md',
    'IDEAS.md',
    '_status.md'
  ]
};

class SelfImprover {
  /**
   * @param {string} ralphRoot - Path to the ralph-claude repository
   * @param {Object} options
   * @param {string} options.baseBranch - Branch to improve from (default: current branch)
   * @param {number} options.maxGenerations - Max generations before stopping (0 = infinite)
   * @param {number} options.agentTimeout - Timeout per agent execution in ms
   * @param {Function} options.agentExecutor - Function to execute Claude agents
   * @param {boolean} options.verbose - Log output
   * @param {boolean} options.autoApproveGates - Skip human gates
   */
  constructor(ralphRoot, options = {}) {
    this.ralphRoot = ralphRoot;
    this.options = {
      baseBranch: null,
      maxGenerations: 0,
      agentTimeout: 600000, // 10 min per agent for self-improvement
      agentExecutor: null,
      verbose: true,
      autoApproveGates: true, // Self-improvement auto-approves gates
      ...options
    };

    this.generation = 0;
    this.generationLog = [];
    this.running = false;
  }

  log(message) {
    if (this.options.verbose) {
      const timestamp = new Date().toISOString().slice(11, 19);
      const line = `[gen${this.generation}] [${timestamp}] ${message}`;
      console.log(line);
      this.generationLog.push(line);
    }
  }

  /**
   * Get the current git branch
   */
  getCurrentBranch() {
    return execSync('git rev-parse --abbrev-ref HEAD', { cwd: this.ralphRoot }).toString().trim();
  }

  /**
   * Get the current generation number from branch naming
   */
  detectGeneration() {
    const branch = this.getCurrentBranch();
    const match = branch.match(/layer-cake-gen(\d+)/);
    if (match) return parseInt(match[1]);
    if (branch === 'layer-cake') return 1;
    return 0;
  }

  /**
   * Create a new generation branch
   */
  createGenerationBranch(genNumber) {
    const branchName = `layer-cake-gen${genNumber}`;
    try {
      execSync(`git checkout -b ${branchName}`, { cwd: this.ralphRoot });
      this.log(`Created branch: ${branchName}`);
      return branchName;
    } catch (err) {
      // Branch may already exist
      execSync(`git checkout ${branchName}`, { cwd: this.ralphRoot });
      this.log(`Switched to existing branch: ${branchName}`);
      return branchName;
    }
  }

  /**
   * Generate L1 input from current codebase analysis.
   * This is the "retrospective" that feeds the next generation.
   */
  async generateRetrospectiveInput() {
    this.log('Generating retrospective input from current codebase...');

    const input = {
      timestamp: new Date().toISOString(),
      generation: this.generation,
      sections: {}
    };

    // Gather current bugs
    try {
      input.sections.bugs = await fs.readFile(path.join(this.ralphRoot, 'BUGS.md'), 'utf8');
    } catch { input.sections.bugs = 'No BUGS.md found'; }

    // Gather current ideas
    try {
      input.sections.ideas = await fs.readFile(path.join(this.ralphRoot, 'IDEAS.md'), 'utf8');
    } catch { input.sections.ideas = 'No IDEAS.md found'; }

    // Gather previous retrospective if exists
    try {
      const retroPath = path.join(this.ralphRoot, '8-analysis', 'retrospective.md');
      input.sections.previousRetrospective = await fs.readFile(retroPath, 'utf8');
    } catch { input.sections.previousRetrospective = 'No previous retrospective'; }

    // Gather test results
    try {
      const testOutput = execSync('npx jest --json 2>/dev/null || echo "{}"', {
        cwd: this.ralphRoot,
        timeout: 30000
      }).toString();
      input.sections.testResults = testOutput.slice(0, 5000); // Truncate
    } catch { input.sections.testResults = 'Tests could not be run'; }

    // Gather file sizes and complexity metrics
    const metrics = await this.gatherMetrics();
    input.sections.metrics = JSON.stringify(metrics, null, 2);

    // Gather generation history
    if (this.generationLog.length > 0) {
      input.sections.generationHistory = this.generationLog.join('\n');
    }

    return input;
  }

  /**
   * Gather codebase metrics for self-analysis
   */
  async gatherMetrics() {
    const metrics = { files: {}, totals: { lines: 0, files: 0 } };

    for (const [category, patterns] of Object.entries(SELF_TARGETS)) {
      metrics.files[category] = [];
      for (const pattern of patterns) {
        try {
          // Resolve glob patterns simply
          const dir = path.dirname(path.join(this.ralphRoot, pattern));
          const filePattern = path.basename(pattern);
          const entries = await fs.readdir(dir).catch(() => []);

          for (const entry of entries) {
            if (this.matchesGlob(entry, filePattern)) {
              const filePath = path.join(dir, entry);
              try {
                const content = await fs.readFile(filePath, 'utf8');
                const lines = content.split('\n').length;
                metrics.files[category].push({ file: entry, lines });
                metrics.totals.lines += lines;
                metrics.totals.files++;
              } catch { /* skip unreadable files */ }
            }
          }
        } catch { /* skip missing dirs */ }
      }
    }

    return metrics;
  }

  /**
   * Simple glob matching (supports * wildcard)
   */
  matchesGlob(name, pattern) {
    if (pattern === '*') return true;
    if (!pattern.includes('*')) return name === pattern;
    const regex = new RegExp('^' + pattern.replace(/\./g, '\\.').replace(/\*/g, '.*') + '$');
    return regex.test(name);
  }

  /**
   * Write the retrospective input as L1 brain dump for the improvement cycle
   */
  async writeImprovementInput(input) {
    const workDir = path.join(this.ralphRoot, '_self-improve', `gen${this.generation}`);
    await fs.mkdir(path.join(workDir, '1-input'), { recursive: true });

    const brainDump = [
      `# Self-Improvement Brain Dump - Generation ${this.generation}`,
      ``,
      `**Date:** ${input.timestamp}`,
      `**Generation:** ${this.generation}`,
      `**Goal:** Improve Layer Cake methodology, prompts, and orchestration code`,
      ``,
      `## Current Bugs`,
      input.sections.bugs,
      ``,
      `## Ideas & Roadmap`,
      input.sections.ideas,
      ``,
      `## Previous Retrospective`,
      input.sections.previousRetrospective,
      ``,
      `## Codebase Metrics`,
      '```json',
      input.sections.metrics,
      '```',
      ``,
      `## Test Results`,
      '```',
      input.sections.testResults?.slice(0, 2000) || 'N/A',
      '```',
      ``,
      `## Improvement Targets`,
      `Focus areas for this generation:`,
      `1. Fix any known bugs from BUGS.md`,
      `2. Implement highest-impact ideas from IDEAS.md`,
      `3. Improve prompt quality based on retrospective findings`,
      `4. Add missing tests`,
      `5. Improve documentation`,
      `6. Reduce complexity where possible`,
      ``
    ].join('\n');

    await fs.writeFile(path.join(workDir, '1-input', 'brain-dump.md'), brainDump);
    this.log(`Wrote improvement input to ${workDir}/1-input/brain-dump.md`);

    return workDir;
  }

  /**
   * Run a single generation of self-improvement.
   * Creates a new branch, runs layer cake targeting ralph's own code, commits results.
   */
  async runGeneration() {
    this.generation++;
    this.log(`=== Starting Generation ${this.generation} ===`);

    // 1. Generate retrospective input
    const input = await this.generateRetrospectiveInput();

    // 2. Create generation branch
    const branchName = this.createGenerationBranch(this.generation + 1);

    // 3. Write improvement input
    const workDir = await this.writeImprovementInput(input);

    // 4. Run Layer Cake on the improvement project
    const ralph = new Ralph(workDir, {
      tier: 'micro', // Self-improvement uses micro tier (1 epic, focused changes)
      autoApproveGates: this.options.autoApproveGates,
      verbose: this.options.verbose,
      agentTimeout: this.options.agentTimeout
    });

    await ralph.initialize();

    if (this.options.agentExecutor) {
      try {
        const result = await ralph.runProject(this.options.agentExecutor);
        this.log(`Generation ${this.generation} result: ${result.status}`);
      } catch (err) {
        this.log(`Generation ${this.generation} error: ${err.message}`);
      }
    } else {
      // No executor provided - use Claude CLI subprocess
      await this.runWithClaudeCLI(workDir);
    }

    // 5. Commit the generation
    await this.commitGeneration(branchName);

    // 6. Update BUGS.md / IDEAS.md based on what was fixed
    await this.updateTrackingDocs();

    this.log(`=== Generation ${this.generation} Complete ===`);

    return {
      generation: this.generation,
      branch: branchName,
      workDir
    };
  }

  /**
   * Run Layer Cake using Claude CLI as the agent executor.
   * This spawns actual `claude -p` processes for each layer.
   */
  async runWithClaudeCLI(workDir) {
    this.log('Running with Claude CLI executor...');

    // Build the improvement prompt
    const prompt = [
      'You are running Layer Cake self-improvement on the ralph-claude codebase.',
      `Working directory: ${workDir}`,
      `Ralph source: ${this.ralphRoot}`,
      '',
      'Read the brain dump in 1-input/ and improve the ralph codebase.',
      'Focus on: fixing bugs, improving prompts, adding tests, reducing complexity.',
      'Commit each change with descriptive messages.',
      '',
      'Target files are in the ralph source directory, not the working directory.',
      'The working directory is for planning artifacts only.'
    ].join('\n');

    return new Promise((resolve, reject) => {
      const proc = spawn('claude', [
        '-p', prompt,
        '--max-turns', '50',
        '--allowedTools', 'Read,Write,Edit,Bash,Glob,Grep'
      ], {
        cwd: this.ralphRoot,
        stdio: 'pipe',
        timeout: this.options.agentTimeout
      });

      let output = '';
      proc.stdout.on('data', (data) => {
        output += data.toString();
        if (this.options.verbose) process.stdout.write(data);
      });
      proc.stderr.on('data', (data) => {
        if (this.options.verbose) process.stderr.write(data);
      });

      proc.on('close', (code) => {
        this.log(`Claude CLI exited with code ${code}`);
        resolve({ code, output });
      });

      proc.on('error', (err) => {
        this.log(`Claude CLI error: ${err.message}`);
        reject(err);
      });
    });
  }

  /**
   * Commit the current generation's changes
   */
  commitGeneration(branchName) {
    try {
      execSync('git add -A', { cwd: this.ralphRoot });
      const message = `feat: self-improvement generation ${this.generation}\n\nAutomated Layer Cake self-improvement iteration.\nBranch: ${branchName}\nTimestamp: ${new Date().toISOString()}`;
      execSync(`git commit -m "${message}" --allow-empty`, { cwd: this.ralphRoot });
      this.log(`Committed generation ${this.generation} to ${branchName}`);
    } catch (err) {
      this.log(`Commit error (may be no changes): ${err.message}`);
    }
  }

  /**
   * Update tracking docs after a generation
   */
  async updateTrackingDocs() {
    // Append generation summary to IDEAS.md
    try {
      const ideasPath = path.join(this.ralphRoot, 'IDEAS.md');
      let ideas = '';
      try { ideas = await fs.readFile(ideasPath, 'utf8'); } catch {}

      const genSummary = `\n\n## Generation ${this.generation} Summary\n` +
        `- **Date:** ${new Date().toISOString()}\n` +
        `- **Log entries:** ${this.generationLog.length}\n`;

      await fs.writeFile(ideasPath, ideas + genSummary);
    } catch (err) {
      this.log(`Error updating tracking docs: ${err.message}`);
    }
  }

  /**
   * Run the continuous self-improvement loop.
   * Never stops unless maxGenerations is set or an unrecoverable error occurs.
   */
  async run() {
    this.running = true;
    this.generation = this.detectGeneration();
    this.log(`Starting continuous self-improvement from generation ${this.generation}`);
    this.log(`Max generations: ${this.options.maxGenerations || 'infinite'}`);

    while (this.running) {
      try {
        const result = await this.runGeneration();
        this.log(`Generation ${result.generation} completed on branch ${result.branch}`);

        // Check max generations
        if (this.options.maxGenerations > 0 && this.generation >= this.options.maxGenerations) {
          this.log(`Reached max generations (${this.options.maxGenerations}), stopping`);
          break;
        }

        // Brief pause between generations to avoid hammering
        await new Promise(resolve => setTimeout(resolve, 5000));

      } catch (err) {
        this.log(`Error in generation ${this.generation}: ${err.message}`);

        // Don't crash on single generation failure - log and continue
        this.generationLog.push(`ERROR: ${err.message}`);

        // Back off on repeated errors
        await new Promise(resolve => setTimeout(resolve, 30000));
      }
    }

    this.log('Self-improvement loop ended');
    return {
      totalGenerations: this.generation,
      log: this.generationLog
    };
  }

  /**
   * Stop the loop gracefully
   */
  stop() {
    this.log('Stop requested, will finish current generation...');
    this.running = false;
  }
}

module.exports = { SelfImprover, SELF_TARGETS };
