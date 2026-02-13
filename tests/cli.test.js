/**
 * Tests for CLI entry point (bin/ralph-cli.js)
 */

const fs = require('fs').promises;
const path = require('path');
const os = require('os');
const { parseArgs, formatLayerLine, cmdInit, cmdStatus, cmdResume, cmdCost } = require('../bin/ralph-cli');

async function createTempDir() {
  const tmpBase = path.join(os.tmpdir(), 'ralph-cli-test');
  await fs.mkdir(tmpBase, { recursive: true });
  return await fs.mkdtemp(path.join(tmpBase, 'proj-'));
}

async function cleanupDir(dir) {
  try {
    await fs.rm(dir, { recursive: true, force: true });
  } catch { /* ignore */ }
}

// Write a minimal _status.md for testing
async function writeMinimalStatus(projectDir, layer = 'L1') {
  await fs.writeFile(path.join(projectDir, '_status.md'), [
    '# Project Status',
    '',
    '## Meta',
    '- **Project:** CLI Test',
    `- **Started:** ${new Date().toISOString()}`,
    `- **Last Updated:** ${new Date().toISOString()}`,
    '',
    '## Current Position',
    `- **Layer:** ${layer}`,
    '- **Layer Name:** Input',
    '- **Phase:** understand',
    '- **Agent:** planner',
    '- **Epic:** None',
    '- **Feature:** None',
    '- **Task:** None',
    '- **Iteration:** 1',
    '',
    '## Gates',
    '- **L3 (Synthesis):** pending',
    '- **L7 (Plan Approval):** pending',
    ''
  ].join('\n'));
}

describe('parseArgs', () => {
  test('parses init command', () => {
    const result = parseArgs(['node', 'ralph-cli', 'init']);
    expect(result.command).toBe('init');
  });

  test('parses status command', () => {
    const result = parseArgs(['node', 'ralph-cli', 'status']);
    expect(result.command).toBe('status');
  });

  test('parses run command', () => {
    const result = parseArgs(['node', 'ralph-cli', 'run']);
    expect(result.command).toBe('run');
  });

  test('parses resume command', () => {
    const result = parseArgs(['node', 'ralph-cli', 'resume']);
    expect(result.command).toBe('resume');
  });

  test('parses cost command', () => {
    const result = parseArgs(['node', 'ralph-cli', 'cost']);
    expect(result.command).toBe('cost');
  });

  test('parses --help flag', () => {
    const result = parseArgs(['node', 'ralph-cli', '--help']);
    expect(result.command).toBe('help');
  });

  test('defaults to help with no args', () => {
    const result = parseArgs(['node', 'ralph-cli']);
    expect(result.command).toBe('help');
  });

  test('parses --dir option', () => {
    const result = parseArgs(['node', 'ralph-cli', 'status', '--dir', '/some/path']);
    expect(result.options.dir).toBe('/some/path');
  });

  test('parses --template option', () => {
    const result = parseArgs(['node', 'ralph-cli', 'init', '--template', 'api']);
    expect(result.options.template).toBe('api');
  });

  test('parses --quiet option', () => {
    const result = parseArgs(['node', 'ralph-cli', 'run', '--quiet']);
    expect(result.options.verbose).toBe(false);
  });

  test('parses --auto-approve option', () => {
    const result = parseArgs(['node', 'ralph-cli', 'run', '--auto-approve']);
    expect(result.options.autoApproveGates).toBe(true);
  });

  test('parses --timeout option', () => {
    const result = parseArgs(['node', 'ralph-cli', 'run', '--timeout', '60000']);
    expect(result.options.timeout).toBe(60000);
  });

  test('defaults template to web-app', () => {
    const result = parseArgs(['node', 'ralph-cli', 'init']);
    expect(result.options.template).toBe('web-app');
  });

  test('defaults verbose to true', () => {
    const result = parseArgs(['node', 'ralph-cli', 'run']);
    expect(result.options.verbose).toBe(true);
  });
});

describe('formatLayerLine', () => {
  test('shows completed layer with [x]', () => {
    const line = formatLayerLine('L1', { name: 'Input', phase: 'understand', agent: 'planner' }, 'L3');
    expect(line).toContain('[x]');
    expect(line).toContain('L1');
    expect(line).toContain('Input');
  });

  test('shows current layer with [>]', () => {
    const line = formatLayerLine('L3', { name: 'Synthesize', phase: 'understand', agent: 'planner' }, 'L3');
    expect(line).toContain('[>]');
    expect(line).toContain('L3');
  });

  test('shows pending layer with [ ]', () => {
    const line = formatLayerLine('L5', { name: 'Feature Planning', phase: 'plan', agent: 'planner' }, 'L3');
    expect(line).toContain('[ ]');
    expect(line).toContain('L5');
  });

  test('shows all layers complete for COMPLETE', () => {
    const line = formatLayerLine('L12', { name: 'Analysis', phase: 'learn', agent: 'planner' }, 'COMPLETE');
    expect(line).toContain('[x]');
  });
});

describe('CLI commands integration', () => {
  let tmpDir;
  const originalLog = console.log;
  const originalError = console.error;
  let logOutput;

  beforeEach(async () => {
    tmpDir = await createTempDir();
    logOutput = [];
    console.log = (...args) => logOutput.push(args.join(' '));
    console.error = (...args) => logOutput.push(args.join(' '));
  });

  afterEach(async () => {
    console.log = originalLog;
    console.error = originalError;
    await cleanupDir(tmpDir);
  });

  test('cmdInit creates project from template', async () => {
    const projectDir = path.join(tmpDir, 'new-project');
    await cmdInit({ dir: projectDir, template: 'web-app' });

    const output = logOutput.join('\n');
    expect(output).toContain('initialized');
    expect(output).toContain('web-app');

    // Verify files were created
    const hasStatus = await fs.access(path.join(projectDir, '_status.md')).then(() => true).catch(() => false);
    expect(hasStatus).toBe(true);
  });

  test('cmdStatus shows project state', async () => {
    await writeMinimalStatus(tmpDir, 'L3');
    await cmdStatus({ dir: tmpDir });

    const output = logOutput.join('\n');
    expect(output).toContain('Project Status');
    expect(output).toContain('L3');
    expect(output).toContain('CLI Test');
  });

  test('cmdResume reports no recovery needed when consistent', async () => {
    await writeMinimalStatus(tmpDir, 'L1');
    await cmdResume({ dir: tmpDir });

    const output = logOutput.join('\n');
    expect(output).toContain('No recovery needed');
  });

  test('cmdCost shows cost info', async () => {
    await writeMinimalStatus(tmpDir, 'L3');
    await cmdCost({ dir: tmpDir });

    const output = logOutput.join('\n');
    expect(output).toContain('Cost Tracking');
    expect(output).toContain('L3');
  });
});
