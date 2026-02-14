/**
 * Unit tests for MockExecutor and test project scaffolding.
 * Covers artifact generation, verdict overrides, timing, and edge cases.
 */

const fs = require('fs');
const path = require('path');
const { MockExecutor } = require('./helpers/mock-executor');
const { createTestProject } = require('./helpers/test-project');

describe('MockExecutor - Artifact Generation', () => {
  let testProject;

  afterEach(async () => {
    if (testProject?.cleanup) {
      await testProject.cleanup();
    }
  });

  it('generates L1 planner artifacts (sources.md and brain-dump.md)', async () => {
    testProject = await createTestProject();
    const mockExecutor = new MockExecutor();

    const result = await mockExecutor.execute({
      layerId: 'L1',
      workingDir: testProject.projectRoot,
      prompt: 'Layer L1'
    });

    expect(result.output).toBeTruthy();
    expect(result.files).toContain('sources.md');
    expect(result.files).toContain('brain-dump.md');
    expect(fs.existsSync(path.join(testProject.projectRoot, '1-input', 'sources.md'))).toBe(true);
    expect(fs.existsSync(path.join(testProject.projectRoot, '1-input', 'brain-dump.md'))).toBe(true);
  });

  it('generates L3 planner artifacts (jtbd.md, journeys.md, architecture.md)', async () => {
    testProject = await createTestProject();
    const mockExecutor = new MockExecutor();

    await mockExecutor.execute({
      layerId: 'L3',
      workingDir: testProject.projectRoot
    });

    expect(fs.existsSync(path.join(testProject.projectRoot, '3-synthesis', 'jtbd.md'))).toBe(true);
    expect(fs.existsSync(path.join(testProject.projectRoot, '3-synthesis', 'journeys.md'))).toBe(true);
    expect(fs.existsSync(path.join(testProject.projectRoot, '3-synthesis', 'architecture.md'))).toBe(true);
  });

  it('generates L4 planner artifacts (_index.md and epic files)', async () => {
    testProject = await createTestProject();
    const mockExecutor = new MockExecutor();

    await mockExecutor.execute({
      layerId: 'L4',
      workingDir: testProject.projectRoot
    });

    expect(fs.existsSync(path.join(testProject.projectRoot, '4-epics', '_index.md'))).toBe(true);
    expect(fs.existsSync(path.join(testProject.projectRoot, '4-epics', 'epic-01.md'))).toBe(true);
    expect(fs.existsSync(path.join(testProject.projectRoot, '4-epics', 'epic-02.md'))).toBe(true);
    expect(fs.existsSync(path.join(testProject.projectRoot, '4-epics', 'epic-03.md'))).toBe(true);
  });

  it('generates L8 builder artifacts (code in output)', async () => {
    testProject = await createTestProject();
    const mockExecutor = new MockExecutor();

    const result = await mockExecutor.execute({
      layerId: 'L8',
      workingDir: testProject.projectRoot
    });

    expect(result.output).toMatch(/function|module\.exports/);
    expect(result.tokenUsage.inputTokens).toBe(100);
    expect(result.tokenUsage.outputTokens).toBe(50);
  });

  it('generates L9 judge artifacts (verdict in output)', async () => {
    testProject = await createTestProject();
    const mockExecutor = new MockExecutor();

    const result = await mockExecutor.execute({
      layerId: 'L9',
      workingDir: testProject.projectRoot
    });

    expect(result.output).toContain('## Verdict: PASS');
    expect(result.files).toHaveLength(0);
  });

  it('generates L12 planner artifacts (retrospective)', async () => {
    testProject = await createTestProject();
    const mockExecutor = new MockExecutor();

    const result = await mockExecutor.execute({
      layerId: 'L12',
      workingDir: testProject.projectRoot
    });

    expect(result.output).toBeTruthy();
    expect(result.tokenUsage.inputTokens).toBe(100);
    expect(fs.existsSync(path.join(testProject.projectRoot, '8-analysis', 'retrospective.md'))).toBe(true);
  });
});

