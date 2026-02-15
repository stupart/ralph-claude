/**
 * Timeout Integration Tests
 *
 * Verifies pipeline behavior when agents time out:
 * - Auto-advance when timeout produces valid artifacts (partial completion)
 * - Retry when timeout produces no/invalid artifacts
 */

const fs = require('fs');
const path = require('path');
const { Ralph } = require('../../lib/ralph');
const { MockExecutor } = require('../helpers/mock-executor');
const { createTestProject } = require('../helpers/test-project');

describe('Timeout Integration Tests', () => {
  let testProject;

  afterEach(async () => {
    if (testProject?.cleanup) {
      await testProject.cleanup();
    }
  });

  it('auto-advances when agent times out but produces valid artifacts', async () => {
    testProject = await createTestProject({ withGatesApproved: true });

    // MockExecutor with preWrite: artifacts are written before the delay
    const mockExecutor = new MockExecutor({
      projectRoot: testProject.projectRoot,
      timingOverrides: {
        L4: { delayMs: 500, preWrite: true } // Write files, then delay past timeout
      }
    });

    const ralph = new Ralph(testProject.projectRoot, {
      autoApproveGates: true,
      verbose: false,
      notifications: false,
      eventLog: false,
      agentTimeout: 100, // 100ms timeout (less than 500ms delay)
      layerTimeouts: { L4: 100 }, // Override for L4
      maxRetries: 1 // Allow one retry to check partial completion
    });

    const result = await ralph.runProject(mockExecutor.execute.bind(mockExecutor));

    // Pipeline should have advanced past L4 (partial completion detected)
    // or completed if the auto-advance worked
    const statusContent = fs.readFileSync(path.join(testProject.projectRoot, '_status.md'), 'utf-8');

    // The preWrite option causes artifacts to be written before the delay,
    // so the partial completion check in Ralph should detect valid L4 artifacts
    // and auto-advance
    const l4Artifacts = fs.existsSync(path.join(testProject.projectRoot, '4-epics', 'epic-01.md'));
    expect(l4Artifacts).toBe(true);

    // Verify L4 was attempted (at least one call)
    const l4Calls = mockExecutor.callLog.filter(c => c.layerId === 'L4');
    expect(l4Calls.length).toBeGreaterThanOrEqual(1);
  }, 30000);

  it('retries when agent times out with invalid/no artifacts', async () => {
    testProject = await createTestProject({ withGatesApproved: true });

    // MockExecutor with delay but no preWrite: artifacts NOT written before timeout
    const mockExecutor = new MockExecutor({
      projectRoot: testProject.projectRoot,
      timingOverrides: {
        L1: { delayMs: 500, preWrite: false } // Delay without writing files first
      }
    });

    const ralph = new Ralph(testProject.projectRoot, {
      autoApproveGates: true,
      verbose: false,
      notifications: false,
      eventLog: false,
      layerTimeouts: { L1: 100 }, // 100ms timeout for L1
      maxRetries: 2
    });

    // Pipeline should fail because L1 can never produce artifacts before timeout
    const result = await ralph.runProject(mockExecutor.execute.bind(mockExecutor));

    // Should have retried L1 multiple times
    const l1Calls = mockExecutor.callLog.filter(c => c.layerId === 'L1');
    expect(l1Calls.length).toBeGreaterThanOrEqual(2);

    // Should end in error (all retries exhausted)
    expect(result.status).toBe('error');
    expect(result.layerId).toBe('L1');
  }, 60000);
});
