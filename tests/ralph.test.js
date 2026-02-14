/**
 * Integration tests for Ralph orchestrator
 * Tests the full spawn -> execute -> validate -> route cycle with mocked agent executor.
 */

const fs = require('fs').promises;
const path = require('path');
const os = require('os');
const { Ralph, CostTracker, LayerTimer } = require('../lib/ralph');
const { LAYERS } = require('../lib/state-machine');

const TEMPLATES_PATH = path.resolve(__dirname, '..', 'templates', 'agents');
let testDir;

beforeEach(async () => {
  testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ralph-test-'));
  // Copy templates to test dir so spawner can find them
  const templatesDir = path.join(testDir, 'templates', 'agents');
  await fs.mkdir(templatesDir, { recursive: true });
  const templateFiles = await fs.readdir(TEMPLATES_PATH);
  for (const f of templateFiles) {
    await fs.copyFile(path.join(TEMPLATES_PATH, f), path.join(templatesDir, f));
  }
});

afterEach(async () => {
  await fs.rm(testDir, { recursive: true, force: true });
});

/**
 * Helper: create a mock agent executor that writes artifacts and returns results
 */
function createMockExecutor(behavior = {}) {
  return async (spawnConfig) => {
    const layerId = spawnConfig.layerId;
    const action = behavior[layerId] || { verdict: 'PASS' };

    // Simulate writing artifacts for planning layers
    const folderMap = {
      L1: '1-input', L2: '2-decomposition', L3: '3-synthesis',
      L4: '4-epics', L5: '5-features', L6: '6-tasks', L7: '7-subtasks',
      L12: '8-analysis'
    };

    const folder = folderMap[layerId];
    if (folder) {
      const folderPath = path.join(testDir, folder);
      await fs.mkdir(folderPath, { recursive: true });
      await fs.writeFile(path.join(folderPath, 'output.md'), `# ${layerId} Output\n`);
    }

    if (action.verdict === 'ITERATE') {
      return {
        reviewResult: {
          verdict: 'ITERATE',
          issues: action.issues || [{ title: 'Test issue', severity: action.severity || 'MINOR' }]
        }
      };
    }

    return { reviewResult: action.verdict === 'PASS' ? { verdict: 'PASS', issues: [] } : undefined };
  };
}

/**
 * Helper: seed project with L1-L7 artifacts so L8+ can run
 */
async function seedProjectArtifacts(projectRoot) {
  const folders = ['1-input', '2-decomposition', '3-synthesis', '4-epics',
    '5-features/epic-1', '6-tasks/epic-1/feature-01', '7-subtasks/epic-1/feature-01', '8-analysis'];
  for (const folder of folders) {
    await fs.mkdir(path.join(projectRoot, folder), { recursive: true });
  }

  // Write minimal artifacts
  await fs.writeFile(path.join(projectRoot, '3-synthesis', 'jtbd.md'),
    '## Job 1\nTest\n## Job 2\nTest\n## Job 3\nTest\n');
  await fs.writeFile(path.join(projectRoot, '3-synthesis', 'journeys.md'),
    '## Journey 1\nTest\n## Journey 2\nTest\n');
  await fs.writeFile(path.join(projectRoot, '3-synthesis', 'architecture.md'),
    '## Decision 1\nTest\n');
  await fs.writeFile(path.join(projectRoot, '4-epics', 'epics.md'),
    '## Epic 1\nTest\n## Epic 2\nTest\n## Epic 3\nTest\n');
  await fs.writeFile(path.join(projectRoot, '5-features', 'epic-1', 'feature-01-test.md'),
    '# Feature\n## Overview\nTest\n## Requirements\nTest\n## Acceptance Criteria\n- [ ] Done\n## Planned Tasks\nTest\n');
  await fs.writeFile(path.join(projectRoot, '6-tasks', 'epic-1', 'feature-01', '_tasks.md'),
    '## Task 1\nTest\n## Task 2\nTest\n## Task 3\nTest\n');
  await fs.writeFile(path.join(projectRoot, '7-subtasks', 'epic-1', 'feature-01', 'task-01-test.md'),
    '## Subtask 1\nTest\n## Subtask 2\nTest\n');
}