describe('MockExecutor - Verdict Overrides', () => {
  let testProject;

  afterEach(async () => {
    if (testProject?.cleanup) {
      await testProject.cleanup();
    }
  });

  it('applies static verdict override for ITERATE with MAJOR severity', async () => {
    testProject = await createTestProject();
    const mockExecutor = new MockExecutor({
      verdictOverrides: {
        L9: {
          verdict: 'ITERATE',
          severity: 'MAJOR',
          issues: [{ title: 'Test Issue', description: 'Test description' }]
        }
      }
    });

    const result = await mockExecutor.execute({
      layerId: 'L9',
      workingDir: testProject.projectRoot
    });

    expect(result.output).toContain('## Verdict: ITERATE');
    expect(result.output).toContain('[MAJOR]');
    expect(result.output).toContain('Test Issue');
  });

  it('applies function-based verdict override (ITERATE then PASS)', async () => {
    testProject = await createTestProject();
    const mockExecutor = new MockExecutor({
      verdictOverrides: {
        L9: (iteration) => iteration === 1
          ? { verdict: 'ITERATE', severity: 'MINOR', issues: [{ title: 'First', description: 'Try again' }] }
          : { verdict: 'PASS' }
      }
    });

    const result1 = await mockExecutor.execute({
      layerId: 'L9',
      workingDir: testProject.projectRoot
    });
    expect(result1.output).toContain('## Verdict: ITERATE');

    const result2 = await mockExecutor.execute({
      layerId: 'L9',
      workingDir: testProject.projectRoot
    });
    expect(result2.output).toContain('## Verdict: PASS');
  });

  it('returns default PASS verdict when no override specified', async () => {
    testProject = await createTestProject();
    const mockExecutor = new MockExecutor();

    const result = await mockExecutor.execute({
      layerId: 'L9',
      workingDir: testProject.projectRoot
    });

    expect(result.output).toContain('## Verdict: PASS');
    expect(result.output).not.toContain('ITERATE');
  });
});

describe('MockExecutor - Timing Overrides', () => {
  let testProject;

  afterEach(async () => {
    if (testProject?.cleanup) {
      await testProject.cleanup();
    }
  });

  it('delays execution according to timingOverrides', async () => {
    testProject = await createTestProject();
    const mockExecutor = new MockExecutor({
      timingOverrides: { L8: { delayMs: 50 } }
    });

    const startTime = Date.now();
    await mockExecutor.execute({
      layerId: 'L8',
      workingDir: testProject.projectRoot
    });
    const elapsed = Date.now() - startTime;

    expect(elapsed).toBeGreaterThanOrEqual(40);
  });

  it('rejects with AbortError when signal times out', async () => {
    testProject = await createTestProject();
    const mockExecutor = new MockExecutor({
      timingOverrides: { L8: { delayMs: 200 } }
    });

    await expect(
      mockExecutor.execute(
        { layerId: 'L8', workingDir: testProject.projectRoot },
        { signal: AbortSignal.timeout(30) }
      )
    ).rejects.toThrow();
  });
});

