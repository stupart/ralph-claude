/**
 * Performance Benchmark Tests
 *
 * Measures critical path performance to catch regressions:
 * - Prompt assembly time (<50ms)
 * - State read/write time (<10ms each)
 * - Validation time (<20ms)
 *
 * Uses Date.now() for measurement. Thresholds are generous to
 * account for CI variance but tight enough to catch O(n^2) regressions.
 */

const { AgentSpawner, LAYER_CONTEXT } = require('../lib/agent-spawner');
const { StateManager, LAYERS } = require('../lib/state-machine');
const { Validator } = require('../lib/validator');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');

let TEST_ROOT;

beforeEach(async () => {
  TEST_ROOT = await fs.mkdtemp(path.join(os.tmpdir(), 'bench-test-'));
  // Create templates
  const templatesDir = path.join(TEST_ROOT, 'templates', 'agents');
  await fs.mkdir(templatesDir, { recursive: true });
  await fs.writeFile(path.join(templatesDir, 'planner-base.md'), 'You are a planner.\n{{LAYER_INSTRUCTIONS}}');
  await fs.writeFile(path.join(templatesDir, 'builder-base.md'), 'You are a builder.\n{{LAYER_INSTRUCTIONS}}');
  await fs.writeFile(path.join(templatesDir, 'judge-base.md'), 'You are a judge.\n{{LAYER_INSTRUCTIONS}}');
});

afterEach(async () => {
  await fs.rm(TEST_ROOT, { recursive: true, force: true });
});

describe('Prompt assembly benchmarks', () => {
  test('createSpawnConfig completes in <50ms for planning layers', async () => {
    const spawner = new AgentSpawner(TEST_ROOT);

    const start = Date.now();
    await spawner.createSpawnConfig('L4', { epic: null, feature: null });
    const elapsed = Date.now() - start;

    expect(elapsed).toBeLessThan(50);
  });

  test('createSpawnConfig completes in <50ms for builder layer', async () => {
    const spawner = new AgentSpawner(TEST_ROOT);

    const start = Date.now();
    await spawner.createSpawnConfig('L8', { epic: 'epic-1', feature: 'feature-01', task: 'task-01' });
    const elapsed = Date.now() - start;

    expect(elapsed).toBeLessThan(50);
  });

  test('createSpawnConfig completes in <50ms for judge layer', async () => {
    const spawner = new AgentSpawner(TEST_ROOT);

    const start = Date.now();
    await spawner.createSpawnConfig('L9', { epic: 'epic-1', feature: 'feature-01' });
    const elapsed = Date.now() - start;

    expect(elapsed).toBeLessThan(50);
  });

  test('buildLayerInstructions completes in <5ms for each layer', () => {
    const spawner = new AgentSpawner(TEST_ROOT);

    for (const layerId of Object.keys(LAYERS)) {
      const start = Date.now();
      spawner.buildLayerInstructions(layerId, { epic: 'e1', feature: 'f1', task: 't1' });
      const elapsed = Date.now() - start;
      expect(elapsed).toBeLessThan(5);
    }
  });

  test('cached prompt loading is faster than first load', async () => {
    const spawner = new AgentSpawner(TEST_ROOT);

    // First load (cache miss)
    const start1 = Date.now();
    await spawner.loadPromptTemplate('planner');
    const elapsed1 = Date.now() - start1;

    // Second load (cache hit)
    const start2 = Date.now();
    await spawner.loadPromptTemplate('planner');
    const elapsed2 = Date.now() - start2;

    // Cache hit should be faster or at most the same
    expect(elapsed2).toBeLessThanOrEqual(elapsed1 + 1);
  });

  test('prompt assembly with iteration learning completes in <50ms', async () => {
    const spawner = new AgentSpawner(TEST_ROOT);
    const handoff = {
      previousIssues: [
        { title: 'Issue 1', severity: 'MINOR', description: 'Fix this' },
        { title: 'Issue 2', severity: 'MAJOR', description: 'Fix that' },
        { title: 'Issue 3', severity: 'ESCALATE', description: 'Rethink this' }
      ],
      iterationNumber: 3
    };

    const start = Date.now();
    await spawner.createSpawnConfig('L8', { epic: 'e1' }, handoff);
    const elapsed = Date.now() - start;

    expect(elapsed).toBeLessThan(50);
  });
});

