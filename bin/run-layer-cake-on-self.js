#!/usr/bin/env node

/**
 * Run Layer Cake on itself.
 *
 * This script uses the Ralph orchestrator to drive the full 12-layer pipeline,
 * with a real agentExecutor that spawns `claude -p` subprocesses.
 *
 * Usage:
 *   node bin/run-layer-cake-on-self.js [--auto-approve] [--dry-run] [--timeout <ms>]
 */

const path = require('path');
const { spawn } = require('child_process');
const readline = require('readline');
const { Ralph } = require('../lib/ralph');
const { VerdictParser } = require('../lib/verdict-parser');

// Project directory for the meta-improvement
const PROJECT_DIR = path.join(__dirname, '..', '_layer-cake-v6');
// The actual codebase the builder will modify
const CODEBASE_ROOT = path.join(__dirname, '..');
const verdictParser = new VerdictParser();

/**
 * Parse CLI arguments
 */
function parseArgs() {
  const args = process.argv.slice(2);
  const opts = {
    autoApprove: false,
    dryRun: false,
    timeout: 1800000, // 30 min default (reviews)
    maxTurns: 0, // 0 = no limit, agent runs until done
    verbose: true
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--auto-approve':
        opts.autoApprove = true;
        break;
      case '--dry-run':
        opts.dryRun = true;
        break;
      case '--timeout':
        opts.timeout = parseInt(args[++i]) || 600000;
        break;
      case '--max-turns':
        opts.maxTurns = parseInt(args[++i]) || 100;
        break;
      case '--quiet':
        opts.verbose = false;
        break;
    }
  }
  return opts;
}

/**
 * Resolve context glob patterns to actual file contents.
 * Takes the spawnConfig.context.files patterns and reads matching files.
 */
async function resolveContext(spawnConfig) {
  const fs = require('fs').promises;
  const { glob } = require('path');

  let contextText = '';
  const files = spawnConfig.context?.files || [];

  for (const pattern of files) {
    // Resolve pattern against project dir
    const resolvedPattern = pattern
      .replace(/\{\{epic\}\}/g, spawnConfig.context?.position?.epic || '*')
      .replace(/\{\{feature\}\}/g, spawnConfig.context?.position?.feature || '*')
      .replace(/\{\{task\}\}/g, spawnConfig.context?.position?.task || '*');

    const fullPattern = path.join(PROJECT_DIR, resolvedPattern);

    try {
      // Use simple readdir-based glob since we're in Node
      const dir = path.dirname(fullPattern);
      const entries = await fs.readdir(dir).catch(() => []);
      for (const entry of entries) {
        if (entry.startsWith('.')) continue;
        const filePath = path.join(dir, entry);
        try {
          const stat = await fs.stat(filePath);
          if (stat.isFile()) {
            const content = await fs.readFile(filePath, 'utf8');
            contextText += `\n\n--- FILE: ${path.relative(PROJECT_DIR, filePath)} ---\n${content}`;
          }
        } catch { /* skip unreadable files */ }
      }
    } catch { /* pattern didn't match anything */ }
  }

  return contextText;
}

/**
 * Build the full prompt for an agent, including context files.
 */
async function buildFullPrompt(spawnConfig, layerId) {
  let prompt = spawnConfig.prompt;

  // Add project directory for ALL agent types so they know where to read/write files
  prompt += `\n\n## Project Paths\n\n`;
  prompt += `The Layer Cake project artifacts are at: ${PROJECT_DIR}\n`;
  prompt += `When the template references paths like \`/3-synthesis/\` or \`/4-epics/\`, these are relative to the project directory above.\n`;
  prompt += `For example, \`/3-synthesis/jtbd.md\` means \`${PROJECT_DIR}/3-synthesis/jtbd.md\`.\n`;
  prompt += `Always use the FULL ABSOLUTE PATH when reading or writing files.\n`;

  // Add codebase location for builder
  if (spawnConfig.agentType === 'builder') {
    prompt += `\nThe codebase you are modifying is at: ${CODEBASE_ROOT}\n`;
  }

  // Resolve and append context files
  const context = await resolveContext(spawnConfig);
  if (context) {
    prompt += `\n\n## Context Files\n${context}`;
  }

  // Add instructions for judges to output parseable verdicts
  if (spawnConfig.agentType === 'judge') {
    prompt += `\n\n## CRITICAL: Verdict Output Format

You MUST end your review with a structured verdict section in this exact format:

## Verdict: PASS

OR

## Verdict: ITERATE

### Issues:
- [MINOR] Issue title: Description of the issue
- [MAJOR] Issue title: Description of the issue
- [ESCALATE] Issue title: Description of the issue

This format is machine-parsed. Do not deviate from it.`;
  }

  return prompt;
}

