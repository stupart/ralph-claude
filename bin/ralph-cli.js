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
      dryRun: false
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
      case '--help':
        result.command = 'help';
        break;
    }
  }

  return result;
}

// Format a layer status line
function formatLayerLine(layerId, layer, currentLayer) {
  const layerNum = parseInt(layerId.slice(1));
  const currentNum = currentLayer === 'COMPLETE' ? 13 : parseInt(currentLayer.slice(1));
  const isComplete = layerNum < currentNum;
  const isCurrent = layerId === currentLayer;
  const checkbox = isComplete ? '[x]' : (isCurrent ? '[>]' : '[ ]');
  return `  ${checkbox} ${layerId}: ${layer.name} (${layer.phase}, ${layer.agent})`;
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

Options:
  --dir <path>       Project directory (default: current directory)
  --template <name>  Template for init (default: web-app)
  --verbose          Enable verbose output
  --quiet            Disable verbose output
  --auto-approve     Auto-approve human gates (L3, L7)
  --timeout <ms>     Agent timeout in milliseconds (default: 300000)
  --dry-run          Show spawn config without executing agent
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
    case 'help':
    default:
      await cmdHelp();
      break;
  }
}

// Export for testing
module.exports = { parseArgs, cmdInit, cmdStatus, cmdResume, cmdCost, formatLayerLine };

// Run if executed directly
if (require.main === module) {
  main().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
}