describe('State read/write benchmarks', () => {
  test('state read completes in <10ms (new state)', async () => {
    const state = new StateManager(TEST_ROOT);

    const start = Date.now();
    await state.read();
    const elapsed = Date.now() - start;

    expect(elapsed).toBeLessThan(10);
  });

  test('state write completes in <10ms', async () => {
    const state = new StateManager(TEST_ROOT);
    await state.read();

    const start = Date.now();
    await state.write();
    const elapsed = Date.now() - start;

    expect(elapsed).toBeLessThan(10);
  });

  test('state read from existing file completes in <10ms', async () => {
    // Write first
    const state1 = new StateManager(TEST_ROOT);
    await state1.read();
    await state1.write();

    // Read from disk
    const state2 = new StateManager(TEST_ROOT);
    const start = Date.now();
    await state2.read();
    const elapsed = Date.now() - start;

    expect(elapsed).toBeLessThan(10);
  });

  test('advance operation completes in <15ms', async () => {
    const state = new StateManager(TEST_ROOT);
    await state.read();

    // Create artifacts for BUG-002
    await fs.mkdir(path.join(TEST_ROOT, '1-input'), { recursive: true });
    await fs.writeFile(path.join(TEST_ROOT, '1-input', 'out.md'), '# L1');

    const start = Date.now();
    await state.advance();
    const elapsed = Date.now() - start;

    expect(elapsed).toBeLessThan(15);
  });

  test('iterate operation completes in <10ms', async () => {
    const state = new StateManager(TEST_ROOT);
    await state.read();

    const start = Date.now();
    await state.iterate();
    const elapsed = Date.now() - start;

    expect(elapsed).toBeLessThan(10);
  });

  test('cascade operation completes in <10ms', async () => {
    const state = new StateManager(TEST_ROOT);
    await state.read();
    state.state.position.layer = 'L5';
    await state.write();

    const start = Date.now();
    await state.cascade('L3');
    const elapsed = Date.now() - start;

    expect(elapsed).toBeLessThan(10);
  });
});

describe('Validation benchmarks', () => {
  test('validateLayer completes in <20ms for layers without rules', async () => {
    const validator = new Validator(TEST_ROOT, 'small');

    const start = Date.now();
    await validator.validateLayer('L1');
    const elapsed = Date.now() - start;

    expect(elapsed).toBeLessThan(20);
  });

  test('validateLayer completes in <20ms for L3 synthesis', async () => {
    // Create synthesis artifacts
    const synthDir = path.join(TEST_ROOT, '3-synthesis');
    await fs.mkdir(synthDir, { recursive: true });
    await fs.writeFile(path.join(synthDir, 'jtbd.md'), '## Job 1\nTest\n## Job 2\nTest\n## Job 3\nTest');
    await fs.writeFile(path.join(synthDir, 'journeys.md'), '## Journey 1\nTest\n## Journey 2\nTest');
    await fs.writeFile(path.join(synthDir, 'architecture.md'), '## Decision 1\nTest');

    const validator = new Validator(TEST_ROOT, 'small');

    const start = Date.now();
    await validator.validateLayer('L3');
    const elapsed = Date.now() - start;

    expect(elapsed).toBeLessThan(20);
  });

  test('countMarkdownItems completes in <5ms for typical content', () => {
    const validator = new Validator(TEST_ROOT, 'small');
    const content = Array.from({ length: 20 }, (_, i) => `## Epic ${i + 1}\nDescription here.`).join('\n\n');

    const start = Date.now();
    validator.countMarkdownItems(content, 'epic');
    const elapsed = Date.now() - start;

    expect(elapsed).toBeLessThan(5);
  });

  test('hasSection completes in <2ms', () => {
    const validator = new Validator(TEST_ROOT, 'small');
    const content = '# Feature\n## Overview\nTest\n## Requirements\nTest\n## Acceptance Criteria\n- [ ] Done';

    const start = Date.now();
    validator.hasSection(content, 'overview');
    validator.hasSection(content, 'requirements');
    validator.hasSection(content, 'acceptance criteria');
    const elapsed = Date.now() - start;

    expect(elapsed).toBeLessThan(2);
  });
});

describe('Context budget estimation benchmarks', () => {
  test('estimateContextBudget completes in <5ms', () => {
    const spawner = new AgentSpawner(TEST_ROOT);
    const config = {
      prompt: 'x'.repeat(10000),
      model: 'opus',
      context: { files: Array.from({ length: 20 }, (_, i) => `file-${i}.md`) },
      handoff: { previousIssues: [{ title: 'test', severity: 'MINOR' }] }
    };

    const start = Date.now();
    spawner.estimateContextBudget(config);
    const elapsed = Date.now() - start;

    expect(elapsed).toBeLessThan(5);
  });
});