/**
 * The agent executor: spawns `claude -p` with the assembled prompt.
 *
 * @param {Object} spawnConfig - From Ralph's AgentSpawner
 * @returns {Promise<Object>} Artifacts including reviewResult for judges
 */
function createAgentExecutor(opts) {
  return async function agentExecutor(spawnConfig) {
    const layerId = spawnConfig.layerId;
    const agentType = spawnConfig.agentType;

    console.log(`\n${'='.repeat(60)}`);
    console.log(`  Spawning ${agentType} agent for ${layerId}`);
    console.log(`  Model: ${spawnConfig.model}`);
    console.log(`${'='.repeat(60)}\n`);

    // Build the full prompt with resolved context
    const fullPrompt = await buildFullPrompt(spawnConfig, layerId);

    // Log prompt size
    const estimatedTokens = Math.ceil(fullPrompt.length / 4);
    console.log(`  Prompt size: ~${estimatedTokens} tokens (${fullPrompt.length} chars)`);

    if (opts.dryRun) {
      console.log(`  [DRY RUN] Would spawn claude -p with ${fullPrompt.length} char prompt`);
      console.log(`  First 500 chars of prompt:\n${fullPrompt.slice(0, 500)}...`);
      return { dryRun: true };
    }

    // Spawn claude -p
    return new Promise((resolve, reject) => {
      const args = [
        '-p', fullPrompt,
        '--allowedTools', getToolFlags(spawnConfig),
        '--output-format', 'text'
      ];

      // Only set max-turns if explicitly limited (0 = no limit)
      if (opts.maxTurns > 0) {
        args.push('--max-turns', String(opts.maxTurns));
      }

      console.log(`  Running: claude -p [prompt] ${opts.maxTurns > 0 ? '--max-turns ' + opts.maxTurns : '(unlimited turns)'}`);

      const child = spawn('claude', args, {
        cwd: CODEBASE_ROOT,
        stdio: ['ignore', 'pipe', 'pipe'],
        env: { ...process.env }
      });

      // Register process for kill enforcement
      if (spawnConfig.registerProcess) {
        spawnConfig.registerProcess(child);
      }

      // Handle abort signal
      if (spawnConfig.abortSignal) {
        spawnConfig.abortSignal.addEventListener('abort', () => {
          if (!child.killed) child.kill('SIGTERM');
        });
      }

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

      child.on('close', (code) => {
        console.log(`\n  Agent exited with code ${code}`);

        if (code !== 0) {
          reject(new Error(`Agent process exited with code ${code}: ${stderr.slice(0, 500)}`));
          return;
        }

        // Build artifacts
        const artifacts = {
          output: stdout,
          stderr: stderr
        };

        // Parse verdict for judge agents
        if (agentType === 'judge') {
          artifacts.reviewResult = verdictParser.parse(stdout);
          console.log(`\n  Verdict: ${artifacts.reviewResult.verdict} (${artifacts.reviewResult.issues.length} issues)`);
        }

        resolve(artifacts);
      });

      child.on('error', (err) => {
        reject(new Error(`Failed to spawn claude: ${err.message}`));
      });
    });
  };
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
 * Prompt the human for gate approval (L3 and L7).
 */
async function promptHumanGate(layerId, ralph) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    console.log(`\n${'*'.repeat(60)}`);
    console.log(`  HUMAN GATE: Layer ${layerId} requires approval`);
    console.log(`${'*'.repeat(60)}`);

    if (layerId === 'L3') {
      console.log('\n  The planner has completed synthesis (JTBD, journeys, architecture).');
      console.log('  Review the artifacts in _layer-cake-v2/3-synthesis/ before approving.\n');
    } else if (layerId === 'L7') {
      console.log('\n  The planner has completed all subtask definitions.');
      console.log('  Review the artifacts in _layer-cake-v2/7-subtasks/ before approving.\n');
    }

    rl.question('  Approve and continue? (y/n): ', async (answer) => {
      rl.close();
      if (answer.toLowerCase().startsWith('y')) {
        await ralph.approveGate(layerId);
        console.log(`  Gate ${layerId} approved.\n`);
        resolve(true);
      } else {
        console.log(`  Gate ${layerId} rejected. Stopping.\n`);
        resolve(false);
      }
    });
  });
}

