#!/usr/bin/env node

/**
 * Ralph CLI - Layer Cake Orchestrator
 *
 * Commands:
 *   init [--template <name>] [--dir <path>]  - Initialize a new project from template
 *   run [--dir <path>]                        - Run project through Layer Cake
 *   status [--dir <path>]                     - Show current project state
 *   resume [--dir <path>]                     - Resume from crash/interruption
 *   cost [--dir <path>]                       - Show token usage and cost estimates
 *
 * Global options:
 *   --dir <path>       Project directory (default: current directory)
 *   --verbose          Enable verbose output (default: true)
 *   --quiet            Disable verbose output
 *   --dry-run          Show what would be spawned without executing
 *   --help             Show help
 */

const path = require('path');
const { Ralph, CostTracker } = require('../lib/ralph');
const { RecoveryManager } = require('../lib/recovery');
const { StateManager, LAYERS } = require('../lib/state-machine');
const { listTemplates, initProject } = require('../lib/templates');

// Parse CLI arguments into command + options
function parseArgs(argv) {
  const args = argv.slice(2);
  const result = {
    command: null,
    options: {
      dir: process.cwd(),
      template: 'web-app',
      verbose: true,
      autoApproveGates: false,
      timeout: 300000,
      dryRun: false,
      noColor: false
    }
  };

  if (args.length === 0 || args[0] === '--help') {
    result.command = 'help';
    return result;
  }

  // First non-flag argument is the command
  if (!args[0].startsWith('-')) {
    result.command = args[0];
  }

  for (let i = result.command ? 1 : 0; i < args.length; i++) {
    switch (args[i]) {
      case '--dir':
        result.options.dir = path.resolve(args[++i] || '.');
        break;
      case '--template':
        result.options.template = args[++i] || 'web-app';
        break;
      case '--verbose':
        result.options.verbose = true;
        break;
      case '--quiet':
        result.options.verbose = false;
        break;
      case '--auto-approve':
        result.options.autoApproveGates = true;
        break;
      case '--timeout':
        result.options.timeout = parseInt(args[++i]) || 300000;
        break;
      case '--dry-run':
        result.options.dryRun = true;
        break;
      case '--no-color':
        result.options.noColor = true;
        colorEnabled = false;
        break;
      case '--help':
        result.command = 'help';
        break;
    }
  }

  return result;
}

/**
 * ANSI color codes for CLI output
 */
const COLORS = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',    // gray/dim for pending
  cyan: '\x1b[36m'
};

/** Whether color output is enabled (can be disabled with --no-color) */
let colorEnabled = true;

/**
 * Apply color to text if color is enabled
 * @param {string} text
 * @param {...string} codes - ANSI codes to apply
 * @returns {string}
 */
function color(text, ...codes) {
  if (!colorEnabled) return text;
  return codes.join('') + text + COLORS.reset;
}

// Format a layer status line
function formatLayerLine(layerId, layer, currentLayer, useColor = true) {
  const layerNum = parseInt(layerId.slice(1));
  const currentNum = currentLayer === 'COMPLETE' ? 13 : parseInt(currentLayer.slice(1));
  const isComplete = layerNum < currentNum;
  const isCurrent = layerId === currentLayer;
  const checkbox = isComplete ? '[x]' : (isCurrent ? '[>]' : '[ ]');
  const line = `  ${checkbox} ${layerId}: ${layer.name} (${layer.phase}, ${layer.agent})`;

  if (!useColor || !colorEnabled) return line;

  if (isComplete) {
    return color(line, COLORS.green);
  } else if (isCurrent) {
    return color(line, COLORS.bold, COLORS.yellow);
  } else {
    return color(line, COLORS.dim);
  }
}

// Commands