describe('Ralph', () => {
  test('initializes with recovery and returns ready state', async () => {
    const ralph = new Ralph(testDir, { verbose: false });
    const result = await ralph.initialize();
    expect(result.status).toBe('ready');
    expect(result.position.layer).toBe('L1');
  });

  test('runNextLayer returns complete for COMPLETE state', async () => {
    const ralph = new Ralph(testDir, { verbose: false });
    await ralph.initialize();

    // Manually set to COMPLETE (simulating post-L12)
    ralph.state.state.position.layer = 'COMPLETE';
    await ralph.state.write();

    // Re-read state and try to run
    await ralph.state.read();
    const result = await ralph.runNextLayer();
    expect(result.status).toBe('complete');
  });

  test('runNextLayer returns spawn config for L1', async () => {
    const ralph = new Ralph(testDir, { verbose: false });
    await ralph.initialize();
    const result = await ralph.runNextLayer();
    expect(result.status).toBe('spawn');
    expect(result.layerId).toBe('L1');
    expect(result.spawnConfig.agentType).toBe('planner');
  });

  test('runNextLayer blocks at human gate L3 with gateTimeout', async () => {
    // With gateTimeout set, gates return waiting_human until timeout expires
    const ralph = new Ralph(testDir, { verbose: false, gateTimeout: 60000 });
    await ralph.initialize();

    // Advance state to L3
    const state = await ralph.state.read();
    state.position.layer = 'L3';
    ralph.state.state = state;
    await ralph.state.write();

    const result = await ralph.runNextLayer();
    expect(result.status).toBe('waiting_human');
  });

  test('runNextLayer auto-approves gate in non-TTY mode', async () => {
    // Without gateTimeout, non-TTY stdin auto-approves (E2 interactive gate behavior)
    const ralph = new Ralph(testDir, { verbose: false });
    await ralph.initialize();

    // Advance state to L3
    const state = await ralph.state.read();
    state.position.layer = 'L3';
    ralph.state.state = state;
    await ralph.state.write();

    const result = await ralph.runNextLayer();
    // Non-TTY auto-approves and proceeds to spawn
    expect(result.status).toBe('spawn');
  });

  test('runNextLayer proceeds after gate approval', async () => {
    const ralph = new Ralph(testDir, { verbose: false });
    await ralph.initialize();

    // Set to L3 with gate approved
    const state = await ralph.state.read();
    state.position.layer = 'L3';
    state.gates.L3 = { status: 'approved', approvedAt: new Date().toISOString() };
    ralph.state.state = state;
    await ralph.state.write();

    const result = await ralph.runNextLayer();
    expect(result.status).toBe('spawn');
    expect(result.layerId).toBe('L3');
  });

  test('runLayerCycle handles agent timeout', async () => {
    const ralph = new Ralph(testDir, { verbose: false, agentTimeout: 100, maxRetries: 0 });
    await ralph.initialize();

    const slowExecutor = () => new Promise(resolve => setTimeout(resolve, 5000));
    const result = await ralph.runLayerCycle(slowExecutor);
    expect(result.status).toBe('error');
    expect(result.error).toContain('timed out');
  });

  test('runLayerCycle provides abortSignal and registerProcess to executor', async () => {
    const ralph = new Ralph(testDir, { verbose: false, agentTimeout: 500 });
    await ralph.initialize();

    let receivedSignal = null;
    let receivedRegister = null;

    const executor = async (spawnConfig) => {
      receivedSignal = spawnConfig.abortSignal;
      receivedRegister = spawnConfig.registerProcess;

      const folderPath = path.join(testDir, '1-input');
      await fs.mkdir(folderPath, { recursive: true });
      await fs.writeFile(path.join(folderPath, 'output.md'), '# Output\n');
      return {};
    };

    await ralph.runLayerCycle(executor);

    expect(receivedSignal).toBeDefined();
    expect(receivedSignal).toBeInstanceOf(AbortSignal);
    expect(typeof receivedRegister).toBe('function');
  });

  test('runLayerCycle kills registered process on timeout', async () => {
    const ralph = new Ralph(testDir, { verbose: false, agentTimeout: 100, maxRetries: 0 });
    await ralph.initialize();

    const mockProcess = {
      killed: false,
      kill: jest.fn(function() { this.killed = true; })
    };

    const slowExecutor = (spawnConfig) => {
      spawnConfig.registerProcess(mockProcess);
      return new Promise(resolve => setTimeout(resolve, 5000));
    };

    const result = await ralph.runLayerCycle(slowExecutor);

    expect(result.status).toBe('error');
    expect(mockProcess.kill).toHaveBeenCalledWith('SIGTERM');
  });

  test('runLayerCycle fires abort signal on timeout', async () => {
    const ralph = new Ralph(testDir, { verbose: false, agentTimeout: 100, maxRetries: 0 });
    await ralph.initialize();

    let signalAborted = false;

    const slowExecutor = (spawnConfig) => {
      spawnConfig.abortSignal.addEventListener('abort', () => {
        signalAborted = true;
      });
      return new Promise(resolve => setTimeout(resolve, 5000));
    };

    await ralph.runLayerCycle(slowExecutor);
    expect(signalAborted).toBe(true);
  });

  test('runLayerCycle advances on successful execution', async () => {
    const ralph = new Ralph(testDir, { verbose: false });
    await ralph.initialize();

    const executor = createMockExecutor({ L1: { verdict: 'PASS' } });
    const result = await ralph.runLayerCycle(executor);
    expect(result.status).toBe('advanced');
    expect(result.from).toBe('L1');
    expect(result.to).toBe('L2');
  });

  test('runLayerCycle retries on crash then succeeds', async () => {
    const ralph = new Ralph(testDir, { verbose: false, maxRetries: 2 });
    await ralph.initialize();

    let attempts = 0;
    const executor = async (spawnConfig) => {
      attempts++;
      if (attempts < 2) {
        throw new Error('Agent crashed');
      }
      // Succeed on second attempt
      const folderPath = path.join(testDir, '1-input');
      await fs.mkdir(folderPath, { recursive: true });
      await fs.writeFile(path.join(folderPath, 'output.md'), '# Output\n');
      return {};
    };

    const result = await ralph.runLayerCycle(executor);
    expect(result.status).toBe('advanced');
    expect(attempts).toBe(2);
  });

  test('runLayerCycle exhausts retries and returns error', async () => {
    const ralph = new Ralph(testDir, { verbose: false, maxRetries: 2 });
    await ralph.initialize();

    let attempts = 0;
    const executor = async () => {
      attempts++;
      throw new Error('Always crashes');
    };

    const result = await ralph.runLayerCycle(executor);
    expect(result.status).toBe('error');
    expect(result.attempts).toBe(3); // 1 initial + 2 retries
    expect(attempts).toBe(3);
    expect(result.error).toContain('Always crashes');
  });

  test('runLayerCycle with maxRetries 0 fails immediately', async () => {
    const ralph = new Ralph(testDir, { verbose: false, maxRetries: 0 });
    await ralph.initialize();

    let attempts = 0;
    const executor = async () => {
      attempts++;
      throw new Error('Crash');
    };

    const result = await ralph.runLayerCycle(executor);
    expect(result.status).toBe('error');
    expect(attempts).toBe(1);
  });

  test('onLayerComplete routes ITERATE verdict correctly', async () => {
    const ralph = new Ralph(testDir, { verbose: false });
    await ralph.initialize();
    await seedProjectArtifacts(testDir);

    // Set to L9 review
    ralph.state.state.position.layer = 'L9';
    ralph.state.state.gates.L3 = { status: 'approved' };
    ralph.state.state.gates.L7 = { status: 'approved' };
    await ralph.state.write();

    const result = await ralph.onLayerComplete('L9', {
      reviewResult: {
        verdict: 'ITERATE',
        issues: [{ title: 'Missing test', severity: 'MINOR' }]
      }
    });

    expect(result.action).toBe('cascade');
    expect(result.to).toBe('L8'); // MINOR from L9 goes to L8
  });

  test('event handlers fire correctly', async () => {
    const ralph = new Ralph(testDir, { verbose: false });
    const events = [];

    ralph.on('onLayerStart', (data) => events.push({ type: 'start', ...data }));
    ralph.on('onAgentSpawn', (data) => events.push({ type: 'spawn', agentType: data.agentType }));

    await ralph.initialize();
    await ralph.runNextLayer();

    expect(events.length).toBe(2);
    expect(events[0].type).toBe('start');
    expect(events[1].type).toBe('spawn');
    expect(events[1].agentType).toBe('planner');
  });

  test('getEpicList reads feature directories', async () => {
    const ralph = new Ralph(testDir, { verbose: false });
    await seedProjectArtifacts(testDir);
    await fs.mkdir(path.join(testDir, '5-features', 'epic-2'), { recursive: true });

    const epics = await ralph.getEpicList();
    expect(epics).toContain('epic-1');
    expect(epics).toContain('epic-2');
    expect(epics.length).toBe(2);
  });

  test('getStatus returns current position and progress', async () => {
    const ralph = new Ralph(testDir, { verbose: false });
    await ralph.initialize();

    const status = await ralph.getStatus();
    expect(status.position.layer).toBe('L1');
    expect(status.progress.completed).toBe(0);
    expect(status.progress.total).toBe(12);
  });

  test('ensureProjectStructure creates all 8 folders including 8-analysis', async () => {
    const ralph = new Ralph(testDir, { verbose: false });
    await ralph.ensureProjectStructure();

    const expectedFolders = ['1-input', '2-decomposition', '3-synthesis', '4-epics',
      '5-features', '6-tasks', '7-subtasks', '8-analysis'];

    for (const folder of expectedFolders) {
      const stat = await fs.stat(path.join(testDir, folder));
      expect(stat.isDirectory()).toBe(true);
    }
  });

  test('runLayerCycle in dry-run mode returns spawn config without executing', async () => {
    const ralph = new Ralph(testDir, { verbose: false, dryRun: true });
    await ralph.initialize();

    let executorCalled = false;
    const executor = async () => {
      executorCalled = true;
      return {};
    };

    const result = await ralph.runLayerCycle(executor);
    expect(result.status).toBe('dry_run');
    expect(result.layerId).toBe('L1');
    expect(result.spawnConfig).toBeDefined();
    expect(result.spawnConfig.agentType).toBe('planner');
    expect(result.spawnConfig.prompt).toBeDefined();
    expect(result.spawnConfig.toolPermissions).toBeDefined();
    expect(result.spawnConfig.context).toBeDefined();
    expect(executorCalled).toBe(false);
  });

  test('dry-run mode does not modify state', async () => {
    const ralph = new Ralph(testDir, { verbose: false, dryRun: true });
    await ralph.initialize();

    const stateBefore = await ralph.state.read();
    const layerBefore = stateBefore.position.layer;

    const executor = async () => ({ });
    await ralph.runLayerCycle(executor);

    const stateAfter = await ralph.state.read();
    expect(stateAfter.position.layer).toBe(layerBefore);
  });

  test('getStatus includes cost summary', async () => {
    const ralph = new Ralph(testDir, { verbose: false });
    await ralph.initialize();

    const status = await ralph.getStatus();
    expect(status.costs).toBeDefined();
    expect(status.costs.totals.inputTokens).toBe(0);
    expect(status.costs.totals.outputTokens).toBe(0);
    expect(status.costs.totals.calls).toBe(0);
  });

  test('runLayerCycle records token usage from artifacts', async () => {
    const ralph = new Ralph(testDir, { verbose: false });
    await ralph.initialize();

    const costEvents = [];
    ralph.on('onCostUpdate', (data) => costEvents.push(data));

    const executor = async (spawnConfig) => {
      const folderMap = { L1: '1-input' };
      const folder = folderMap[spawnConfig.layerId];
      if (folder) {
        await fs.mkdir(path.join(testDir, folder), { recursive: true });
        await fs.writeFile(path.join(testDir, folder, 'output.md'), '# Output\n');
      }
      return {
        tokenUsage: { inputTokens: 1500, outputTokens: 800 }
      };
    };

    await ralph.runLayerCycle(executor);

    expect(costEvents).toHaveLength(1);
    expect(costEvents[0].layerId).toBe('L1');
    expect(costEvents[0].inputTokens).toBe(1500);
    expect(costEvents[0].outputTokens).toBe(800);

    const summary = ralph.costs.getSummary();
    expect(summary.layers.L1.inputTokens).toBe(1500);
    expect(summary.layers.L1.outputTokens).toBe(800);
    expect(summary.layers.L1.calls).toBe(1);
    expect(summary.totals.inputTokens).toBe(1500);
    expect(summary.totals.outputTokens).toBe(800);
  });
});

