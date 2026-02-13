#!/usr/bin/env node

/**
 * ralph improve - Continuous self-improvement loop
 *
 * Usage:
 *   node bin/ralph-improve.js                    # Run forever
 *   node bin/ralph-improve.js --max-generations 5 # Run 5 generations
 *   node bin/ralph-improve.js --timeout 600000    # 10min per agent
 *
 * This runs Layer Cake on itself, improving prompts, fixing bugs,
 * and refining the methodology with each generation.
 */

const path = require('path');
const { SelfImprover } = require('../lib/self-improve');

const args = process.argv.slice(2);
const options = {};

// Parse CLI args
for (let i = 0; i < args.length; i++) {
  switch (args[i]) {
    case '--max-generations':
      options.maxGenerations = parseInt(args[++i]) || 0;
      break;
    case '--timeout':
      options.agentTimeout = parseInt(args[++i]) || 600000;
      break;
    case '--quiet':
      options.verbose = false;
      break;
    case '--help':
      console.log(`
ralph improve - Continuous self-improvement loop

Usage:
  node bin/ralph-improve.js [options]

Options:
  --max-generations N   Stop after N generations (default: infinite)
  --timeout MS          Agent timeout in milliseconds (default: 600000)
  --quiet               Suppress verbose output
  --help                Show this help
`);
      process.exit(0);
  }
}

const ralphRoot = path.resolve(__dirname, '..');
const improver = new SelfImprover(ralphRoot, options);

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\nGraceful shutdown requested...');
  improver.stop();
});

process.on('SIGTERM', () => {
  improver.stop();
});

// Run the loop
improver.run()
  .then(result => {
    console.log(`\nSelf-improvement completed after ${result.totalGenerations} generations`);
    process.exit(0);
  })
  .catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