async function cmdHelp() {
  console.log(`
Ralph CLI - Layer Cake Orchestrator

Usage: ralph-cli <command> [options]

Commands:
  init       Initialize a new project from a template
  run        Run the project through Layer Cake pipeline
  status     Show current project state and progress
  resume     Recover from crash or interrupted state
  cost       Show token usage and cost estimates
  prompts    Prompt Lab tools
    list                List all templates with metadata (default)
    edit <identifier>   Edit a template with live preview
    test <id> --variants <list> [--real]  Run A/B test
    report [--last N]   Show metrics comparison table

Options:
  --dir <path>       Project directory (default: current directory)
  --template <name>  Template for init (default: web-app)
  --verbose          Enable verbose output
  --quiet            Disable verbose output
  --auto-approve     Auto-approve human gates (L3, L7)
  --timeout <ms>     Agent timeout in milliseconds (default: 300000)
  --dry-run          Show spawn config without executing agent
  --no-color         Disable colored output
  --help             Show this help

Examples:
  ralph-cli init --template web-app --dir ./my-project
  ralph-cli status --dir ./my-project
  ralph-cli run --dir ./my-project --auto-approve
  ralph-cli resume --dir ./my-project
  ralph-cli cost --dir ./my-project
`);
}

async function cmdInit(options) {
  console.log(`Initializing project with template: ${options.template}`);
  console.log(`Target directory: ${options.dir}`);

  try {
    // List available templates
    const templates = await listTemplates();
    const template = templates.find(t => t.name === options.template);

    if (!template) {
      console.error(`Template "${options.template}" not found.`);
      console.log('Available templates:');
      for (const t of templates) {
        console.log(`  - ${t.name}: ${t.description}`);
      }
      process.exit(1);
    }

    const result = await initProject(options.template, options.dir, {
      variables: {
        DATE: new Date().toISOString(),
        PROJECT_NAME: path.basename(options.dir)
      }
    });

    console.log(`\nProject initialized from "${result.template}" template.`);
    console.log(`\nCreated ${result.folders.length} folders:`);
    for (const folder of result.folders) {
      console.log(`  + ${folder}/`);
    }
    console.log(`\nCreated ${result.files.length} files:`);
    for (const file of result.files) {
      console.log(`  + ${file}`);
    }
    console.log('\nNext steps:');
    console.log('  1. Edit 1-input/brain-dump.md with your project ideas');
    console.log('  2. Run: ralph-cli run --dir ' + options.dir);
  } catch (err) {
    console.error(`Init failed: ${err.message}`);
    process.exit(1);
  }
}

async function cmdStatus(options) {
  try {
    const sm = new StateManager(options.dir);
    const state = await sm.read();
    const progress = sm.getProgress();

    console.log('Project Status');
    console.log('==============');
    console.log(`  Project:    ${state.meta.project}`);
    console.log(`  Started:    ${state.meta.started}`);
    console.log(`  Updated:    ${state.meta.lastUpdated}`);
    console.log('');
    console.log('Current Position');
    console.log('----------------');
    console.log(`  Layer:      ${state.position.layer}`);
    if (state.position.layer !== 'COMPLETE') {
      const layer = LAYERS[state.position.layer];
      console.log(`  Name:       ${layer?.name || 'Unknown'}`);
      console.log(`  Phase:      ${layer?.phase || 'Unknown'}`);
      console.log(`  Agent:      ${layer?.agent || 'Unknown'}`);
    }
    if (state.position.epic) console.log(`  Epic:       ${state.position.epic}`);
    if (state.position.feature) console.log(`  Feature:    ${state.position.feature}`);
    console.log(`  Iteration:  ${state.position.iteration}`);
    console.log('');
    console.log(`Progress: ${progress.completed}/${progress.total} layers (${progress.percentage}%)`);
    console.log('');

    // Layer status
    console.log('Layers:');
    for (const [layerId, layer] of Object.entries(LAYERS)) {
      console.log(formatLayerLine(layerId, layer, state.position.layer));
    }

    // Gates
    console.log('');
    console.log('Gates:');
    console.log(`  L3 (Synthesis):     ${state.gates?.L3?.status || 'pending'}`);
    console.log(`  L7 (Plan Approval): ${state.gates?.L7?.status || 'pending'}`);
  } catch (err) {
    console.error(`Status failed: ${err.message}`);
    process.exit(1);
  }
}

