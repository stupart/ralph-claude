/**
 * Cascade Integration Tests
 *
 * Verifies backward routing (ITERATE/CASCADE) behavior when judges
 * return MINOR, MAJOR, or ESCALATE severity verdicts.
 */

const fs = require('fs');
const path = require('path');
const { Ralph } = require('../../lib/ralph');
const { MockExecutor } = require('../helpers/mock-executor');
const { createTestProject } = require('../helpers/test-project');

describe('Cascade Integration Tests', () => {
  let testProject;

  afterEach(async () => {
    if (testProject?.cleanup) {
      await testProject.cleanup();
    }
  });

  it('MINOR severity cascade: L9 ITERATE causes L8 retry then L9 PASS', async () => {
    testProject = await createTestProject({ withGatesApproved: true });

    const mockExecutor = new MockExecutor({
      projectRoot: testProject.projectRoot,
      verdictOverrides: {
        L9: (iteration) => iteration === 1
          ? {
              verdict: 'ITERATE',
              severity: 'MINOR',
              issues: [{ title: 'Style Issue', description: 'Minor formatting needed', severity: 'MINOR' }]
            }
          : { verdict: 'PASS' }
      }
    });

    const ralph = new Ralph(testProject.projectRoot, {
      autoApproveGates: true,
      verbose: false,
      notifications: false,
      eventLog: false,
      agentTimeout: 0
    });

    const result = await ralph.runProject(mockExecutor.execute.bind(mockExecutor));

    // Verify pipeline completed (L12 reached)
    expect(['complete', 'advanced']).toContain(result.status);

    // Verify L8 executed at least twice (initial + after MINOR cascade)
    const l8Calls = mockExecutor.callLog.filter(c => c.layerId === 'L8');
    expect(l8Calls.length).toBeGreaterThanOrEqual(2);

    // Verify L9 executed at least twice (ITERATE then PASS)
    const l9Calls = mockExecutor.callLog.filter(c => c.layerId === 'L9');
    expect(l9Calls.length).toBeGreaterThanOrEqual(2);

    // Verify final status shows completion
    const statusContent = fs.readFileSync(path.join(testProject.projectRoot, '_status.md'), 'utf-8');
    expect(statusContent).toMatch(/COMPLETE/);
  }, 60000);

  it('MAJOR severity cascade: L9 ITERATE causes cascade to earlier layer', async () => {
    testProject = await createTestProject({ withGatesApproved: true });

    const mockExecutor = new MockExecutor({
      projectRoot: testProject.projectRoot,
      verdictOverrides: {
        L9: (iteration) => iteration === 1
          ? {
              verdict: 'ITERATE',
              severity: 'MAJOR',
              issues: [{ title: 'Logic Error', description: 'Fundamental issue', severity: 'MAJOR' }]
            }
          : { verdict: 'PASS' }
      }
    });

    const ralph = new Ralph(testProject.projectRoot, {
      autoApproveGates: true,
      verbose: false,
      notifications: false,
      eventLog: false,
      agentTimeout: 0
    });

    const result = await ralph.runProject(mockExecutor.execute.bind(mockExecutor));

    // Verify pipeline completed
    expect(['complete', 'advanced']).toContain(result.status);

    // Verify L9 executed at least twice (ITERATE then PASS)
    const l9Calls = mockExecutor.callLog.filter(c => c.layerId === 'L9');
    expect(l9Calls.length).toBeGreaterThanOrEqual(2);

    // MAJOR at L9 cascades to L7 per LAYERS definition
    // After cascade, L7 → L8 → L9 should re-execute
    const l7Calls = mockExecutor.callLog.filter(c => c.layerId === 'L7');
    expect(l7Calls.length).toBeGreaterThanOrEqual(2);

    // Verify execution sequence after cascade
    const firstL9Index = mockExecutor.callLog.findIndex(c => c.layerId === 'L9');
    const postCascadeLog = mockExecutor.callLog.slice(firstL9Index + 1);

    // Should see layers re-executed after cascade
    const postCascadeLayerIds = postCascadeLog.map(c => c.layerId);
    expect(postCascadeLayerIds).toContain('L9'); // L9 runs again after cascade

    // Verify final status
    const statusContent = fs.readFileSync(path.join(testProject.projectRoot, '_status.md'), 'utf-8');
    expect(statusContent).toMatch(/COMPLETE/);
  }, 60000);

  it('ESCALATE severity cascade: L9 ITERATE cascades further back', async () => {
    testProject = await createTestProject({ withGatesApproved: true });

    const mockExecutor = new MockExecutor({
      projectRoot: testProject.projectRoot,
      verdictOverrides: {
        L9: (iteration) => iteration === 1
          ? {
              verdict: 'ITERATE',
              severity: 'ESCALATE',
              issues: [{ title: 'Architecture Issue', description: 'Major redesign needed', severity: 'ESCALATE' }]
            }
          : { verdict: 'PASS' }
      }
    });

    const ralph = new Ralph(testProject.projectRoot, {
      autoApproveGates: true,
      verbose: false,
      notifications: false,
      eventLog: false,
      agentTimeout: 0
    });

    const result = await ralph.runProject(mockExecutor.execute.bind(mockExecutor));

    // Verify pipeline completed
    expect(['complete', 'advanced']).toContain(result.status);

    // Verify L9 executed at least twice (ITERATE then PASS)
    const l9Calls = mockExecutor.callLog.filter(c => c.layerId === 'L9');
    expect(l9Calls.length).toBeGreaterThanOrEqual(2);

    // ESCALATE at L9 cascades to L6 per LAYERS definition
    const l6Calls = mockExecutor.callLog.filter(c => c.layerId === 'L6');
    expect(l6Calls.length).toBeGreaterThanOrEqual(2);

    // Verify final status
    const statusContent = fs.readFileSync(path.join(testProject.projectRoot, '_status.md'), 'utf-8');
    expect(statusContent).toMatch(/COMPLETE/);
  }, 60000);

  it('cascade depth limit: always-ITERATE halts after max depth', async () => {
    testProject = await createTestProject({ withGatesApproved: true });

    const mockExecutor = new MockExecutor({
      projectRoot: testProject.projectRoot,
      verdictOverrides: {
        L9: () => ({
          verdict: 'ITERATE',
          severity: 'MINOR',
          issues: [{ title: 'Never Pass', description: 'Always iterate', severity: 'MINOR' }]
        })
      }
    });

    const ralph = new Ralph(testProject.projectRoot, {
      autoApproveGates: true,
      verbose: false,
      notifications: false,
      eventLog: false,
      agentTimeout: 0,
      maxCascadeDepth: 6
    });

    // Pipeline should halt/fail rather than run forever
    let result;
    try {
      result = await ralph.runProject(mockExecutor.execute.bind(mockExecutor));
    } catch (err) {
      result = { status: 'error', error: err.message };
    }

    // Should NOT complete - should halt due to cascade depth or epic escalation
    const statusContent = fs.readFileSync(path.join(testProject.projectRoot, '_status.md'), 'utf-8');

    // Either the pipeline halted (human_required), escalated the epic, or the
    // runEpicCycle hit its internal max iterations (3)
    const validHaltStatuses = ['human_required', 'error'];
    const didHalt = validHaltStatuses.includes(result.status) || result.epicEscalated;
    expect(didHalt).toBe(true);

    // Verify total executions are bounded (not infinite)
    const totalCalls = mockExecutor.callLog.length;
    expect(totalCalls).toBeLessThan(100);

    // Verify L8/L9 executions are bounded
    const l8Calls = mockExecutor.callLog.filter(c => c.layerId === 'L8').length;
    const l9Calls = mockExecutor.callLog.filter(c => c.layerId === 'L9').length;
    expect(l8Calls).toBeLessThanOrEqual(20);
    expect(l9Calls).toBeLessThanOrEqual(20);
  }, 60000);
});
