/**
 * Recovery Manager Tests
 *
 * Tests for the Layer Cake recovery module.
 * Run with: node tests/recovery.test.js
 */

const { RecoveryManager, SCAN_FOLDERS } = require('../lib/recovery');
const { StateManager, createDefaultState } = require('../lib/state-machine');
const fs = require('fs').promises;
const path = require('path');

const TEST_ROOT = path.join(__dirname, '.test-recovery-project');
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
  await fs.mkdir(TEST_ROOT, { recursive: true });
}

async function resetProject() {
  // Clean up everything in test root
  try {
    await fs.rm(TEST_ROOT, { recursive: true, force: true });
    await fs.mkdir(TEST_ROOT, { recursive: true });
  } catch {}
}

async function cleanup() {
  try {
    await fs.rm(TEST_ROOT, { recursive: true, force: true });
  } catch {}
}

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

// ============= Tests =============

const tests = [
  // --- scanFilesystem ---
  test('scanFilesystem detects existing folders', async () => {
    await resetProject();
    await createLayerFolders(['L1', 'L2']);

    const rm = new RecoveryManager(TEST_ROOT);
    const scan = await rm.scanFilesystem();

    assert(scan.L1.exists === true, 'L1 folder should exist');
    assert(scan.L1.hasContent === true, 'L1 should have content');
    assert(scan.L2.exists === true, 'L2 folder should exist');
    assert(scan.L3.exists === false, 'L3 folder should not exist');
  }),

  test('scanFilesystem detects empty folders', async () => {
    await resetProject();
    const emptyFolder = path.join(TEST_ROOT, '1-input');
    await fs.mkdir(emptyFolder, { recursive: true });

    const rm = new RecoveryManager(TEST_ROOT);
    const scan = await rm.scanFilesystem();

    assert(scan.L1.exists === true, 'L1 folder should exist');
    assert(scan.L1.hasContent === false, 'L1 should be empty');
  }),

  // --- inferLayerFromFilesystem ---
  test('inferLayerFromFilesystem returns L1 for empty project', async () => {
    await resetProject();

    const rm = new RecoveryManager(TEST_ROOT);
    const scan = await rm.scanFilesystem();
    const layer = rm.inferLayerFromFilesystem(scan);

    assert(layer === 'L1', 'Empty project should infer L1');
  }),

  test('inferLayerFromFilesystem infers next layer after completed ones', async () => {
    await resetProject();
    await createLayerFolders(['L1', 'L2', 'L3']);

    const rm = new RecoveryManager(TEST_ROOT);
    const scan = await rm.scanFilesystem();
    const layer = rm.inferLayerFromFilesystem(scan);

    assert(layer === 'L4', 'After L1-L3 should infer L4');
  }),

  test('inferLayerFromFilesystem stops at gap', async () => {
    await resetProject();
    // L1 exists, L2 missing, L3 exists - should stop at L2
    await createLayerFolders(['L1', 'L3']);

    const rm = new RecoveryManager(TEST_ROOT);
    const scan = await rm.scanFilesystem();
    const layer = rm.inferLayerFromFilesystem(scan);

    assert(layer === 'L2', 'Should stop at gap (L2)');
  }),

  // --- reconcile ---
  test('reconcile detects no mismatches when consistent', async () => {
    await resetProject();
    await createLayerFolders(['L1', 'L2']);
    await writeStatusAt('L3');

    const rm = new RecoveryManager(TEST_ROOT);
    const plan = await rm.reconcile();

    assert(plan.needsRecovery === false, 'Should not need recovery');
    assert(plan.mismatches.length === 0, 'Should have no mismatches');
  }),

  test('reconcile detects missing status file', async () => {
    await resetProject();
    await createLayerFolders(['L1', 'L2']);
    // No status file

    const rm = new RecoveryManager(TEST_ROOT);
    const plan = await rm.reconcile();

    assert(plan.needsRecovery === true, 'Should need recovery');
    assert(plan.mismatches.some(m => m.type === 'missing_status'),
      'Should detect missing status');
    assert(plan.actions.some(a => a.type === 'create_status'),
      'Should have create_status action');
  }),

  test('reconcile detects status ahead of filesystem', async () => {
    await resetProject();
    await createLayerFolders(['L1']); // Only L1 on disk
    await writeStatusAt('L5'); // Status says L5

    const rm = new RecoveryManager(TEST_ROOT);
    const plan = await rm.reconcile();

    assert(plan.needsRecovery === true, 'Should need recovery');
    assert(plan.mismatches.some(m => m.type === 'status_ahead'),
      'Should detect status ahead');
  }),

  test('reconcile detects status behind filesystem', async () => {
    await resetProject();
    await createLayerFolders(['L1', 'L2', 'L3', 'L4']); // L1-L4 on disk
    await writeStatusAt('L2'); // Status says L2

    const rm = new RecoveryManager(TEST_ROOT);
    const plan = await rm.reconcile();

    assert(plan.needsRecovery === true, 'Should need recovery');
    assert(plan.mismatches.some(m => m.type === 'status_behind'),
      'Should detect status behind');
  }),

  // --- resume ---
  test('resume returns no-op when consistent', async () => {
    await resetProject();
    await createLayerFolders(['L1']);
    await writeStatusAt('L2');

    const rm = new RecoveryManager(TEST_ROOT);
    const result = await rm.resume();

    assert(result.recovered === false, 'Should not need recovery');
  }),

  test('resume creates status file when missing', async () => {
    await resetProject();
    await createLayerFolders(['L1', 'L2', 'L3']);
    // No status file

    const rm = new RecoveryManager(TEST_ROOT);
    const result = await rm.resume();

    assert(result.recovered === true, 'Should have recovered');

    // Verify status file was created
    const sm = new StateManager(TEST_ROOT);
    const state = await sm.read();
    assert(state.position.layer === 'L4', 'Status should be at L4');
  }),

  test('resume advances status to match filesystem', async () => {
    await resetProject();
    await createLayerFolders(['L1', 'L2', 'L3', 'L4']);
    await writeStatusAt('L2');

    const rm = new RecoveryManager(TEST_ROOT);
    const result = await rm.resume();

    assert(result.recovered === true, 'Should have recovered');

    const sm = new StateManager(TEST_ROOT);
    const state = await sm.read();
    assert(state.position.layer === 'L5', 'Status should be advanced to L5');
  }),

  // --- cleanStart ---
  test('cleanStart resets to L1', async () => {
    await resetProject();
    await createLayerFolders(['L1', 'L2', 'L3']);
    await writeStatusAt('L5');

    const rm = new RecoveryManager(TEST_ROOT);
    const result = await rm.cleanStart();

    assert(result.reset === true, 'Should indicate reset');
    assert(result.layer === 'L1', 'Should be at L1');

    // Verify status file
    const sm = new StateManager(TEST_ROOT);
    const state = await sm.read();
    assert(state.position.layer === 'L1', 'State should be L1');
  }),

  test('cleanStart preserves filesystem artifacts', async () => {
    await resetProject();
    await createLayerFolders(['L1', 'L2', 'L3']);
    await writeStatusAt('L4');

    const rm = new RecoveryManager(TEST_ROOT);
    await rm.cleanStart();

    // Check folders still exist
    const stat1 = await fs.stat(path.join(TEST_ROOT, '1-input'));
    assert(stat1.isDirectory(), '1-input should still exist');

    const stat3 = await fs.stat(path.join(TEST_ROOT, '3-synthesis'));
    assert(stat3.isDirectory(), '3-synthesis should still exist');
  }),

  // --- generateRecoverySummary ---
  test('generateRecoverySummary returns readable text', async () => {
    await resetProject();
    await createLayerFolders(['L1', 'L2']);
    await writeStatusAt('L5');

    const rm = new RecoveryManager(TEST_ROOT);
    const summary = await rm.generateRecoverySummary();

    assert(typeof summary === 'string', 'Summary should be a string');
    assert(summary.includes('Recovery Summary'), 'Should have title');
    assert(summary.includes('Status File'), 'Should mention status file');
    assert(summary.includes('Filesystem State'), 'Should mention filesystem');
    assert(summary.includes('Mismatches'), 'Should have mismatches section');
  }),

  test('generateRecoverySummary shows no mismatches when consistent', async () => {
    await resetProject();
    await createLayerFolders(['L1', 'L2']);
    await writeStatusAt('L3');

    const rm = new RecoveryManager(TEST_ROOT);
    const summary = await rm.generateRecoverySummary();

    assert(summary.includes('No mismatches'), 'Should indicate no mismatches');
  }),

  // --- Recovery logging ---
  test('recovery operations produce log entries', async () => {
    await resetProject();
    await createLayerFolders(['L1']);

    const rm = new RecoveryManager(TEST_ROOT);
    await rm.reconcile();

    assert(rm.log.length > 0, 'Should have log entries');
    assert(rm.log[0].timestamp !== undefined, 'Log entries should have timestamps');
    assert(rm.log[0].message !== undefined, 'Log entries should have messages');
  })
];

// ============= Run Tests =============

async function runTests() {
  console.log('\nRecovery Manager Tests');
  console.log('=======================\n');

  await setup();

  for (const testFn of tests) {
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
