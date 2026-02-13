/**
 * Recovery Manager Tests (jest format)
 *
 * Tests for the Layer Cake recovery module.
 * Converted from custom runner to jest in gen4.
 */

const { RecoveryManager, SCAN_FOLDERS } = require('../lib/recovery');
const { StateManager, createDefaultState } = require('../lib/state-machine');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');

let TEST_ROOT;

beforeEach(async () => {
  TEST_ROOT = await fs.mkdtemp(path.join(os.tmpdir(), 'recovery-test-'));
});

afterEach(async () => {
  await fs.rm(TEST_ROOT, { recursive: true, force: true });
});

/**
 * Helper to create layer folders with content
 */
async function createLayerFolders(layers) {
  for (const layerId of layers) {
    const folder = SCAN_FOLDERS[layerId];
    if (folder) {
      const folderPath = path.join(TEST_ROOT, folder);
      await fs.mkdir(folderPath, { recursive: true });
      await fs.writeFile(path.join(folderPath, 'artifact.md'), `# ${layerId} Artifact`);
    }
  }
}

/**
 * Helper to write a status file at a given layer
 */
async function writeStatusAt(layer) {
  const sm = new StateManager(TEST_ROOT);
  await sm.read();
  sm.state.position.layer = layer;
  await sm.write();
}

describe('scanFilesystem', () => {
  test('detects existing folders', async () => {
    await createLayerFolders(['L1', 'L2']);

    const rm = new RecoveryManager(TEST_ROOT);
    const scan = await rm.scanFilesystem();

    expect(scan.L1.exists).toBe(true);
    expect(scan.L1.hasContent).toBe(true);
    expect(scan.L2.exists).toBe(true);
    expect(scan.L3.exists).toBe(false);
  });

  test('detects empty folders', async () => {
    const emptyFolder = path.join(TEST_ROOT, '1-input');
    await fs.mkdir(emptyFolder, { recursive: true });

    const rm = new RecoveryManager(TEST_ROOT);
    const scan = await rm.scanFilesystem();

    expect(scan.L1.exists).toBe(true);
    expect(scan.L1.hasContent).toBe(false);
  });
});

describe('inferLayerFromFilesystem', () => {
  test('returns L1 for empty project', async () => {
    const rm = new RecoveryManager(TEST_ROOT);
    const scan = await rm.scanFilesystem();
    const layer = rm.inferLayerFromFilesystem(scan);
    expect(layer).toBe('L1');
  });

  test('infers next layer after completed ones', async () => {
    await createLayerFolders(['L1', 'L2', 'L3']);

    const rm = new RecoveryManager(TEST_ROOT);
    const scan = await rm.scanFilesystem();
    const layer = rm.inferLayerFromFilesystem(scan);
    expect(layer).toBe('L4');
  });

  test('stops at gap', async () => {
    // L1 exists, L2 missing, L3 exists - should stop at L2
    await createLayerFolders(['L1', 'L3']);

    const rm = new RecoveryManager(TEST_ROOT);
    const scan = await rm.scanFilesystem();
    const layer = rm.inferLayerFromFilesystem(scan);
    expect(layer).toBe('L2');
  });
});

describe('reconcile', () => {
  test('detects no mismatches when consistent', async () => {
    await createLayerFolders(['L1', 'L2']);
    await writeStatusAt('L3');

    const rm = new RecoveryManager(TEST_ROOT);
    const plan = await rm.reconcile();

    expect(plan.needsRecovery).toBe(false);
    expect(plan.mismatches).toHaveLength(0);
  });

  test('detects missing status file', async () => {
    await createLayerFolders(['L1', 'L2']);
    // No status file

    const rm = new RecoveryManager(TEST_ROOT);
    const plan = await rm.reconcile();

    expect(plan.needsRecovery).toBe(true);
    expect(plan.mismatches.some(m => m.type === 'missing_status')).toBe(true);
    expect(plan.actions.some(a => a.type === 'create_status')).toBe(true);
  });

  test('detects status ahead of filesystem', async () => {
    await createLayerFolders(['L1']); // Only L1 on disk
    await writeStatusAt('L5'); // Status says L5

    const rm = new RecoveryManager(TEST_ROOT);
    const plan = await rm.reconcile();

    expect(plan.needsRecovery).toBe(true);
    expect(plan.mismatches.some(m => m.type === 'status_ahead')).toBe(true);
  });

  test('detects status behind filesystem', async () => {
    await createLayerFolders(['L1', 'L2', 'L3', 'L4']); // L1-L4 on disk
    await writeStatusAt('L2'); // Status says L2

    const rm = new RecoveryManager(TEST_ROOT);
    const plan = await rm.reconcile();

    expect(plan.needsRecovery).toBe(true);
    expect(plan.mismatches.some(m => m.type === 'status_behind')).toBe(true);
  });
});

