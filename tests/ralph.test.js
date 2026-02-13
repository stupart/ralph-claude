/**
 * Integration tests for Ralph orchestrator
 * Tests the full spawn -> execute -> validate -> route cycle with mocked agent executor.
 */

const fs = require('fs').promises;
const path = require('path');
const os = require('os');
const { Ralph } = require('../lib/ralph');
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

  test('runNextLayer blocks at human gate L3', async () => {
    const ralph = new Ralph(testDir, { verbose: false });
    await ralph.initialize();

    // Advance state to L3
    const state = await ralph.state.read();
    state.position.layer = 'L3';
    ralph.state.state = state;
    await ralph.state.write();

    const result = await ralph.runNextLayer();
    expect(result.status).toBe('waiting_human');
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
    const ralph = new Ralph(testDir, { verbose: false, agentTimeout: 100 });
    await ralph.initialize();

    const slowExecutor = () => new Promise(resolve => setTimeout(resolve, 5000));
    const result = await ralph.runLayerCycle(slowExecutor);
    expect(result.status).toBe('error');
    expect(result.error).toContain('timed out');
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
});
