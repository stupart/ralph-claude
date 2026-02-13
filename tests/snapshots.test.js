/**
 * Snapshot Tests for Prompt Assembly
 *
 * Captures the assembled prompt for each layer (L1-L12) and alerts
 * when prompts change unexpectedly. This prevents accidental prompt
 * regressions that could affect agent behavior.
 *
 * To update snapshots after intentional changes:
 *   npx jest tests/snapshots.test.js --updateSnapshot
 */

const { AgentSpawner, LAYER_CONTEXT, LAYER_AGENTS } = require('../lib/agent-spawner');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');

let TEST_ROOT;

beforeEach(async () => {
  TEST_ROOT = await fs.mkdtemp(path.join(os.tmpdir(), 'snap-test-'));
  const templatesDir = path.join(TEST_ROOT, 'templates', 'agents');
  await fs.mkdir(templatesDir, { recursive: true });
  await fs.writeFile(
    path.join(templatesDir, 'planner-base.md'),
    'You are a planner agent for the Layer Cake methodology.\n\n{{LAYER_INSTRUCTIONS}}'
  );
  await fs.writeFile(
    path.join(templatesDir, 'builder-base.md'),
    'You are a builder agent for the Layer Cake methodology.\n\n{{LAYER_INSTRUCTIONS}}'
  );
  await fs.writeFile(
    path.join(templatesDir, 'judge-base.md'),
    'You are a judge agent for the Layer Cake methodology.\n\n{{LAYER_INSTRUCTIONS}}'
  );
});

afterEach(async () => {
  await fs.rm(TEST_ROOT, { recursive: true, force: true });
});

describe('Prompt assembly snapshots', () => {
  // Test each layer's assembled prompt matches its snapshot
  const layers = ['L1', 'L2', 'L3', 'L4', 'L5', 'L6', 'L7', 'L8', 'L9', 'L10', 'L11', 'L12'];

  for (const layerId of layers) {
    test(`${layerId} prompt assembly matches snapshot`, async () => {
      const spawner = new AgentSpawner(TEST_ROOT);
      const config = await spawner.createSpawnConfig(layerId, {
        epic: 'test-epic',
        feature: 'test-feature',
        task: 'test-task',
        iteration: 1
      });

      // Snapshot the prompt (strip timestamps and paths that vary)
      const normalizedPrompt = config.prompt
        .replace(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d+Z/g, '<TIMESTAMP>')
        .replace(new RegExp(TEST_ROOT.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), '<PROJECT_ROOT>');

      expect(normalizedPrompt).toMatchSnapshot(`${layerId}-prompt`);
    });
  }
});

describe('Layer instructions snapshots', () => {
  const layers = ['L1', 'L2', 'L3', 'L4', 'L5', 'L6', 'L7', 'L8', 'L9', 'L10', 'L11', 'L12'];

  for (const layerId of layers) {
    test(`${layerId} layer instructions match snapshot`, () => {
      const spawner = new AgentSpawner(TEST_ROOT);
      const instructions = spawner.buildLayerInstructions(layerId, {
        epic: 'test-epic',
        feature: 'test-feature',
        task: 'test-task'
      });

      expect(instructions).toMatchSnapshot(`${layerId}-instructions`);
    });
  }
});

describe('Iteration learning prompt snapshot', () => {
  test('iteration learning section matches snapshot', () => {
    const spawner = new AgentSpawner(TEST_ROOT);
    const issues = [
      { title: 'Missing unit tests', severity: 'MINOR', description: 'Auth module needs tests' },
      { title: 'Wrong API design', severity: 'MAJOR' },
      { title: 'Security vulnerability', severity: 'ESCALATE', description: 'SQL injection in query builder' }
    ];

    const learning = spawner.buildIterationLearning(issues, 3);
    expect(learning).toMatchSnapshot('iteration-learning');
  });

  test('empty iteration learning matches snapshot', () => {
    const spawner = new AgentSpawner(TEST_ROOT);
    const learning = spawner.buildIterationLearning([], 1);
    expect(learning).toMatchSnapshot('iteration-learning-empty');
  });
});

describe('Context structure snapshots', () => {
  test('LAYER_CONTEXT configuration matches snapshot', () => {
    // Snapshot the full context configuration to catch changes
    expect(LAYER_CONTEXT).toMatchSnapshot('layer-context-config');
  });

  test('LAYER_AGENTS mapping matches snapshot', () => {
    expect(LAYER_AGENTS).toMatchSnapshot('layer-agents-mapping');
  });
});

describe('Tool permissions snapshots', () => {
  test('planner permissions match snapshot', () => {
    const spawner = new AgentSpawner(TEST_ROOT);
    const perms = spawner.getToolPermissions('planner');
    expect(perms).toMatchSnapshot('planner-permissions');
  });

  test('builder permissions match snapshot', () => {
    const spawner = new AgentSpawner(TEST_ROOT);
    const perms = spawner.getToolPermissions('builder');
    expect(perms).toMatchSnapshot('builder-permissions');
  });

  test('judge permissions match snapshot', () => {
    const spawner = new AgentSpawner(TEST_ROOT);
    const perms = spawner.getToolPermissions('judge');
    expect(perms).toMatchSnapshot('judge-permissions');
  });
});