describe('MockExecutor - Edge Cases', () => {
  let testProject;

  afterEach(async () => {
    if (testProject?.cleanup) {
      await testProject.cleanup();
    }
  });

  it('handles unknown layer ID without throwing', async () => {
    testProject = await createTestProject();
    const mockExecutor = new MockExecutor();

    const result = await mockExecutor.execute({
      layerId: 'L99',
      workingDir: testProject.projectRoot
    });

    expect(result.output).toContain('WARNING');
    expect(result.files).toHaveLength(0);
    expect(result.tokenUsage.inputTokens).toBe(100);
  });

  it('handles empty spawnConfig without throwing', async () => {
    testProject = await createTestProject();
    const mockExecutor = new MockExecutor();

    const result = await mockExecutor.execute({});

    expect(result.output).toBeTruthy();
    expect(Array.isArray(result.files)).toBe(true);
    expect(result.tokenUsage).toBeTruthy();
  });

  it('handles null spawnConfig without throwing', async () => {
    const mockExecutor = new MockExecutor();

    const result = await mockExecutor.execute(null);

    expect(result.output).toContain('WARNING');
    expect(result.files).toHaveLength(0);
  });

  it('tracks calls in callLog correctly', async () => {
    testProject = await createTestProject();
    const callLog = [];
    const mockExecutor = new MockExecutor({ callLog });

    await mockExecutor.execute({ layerId: 'L1', workingDir: testProject.projectRoot });
    await mockExecutor.execute({ layerId: 'L1', workingDir: testProject.projectRoot });
    await mockExecutor.execute({ layerId: 'L9', workingDir: testProject.projectRoot });

    expect(callLog).toHaveLength(3);
    expect(callLog[0].layerId).toBe('L1');
    expect(callLog[0].iteration).toBe(1);
    expect(callLog[1].layerId).toBe('L1');
    expect(callLog[1].iteration).toBe(2);
    expect(callLog[2].layerId).toBe('L9');
    expect(callLog[2].iteration).toBe(1);
  });

  it('extracts layer from prompt as fallback', async () => {
    testProject = await createTestProject();
    const mockExecutor = new MockExecutor();

    const result = await mockExecutor.execute({
      prompt: 'This is for Layer L4 epic definition',
      workingDir: testProject.projectRoot
    });

    expect(result.output).toBeTruthy();
    // Should have routed to planner generator for L4
    expect(mockExecutor.callLog[0].layerId).toBe('L4');
  });
});

describe('createTestProject', () => {
  it('creates project directory with expected structure', async () => {
    const { projectRoot, cleanup } = await createTestProject();

    expect(fs.existsSync(projectRoot)).toBe(true);
    expect(fs.existsSync(path.join(projectRoot, '1-input'))).toBe(true);
    expect(fs.existsSync(path.join(projectRoot, '2-decomposition'))).toBe(true);
    expect(fs.existsSync(path.join(projectRoot, '3-synthesis'))).toBe(true);
    expect(fs.existsSync(path.join(projectRoot, '4-epics'))).toBe(true);
    expect(fs.existsSync(path.join(projectRoot, '5-features'))).toBe(true);
    expect(fs.existsSync(path.join(projectRoot, '6-tasks'))).toBe(true);
    expect(fs.existsSync(path.join(projectRoot, '7-subtasks'))).toBe(true);
    expect(fs.existsSync(path.join(projectRoot, '8-analysis'))).toBe(true);

    await cleanup();
  });

  it('generates valid brain-dump.md with required sections', async () => {
    const { projectRoot, cleanup } = await createTestProject();

    const brainDumpPath = path.join(projectRoot, '1-input', 'brain-dump.md');
    expect(fs.existsSync(brainDumpPath)).toBe(true);

    const content = fs.readFileSync(brainDumpPath, 'utf-8');
    expect(content).toContain('## Description');
    expect(content).toContain('## Goals');

    await cleanup();
  });

  it('generates _status.md with correct format', async () => {
    const { projectRoot, cleanup } = await createTestProject({ withGatesApproved: true });

    const statusPath = path.join(projectRoot, '_status.md');
    expect(fs.existsSync(statusPath)).toBe(true);

    const content = fs.readFileSync(statusPath, 'utf-8');
    expect(content).toContain('## Meta');
    expect(content).toContain('## Current Position');
    expect(content).toContain('## Gates');
    expect(content).toContain('approved');

    await cleanup();
  });

  it('removes all files on cleanup', async () => {
    const { projectRoot, cleanup } = await createTestProject();

    expect(fs.existsSync(projectRoot)).toBe(true);
    await cleanup();
    expect(fs.existsSync(projectRoot)).toBe(false);
  });

  it('creates unique directories for concurrent calls', async () => {
    const [project1, project2] = await Promise.all([
      createTestProject(),
      createTestProject()
    ]);

    expect(project1.projectRoot).not.toBe(project2.projectRoot);
    expect(fs.existsSync(project1.projectRoot)).toBe(true);
    expect(fs.existsSync(project2.projectRoot)).toBe(true);

    await project1.cleanup();
    await project2.cleanup();
  });
});
