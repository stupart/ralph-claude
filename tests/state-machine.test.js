/**
 * State Machine Tests (jest format)
 *
 * Tests for the Layer Cake state machine.
 * Converted from custom runner to jest in gen4.
 */

const { StateManager, LAYERS, LAYER_DEPS, LAYER_FOLDERS, DEFAULT_STATE, acquireLock, releaseLock } = require('../lib/state-machine');
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

    // BUG-002: must create artifacts before advancing
    const inputDir = path.join(TEST_ROOT, '1-input');
    await fs.mkdir(inputDir, { recursive: true });
    await fs.writeFile(path.join(inputDir, 'output.md'), '# L1');

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

    // BUG-002: must create artifacts before advancing from L3
    const synthDir = path.join(TEST_ROOT, '3-synthesis');
    await fs.mkdir(synthDir, { recursive: true });
    await fs.writeFile(path.join(synthDir, 'output.md'), '# Synthesis');

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

    // BUG-002: create artifacts for each layer before advancing
    await fs.mkdir(path.join(TEST_ROOT, '1-input'), { recursive: true });
    await fs.writeFile(path.join(TEST_ROOT, '1-input', 'out.md'), '# L1');
    await state.advance(); // L1 -> L2

    await fs.mkdir(path.join(TEST_ROOT, '2-decomposition'), { recursive: true });
    await fs.writeFile(path.join(TEST_ROOT, '2-decomposition', 'out.md'), '# L2');
    await state.advance(); // L2 -> L3

    expect(state.state.history.length).toBeGreaterThanOrEqual(2);
    expect(state.state.history[state.state.history.length - 1].action).toContain('Advanced');
  });
});

describe('BUG-002: validateLayerAdvancement', () => {
  test('blocks advance when artifacts folder is missing', async () => {
    const state = new StateManager(TEST_ROOT);
    await state.read();
    // L1 at start, no 1-input folder -> should fail to advance

    await expect(state.advance()).rejects.toThrow('BUG-002 guard');
  });

  test('blocks advance when artifacts folder is empty', async () => {
    const state = new StateManager(TEST_ROOT);
    await state.read();
    // Create empty folder
    await fs.mkdir(path.join(TEST_ROOT, '1-input'), { recursive: true });

    await expect(state.advance()).rejects.toThrow('BUG-002 guard');
  });

  test('allows advance when artifacts folder has content', async () => {
    const state = new StateManager(TEST_ROOT);
    await state.read();
    await fs.mkdir(path.join(TEST_ROOT, '1-input'), { recursive: true });
    await fs.writeFile(path.join(TEST_ROOT, '1-input', 'brain-dump.md'), '# Content');

    const result = await state.advance();
    expect(result.to).toBe('L2');
  });

  test('allows cascade (backward transition) without artifacts', async () => {
    const state = new StateManager(TEST_ROOT);
    await state.read();
    state.state.position.layer = 'L5';
    await state.write();

    // Cascade backward does not require artifacts
    const result = await state.cascade('L3');
    expect(result.to).toBe('L3');
  });
});

describe('File locking', () => {
  test('acquireLock creates lock file', async () => {
    const lockPath = path.join(TEST_ROOT, 'test.lock');
    await acquireLock(lockPath);

    const stat = await fs.stat(lockPath);
    expect(stat.isFile()).toBe(true);

    await releaseLock(lockPath);
  });

  test('releaseLock removes lock file', async () => {
    const lockPath = path.join(TEST_ROOT, 'test.lock');
    await acquireLock(lockPath);
    await releaseLock(lockPath);

    await expect(fs.stat(lockPath)).rejects.toThrow();
  });

  test('second acquireLock waits for release', async () => {
    const lockPath = path.join(TEST_ROOT, 'test.lock');
    await acquireLock(lockPath);

    // Release after 100ms
    setTimeout(() => releaseLock(lockPath), 100);

    const start = Date.now();
    await acquireLock(lockPath, { retryMs: 20, timeoutMs: 2000 });
    const elapsed = Date.now() - start;

    expect(elapsed).toBeGreaterThanOrEqual(50); // Had to wait
    await releaseLock(lockPath);
  });

  test('acquireLock throws on timeout', async () => {
    const lockPath = path.join(TEST_ROOT, 'test.lock');
    await acquireLock(lockPath);

    // Don't release — should timeout
    await expect(
      acquireLock(lockPath, { retryMs: 10, timeoutMs: 100, staleLockMs: 60000 })
    ).rejects.toThrow('Failed to acquire lock');

    await releaseLock(lockPath);
  });

  test('acquireLock breaks stale lock', async () => {
    const lockPath = path.join(TEST_ROOT, 'test.lock');
    // Write a stale lock (timestamp in the past)
    await fs.writeFile(lockPath, JSON.stringify({ pid: 99999, timestamp: Date.now() - 60000 }));

    // Should break the stale lock and succeed
    await acquireLock(lockPath, { staleLockMs: 1000 });
    await releaseLock(lockPath);
  });

  test('concurrent writes do not corrupt state', async () => {
    const state1 = new StateManager(TEST_ROOT);
    const state2 = new StateManager(TEST_ROOT);

    await state1.read();
    await state2.read();

    state1.state.meta.project = 'Writer 1';
    state2.state.meta.project = 'Writer 2';

    // Both write concurrently — locking ensures no corruption
    await Promise.all([
      state1.write(),
      state2.write()
    ]);

    // Read final state — should be one of the two, not corrupted
    const finalState = new StateManager(TEST_ROOT);
    const final = await finalState.read();
    expect(['Writer 1', 'Writer 2']).toContain(final.meta.project);

    // Lock file should be cleaned up
    await expect(fs.stat(path.join(TEST_ROOT, '_status.md.lock'))).rejects.toThrow();
  });
});

describe('LAYER_DEPS', () => {
  test('has entries for all 12 layers', () => {
    for (let i = 1; i <= 12; i++) {
      expect(LAYER_DEPS[`L${i}`]).toBeDefined();
      expect(Array.isArray(LAYER_DEPS[`L${i}`])).toBe(true);
    }
  });

  test('L1 has no dependencies', () => {
    expect(LAYER_DEPS.L1).toEqual([]);
  });

  test('L2 depends on L1', () => {
    expect(LAYER_DEPS.L2).toEqual(['L1']);
  });

  test('L3 depends on L1 and L2', () => {
    expect(LAYER_DEPS.L3).toEqual(['L1', 'L2']);
  });

  test('L8 depends on L7 (subtasks)', () => {
    expect(LAYER_DEPS.L8).toEqual(['L7']);
  });

  test('L9 depends on L5 and L7 (feature specs + subtasks)', () => {
    expect(LAYER_DEPS.L9).toContain('L5');
    expect(LAYER_DEPS.L9).toContain('L7');
  });

  test('all dependency references are valid layer IDs', () => {
    for (const [layerId, deps] of Object.entries(LAYER_DEPS)) {
      for (const dep of deps) {
        expect(LAYERS[dep]).toBeDefined();
      }
    }
  });

  test('no layer depends on itself', () => {
    for (const [layerId, deps] of Object.entries(LAYER_DEPS)) {
      expect(deps).not.toContain(layerId);
    }
  });

  test('no layer depends on a later layer', () => {
    for (const [layerId, deps] of Object.entries(LAYER_DEPS)) {
      const layerNum = parseInt(layerId.slice(1));
      for (const dep of deps) {
        const depNum = parseInt(dep.slice(1));
        expect(depNum).toBeLessThan(layerNum);
      }
    }
  });
});