async function cmdRun(options) {
  console.log(`Running project at: ${options.dir}`);

  try {
    const ralph = new Ralph(options.dir, {
      verbose: options.verbose,
      autoApproveGates: options.autoApproveGates,
      agentTimeout: options.timeout,
      dryRun: options.dryRun
    });

    const initResult = await ralph.initialize();
    console.log(`Initialized at ${initResult.position?.layer || 'COMPLETE'}`);

    if (initResult.status === 'complete') {
      console.log('Project is already complete.');
      return;
    }

    // Note: In a real execution, this would provide an actual agent executor
    // that spawns Claude instances. For now, we show the spawn configuration.
    const spawnResult = await ralph.runNextLayer();

    if (spawnResult.status === 'spawn') {
      console.log(`\nReady to spawn ${spawnResult.spawnConfig.agentType} agent for ${spawnResult.layerId}`);
      console.log(`Model: ${spawnResult.spawnConfig.model}`);
      console.log(`Context files: ${spawnResult.spawnConfig.context.files.length}`);
      console.log('\nTo execute, provide an agent executor (e.g., Claude API integration).');
    } else {
      console.log(`\nResult: ${spawnResult.status} - ${spawnResult.message}`);
    }
  } catch (err) {
    console.error(`Run failed: ${err.message}`);
    process.exit(1);
  }
}

async function cmdResume(options) {
  console.log(`Checking project state at: ${options.dir}`);

  try {
    const recovery = new RecoveryManager(options.dir);
    const plan = await recovery.reconcile();

    if (!plan.needsRecovery) {
      console.log('No recovery needed. State is consistent with filesystem.');
      console.log(`Current layer: ${plan.statusLayer}`);
      return;
    }

    console.log('Mismatches detected:');
    for (const mismatch of plan.mismatches) {
      console.log(`  - [${mismatch.type}] ${mismatch.description}`);
    }

    console.log('\nApplying recovery:');
    for (const action of plan.actions) {
      console.log(`  - ${action.description}`);
    }

    const result = await recovery.resume(plan);

    if (result.recovered) {
      console.log('\nRecovery complete.');
      for (const action of result.actions) {
        const status = action.success ? 'OK' : `FAILED: ${action.error}`;
        console.log(`  [${status}] ${action.action}`);
      }

      // Show new state
      const sm = new StateManager(options.dir);
      const state = await sm.read();
      console.log(`\nCurrent layer after recovery: ${state.position.layer}`);
    }
  } catch (err) {
    console.error(`Resume failed: ${err.message}`);
    process.exit(1);
  }
}

async function cmdCost(options) {
  try {
    const sm = new StateManager(options.dir);
    const state = await sm.read();

    console.log('Cost Tracking');
    console.log('=============');
    console.log('');
    console.log('Note: Cost data is tracked in-memory during ralph runs.');
    console.log('Historical cost data requires the event log (_events.jsonl).');
    console.log('');

    // Try to read event log for historical data
    const fs = require('fs').promises;
    const eventsPath = path.join(options.dir, '_events.jsonl');

    try {
      const content = await fs.readFile(eventsPath, 'utf8');
      const events = content.trim().split('\n')
        .filter(line => line.trim())
        .map(line => {
          try { return JSON.parse(line); } catch { return null; }
        })
        .filter(Boolean);

      // Count events by type
      const layerStarts = events.filter(e => e.type === 'layer_start').length;
      const layerEnds = events.filter(e => e.type === 'layer_end').length;
      const verdicts = events.filter(e => e.type === 'verdict');
      const errors = events.filter(e => e.type === 'error').length;

      console.log('Event Log Summary:');
      console.log(`  Layer starts:  ${layerStarts}`);
      console.log(`  Layer ends:    ${layerEnds}`);
      console.log(`  Verdicts:      ${verdicts.length}`);
      console.log(`  Errors:        ${errors}`);

      if (verdicts.length > 0) {
        const passes = verdicts.filter(v => v.meta?.verdict === 'PASS').length;
        const iterates = verdicts.filter(v => v.meta?.verdict === 'ITERATE').length;
        console.log(`    PASS:        ${passes}`);
        console.log(`    ITERATE:     ${iterates}`);
      }
    } catch {
      console.log('No event log found. Run the project to generate cost data.');
    }

    console.log('');
    console.log(`Current position: ${state.position.layer}`);
    const progress = sm.getProgress();
    console.log(`Progress: ${progress.completed}/${progress.total} layers`);
  } catch (err) {
    console.error(`Cost failed: ${err.message}`);
    process.exit(1);
  }
}

// Prompt Lab commands

