/**
 * Happy Path Integration Test
 *
 * Verifies the full L1-L12 pipeline completes with an all-PASS MockExecutor.
 * Tests forward flow, artifact generation, and final status.
 */

const fs = require('fs');
const path = require('path');
const { Ralph } = require('../../lib/ralph');
const { MockExecutor } = require('../helpers/mock-executor');
const { createTestProject } = require('../helpers/test-project');

describe('Happy Path Integration', () => {
  let testProject;

  afterEach(async () => {
    if (testProject?.cleanup) {
      await testProject.cleanup();
    }
  });

  it('completes full L1-L12 pipeline with all-PASS MockExecutor', async () => {
    testProject = await createTestProject({ withGatesApproved: true });

    const mockExecutor = new MockExecutor({
      projectRoot: testProject.projectRoot
    });

    const ralph = new Ralph(testProject.projectRoot, {
      autoApproveGates: true,
      verbose: false,
      notifications: false,
      eventLog: false,
      agentTimeout: 0 // No timeout for mock executor
    });

    const result = await ralph.runProject(mockExecutor.execute.bind(mockExecutor));

    // Verify pipeline completed - Ralph returns 'complete' or 'advanced' from L12
    // depending on how advance() propagates the COMPLETE state
    expect(['complete', 'advanced']).toContain(result.status);
    if (result.status === 'advanced') {
      expect(result.from).toBe('L12');
    }

    // Verify final _status.md shows completion
    const statusPath = path.join(testProject.projectRoot, '_status.md');
    const statusContent = fs.readFileSync(statusPath, 'utf-8');
    expect(statusContent).toMatch(/COMPLETE/);

    // Verify key artifacts exist
    expect(fs.existsSync(path.join(testProject.projectRoot, '1-input', 'sources.md'))).toBe(true);
    expect(fs.existsSync(path.join(testProject.projectRoot, '1-input', 'brain-dump.md'))).toBe(true);
    expect(fs.existsSync(path.join(testProject.projectRoot, '3-synthesis', 'jtbd.md'))).toBe(true);
    expect(fs.existsSync(path.join(testProject.projectRoot, '3-synthesis', 'architecture.md'))).toBe(true);
    expect(fs.existsSync(path.join(testProject.projectRoot, '4-epics', '_index.md'))).toBe(true);
    expect(fs.existsSync(path.join(testProject.projectRoot, '4-epics', 'epic-01.md'))).toBe(true);
    expect(fs.existsSync(path.join(testProject.projectRoot, '8-analysis', 'retrospective.md'))).toBe(true);

    // Verify MockExecutor logged all expected layer calls
    const layerIds = mockExecutor.callLog.map(c => c.layerId);
    expect(layerIds).toContain('L1');
    expect(layerIds).toContain('L3');
    expect(layerIds).toContain('L4');
    expect(layerIds).toContain('L12');
  }, 60000);
});
