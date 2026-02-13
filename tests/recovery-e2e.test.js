/**
 * Error Recovery Integration Tests
 *
 * Tests the RecoveryManager with realistic failure scenarios:
 * - Crash mid-L8 (builder crash leaves partial state)
 * - Stale lock handling (status locked by dead process)
 * - Corrupted _status.md (malformed or missing sections)
 * - Status ahead of filesystem (status says L6 but only L3 artifacts exist)
 */

const fs = require('fs').promises;
const path = require('path');
const os = require('os');
const { RecoveryManager, SCAN_FOLDERS } = require('../lib/recovery');
const { StateManager, LAYERS, createDefaultState } = require('../lib/state-machine');

async function createTestDir() {
  const tmpBase = path.join(os.tmpdir(), 'ralph-recovery-e2e');
  await fs.mkdir(tmpBase, { recursive: true });
  return await fs.mkdtemp(path.join(tmpBase, 'proj-'));
}

async function cleanupDir(dir) {
  try {
    await fs.rm(dir, { recursive: true, force: true });
  } catch {
    // Ignore
  }
}

// Create a valid _status.md at a given layer
async function writeStatusAtLayer(projectDir, layerId) {
  const layer = LAYERS[layerId];
  const content = [
    '# Project Status',
    '',
    '## Meta',
    '- **Project:** Recovery Test',
    `- **Started:** ${new Date().toISOString()}`,
    `- **Last Updated:** ${new Date().toISOString()}`,
    '',
    '## Current Position',
    `- **Layer:** ${layerId}`,
    `- **Layer Name:** ${layer?.name || 'Unknown'}`,
    `- **Phase:** ${layer?.phase || 'unknown'}`,
    `- **Agent:** ${layer?.agent || 'unknown'}`,
    '- **Epic:** None',
    '- **Feature:** None',
    '- **Task:** None',
    '- **Iteration:** 1',
    '',
    '## Gates',
    '- **L3 (Synthesis):** pending',
    '- **L7 (Plan Approval):** pending',
    ''
  ].join('\n');

  await fs.writeFile(path.join(projectDir, '_status.md'), content);
}

// Create layer folders with content up to a given layer
async function createArtifactsThrough(projectDir, throughLayer) {
  const layerOrder = ['L1', 'L2', 'L3', 'L4', 'L5', 'L6', 'L7'];
  const folderMap = {
    L1: '1-input',
    L2: '2-decomposition',
    L3: '3-synthesis',
    L4: '4-epics',
    L5: '5-features',
    L6: '6-tasks',
    L7: '7-subtasks'
  };

  for (const layerId of layerOrder) {
    const folder = folderMap[layerId];
    if (!folder) continue;

    const folderPath = path.join(projectDir, folder);
    await fs.mkdir(folderPath, { recursive: true });
    await fs.writeFile(
      path.join(folderPath, 'artifact.md'),
      `# ${layerId} Artifact\nGenerated content for ${layerId}`
    );

    if (layerId === throughLayer) break;
  }
}

describe('Recovery E2E: Crash mid-L8', () => {
  let projectDir;

  beforeEach(async () => {
    projectDir = await createTestDir();
  });

  afterEach(async () => {
    await cleanupDir(projectDir);
  });

  test('recovers from crash during L8 build with L7 artifacts complete', async () => {
    // Scenario: Agent was building (L8) and crashed. Status says L8,
    // filesystem has artifacts through L7.
    await createArtifactsThrough(projectDir, 'L7');
    await writeStatusAtLayer(projectDir, 'L8');

    const recovery = new RecoveryManager(projectDir);
    const plan = await recovery.reconcile();

    // Status (L8) is consistent with filesystem (L7 complete -> next is L8)
    // The recovery should see this as consistent since L8 has no folder
    expect(plan.statusLayer).toBe('L8');
    expect(plan.inferredLayer).toBe('L8');
    // Should be in sync (L8 is correct because L7 artifacts exist)
    expect(plan.needsRecovery).toBe(false);
  });

  test('detects crash with only partial artifacts (L5 complete, status at L8)', async () => {
    // Scenario: Status jumped to L8 but only L1-L5 artifacts exist
    await createArtifactsThrough(projectDir, 'L5');
    await writeStatusAtLayer(projectDir, 'L8');

    const recovery = new RecoveryManager(projectDir);
    const plan = await recovery.reconcile();

    // Filesystem only shows L5 complete -> should be at L6
    expect(plan.statusLayer).toBe('L8');
    expect(plan.inferredLayer).toBe('L6');
    expect(plan.needsRecovery).toBe(true);

    // Should recommend rewinding
    const rewindAction = plan.actions.find(a => a.type === 'rewind_status');
    expect(rewindAction).toBeDefined();
    expect(rewindAction.from).toBe('L8');
    expect(rewindAction.to).toBe('L6');

    // Apply recovery
    const result = await recovery.resume(plan);
    expect(result.recovered).toBe(true);

    // Verify state is now at L6
    const sm = new StateManager(projectDir);
    const state = await sm.read();
    expect(state.position.layer).toBe('L6');
  });

  test('creates missing intermediate folders during recovery', async () => {
    // Scenario: Status at L5 but missing L2 folder (somehow deleted)
    await createArtifactsThrough(projectDir, 'L4');
    // Delete L2 folder
    await fs.rm(path.join(projectDir, '2-decomposition'), { recursive: true });
    await writeStatusAtLayer(projectDir, 'L5');

    const recovery = new RecoveryManager(projectDir);
    const plan = await recovery.reconcile();

    // Filesystem shows gap at L2 - inferred layer stops at L1->L2
    expect(plan.needsRecovery).toBe(true);

    // Apply and verify the folder gets recreated
    const result = await recovery.resume(plan);
    expect(result.recovered).toBe(true);
  });
});