/**
 * Main entry point
 */
async function main() {
  const opts = parseArgs();

  console.log('Layer Cake on Layer Cake');
  console.log('=======================');
  console.log(`Project dir: ${PROJECT_DIR}`);
  console.log(`Codebase:    ${CODEBASE_ROOT}`);
  console.log(`Auto-approve gates: ${opts.autoApprove}`);
  console.log(`Dry run: ${opts.dryRun}`);
  console.log(`Timeout: ${opts.timeout}ms`);
  console.log(`Max turns: ${opts.maxTurns}`);
  console.log('');

  // Initialize Ralph
  const ralph = new Ralph(PROJECT_DIR, {
    verbose: opts.verbose,
    autoApproveGates: opts.autoApprove,
    agentTimeout: opts.timeout,
    dryRun: opts.dryRun,
    maxRetries: 2,
    maxCascadeDepth: 5
  });

  // Also point the spawner templates at the actual templates directory
  ralph.spawner.templatesPath = path.join(CODEBASE_ROOT, 'templates', 'agents');

  const initResult = await ralph.initialize();
  console.log(`Initialized: ${JSON.stringify(initResult, null, 2)}`);

  if (initResult.status === 'complete') {
    console.log('Project is already complete!');
    return;
  }

  // Create the agent executor
  const agentExecutor = createAgentExecutor(opts);

  // Run the full pipeline using runProject() which handles:
  // - Per-epic build cycling at L8 (one epic at a time, L9 review per epic)
  // - Layer progression through L1-L12
  // - ITERATE/cascade routing
  // - Stall detection
  //
  // The old while/runLayerCycle loop bypassed per-epic cycling, dumping ALL
  // subtask files into a single builder pass. runProject() feeds one epic's
  // subtasks at a time, keeping context manageable.
  let result;
  do {
    result = await ralph.runProject(agentExecutor);
    console.log(`\nProject result: ${result.status}`);

    if (result.status === 'complete') {
      console.log('\nProject COMPLETE!');
      console.log('Costs:', JSON.stringify(ralph.costs.getSummary(), null, 2));
      console.log('Timings:', JSON.stringify(ralph.timings.getSummary(), null, 2));
    } else if (result.status === 'waiting_human') {
      if (opts.autoApprove) {
        await ralph.approveGate(result.layerId);
        console.log(`  Auto-approved gate at ${result.layerId}`);
        // Loop to continue runProject from where it paused
      } else {
        const approved = await promptHumanGate(result.layerId, ralph);
        if (!approved) {
          console.log('Stopping at human gate.');
          break;
        }
      }
    } else if (result.status === 'human_required') {
      console.log(`\nHuman intervention required at ${result.layer || result.layerId}`);
      console.log(`Reason: ${result.reason || result.message}`);
    } else if (result.status === 'error') {
      console.log(`\nError at ${result.layerId}: ${result.message}`);
    } else {
      console.log(`  Unexpected status: ${result.status}`);
      console.log(JSON.stringify(result, null, 2));
    }
  } while (result.status === 'waiting_human');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
