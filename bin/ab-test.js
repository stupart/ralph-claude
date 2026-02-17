#!/usr/bin/env node

/**
 * A/B Test Runner for Layer Cake prompt variants.
 *
 * Runs the full pipeline with dual-prompt mode: for each specified layer,
 * both the base and variant prompts run in parallel, a comparison judge
 * picks the winner, and the winner's output feeds into the next layer.
 *
 * Usage:
 *   node bin/ab-test.js --brain-dump <path> --variant <name> [options]
 *
 * Options:
 *   --brain-dump <path>   Path to the brain dump / task file (required)
 *   --variant <name>      Variant to test against base (e.g., 'vivid') (required)
 *   --layers <list>       Comma-separated layers to A/B test (e.g., L3,L8,L9)
 *   --timeout <ms>        Agent timeout in ms (default: 1800000)
 *   --max-turns <n>       Max turns per agent (default: unlimited)
 *   --dry-run             Verify setup without spawning agents
 *   --auto-approve        Auto-approve human gates
 *   --quiet               Suppress verbose output
 */

const path = require('path');
const fs = require('fs');
const fsp = require('fs').promises;
const { spawn } = require('child_process');
const { Ralph } = require('../lib/ralph');
const { ABRunner } = require('../lib/ab-runner');
const { VerdictParser } = require('../lib/verdict-parser');

const CODEBASE_ROOT = path.join(__dirname, '..');

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = {
    brainDump: null,
    variant: null,
    layers: null,
    timeout: 1800000,
    maxTurns: 0,
    dryRun: false,
    autoApprove: false,
    verbose: true
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--brain-dump':
        opts.brainDump = args[++i];
        break;
      case '--variant':
        opts.variant = args[++i];
        break;
      case '--layers':
        opts.layers = args[++i].split(',').map(l => l.trim());
        break;
      case '--timeout':
        opts.timeout = parseInt(args[++i]) || 1800000;
        break;
      case '--max-turns':
        opts.maxTurns = parseInt(args[++i]) || 100;
        break;
      case '--dry-run':
        opts.dryRun = true;
        break;
      case '--auto-approve':
        opts.autoApprove = true;
        break;
      case '--quiet':
        opts.verbose = false;
        break;
    }
  }

  if (!opts.variant) {
    console.error('Error: --variant is required');
    console.error('Usage: node bin/ab-test.js --brain-dump <path> --variant <name>');
    process.exit(1);
  }

  return opts;
}

/**
 * Get --allowedTools flag value based on agent permissions.
 */
function getToolFlags(spawnConfig) {
  const perms = spawnConfig.toolPermissions || spawnConfig.permissions;
  if (!perms) return 'Read,Write,Edit,Bash,Glob,Grep';

  const tools = [];
  if (perms.allowed) tools.push(...perms.allowed);
  if (perms.limited) tools.push(...Object.keys(perms.limited));
  if (perms.optional) tools.push(...perms.optional);

  return tools.join(',') || 'Read,Write,Edit,Bash,Glob,Grep';
}

/**
 * Create an agent executor that spawns `claude -p`.
 */
function createAgentExecutor(opts, projectDir) {
  const verdictParser = new VerdictParser(projectDir);
  const childProcesses = new Set();

  // Cleanup on exit
  process.on('exit', () => {
    for (const child of childProcesses) {
      try { child.kill('SIGKILL'); } catch { /* already dead */ }
    }
  });

  return async function agentExecutor(spawnConfig) {
    const agentType = spawnConfig.agentType;

    if (opts.verbose) {
      console.log(`    Spawning ${agentType} for ${spawnConfig.layerId}`);
    }

    // Append project paths to prompt
    let fullPrompt = spawnConfig.prompt;
    fullPrompt += `\n\n## Project Paths\n\n`;
    fullPrompt += `The Layer Cake project artifacts are at: ${projectDir}\n`;
    fullPrompt += `Always use the FULL ABSOLUTE PATH when reading or writing files.\n`;

    if (agentType === 'builder') {
      fullPrompt += `\nThe codebase you are modifying is at: ${CODEBASE_ROOT}\n`;
    }

    if (opts.dryRun) {
      console.log(`    [DRY RUN] Would spawn claude -p (${fullPrompt.length} chars)`);
      return { output: '[dry-run output]', dryRun: true };
    }

    return new Promise((resolve, reject) => {
      const args = [
        '-p', fullPrompt,
        '--allowedTools', getToolFlags(spawnConfig),
        '--output-format', 'text'
      ];

      if (opts.maxTurns > 0) {
        args.push('--max-turns', String(opts.maxTurns));
      }

      const child = spawn('claude', args, {
        cwd: CODEBASE_ROOT,
        stdio: ['ignore', 'pipe', 'pipe'],
        env: { ...process.env }
      });

      childProcesses.add(child);

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => {
        const text = data.toString();
        stdout += text;
        if (opts.verbose) process.stdout.write(text);
      });

      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      // Timeout
      const timer = setTimeout(() => {
        if (!child.killed) child.kill('SIGTERM');
      }, opts.timeout);

      child.on('close', (code) => {
        clearTimeout(timer);
        childProcesses.delete(child);

        if (code !== 0) {
          reject(new Error(`Agent exited with code ${code}: ${stderr.slice(0, 500)}`));
          return;
        }

        const artifacts = { output: stdout, stderr };

        if (agentType === 'judge') {
          artifacts.reviewResult = verdictParser.parse(stdout);
        }

        resolve(artifacts);
      });

      child.on('error', (err) => {
        clearTimeout(timer);
        childProcesses.delete(child);
        reject(new Error(`Failed to spawn claude: ${err.message}`));
      });
    });
  };
}