async function cmdPrompts() {
  const subcommand = process.argv[3] || 'list';

  switch (subcommand) {
    case 'list':
      await handlePromptsList();
      break;
    case 'edit':
      await handlePromptsEdit();
      break;
    case 'test':
      await handlePromptsTest();
      break;
    case 'report':
      await handlePromptsReport();
      break;
    default:
      console.log('Unknown subcommand: ' + subcommand);
      console.log('Valid subcommands: list, edit, test, report');
      console.log('Usage: ralph prompts [list|edit|test|report]');
      break;
  }
}

async function handlePromptsList() {
  const { PromptRegistry } = require('../lib/prompt-registry');
  const registry = new PromptRegistry();
  const entries = await registry.scan();

  if (entries.length === 0) {
    console.log('No templates found.');
    return;
  }

  const header = 'Template'.padEnd(35) + 'Type'.padEnd(10) +
    'Layers'.padEnd(15) + 'Vars'.padEnd(6) + 'Chars'.padEnd(8) +
    'Tokens'.padEnd(8) + 'Modified'.padEnd(12);
  console.log(header);
  console.log('-'.repeat(header.length));

  for (const e of entries) {
    console.log(
      e.filename.padEnd(35) +
      e.agentType.padEnd(10) +
      (e.layerMapping.join(',') || '-').padEnd(15) +
      String(e.templateVariables.length).padEnd(6) +
      String(e.charCount).padEnd(8) +
      String(e.estimatedTokens).padEnd(8) +
      e.lastModified.toISOString().split('T')[0].padEnd(12)
    );
  }
}

async function handlePromptsEdit() {
  const identifier = process.argv[4];
  if (!identifier) {
    console.error('Usage: ralph prompts edit <identifier>');
    console.error('Example: ralph prompts edit L8-builder');
    return;
  }
  const { PromptEditor } = require('../lib/prompt-editor');
  const editor = new PromptEditor(process.cwd());
  await editor.edit(identifier);
}

async function handlePromptsTest() {
  const identifier = process.argv[4];
  if (!identifier) {
    console.error('Usage: ralph prompts test <identifier> --variants <list> [--real]');
    return;
  }

  const variantsIdx = process.argv.indexOf('--variants');
  if (variantsIdx === -1 || !process.argv[variantsIdx + 1]) {
    console.error('Error: --variants is required. Example: --variants original,vivid');
    return;
  }

  const variants = process.argv[variantsIdx + 1].split(',').filter(Boolean);
  if (variants.length === 0) {
    console.error('Error: --variants must list at least one variant name.');
    return;
  }

  const real = process.argv.includes('--real');

  const { PromptTester } = require('../lib/prompt-tester');
  const tester = new PromptTester(process.cwd());
  const result = await tester.test(identifier, variants, { real });
  console.log(`Test complete. Results stored in _prompt-tests/${result.filename}`);
}

async function handlePromptsReport() {
  const options = {};
  const lastIdx = process.argv.indexOf('--last');
  if (lastIdx !== -1 && process.argv[lastIdx + 1]) {
    const n = parseInt(process.argv[lastIdx + 1], 10);
    if (n > 0) options.last = n;
  }

  const { PromptMetrics } = require('../lib/prompt-metrics');
  const metrics = new PromptMetrics(process.cwd());
  const report = await metrics.report(options);
  if (report.formatted) {
    console.log(report.formatted);
  } else if (report.message) {
    console.log(report.message);
  }
}

// Main entry point
async function main() {
  const { command, options } = parseArgs(process.argv);

  switch (command) {
    case 'init':
      await cmdInit(options);
      break;
    case 'run':
      await cmdRun(options);
      break;
    case 'status':
      await cmdStatus(options);
      break;
    case 'resume':
      await cmdResume(options);
      break;
    case 'cost':
      await cmdCost(options);
      break;
    case 'prompts':
      await cmdPrompts(options);
      break;
    case 'help':
    default:
      await cmdHelp();
      break;
  }
}

/**
 * Set color enabled state (for testing)
 * @param {boolean} enabled
 */
function setColorEnabled(enabled) {
  colorEnabled = enabled;
}

// Export for testing
module.exports = { parseArgs, cmdInit, cmdStatus, cmdResume, cmdCost, cmdPrompts, formatLayerLine, COLORS, color, setColorEnabled };

// Run if executed directly
if (require.main === module) {
  main().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
}