describe('CostTracker', () => {
  test('records and accumulates token usage', () => {
    const tracker = new CostTracker();
    tracker.record('L1', 1000, 500);
    tracker.record('L1', 200, 100);
    tracker.record('L2', 300, 150);

    const summary = tracker.getSummary();
    expect(summary.layers.L1.inputTokens).toBe(1200);
    expect(summary.layers.L1.outputTokens).toBe(600);
    expect(summary.layers.L1.calls).toBe(2);
    expect(summary.layers.L2.inputTokens).toBe(300);
    expect(summary.layers.L2.calls).toBe(1);
    expect(summary.totals.inputTokens).toBe(1500);
    expect(summary.totals.outputTokens).toBe(750);
    expect(summary.totals.calls).toBe(3);
  });

  test('reset clears all data', () => {
    const tracker = new CostTracker();
    tracker.record('L1', 1000, 500);
    tracker.reset();

    const summary = tracker.getSummary();
    expect(summary.totals.inputTokens).toBe(0);
    expect(summary.totals.calls).toBe(0);
    expect(Object.keys(summary.layers)).toHaveLength(0);
  });

  test('handles zero-token records', () => {
    const tracker = new CostTracker();
    tracker.record('L1');
    expect(tracker.getSummary().layers.L1.calls).toBe(1);
    expect(tracker.getSummary().layers.L1.inputTokens).toBe(0);
  });
});