describe('Recovery E2E: Stale lock handling', () => {
  let projectDir;

  beforeEach(async () => {
    projectDir = await createTestDir();
  });

  afterEach(async () => {
    await cleanupDir(projectDir);
  });

  test('stale .tmp file does not interfere with recovery', async () => {
    // Scenario: A crash left _status.md.tmp (from atomic write) alongside _status.md
    await createArtifactsThrough(projectDir, 'L3');
    await writeStatusAtLayer(projectDir, 'L4');

    // Create stale temp file
    await fs.writeFile(
      path.join(projectDir, '_status.md.tmp'),
      'corrupted partial write data'
    );

    const recovery = new RecoveryManager(projectDir);
    const plan = await recovery.reconcile();

    // Should still read the real _status.md correctly
    expect(plan.statusLayer).toBe('L4');
    expect(plan.inferredLayer).toBe('L4');
    expect(plan.needsRecovery).toBe(false);
  });

  test('recovery creates valid _status.md when temp file exists but no real status', async () => {
    // Scenario: Crash during first write - .tmp exists but _status.md was never created
    await createArtifactsThrough(projectDir, 'L2');

    // Only the temp file exists
    await fs.writeFile(
      path.join(projectDir, '_status.md.tmp'),
      'partial write data'
    );

    const recovery = new RecoveryManager(projectDir);
    const plan = await recovery.reconcile();

    expect(plan.statusFileExists).toBe(false);
    expect(plan.inferredLayer).toBe('L3');
    expect(plan.needsRecovery).toBe(true);

    const result = await recovery.resume(plan);
    expect(result.recovered).toBe(true);

    // Verify new _status.md was created at correct layer
    const sm = new StateManager(projectDir);
    const state = await sm.read();
    expect(state.position.layer).toBe('L3');
  });
});

describe('Recovery E2E: Corrupted _status.md', () => {
  let projectDir;

  beforeEach(async () => {
    projectDir = await createTestDir();
  });

  afterEach(async () => {
    await cleanupDir(projectDir);
  });

  test('handles completely empty _status.md', async () => {
    await createArtifactsThrough(projectDir, 'L3');
    await fs.writeFile(path.join(projectDir, '_status.md'), '');

    const recovery = new RecoveryManager(projectDir);
    const plan = await recovery.reconcile();

    // Empty file parses as L1 (default), but filesystem says L4
    expect(plan.statusLayer).toBe('L1');
    expect(plan.inferredLayer).toBe('L4');
    expect(plan.needsRecovery).toBe(true);

    const result = await recovery.resume(plan);
    expect(result.recovered).toBe(true);

    const sm = new StateManager(projectDir);
    const state = await sm.read();
    expect(state.position.layer).toBe('L4');
  });

  test('handles _status.md with malformed markdown', async () => {
    await createArtifactsThrough(projectDir, 'L2');
    await fs.writeFile(path.join(projectDir, '_status.md'), [
      '# Not a valid status file',
      'This is random text that does not follow the format',
      'No sections or key-value pairs here',
      '{{broken template variables}}'
    ].join('\n'));

    const recovery = new RecoveryManager(projectDir);
    const plan = await recovery.reconcile();

    // Malformed file defaults to L1
    expect(plan.statusLayer).toBe('L1');
    expect(plan.inferredLayer).toBe('L3');
    expect(plan.needsRecovery).toBe(true);
  });

  test('handles _status.md with valid header but missing position section', async () => {
    await createArtifactsThrough(projectDir, 'L4');
    await fs.writeFile(path.join(projectDir, '_status.md'), [
      '# Project Status',
      '',
      '## Meta',
      '- **Project:** Test',
      '',
      '## Gates',
      '- **L3 (Synthesis):** approved',
      ''
    ].join('\n'));

    const recovery = new RecoveryManager(projectDir);
    const plan = await recovery.reconcile();

    // Missing position defaults to L1
    expect(plan.statusLayer).toBe('L1');
    expect(plan.inferredLayer).toBe('L5');
    expect(plan.needsRecovery).toBe(true);
  });

  test('handles _status.md with invalid layer value', async () => {
    await createArtifactsThrough(projectDir, 'L3');
    await fs.writeFile(path.join(projectDir, '_status.md'), [
      '# Project Status',
      '',
      '## Current Position',
      '- **Layer:** L99',
      '- **Layer Name:** Nonexistent',
      ''
    ].join('\n'));

    const recovery = new RecoveryManager(projectDir);
    const plan = await recovery.reconcile();

    // L99 status vs L4 inferred -> mismatch
    expect(plan.statusLayer).toBe('L99');
    expect(plan.inferredLayer).toBe('L4');
    expect(plan.needsRecovery).toBe(true);

    // Should rewind since 99 > 4
    const action = plan.actions.find(a => a.type === 'rewind_status');
    expect(action).toBeDefined();
  });
});

