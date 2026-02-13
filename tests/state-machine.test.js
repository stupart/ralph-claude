/**
 * State Machine Tests
 *
 * Tests for the Layer Cake state machine.
 * Run with: node tests/state-machine.test.js
 */

const { StateManager, LAYERS, LAYER_FOLDERS, DEFAULT_STATE } = require('../lib/state-machine');
const fs = require('fs').promises;
const path = require('path');

// Test project root (use a temp directory for testing)
const TEST_ROOT = path.join(__dirname, '.test-project');
const TEST_STATUS = path.join(TEST_ROOT, '_status.md');

// Simple test framework
let passed = 0;
let failed = 0;

function test(name, fn) {
  return async () => {
    try {
      await fn();
      console.log(`  ✓ ${name}`);
      passed++;
    } catch (err) {
      console.log(`  ✗ ${name}`);
      console.log(`    Error: ${err.message}`);
      failed++;
    }
  };
}

function assert(condition, message) {
  if (!condition) throw new Error(message || 'Assertion failed');
}

async function setup() {
  // Create test directory
  await fs.mkdir(TEST_ROOT, { recursive: true });
}

async function cleanup() {
  // Remove test directory
  try {
    await fs.rm(TEST_ROOT, { recursive: true, force: true });
  } catch {}
}

// ============= Tests =============

const tests = [
  test('StateManager initializes with default state when no file exists', async () => {
    const state = new StateManager(TEST_ROOT);
    const current = await state.read();

    assert(current.position.layer === 'L1', 'Should start at L1');
    assert(current.position.agent === 'planner', 'L1 should use planner');
  }),

  test('StateManager writes and reads state correctly', async () => {
    const state = new StateManager(TEST_ROOT);
    await state.read();

    state.state.meta.project = 'Test Project';
    await state.write();

    // Read again
    const state2 = new StateManager(TEST_ROOT);
    const current = await state2.read();

    assert(current.meta.project === 'Test Project', 'Project name should persist');
  }),

  test('advance() moves to next layer', async () => {
    const state = new StateManager(TEST_ROOT);
    await state.read();

    const result = await state.advance();

    assert(result.to === 'L2', 'Should advance to L2');
    assert(state.state.position.layer === 'L2', 'Position should be L2');
    assert(state.state.position.iteration === 1, 'Iteration should reset to 1');
  }),

  test('iterate() increments iteration count', async () => {
    const state = new StateManager(TEST_ROOT);
    await state.read();

    const result1 = await state.iterate();
    assert(result1.iteration === 2, 'First iterate should go to 2');

    const result2 = await state.iterate();
    assert(result2.iteration === 3, 'Second iterate should go to 3');
  }),

  test('cascade() moves to specified layer', async () => {
    const state = new StateManager(TEST_ROOT);
    await state.read();

    // Move to L5 first
    state.state.position.layer = 'L5';
    await state.write();

    const result = await state.cascade('L3');

    assert(result.to === 'L3', 'Should cascade to L3');
    assert(state.state.position.layer === 'L3', 'Position should be L3');
    assert(state.state.position.iteration === 1, 'Iteration should reset');
  }),

  test('approveGate() marks gate as approved', async () => {
    const state = new StateManager(TEST_ROOT);
    await state.read();

    await state.approveGate('L3');

    assert(state.state.gates.L3.status === 'approved', 'Gate should be approved');
    assert(state.state.gates.L3.approvedAt !== null, 'Should have approval timestamp');
  }),

  test('getCurrentLayer() returns correct layer info', async () => {
    const state = new StateManager(TEST_ROOT);
    await state.read();

    state.state.position.layer = 'L8';
    const layer = state.getCurrentLayer();

    assert(layer.id === 'L8', 'Layer ID should be L8');
    assert(layer.name === 'Build', 'Layer name should be Build');
    assert(layer.agent === 'builder', 'Agent should be builder');
  }),

  test('isLayerComplete() returns correct status', async () => {
    const state = new StateManager(TEST_ROOT);
    await state.read();

    state.state.position.layer = 'L5';
    await state.write();

    assert(state.isLayerComplete('L3') === true, 'L3 should be complete when at L5');
    assert(state.isLayerComplete('L5') === false, 'L5 should not be complete when at L5');
    assert(state.isLayerComplete('L7') === false, 'L7 should not be complete when at L5');
  }),

  test('getProgress() returns correct progress', async () => {
    const state = new StateManager(TEST_ROOT);
    await state.read();

    state.state.position.layer = 'L7';
    const progress = state.getProgress();

    assert(progress.completed === 6, 'Should have 6 layers complete');
    assert(progress.total === 12, 'Total should be 12');
    assert(progress.percentage === 50, 'Should be 50% complete');
  }),

  test('human gate blocks advance without approval', async () => {
    const state = new StateManager(TEST_ROOT);
    await state.read();

    // Move to L3 (which has a human gate)
    state.state.position.layer = 'L3';
    state.state.gates = { L3: { status: 'pending' } };
    await state.write();

    const result = await state.advance();

    assert(result.action === 'waiting_human', 'Should be waiting for human');
    assert(result.gate === true, 'Should indicate gate');
  }),

  test('human gate allows advance after approval', async () => {
    const state = new StateManager(TEST_ROOT);
    await state.read();

    // Move to L3 and approve gate
    state.state.position.layer = 'L3';
    state.state.gates = { L3: { status: 'approved', approvedAt: new Date().toISOString() } };
    await state.write();

    const result = await state.advance();

    assert(result.action === 'advance', 'Should advance');
    assert(result.to === 'L4', 'Should advance to L4');
  }),

  test('LAYERS constant has all 12 layers', async () => {
    const layerIds = Object.keys(LAYERS);
    assert(layerIds.length === 12, 'Should have 12 layers');
    assert(layerIds.includes('L1') && layerIds.includes('L12'), 'Should have L1 and L12');
  }),

  test('LAYER_FOLDERS maps correctly', async () => {
    assert(LAYER_FOLDERS.L1 === '1-input', 'L1 should map to 1-input');
    assert(LAYER_FOLDERS.L4 === '4-epics', 'L4 should map to 4-epics');
    assert(LAYER_FOLDERS.L8 === null, 'L8 should have no folder');
  }),

  test('history is maintained', async () => {
    const state = new StateManager(TEST_ROOT);
    await state.read();

    await state.advance();
    await state.advance();

    assert(state.state.history.length >= 2, 'Should have at least 2 history entries');
    assert(state.state.history[state.state.history.length - 1].action.includes('Advanced'), 'Last entry should be advance');
  })
];

// ============= Run Tests =============

async function runTests() {
  console.log('\nState Machine Tests');
  console.log('===================\n');

  await setup();

  for (const testFn of tests) {
    // Reset state between tests
    try {
      await fs.unlink(TEST_STATUS);
    } catch {}

    await testFn();
  }

  await cleanup();

  console.log(`\nResults: ${passed} passed, ${failed} failed\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Test runner error:', err);
  process.exit(1);
});