describe('LayerTimer', () => {
  test('tracks start and end timestamps', () => {
    const timer = new LayerTimer();
    timer.start('L1');
    timer.end('L1');

    const summary = timer.getSummary();
    expect(summary.layers.L1).toBeDefined();
    expect(summary.layers.L1.runs).toBe(1);
    expect(summary.layers.L1.durationMs).toBeGreaterThanOrEqual(0);
    expect(summary.layers.L1.lastStartedAt).toBeDefined();
    expect(summary.layers.L1.lastEndedAt).toBeDefined();
  });

  test('accumulates duration across multiple runs', async () => {
    const timer = new LayerTimer();
    timer.start('L1');
    await new Promise(r => setTimeout(r, 10));
    timer.end('L1');

    timer.start('L1');
    await new Promise(r => setTimeout(r, 10));
    timer.end('L1');

    const summary = timer.getSummary();
    expect(summary.layers.L1.runs).toBe(2);
    expect(summary.layers.L1.durationMs).toBeGreaterThanOrEqual(15);
    expect(summary.totalDurationMs).toBeGreaterThanOrEqual(15);
  });

  test('end without start does nothing', () => {
    const timer = new LayerTimer();
    timer.end('L1'); // No start
    expect(timer.getSummary().totalDurationMs).toBe(0);
  });

  test('reset clears all data', () => {
    const timer = new LayerTimer();
    timer.start('L1');
    timer.end('L1');
    timer.reset();

    const summary = timer.getSummary();
    expect(Object.keys(summary.layers)).toHaveLength(0);
    expect(summary.totalDurationMs).toBe(0);
  });

  test('tracks multiple layers independently', () => {
    const timer = new LayerTimer();
    timer.start('L1');
    timer.end('L1');
    timer.start('L2');
    timer.end('L2');

    const summary = timer.getSummary();
    expect(summary.layers.L1).toBeDefined();
    expect(summary.layers.L2).toBeDefined();
    expect(summary.layers.L1.runs).toBe(1);
    expect(summary.layers.L2.runs).toBe(1);
  });
});