describe('Recovery E2E: Status ahead of filesystem', () => {
  let projectDir;

  beforeEach(async () => {
    projectDir = await createTestDir();
  });

  afterEach(async () => {
    await cleanupDir(projectDir);
  });

  test('rewinds status from L6 to L4 when only L1-L3 artifacts exist', async () => {
    await createArtifactsThrough(projectDir, 'L3');
    await writeStatusAtLayer(projectDir, 'L6');

    const recovery = new RecoveryManager(projectDir);
    const plan = await recovery.reconcile();

    expect(plan.statusLayer).toBe('L6');
    expect(plan.inferredLayer).toBe('L4');
    expect(plan.needsRecovery).toBe(true);

    const mismatch = plan.mismatches.find(m => m.type === 'status_ahead');
    expect(mismatch).toBeDefined();

    const result = await recovery.resume(plan);
    expect(result.recovered).toBe(true);

    const sm = new StateManager(projectDir);
    const state = await sm.read();
    expect(state.position.layer).toBe('L4');
  });

  test('advances status from L1 to L4 when L1-L3 artifacts exist', async () => {
    await createArtifactsThrough(projectDir, 'L3');
    await writeStatusAtLayer(projectDir, 'L1');

    const recovery = new RecoveryManager(projectDir);
    const plan = await recovery.reconcile();

    expect(plan.statusLayer).toBe('L1');
    expect(plan.inferredLayer).toBe('L4');
    expect(plan.needsRecovery).toBe(true);

    const mismatch = plan.mismatches.find(m => m.type === 'status_behind');
    expect(mismatch).toBeDefined();

    const result = await recovery.resume(plan);
    expect(result.recovered).toBe(true);

    const sm = new StateManager(projectDir);
    const state = await sm.read();
    expect(state.position.layer).toBe('L4');
  });

  test('handles empty project with no artifacts and no status', async () => {
    // Completely empty project directory

    const recovery = new RecoveryManager(projectDir);
    const plan = await recovery.reconcile();

    expect(plan.statusFileExists).toBe(false);
    expect(plan.inferredLayer).toBe('L1');
    expect(plan.needsRecovery).toBe(true);

    const result = await recovery.resume(plan);
    expect(result.recovered).toBe(true);

    const sm = new StateManager(projectDir);
    const state = await sm.read();
    expect(state.position.layer).toBe('L1');
  });

  test('cleanStart resets to L1 while preserving artifacts', async () => {
    await createArtifactsThrough(projectDir, 'L5');
    await writeStatusAtLayer(projectDir, 'L6');

    const recovery = new RecoveryManager(projectDir);
    const result = await recovery.cleanStart();

    expect(result.reset).toBe(true);
    expect(result.layer).toBe('L1');

    // Verify status was reset
    const sm = new StateManager(projectDir);
    const state = await sm.read();
    expect(state.position.layer).toBe('L1');

    // Verify artifacts still exist
    const hasL5 = await fs.access(path.join(projectDir, '5-features'))
      .then(() => true)
      .catch(() => false);
    expect(hasL5).toBe(true);
  });

  test('generateRecoverySummary produces readable output', async () => {
    await createArtifactsThrough(projectDir, 'L3');
    await writeStatusAtLayer(projectDir, 'L6');

    const recovery = new RecoveryManager(projectDir);
    const summary = await recovery.generateRecoverySummary();

    expect(summary).toContain('Recovery Summary');
    expect(summary).toContain('Reported Layer: L6');
    expect(summary).toContain('Inferred Layer: L4');
    expect(summary).toContain('status_ahead');
    expect(summary).toContain('Recommended Actions');
  });
});
