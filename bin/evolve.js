#!/usr/bin/env node

const EvolutionRunner = require('../lib/evolution-runner');

function parseArgs(argv = process.argv.slice(2)) {
  const options = {
    variant: null,
    hours: null,
    startAt: null,
    brainDumps: '_evolution/brain-dumps/',
    timeout: 1800000,
    maxTurns: undefined,
    quiet: false
  };

  for (let i = 0; i < argv.length; i++) {
    switch (argv[i]) {
      case '--variant': options.variant = argv[++i]; break;
      case '--hours': options.hours = parseFloat(argv[++i]); break;
      case '--start-at': options.startAt = argv[++i]; break;
      case '--brain-dumps': options.brainDumps = argv[++i]; break;
      case '--timeout': options.timeout = parseInt(argv[++i], 10); break;
      case '--max-turns': options.maxTurns = parseInt(argv[++i], 10); break;
      case '--quiet': options.quiet = true; break;
    }
  }

  return options;
}

function validateArgs(options) {
  const errors = [];
  if (!options.variant) {
    errors.push('Missing required argument: --variant');
  }
  if (options.hours === null || options.hours === undefined) {
    errors.push('Missing required argument: --hours');
  } else if (options.hours <= 0 || isNaN(options.hours)) {
    errors.push('Hours must be a positive number');
  }
  if (options.startAt && !/^\d{2}:\d{2}$/.test(options.startAt)) {
    errors.push('Invalid --start-at format. Expected HH:MM (24-hour)');
  }
  if (errors.length > 0) {
    errors.forEach(e => console.error(e));
    process.exit(1);
  }
  return options;
}

function computeDelay(targetHHMM) {
  const [hours, minutes] = targetHHMM.split(':').map(Number);
  const now = new Date();
  const target = new Date();
  target.setHours(hours, minutes, 0, 0);

  let delay = target.getTime() - now.getTime();
  let isTomorrow = false;

  if (delay <= 0) {
    delay += 86400000; // 24 hours
    isTomorrow = true;
  }

  return { delay, isTomorrow };
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function handleStartAt(startAt) {
  if (!startAt) return;
  const { delay, isTomorrow } = computeDelay(startAt);
  if (delay <= 0) return;

  const hours = Math.floor(delay / 3600000);
  const minutes = Math.floor((delay % 3600000) / 60000);
  const when = isTomorrow ? 'tomorrow' : 'today';
  console.log(`Waiting until ${startAt} ${when} (${hours}h ${minutes}m from now)...`);
  await sleep(delay);
}

async function main(argv) {
  const options = parseArgs(argv);
  validateArgs(options);

  await handleStartAt(options.startAt);

  const runner = new EvolutionRunner(process.cwd(), {
    variant: options.variant,
    hours: options.hours,
    brainDumpDir: options.brainDumps,
    timeout: options.timeout,
    maxTurns: options.maxTurns,
    quiet: options.quiet
  });

  await runner.run();
}

if (require.main === module) {
  main().catch(err => {
    console.error(`Fatal: ${err.message}`);
    process.exit(1);
  });
}

module.exports = { parseArgs, validateArgs, computeDelay, main };