describe('Ralph iteration learning', () => {
  test('stores review issues for next builder iteration', async () => {
    const ralph = new Ralph(testDir, { verbose: false });
    await ralph.initialize();
    await seedProjectArtifacts(testDir);

    // Set to L9 review
    ralph.state.state.position.layer = 'L9';
    ralph.state.state.gates.L3 = { status: 'approved' };
    ralph.state.state.gates.L7 = { status: 'approved' };
    await ralph.state.write();

    const issues = [
      { title: 'Missing test', severity: 'MINOR' },
      { title: 'Bad naming', severity: 'MINOR' }
    ];

    await ralph.onLayerComplete('L9', {
      reviewResult: { verdict: 'ITERATE', issues }
    });

    // Previous issues should be stored
    expect(ralph._previousIterationIssues).toEqual(issues);
  });

  test('clears previous issues on PASS verdict', async () => {
    const ralph = new Ralph(testDir, { verbose: false });
    await ralph.initialize();
    await seedProjectArtifacts(testDir);

    // Store some previous issues
    ralph._previousIterationIssues = [{ title: 'Old issue', severity: 'MINOR' }];

    // Set to L9 review with PASS
    ralph.state.state.position.layer = 'L9';
    ralph.state.state.gates.L3 = { status: 'approved' };
    ralph.state.state.gates.L7 = { status: 'approved' };
    await ralph.state.write();

    await ralph.onLayerComplete('L9', {
      reviewResult: { verdict: 'PASS', issues: [] }
    });

    // Previous issues should be cleared
    expect(ralph._previousIterationIssues).toBeNull();
  });

  test('runNextLayer passes previous issues as handoff to spawner', async () => {
    const ralph = new Ralph(testDir, { verbose: false });
    await ralph.initialize();

    // Set previous issues
    ralph._previousIterationIssues = [
      { title: 'Fix alignment', severity: 'MINOR' }
    ];

    const result = await ralph.runNextLayer();
    expect(result.status).toBe('spawn');
    expect(result.spawnConfig.handoff).toBeDefined();
    expect(result.spawnConfig.handoff.previousIssues).toHaveLength(1);
    expect(result.spawnConfig.handoff.previousIssues[0].title).toBe('Fix alignment');
  });
});