async function main() {
  const opts = parseArgs();
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const projectDir = path.join(CODEBASE_ROOT, `_layer-cake-ab-${timestamp}`);

  console.log('Layer Cake A/B Test');
  console.log('===================');
  console.log(`Variant:     ${opts.variant}`);
  console.log(`Layers:      ${opts.layers ? opts.layers.join(', ') : 'all'}`);
  console.log(`Brain dump:  ${opts.brainDump || '(none)'}`);
  console.log(`Project dir: ${projectDir}`);
  console.log(`Dry run:     ${opts.dryRun}`);
  console.log(`Timeout:     ${opts.timeout}ms`);
  console.log('');

  // Create project directory
  await fsp.mkdir(projectDir, { recursive: true });

  // Copy brain dump to project input if provided
  if (opts.brainDump) {
    const inputDir = path.join(projectDir, '1-input');
    await fsp.mkdir(inputDir, { recursive: true });
    const brainDumpContent = await fsp.readFile(opts.brainDump, 'utf8');
    await fsp.writeFile(path.join(inputDir, 'brain-dump.md'), brainDumpContent);
  }

  // Initialize ABRunner
  const abRunner = new ABRunner(CODEBASE_ROOT, {
    variant: opts.variant,
    layers: opts.layers,
    comparisonModel: 'opus',
    dryRun: opts.dryRun,
    verbose: opts.verbose
  });

  // Initialize Ralph
  const ralph = new Ralph(projectDir, {
    verbose: opts.verbose,
    autoApproveGates: opts.autoApprove,
    agentTimeout: opts.timeout,
    dryRun: opts.dryRun,
    maxRetries: 2,
    maxCascadeDepth: 5
  });

  ralph.spawner.templatesPath = path.join(CODEBASE_ROOT, 'templates', 'agents');

  const initResult = await ralph.initialize();
  console.log(`Initialized: ${initResult.status}`);

  // Create agent executor
  const baseExecutor = createAgentExecutor(opts, projectDir);

  // Wrap executor with A/B testing
  const abExecutor = async function(spawnConfig) {
    const layerId = spawnConfig.layerId;
    const context = {
      position: spawnConfig.context?.position || {},
      handoff: spawnConfig.handoff
    };

    const result = await abRunner.runDualLayer(layerId, context, baseExecutor);

    // Return in the format Ralph expects
    if (result.artifacts) {
      return result.artifacts;
    }
    return { output: result.output || '' };
  };

  // Run pipeline
  let pipelineResult;
  do {
    pipelineResult = await ralph.runProject(abExecutor);
    console.log(`\nPipeline result: ${pipelineResult.status}`);

    if (pipelineResult.status === 'complete') {
      console.log('\nPipeline COMPLETE!');
    } else if (pipelineResult.status === 'waiting_human') {
      if (opts.autoApprove) {
        await ralph.approveGate(pipelineResult.layerId);
        console.log(`  Auto-approved gate at ${pipelineResult.layerId}`);
      } else {
        console.log(`  Human gate at ${pipelineResult.layerId} — use --auto-approve to skip`);
        break;
      }
    } else if (pipelineResult.status === 'error') {
      console.log(`  Error: ${pipelineResult.message}`);
      break;
    } else {
      break;
    }
  } while (pipelineResult.status === 'waiting_human');

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('  A/B TEST SUMMARY');
  console.log('='.repeat(60));

  const resultsPath = path.join(CODEBASE_ROOT, '_ab-results', 'evolution.jsonl');
  try {
    const lines = fs.readFileSync(resultsPath, 'utf8').trim().split('\n');
    const results = lines.map(l => {
      try { return JSON.parse(l); } catch { return null; }
    }).filter(Boolean);

    // Filter to this run's results (by timestamp proximity)
    const runStart = new Date(timestamp.replace(/-/g, (m, i) => i < 13 ? ':' : '-'));
    const recentResults = results.filter(r => {
      const t = new Date(r.timestamp);
      return t >= runStart;
    });

    if (recentResults.length === 0) {
      console.log('\n  No A/B comparisons were recorded this run.');
    } else {
      let baseWins = 0;
      let variantWins = 0;
      let ties = 0;

      console.log('\n  Layer | Winner    | Confidence | Reasoning');
      console.log('  ------|-----------|------------|----------');

      for (const r of recentResults) {
        const winner = r.actualWinner === 'tie' ? 'TIE' : r.actualWinner;
        console.log(`  ${r.layerId.padEnd(5)} | ${winner.padEnd(9)} | ${r.confidence.padEnd(10)} | ${r.reasoning.slice(0, 50)}`);

        if (r.actualWinner === 'base') baseWins++;
        else if (r.actualWinner === opts.variant) variantWins++;
        else ties++;
      }

      console.log('');
      console.log(`  Base wins: ${baseWins} | ${opts.variant} wins: ${variantWins} | Ties: ${ties}`);
    }
  } catch {
    console.log('\n  No evolution.jsonl found — run without --dry-run to generate results.');
  }

  console.log(`\n  Results: ${resultsPath}`);
  console.log(`  Project: ${projectDir}`);
  console.log('');
}

if (require.main === module) {
  main().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
}

module.exports = { parseArgs };
