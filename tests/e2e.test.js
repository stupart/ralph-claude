/**
 * End-to-End Integration Test
 *
 * Runs mocked agents through all 12 layers (L1->L12), verifying:
 * - State transitions at each layer
 * - Artifact creation on disk
 * - Gate handling (L3, L7 human gates)
 * - Review pass/fail routing
 * - Final completion
 */

const fs = require('fs').promises;
const path = require('path');
const os = require('os');
const { Ralph, CostTracker } = require('../lib/ralph');
const { LAYERS } = require('../lib/state-machine');

// Helper to create an isolated project directory with required artifacts
async function createTestProject() {
  const tmpBase = path.join(os.tmpdir(), 'ralph-e2e-test');
  await fs.mkdir(tmpBase, { recursive: true });
  const projectDir = await fs.mkdtemp(path.join(tmpBase, 'proj-'));

  // Create minimal _status.md
  await fs.writeFile(path.join(projectDir, '_status.md'), [
    '# Project Status',
    '',
    '## Meta',
    `- **Project:** E2E Test`,
    `- **Started:** ${new Date().toISOString()}`,
    `- **Last Updated:** ${new Date().toISOString()}`,
    '',
    '## Current Position',
    '- **Layer:** L1',
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

  // Create templates/agents directory with minimal prompt files
  const agentsDir = path.join(projectDir, 'templates', 'agents');
  await fs.mkdir(agentsDir, { recursive: true });
  await fs.writeFile(path.join(agentsDir, 'planner-base.md'), '# Planner\n{{LAYER_INSTRUCTIONS}}');
  await fs.writeFile(path.join(agentsDir, 'builder-base.md'), '# Builder\n{{LAYER_INSTRUCTIONS}}');
  await fs.writeFile(path.join(agentsDir, 'judge-base.md'), '# Judge\n{{LAYER_INSTRUCTIONS}}');

  return projectDir;
}

// Create file artifacts for a layer to simulate agent completion
async function createLayerArtifacts(projectDir, layerId) {
  switch (layerId) {
    case 'L1': {
      const dir = path.join(projectDir, '1-input');
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(path.join(dir, 'brain-dump.md'), '# Brain Dump\nSome ideas here.');
      break;
    }
    case 'L2': {
      const dir = path.join(projectDir, '2-decomposition');
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(path.join(dir, 'patterns.md'), '# Patterns\n## Pattern 1\nDetails');
      break;
    }
    case 'L3': {
      const dir = path.join(projectDir, '3-synthesis');
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(path.join(dir, 'jtbd.md'), '# JTBD\n## Job 1\n## Job 2\n## Job 3');
      await fs.writeFile(path.join(dir, 'journeys.md'), '# Journeys\n## Journey 1\n## Journey 2');
      await fs.writeFile(path.join(dir, 'architecture.md'), '# Architecture\n## Decision 1');
      break;
    }
    case 'L4': {
      const dir = path.join(projectDir, '4-epics');
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(path.join(dir, 'epics.md'), [
        '# Epics',
        '## Epic 1',
        '### Description', 'Build the auth system',
        '### Scope', 'Login and registration',
        '### Dependencies', 'None',
        '## Epic 2',
        '### Description', 'Build the dashboard',
        '### Scope', 'Main dashboard page',
        '### Dependencies', 'Epic 1',
        '## Epic 3',
        '### Description', 'Build settings',
        '### Scope', 'User settings page',
        '### Dependencies', 'Epic 1'
      ].join('\n'));
      break;
    }
    case 'L5': {
      const dir = path.join(projectDir, '5-features');
      await fs.mkdir(dir, { recursive: true });
      for (const epic of ['epic-1', 'epic-2', 'epic-3']) {
        const epicDir = path.join(dir, epic);
        await fs.mkdir(epicDir, { recursive: true });
        for (let i = 1; i <= 3; i++) {
          await fs.writeFile(path.join(epicDir, `feature-${i}.md`), [
            `# Feature ${i}`,
            '## Overview', `Feature ${i} overview`,
            '## Requirements', '- Req 1',
            '## Acceptance Criteria', '- [ ] Criterion 1',
            '## Planned Tasks', '- Task 1'
          ].join('\n'));
        }
      }
      break;
    }
    case 'L6': {
      const dir = path.join(projectDir, '6-tasks');
      await fs.mkdir(dir, { recursive: true });
      for (const epic of ['epic-1', 'epic-2', 'epic-3']) {
        for (const feature of ['feature-1', 'feature-2', 'feature-3']) {
          const featureDir = path.join(dir, epic, feature);
          await fs.mkdir(featureDir, { recursive: true });
          await fs.writeFile(path.join(featureDir, '_tasks.md'), [
            '# Tasks',
            '## Task 1', '### Description', 'Do thing 1', '### Files', 'src/a.js', '### Verification', 'Test it',
            '## Task 2', '### Description', 'Do thing 2', '### Files', 'src/b.js', '### Verification', 'Test it',
            '## Task 3', '### Description', 'Do thing 3', '### Files', 'src/c.js', '### Verification', 'Test it'
          ].join('\n'));
        }
      }
      break;
    }
    case 'L7': {
      const dir = path.join(projectDir, '7-subtasks');
      await fs.mkdir(dir, { recursive: true });
      for (const epic of ['epic-1', 'epic-2', 'epic-3']) {
        for (const feature of ['feature-1', 'feature-2', 'feature-3']) {
          const featureDir = path.join(dir, epic, feature);
          await fs.mkdir(featureDir, { recursive: true });
          await fs.writeFile(path.join(featureDir, 'task-1.md'), [
            '# Task 1 Subtasks',
            '## Subtask 1', '### Action', 'Create file', '### Files', 'src/a.js', '### Verification', 'File exists',
            '## Subtask 2', '### Action', 'Add tests', '### Files', 'test/a.test.js', '### Verification', 'Tests pass'
          ].join('\n'));
        }
      }
      break;
    }
    case 'L12': {
      const dir = path.join(projectDir, '8-analysis');
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(path.join(dir, 'retrospective.md'), '# Retrospective\nLessons learned.');
      break;
    }
  }
}

async function cleanupProject(dir) {
  try {
    await fs.rm(dir, { recursive: true, force: true });
  } catch {
    // Ignore cleanup errors
  }
}

describe('E2E: Full Layer Cake Pipeline', () => {
  let projectDir;
  let ralph;

  beforeEach(async () => {
    projectDir = await createTestProject();
    ralph = new Ralph(projectDir, {
      autoApproveGates: true,
      verbose: false,
      agentTimeout: 0, // No timeout for tests
      eventLog: false,
      notifications: false
    });
  });

  afterEach(async () => {
    await cleanupProject(projectDir);
  });

  test('initialize reads current state from L1', async () => {
    const result = await ralph.initialize();
    expect(result.status).toBe('ready');
    expect(result.position.layer).toBe('L1');
  });

  test('runNextLayer returns spawn config for L1', async () => {
    await ralph.initialize();
    const result = await ralph.runNextLayer();
    expect(result.status).toBe('spawn');
    expect(result.layerId).toBe('L1');
    expect(result.spawnConfig.agentType).toBe('planner');
  });

  test('onLayerComplete advances state on valid artifacts', async () => {
    await ralph.initialize();

    // Simulate L1 completion with artifacts on disk
    await createLayerArtifacts(projectDir, 'L1');
    const result = await ralph.onLayerComplete('L1', {});

    expect(result.status).toBe('advanced');
    expect(result.from).toBe('L1');
    expect(result.to).toBe('L2');
  });

  test('runLayerCycle completes one full cycle', async () => {
    await ralph.initialize();

    // Create artifacts before completion
    await createLayerArtifacts(projectDir, 'L1');

    const mockExecutor = jest.fn().mockResolvedValue({
      tokenUsage: { inputTokens: 100, outputTokens: 200 }
    });

    const result = await ralph.runLayerCycle(mockExecutor);

    expect(mockExecutor).toHaveBeenCalledTimes(1);
    expect(result.status).toBe('advanced');
    expect(result.from).toBe('L1');
    expect(result.to).toBe('L2');

    // Verify cost tracking
    const costs = ralph.costs.getSummary();
    expect(costs.totals.inputTokens).toBe(100);
    expect(costs.totals.outputTokens).toBe(200);
    expect(costs.totals.calls).toBe(1);
  });

  test('runs L1 through L7 planning layers sequentially', async () => {
    await ralph.initialize();

    // Pre-approve gates so advance() doesn't block
    await ralph.approveGate('L3');
    await ralph.approveGate('L7');

    const layersToRun = ['L1', 'L2', 'L3', 'L4', 'L5', 'L6', 'L7'];
    const transitions = [];

    for (const layerId of layersToRun) {
      // Create artifacts for current layer
      await createLayerArtifacts(projectDir, layerId);

      const mockExecutor = jest.fn().mockResolvedValue({});
      const result = await ralph.runLayerCycle(mockExecutor);

      transitions.push({ from: result.from, to: result.to, status: result.status });
      expect(result.status).toBe('advanced');
    }

    // Verify the chain L1->L2->L3->L4->L5->L6->L7->L8
    expect(transitions[0]).toMatchObject({ from: 'L1', to: 'L2' });
    expect(transitions[1]).toMatchObject({ from: 'L2', to: 'L3' });
    expect(transitions[2]).toMatchObject({ from: 'L3', to: 'L4' });
    expect(transitions[3]).toMatchObject({ from: 'L4', to: 'L5' });
    expect(transitions[4]).toMatchObject({ from: 'L5', to: 'L6' });
    expect(transitions[5]).toMatchObject({ from: 'L6', to: 'L7' });
    expect(transitions[6]).toMatchObject({ from: 'L7', to: 'L8' });
  });

  test('human gate blocks with gateTimeout', async () => {
    // With gateTimeout, gates return waiting_human until timeout expires
    const gatedRalph = new Ralph(projectDir, {
      autoApproveGates: false,
      gateTimeout: 60000,
      verbose: false,
      agentTimeout: 0,
      eventLog: false,
      notifications: false
    });

    await gatedRalph.initialize();

    // Advance to L3 (has human gate)
    await createLayerArtifacts(projectDir, 'L1');
    await gatedRalph.runLayerCycle(jest.fn().mockResolvedValue({}));
    await createLayerArtifacts(projectDir, 'L2');
    await gatedRalph.runLayerCycle(jest.fn().mockResolvedValue({}));

    // L3 should block on human gate (with gateTimeout, returns waiting_human)
    await createLayerArtifacts(projectDir, 'L3');
    const gateResult = await gatedRalph.runNextLayer();
    expect(gateResult.status).toBe('waiting_human');
    expect(gateResult.layerId).toBe('L3');

    // Approve the gate
    await gatedRalph.approveGate('L3');

    // Now L3 should proceed
    const result = await gatedRalph.runLayerCycle(jest.fn().mockResolvedValue({}));
    expect(result.status).toBe('advanced');
    expect(result.from).toBe('L3');
    expect(result.to).toBe('L4');
  });

  test('human gate auto-approves in non-TTY without gateTimeout', async () => {
    // Without gateTimeout, non-TTY stdin auto-approves (E2 interactive behavior)
    const gatedRalph = new Ralph(projectDir, {
      autoApproveGates: false,
      verbose: false,
      agentTimeout: 0,
      eventLog: false,
      notifications: false
    });

    await gatedRalph.initialize();

    // Advance to L3
    await createLayerArtifacts(projectDir, 'L1');
    await gatedRalph.runLayerCycle(jest.fn().mockResolvedValue({}));
    await createLayerArtifacts(projectDir, 'L2');
    await gatedRalph.runLayerCycle(jest.fn().mockResolvedValue({}));

    // L3 should auto-approve in non-TTY mode and proceed to spawn
    await createLayerArtifacts(projectDir, 'L3');
    const gateResult = await gatedRalph.runNextLayer();
    expect(gateResult.status).toBe('spawn');
    expect(gateResult.layerId).toBe('L3');
  });

  test('review layer with PASS advances forward', async () => {
    await ralph.initialize();

    // Fast-forward to L9 by manually setting state
    const state = await ralph.state.read();
    state.position.layer = 'L9';
    state.position.phase = 'review';
    state.position.agent = 'judge';
    await ralph.state.write();

    const mockExecutor = jest.fn().mockResolvedValue({
      reviewResult: {
        verdict: 'PASS',
        issues: []
      }
    });

    const result = await ralph.runLayerCycle(mockExecutor);
    expect(result.status).toBe('advance');
    expect(result.from).toBe('L9');
    expect(result.to).toBe('L10');
  });

  test('review layer with ITERATE cascades back', async () => {
    await ralph.initialize();

    // Fast-forward to L9
    const state = await ralph.state.read();
    state.position.layer = 'L9';
    state.position.phase = 'review';
    state.position.agent = 'judge';
    await ralph.state.write();

    const mockExecutor = jest.fn().mockResolvedValue({
      reviewResult: {
        verdict: 'ITERATE',
        issues: [{ title: 'Missing tests', severity: 'MINOR' }]
      }
    });

    const result = await ralph.runLayerCycle(mockExecutor);
    expect(result.status).toBe('cascade');
    expect(result.from).toBe('L9');
    expect(result.to).toBe('L8'); // MINOR at L9 cascades to L8
  });

  test('review layer MAJOR cascades further back', async () => {
    await ralph.initialize();

    // Fast-forward to L10
    const state = await ralph.state.read();
    state.position.layer = 'L10';
    state.position.phase = 'review';
    state.position.agent = 'judge';
    await ralph.state.write();

    const mockExecutor = jest.fn().mockResolvedValue({
      reviewResult: {
        verdict: 'ITERATE',
        issues: [{ title: 'Fundamental design flaw', severity: 'MAJOR' }]
      }
    });

    const result = await ralph.runLayerCycle(mockExecutor);
    expect(result.status).toBe('cascade');
    expect(result.from).toBe('L10');
    expect(result.to).toBe('L6'); // MAJOR at L10 cascades to L6
  });

  test('L12 advances to COMPLETE', async () => {
    await ralph.initialize();

    // Fast-forward to L12
    const state = await ralph.state.read();
    state.position.layer = 'L12';
    state.position.phase = 'learn';
    state.position.agent = 'planner';
    await ralph.state.write();

    await createLayerArtifacts(projectDir, 'L12');

    const mockExecutor = jest.fn().mockResolvedValue({});
    const result = await ralph.runLayerCycle(mockExecutor);

    expect(result.status).toBe('complete');
    expect(result.to).toBe('COMPLETE');

    // Verify the state is COMPLETE
    const finalState = await ralph.state.read();
    expect(finalState.position.layer).toBe('COMPLETE');
  });

  test('already complete project returns complete status', async () => {
    await ralph.initialize();

    // Set to COMPLETE
    const state = await ralph.state.read();
    state.position.layer = 'COMPLETE';
    await ralph.state.write();

    const result = await ralph.runNextLayer();
    expect(result.status).toBe('complete');
  });

  test('cost tracker accumulates across layers', async () => {
    await ralph.initialize();

    // Run L1
    await createLayerArtifacts(projectDir, 'L1');
    await ralph.runLayerCycle(jest.fn().mockResolvedValue({
      tokenUsage: { inputTokens: 500, outputTokens: 1000 }
    }));

    // Run L2
    await createLayerArtifacts(projectDir, 'L2');
    await ralph.runLayerCycle(jest.fn().mockResolvedValue({
      tokenUsage: { inputTokens: 800, outputTokens: 1500 }
    }));

    const costs = ralph.costs.getSummary();
    expect(costs.totals.inputTokens).toBe(1300);
    expect(costs.totals.outputTokens).toBe(2500);
    expect(costs.totals.calls).toBe(2);
    expect(costs.layers.L1.inputTokens).toBe(500);
    expect(costs.layers.L2.outputTokens).toBe(1500);
  });

  test('event handlers fire during layer cycle', async () => {
    await ralph.initialize();

    const events = [];
    ralph.on('onLayerStart', (data) => events.push({ type: 'start', ...data }));
    ralph.on('onLayerComplete', (data) => events.push({ type: 'complete', ...data }));
    ralph.on('onAgentSpawn', (data) => events.push({ type: 'spawn', agentType: data.agentType }));
    ralph.on('onCostUpdate', (data) => events.push({ type: 'cost', ...data }));

    await createLayerArtifacts(projectDir, 'L1');
    await ralph.runLayerCycle(jest.fn().mockResolvedValue({
      tokenUsage: { inputTokens: 100, outputTokens: 200 }
    }));

    expect(events.find(e => e.type === 'start')).toBeDefined();
    expect(events.find(e => e.type === 'spawn')).toBeDefined();
    expect(events.find(e => e.type === 'cost')).toBeDefined();
    expect(events.find(e => e.type === 'complete')).toBeDefined();
  });

  test('getStatus returns comprehensive project state', async () => {
    await ralph.initialize();

    const status = await ralph.getStatus();

    expect(status.position.layer).toBe('L1');
    expect(status.progress.completed).toBe(0);
    expect(status.progress.total).toBe(12);
    expect(status.gates).toBeDefined();
    expect(status.layer.name).toBe('Input');
    expect(status.costs).toBeDefined();
  });
});