describe('Ralph timing integration', () => {
  test('getStatus includes timing summary', async () => {
    const ralph = new Ralph(testDir, { verbose: false });
    await ralph.initialize();

    const status = await ralph.getStatus();
    expect(status.timings).toBeDefined();
    expect(status.timings.totalDurationMs).toBe(0);
    expect(status.timings.layers).toBeDefined();
  });

  test('runLayerCycle records layer timing', async () => {
    const ralph = new Ralph(testDir, { verbose: false });
    await ralph.initialize();

    const executor = createMockExecutor({ L1: { verdict: 'PASS' } });
    await ralph.runLayerCycle(executor);

    const summary = ralph.timings.getSummary();
    expect(summary.layers.L1).toBeDefined();
    expect(summary.layers.L1.runs).toBe(1);
    expect(summary.layers.L1.durationMs).toBeGreaterThanOrEqual(0);
    expect(summary.totalDurationMs).toBeGreaterThanOrEqual(0);
  });
});

describe('Ralph cascade depth limit', () => {
  test('cascade depth starts at 0', async () => {
    const ralph = new Ralph(testDir, { verbose: false });
    expect(ralph._cascadeDepth).toBe(0);
  });

  test('cascade depth increments on ITERATE', async () => {
    const ralph = new Ralph(testDir, { verbose: false, maxCascadeDepth: 10 });
    await ralph.initialize();
    await seedProjectArtifacts(testDir);

    ralph.state.state.position.layer = 'L9';
    ralph.state.state.gates.L3 = { status: 'approved' };
    ralph.state.state.gates.L7 = { status: 'approved' };
    await ralph.state.write();

    await ralph.onLayerComplete('L9', {
      reviewResult: { verdict: 'ITERATE', issues: [{ title: 'Fix', severity: 'MINOR' }] }
    });

    expect(ralph._cascadeDepth).toBe(1);
  });

  test('cascade depth resets on PASS', async () => {
    const ralph = new Ralph(testDir, { verbose: false });
    await ralph.initialize();
    await seedProjectArtifacts(testDir);

    ralph._cascadeDepth = 3;

    ralph.state.state.position.layer = 'L9';
    ralph.state.state.gates.L3 = { status: 'approved' };
    ralph.state.state.gates.L7 = { status: 'approved' };
    await ralph.state.write();

    await ralph.onLayerComplete('L9', {
      reviewResult: { verdict: 'PASS', issues: [] }
    });

    expect(ralph._cascadeDepth).toBe(0);
  });

  test('escalates to human when cascade depth exceeds limit', async () => {
    const ralph = new Ralph(testDir, { verbose: false, maxCascadeDepth: 2 });
    await ralph.initialize();
    await seedProjectArtifacts(testDir);

    ralph._cascadeDepth = 1; // Already at 1, limit is 2

    ralph.state.state.position.layer = 'L9';
    ralph.state.state.gates.L3 = { status: 'approved' };
    ralph.state.state.gates.L7 = { status: 'approved' };
    await ralph.state.write();

    const result = await ralph.onLayerComplete('L9', {
      reviewResult: { verdict: 'ITERATE', issues: [{ title: 'Fix', severity: 'MINOR' }] }
    });

    expect(result.status).toBe('human_required');
    expect(result.cascadeDepth).toBe(2);
    expect(result.reason).toContain('Cascade depth limit');
  });

  test('default maxCascadeDepth is 5', () => {
    const ralph = new Ralph(testDir, { verbose: false });
    expect(ralph.options.maxCascadeDepth).toBe(5);
  });

  test('custom maxCascadeDepth is respected', () => {
    const ralph = new Ralph(testDir, { verbose: false, maxCascadeDepth: 3 });
    expect(ralph.options.maxCascadeDepth).toBe(3);
  });

  test('fires onError event when cascade depth exceeded', async () => {
    const ralph = new Ralph(testDir, { verbose: false, maxCascadeDepth: 1 });
    await ralph.initialize();
    await seedProjectArtifacts(testDir);

    const errors = [];
    ralph.on('onError', (data) => errors.push(data));

    ralph.state.state.position.layer = 'L9';
    ralph.state.state.gates.L3 = { status: 'approved' };
    ralph.state.state.gates.L7 = { status: 'approved' };
    await ralph.state.write();

    await ralph.onLayerComplete('L9', {
      reviewResult: { verdict: 'ITERATE', issues: [{ title: 'Fix', severity: 'MINOR' }] }
    });

    expect(errors).toHaveLength(1);
    expect(errors[0].type).toBe('cascade_depth_exceeded');
  });
});

