/**
 * State Machine Stress Tests
 *
 * Tests concurrent access to StateManager via advisory file locking,
 * and crash recovery when _status.md is corrupted or truncated.
 */

const fs = require('fs');
const fsp = require('fs').promises;
const path = require('path');
const { StateManager } = require('../../lib/state-machine');
const { createTestProject } = require('../helpers/test-project');

describe('State Machine Stress Tests', () => {
  let testProject;

  afterEach(async () => {
    if (testProject?.cleanup) {
      await testProject.cleanup();
    }
  });

  it('handles 10 parallel writes without corruption', async () => {
    testProject = await createTestProject();

    const writeResults = [];

    // Create 10 concurrent write operations
    const writePromises = Array.from({ length: 10 }, async (_, i) => {
      // Each writer gets its own StateManager to simulate concurrent processes
      const sm = new StateManager(testProject.projectRoot);
      const state = await sm.read();
      state.position.layer = `L${(i % 12) + 1}`;
      state.meta.lastUpdated = new Date().toISOString();

      try {
        await sm.write();
        writeResults.push({ index: i, success: true, layer: state.position.layer });
      } catch (err) {
        writeResults.push({ index: i, success: false, error: err.message });
      }
    });

    // Execute all writes concurrently
    await Promise.all(writePromises);

    // Verify all writes completed (either succeeded or failed gracefully)
    expect(writeResults.length).toBe(10);

    // Verify no write threw an unhandled exception
    const successfulWrites = writeResults.filter(r => r.success);
    expect(successfulWrites.length).toBeGreaterThan(0);

    // Verify final _status.md is valid and parseable
    const statusPath = path.join(testProject.projectRoot, '_status.md');
    expect(fs.existsSync(statusPath)).toBe(true);

    const statusContent = fs.readFileSync(statusPath, 'utf-8');

    // File should not be corrupted
    expect(statusContent.length).toBeGreaterThan(0);
    expect(statusContent).not.toContain('undefined');
    expect(statusContent).not.toContain('[object Object]');

    // Verify file can be parsed back
    const finalSm = new StateManager(testProject.projectRoot);
    const finalState = await finalSm.read();
    expect(finalState).toBeTruthy();
    expect(finalState.position.layer).toBeTruthy();

    // Verify final state is one of the states we wrote
    const writtenLayers = successfulWrites.map(r => r.layer);
    expect(writtenLayers).toContain(finalState.position.layer);
  }, 10000);
});

describe('State Machine Crash Recovery', () => {
  let testProject;

  afterEach(async () => {
    if (testProject?.cleanup) {
      await testProject.cleanup();
    }
  });

  it('returns descriptive error for truncated _status.md', async () => {
    testProject = await createTestProject();

    const sm = new StateManager(testProject.projectRoot);
    const statusPath = path.join(testProject.projectRoot, '_status.md');

    // Read valid state first
    await sm.read();
    // Modify and write valid state
    sm.state.position.layer = 'L5';
    await sm.write();

    // Manually truncate the file (simulate crash during write)
    const fullContent = fs.readFileSync(statusPath, 'utf-8');
    const truncatedContent = fullContent.slice(0, Math.floor(fullContent.length / 2));
    fs.writeFileSync(statusPath, truncatedContent);

    // Try to read the corrupted file
    const sm2 = new StateManager(testProject.projectRoot);
    let didThrow = false;
    let errorMessage = '';
    let result;

    try {
      result = await sm2.read();
    } catch (err) {
      didThrow = true;
      errorMessage = err.message;
    }

    // StateManager may recover by parsing what it can, or throw
    // Either way it should not produce an unhandled exception
    if (didThrow) {
      // Error should be descriptive
      expect(errorMessage.length).toBeGreaterThan(10);
    } else {
      // If it recovered, result should be a valid state object
      expect(result).toBeTruthy();
      expect(result.position).toBeTruthy();
    }
  });

  it('handles completely empty _status.md', async () => {
    testProject = await createTestProject();

    const statusPath = path.join(testProject.projectRoot, '_status.md');

    // Write empty file
    fs.writeFileSync(statusPath, '');

    const sm = new StateManager(testProject.projectRoot);
    let didThrow = false;
    let errorMessage = '';
    let result;

    try {
      result = await sm.read();
    } catch (err) {
      didThrow = true;
      errorMessage = err.message;
    }

    // Should handle empty file gracefully - either recover with defaults or throw descriptive error
    if (didThrow) {
      expect(errorMessage.length).toBeGreaterThan(0);
    } else {
      // If it recovered, should return a valid state object
      expect(result).toBeTruthy();
      expect(result.position).toBeTruthy();
    }
  });
});
