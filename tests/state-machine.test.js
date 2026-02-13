/**
 * State Machine Tests (jest format)
 *
 * Tests for the Layer Cake state machine.
 * Converted from custom runner to jest in gen4.
 */

const { StateManager, LAYERS, LAYER_FOLDERS, DEFAULT_STATE } = require('../lib/state-machine');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');

let TEST_ROOT;
let TEST_STATUS;

beforeEach(async () => {
  TEST_ROOT = await fs.mkdtemp(path.join(os.tmpdir(), 'sm-test-'));
  TEST_STATUS = path.join(TEST_ROOT, '_status.md');
});

afterEach(async () => {
  await fs.rm(TEST_ROOT, { recursive: true, force: true });
});

describe('StateManager', () => {
  test('initializes with default state when no file exists', async () => {
    const state = new StateManager(TEST_ROOT);
    const current = await state.read();

    expect(current.position.layer).toBe('L1');
    expect(current.position.agent).toBe('planner');
  });

  test('writes and reads state correctly', async () => {
    const state = new StateManager(TEST_ROOT);
    await state.read();

    state.state.meta.project = 'Test Project';
    await state.write();

    const state2 = new StateManager(TEST_ROOT);
    const current = await state2.read();

    expect(current.meta.project).toBe('Test Project');
  });

  test('advance() moves to next layer', async () => {
    const state = new StateManager(TEST_ROOT);
    await state.read();

    const result = await state.advance();

    expect(result.to).toBe('L2');
    expect(state.state.position.layer).toBe('L2');
    expect(state.state.position.iteration).toBe(1);
  });

  test('iterate() increments iteration count', async () => {
    const state = new StateManager(TEST_ROOT);
    await state.read();

    const result1 = await state.iterate();
    expect(result1.iteration).toBe(2);

    const result2 = await state.iterate();
    expect(result2.iteration).toBe(3);
  });

  test('cascade() moves to specified layer', async () => {
    const state = new StateManager(TEST_ROOT);
    await state.read();

    state.state.position.layer = 'L5';
    await state.write();

    const result = await state.cascade('L3');

    expect(result.to).toBe('L3');
    expect(state.state.position.layer).toBe('L3');
    expect(state.state.position.iteration).toBe(1);
  });

  test('approveGate() marks gate as approved', async () => {
    const state = new StateManager(TEST_ROOT);
    await state.read();

    await state.approveGate('L3');

    expect(state.state.gates.L3.status).toBe('approved');
    expect(state.state.gates.L3.approvedAt).not.toBeNull();
  });

  test('getCurrentLayer() returns correct layer info', async () => {
    const state = new StateManager(TEST_ROOT);
    await state.read();

    state.state.position.layer = 'L8';
    const layer = state.getCurrentLayer();

    expect(layer.id).toBe('L8');
    expect(layer.name).toBe('Build');
    expect(layer.agent).toBe('builder');
  });

  test('isLayerComplete() returns correct status', async () => {
    const state = new StateManager(TEST_ROOT);
    await state.read();

    state.state.position.layer = 'L5';
    await state.write();

    expect(state.isLayerComplete('L3')).toBe(true);
    expect(state.isLayerComplete('L5')).toBe(false);
    expect(state.isLayerComplete('L7')).toBe(false);
  });

  test('getProgress() returns correct progress', async () => {
    const state = new StateManager(TEST_ROOT);
    await state.read();

    state.state.position.layer = 'L7';
    const progress = state.getProgress();

    expect(progress.completed).toBe(6);
    expect(progress.total).toBe(12);
    expect(progress.percentage).toBe(50);
  });

  test('human gate blocks advance without approval', async () => {
    const state = new StateManager(TEST_ROOT);
    await state.read();

    state.state.position.layer = 'L3';
    state.state.gates = { L3: { status: 'pending' } };
    await state.write();

    const result = await state.advance();

    expect(result.action).toBe('waiting_human');
    expect(result.gate).toBe(true);
  });

  test('human gate allows advance after approval', async () => {
    const state = new StateManager(TEST_ROOT);
    await state.read();

    state.state.position.layer = 'L3';
    state.state.gates = { L3: { status: 'approved', approvedAt: new Date().toISOString() } };
    await state.write();

    const result = await state.advance();

    expect(result.action).toBe('advance');
    expect(result.to).toBe('L4');
  });
});

describe('LAYERS constant', () => {
  test('has all 12 layers', () => {
    const layerIds = Object.keys(LAYERS);
    expect(layerIds).toHaveLength(12);
    expect(layerIds).toContain('L1');
    expect(layerIds).toContain('L12');
  });
});

describe('LAYER_FOLDERS', () => {
  test('maps correctly', () => {
    expect(LAYER_FOLDERS.L1).toBe('1-input');
    expect(LAYER_FOLDERS.L4).toBe('4-epics');
    expect(LAYER_FOLDERS.L8).toBeNull();
  });
});

describe('history', () => {
  test('is maintained across operations', async () => {
    const state = new StateManager(TEST_ROOT);
    await state.read();

    await state.advance();
    await state.advance();

    expect(state.state.history.length).toBeGreaterThanOrEqual(2);
    expect(state.state.history[state.state.history.length - 1].action).toContain('Advanced');
  });
});