describe('Ralph gate timeout', () => {
  test('default gateTimeout is 0 (no timeout)', () => {
    const ralph = new Ralph(testDir, { verbose: false });
    expect(ralph.options.gateTimeout).toBe(0);
    expect(ralph.options.gateAutoApproveOnTimeout).toBe(false);
  });

  test('gate blocks normally when timeout not reached', async () => {
    const ralph = new Ralph(testDir, { verbose: false, gateTimeout: 60000 });
    await ralph.initialize();

    const state = await ralph.state.read();
    state.position.layer = 'L3';
    ralph.state.state = state;
    await ralph.state.write();

    const result = await ralph.runNextLayer();
    expect(result.status).toBe('waiting_human');
  });

  test('gate returns gate_timeout status when timeout exceeded', async () => {
    const ralph = new Ralph(testDir, { verbose: false, gateTimeout: 1 });
    await ralph.initialize();

    const state = await ralph.state.read();
    state.position.layer = 'L3';
    ralph.state.state = state;
    await ralph.state.write();

    // Set wait start in the past
    ralph._gateWaitStart.L3 = Date.now() - 100;

    const result = await ralph.runNextLayer();
    expect(result.status).toBe('gate_timeout');
    expect(result.layerId).toBe('L3');
    expect(result.message).toContain('timed out');
  });

  test('gate auto-approves on timeout with gateAutoApproveOnTimeout', async () => {
    const ralph = new Ralph(testDir, {
      verbose: false,
      gateTimeout: 1,
      gateAutoApproveOnTimeout: true
    });
    await ralph.initialize();

    const state = await ralph.state.read();
    state.position.layer = 'L3';
    ralph.state.state = state;
    await ralph.state.write();

    // Set wait start in the past
    ralph._gateWaitStart.L3 = Date.now() - 100;

    const result = await ralph.runNextLayer();
    // After auto-approval, should proceed to spawn
    expect(result.status).toBe('spawn');
    expect(result.layerId).toBe('L3');
  });

  test('fires onGateTimeout event', async () => {
    const ralph = new Ralph(testDir, { verbose: false, gateTimeout: 1 });
    await ralph.initialize();

    const events = [];
    ralph.on('onGateTimeout', (data) => events.push(data));

    const state = await ralph.state.read();
    state.position.layer = 'L3';
    ralph.state.state = state;
    await ralph.state.write();

    ralph._gateWaitStart.L3 = Date.now() - 100;
    await ralph.runNextLayer();

    expect(events).toHaveLength(1);
    expect(events[0].layerId).toBe('L3');
    expect(events[0].autoApproved).toBe(false);
  });

  test('gate wait start is tracked on first encounter', async () => {
    const ralph = new Ralph(testDir, { verbose: false, gateTimeout: 60000 });
    await ralph.initialize();

    const state = await ralph.state.read();
    state.position.layer = 'L3';
    ralph.state.state = state;
    await ralph.state.write();

    expect(ralph._gateWaitStart.L3).toBeUndefined();
    await ralph.runNextLayer();
    expect(ralph._gateWaitStart.L3).toBeDefined();
    expect(typeof ralph._gateWaitStart.L3).toBe('number');
  });
});
