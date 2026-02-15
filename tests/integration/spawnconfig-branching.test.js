const { AgentSpawner } = require('../../lib/agent-spawner');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');

describe('SpawnConfig Context Branching', () => {
  let spawner;
  let testRoot;

  const handoff = {
    previousIssues: [
      { severity: 'MINOR', title: 'Test gap', description: 'Missing edge case test' },
      { severity: 'MAJOR', title: 'Bug found', description: 'Null pointer in handler' }
    ],
    iterationNumber: 2,
    maxIterations: 3
  };

  beforeEach(async () => {
    testRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'branching-test-'));
    const templatesDir = path.join(testRoot, 'templates', 'agents');
    await fs.mkdir(templatesDir, { recursive: true });
    await fs.writeFile(path.join(templatesDir, 'planner-base.md'), 'You are a planner.\n{{LAYER_INSTRUCTIONS}}');
    await fs.writeFile(path.join(templatesDir, 'builder-base.md'), 'You are a builder.\n{{LAYER_INSTRUCTIONS}}');
    await fs.writeFile(path.join(templatesDir, 'judge-base.md'), 'You are a judge.\n{{LAYER_INSTRUCTIONS}}');
    spawner = new AgentSpawner(testRoot);
  });

  afterEach(async () => {
    await fs.rm(testRoot, { recursive: true, force: true });
  });

  it('judge (L9) receives structured iteration context', async () => {
    const config = await spawner.createSpawnConfig('L9', {}, handoff);
    expect(config.prompt).toContain('## Review Iteration');
    expect(config.prompt).toContain('## Prior Iteration Issues (Verify Fixed)');
    expect(config.prompt).toContain('This is iteration 2 of 3 (max).');
  });

  it('builder (L8) receives iteration learning format', async () => {
    const config = await spawner.createSpawnConfig('L8', {}, handoff);
    expect(config.prompt).toContain('## Lessons from Previous Iteration');
    expect(config.prompt).not.toContain('## Prior Iteration Issues (Verify Fixed)');
  });

  it('judge (L9) with no issues gets iteration counter only', async () => {
    const noIssuesHandoff = {
      previousIssues: [],
      iterationNumber: 1,
      maxIterations: 3
    };
    const config = await spawner.createSpawnConfig('L9', {}, noIssuesHandoff);
    expect(config.prompt).toContain('## Review Iteration');
    expect(config.prompt).toContain('This is iteration 1 of 3 (max).');
    expect(config.prompt).not.toContain('## Prior Iteration Issues');
  });

  it('builder format matches existing buildIterationLearning() output', async () => {
    const config = await spawner.createSpawnConfig('L8', {}, handoff);
    expect(config.prompt).toContain('Lessons from Previous Iteration (iteration 2)');
    expect(config.prompt).toContain('[MINOR]');
    expect(config.prompt).toContain('[MAJOR]');
  });

  it('judge (L10) receives structured iteration context', async () => {
    const config = await spawner.createSpawnConfig('L10', {}, handoff);
    expect(config.prompt).toContain('## Review Iteration');
    expect(config.prompt).toContain('## Prior Iteration Issues (Verify Fixed)');
  });

  it('judge (L11) receives structured iteration context', async () => {
    const config = await spawner.createSpawnConfig('L11', {}, handoff);
    expect(config.prompt).toContain('## Review Iteration');
    expect(config.prompt).toContain('## Prior Iteration Issues (Verify Fixed)');
  });

  describe('Planner and unknown agent types', () => {
    it('planner (L5) receives no iteration context even with previousIssues', async () => {
      const config = await spawner.createSpawnConfig('L5', {}, handoff);
      expect(config.prompt).not.toContain('## Review Iteration');
      expect(config.prompt).not.toContain('## Prior Iteration Issues');
      expect(config.prompt).not.toContain('## Lessons from Previous Iteration');
    });
  });

  describe('Backwards compatibility', () => {
    it('null handoff does not cause an error', async () => {
      const config = await spawner.createSpawnConfig('L9', {}, null);
      expect(config).toHaveProperty('agentType', 'judge');
      expect(config).toHaveProperty('prompt');
      expect(config).toHaveProperty('toolPermissions');
    });

    it('empty handoff does not cause an error', async () => {
      const config = await spawner.createSpawnConfig('L9', {}, {});
      expect(config).toHaveProperty('agentType', 'judge');
      expect(config).toHaveProperty('prompt');
    });

    it('spawn config fields other than prompt are unchanged', async () => {
      const configWithHandoff = await spawner.createSpawnConfig('L9', {}, handoff);
      const configWithout = await spawner.createSpawnConfig('L9', {}, null);

      expect(configWithHandoff.agentType).toBe(configWithout.agentType);
      expect(configWithHandoff.model).toBe(configWithout.model);
      expect(configWithHandoff.layerId).toBe(configWithout.layerId);
      expect(JSON.stringify(configWithHandoff.toolPermissions))
        .toBe(JSON.stringify(configWithout.toolPermissions));
    });
  });
});