describe('resume', () => {
  test('returns no-op when consistent', async () => {
    await createLayerFolders(['L1']);
    await writeStatusAt('L2');

    const rm = new RecoveryManager(TEST_ROOT);
    const result = await rm.resume();

    expect(result.recovered).toBe(false);
  });

  test('creates status file when missing', async () => {
    await createLayerFolders(['L1', 'L2', 'L3']);
    // No status file

    const rm = new RecoveryManager(TEST_ROOT);
    const result = await rm.resume();

    expect(result.recovered).toBe(true);

    const sm = new StateManager(TEST_ROOT);
    const state = await sm.read();
    expect(state.position.layer).toBe('L4');
  });

  test('advances status to match filesystem', async () => {
    await createLayerFolders(['L1', 'L2', 'L3', 'L4']);
    await writeStatusAt('L2');

    const rm = new RecoveryManager(TEST_ROOT);
    const result = await rm.resume();

    expect(result.recovered).toBe(true);

    const sm = new StateManager(TEST_ROOT);
    const state = await sm.read();
    expect(state.position.layer).toBe('L5');
  });
});

describe('cleanStart', () => {
  test('resets to L1', async () => {
    await createLayerFolders(['L1', 'L2', 'L3']);
    await writeStatusAt('L5');

    const rm = new RecoveryManager(TEST_ROOT);
    const result = await rm.cleanStart();

    expect(result.reset).toBe(true);
    expect(result.layer).toBe('L1');

    const sm = new StateManager(TEST_ROOT);
    const state = await sm.read();
    expect(state.position.layer).toBe('L1');
  });

  test('preserves filesystem artifacts', async () => {
    await createLayerFolders(['L1', 'L2', 'L3']);
    await writeStatusAt('L4');

    const rm = new RecoveryManager(TEST_ROOT);
    await rm.cleanStart();

    const stat1 = await fs.stat(path.join(TEST_ROOT, '1-input'));
    expect(stat1.isDirectory()).toBe(true);

    const stat3 = await fs.stat(path.join(TEST_ROOT, '3-synthesis'));
    expect(stat3.isDirectory()).toBe(true);
  });
});

describe('generateRecoverySummary', () => {
  test('returns readable text', async () => {
    await createLayerFolders(['L1', 'L2']);
    await writeStatusAt('L5');

    const rm = new RecoveryManager(TEST_ROOT);
    const summary = await rm.generateRecoverySummary();

    expect(typeof summary).toBe('string');
    expect(summary).toContain('Recovery Summary');
    expect(summary).toContain('Status File');
    expect(summary).toContain('Filesystem State');
    expect(summary).toContain('Mismatches');
  });

  test('shows no mismatches when consistent', async () => {
    await createLayerFolders(['L1', 'L2']);
    await writeStatusAt('L3');

    const rm = new RecoveryManager(TEST_ROOT);
    const summary = await rm.generateRecoverySummary();

    expect(summary).toContain('No mismatches');
  });
});

describe('Recovery logging', () => {
  test('recovery operations produce log entries', async () => {
    await createLayerFolders(['L1']);

    const rm = new RecoveryManager(TEST_ROOT);
    await rm.reconcile();

    expect(rm.log.length).toBeGreaterThan(0);
    expect(rm.log[0].timestamp).toBeDefined();
    expect(rm.log[0].message).toBeDefined();
  });
});

describe('checkDependenciesMet', () => {
  test('L1 has no dependencies so always passes', async () => {
    const rm = new RecoveryManager(TEST_ROOT);
    const scan = await rm.scanFilesystem();
    const result = rm.checkDependenciesMet('L1', scan);
    expect(result.canResume).toBe(true);
    expect(result.missingDeps).toEqual([]);
  });

  test('L2 passes when L1 artifacts exist', async () => {
    await createLayerFolders(['L1']);
    const rm = new RecoveryManager(TEST_ROOT);
    const scan = await rm.scanFilesystem();
    const result = rm.checkDependenciesMet('L2', scan);
    expect(result.canResume).toBe(true);
  });

  test('L2 fails when L1 artifacts missing', async () => {
    const rm = new RecoveryManager(TEST_ROOT);
    const scan = await rm.scanFilesystem();
    const result = rm.checkDependenciesMet('L2', scan);
    expect(result.canResume).toBe(false);
    expect(result.missingDeps).toContain('L1');
  });

  test('L4 passes when L3 exists but L1/L2 not required directly', async () => {
    await createLayerFolders(['L3']);
    const rm = new RecoveryManager(TEST_ROOT);
    const scan = await rm.scanFilesystem();
    const result = rm.checkDependenciesMet('L4', scan);
    expect(result.canResume).toBe(true);
  });

  test('L9 requires both L5 and L7', async () => {
    await createLayerFolders(['L5']);
    const rm = new RecoveryManager(TEST_ROOT);
    const scan = await rm.scanFilesystem();
    const result = rm.checkDependenciesMet('L9', scan);
    expect(result.canResume).toBe(false);
    expect(result.missingDeps).toContain('L7');
  });

  test('reconcile includes dependency check in plan', async () => {
    await createLayerFolders(['L1', 'L2']);
    await writeStatusAt('L3');

    const rm = new RecoveryManager(TEST_ROOT);
    const plan = await rm.reconcile();
    expect(plan.dependencyCheck).toBeDefined();
    expect(plan.dependencyCheck.canResume).toBe(true);
  });
});
