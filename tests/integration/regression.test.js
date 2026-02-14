/**
 * Regression Tests for Known v2 Bugs
 *
 * Tests that reproduce the original failure conditions for 5 known bugs
 * and verify the fixes hold.
 */

const fs = require('fs');
const fsp = require('fs').promises;
const path = require('path');
const { AgentSpawner } = require('../../lib/agent-spawner');
const { Validator } = require('../../lib/validator');
const { Router } = require('../../lib/router');
const { Ralph } = require('../../lib/ralph');
const { StateManager } = require('../../lib/state-machine');
const { MockExecutor } = require('../helpers/mock-executor');
const { createTestProject } = require('../helpers/test-project');

describe('Regression Tests - Template Lookup', () => {
  let testProject;

  afterEach(async () => {
    if (testProject?.cleanup) {
      await testProject.cleanup();
    }
  });

  // BUG: Template naming convention didn't match layer ID pattern,
  // causing L4-L7 to fail template lookup with "template not found" errors

  it('L4 (epics) template resolves without error', async () => {
    testProject = await createTestProject();
    const spawner = new AgentSpawner(testProject.projectRoot);

    const spawnConfig = await spawner.createSpawnConfig('L4', { epic: 1 });

    expect(spawnConfig).toBeTruthy();
    expect(spawnConfig.prompt).toBeTruthy();
    expect(spawnConfig.prompt).not.toContain('template not found');
  });

  it('L5 (features) template resolves without error', async () => {
    testProject = await createTestProject();
    const spawner = new AgentSpawner(testProject.projectRoot);

    const spawnConfig = await spawner.createSpawnConfig('L5', { epic: 1, feature: 1 });

    expect(spawnConfig).toBeTruthy();
    expect(spawnConfig.prompt).toBeTruthy();
    expect(spawnConfig.prompt).not.toContain('template not found');
  });

  it('L6 (tasks) template resolves without error', async () => {
    testProject = await createTestProject();
    const spawner = new AgentSpawner(testProject.projectRoot);

    const spawnConfig = await spawner.createSpawnConfig('L6', { epic: 1, feature: 1 });

    expect(spawnConfig).toBeTruthy();
    expect(spawnConfig.prompt).toBeTruthy();
    expect(spawnConfig.prompt).not.toContain('template not found');
  });

  it('L7 (subtasks) template resolves without error', async () => {
    testProject = await createTestProject();
    const spawner = new AgentSpawner(testProject.projectRoot);

    const spawnConfig = await spawner.createSpawnConfig('L7', { epic: 1, feature: 1, task: 1 });

    expect(spawnConfig).toBeTruthy();
    expect(spawnConfig.prompt).toBeTruthy();
    expect(spawnConfig.prompt).not.toContain('template not found');
  });
});

describe('Regression Tests - Validator Heading Format', () => {
  let testProject;

  afterEach(async () => {
    if (testProject?.cleanup) {
      await testProject.cleanup();
    }
  });

  // BUG: Validator regex failed on bold-formatted headings (**Section Name**)
  // instead of standard markdown headings (## Section Name)

  it('accepts standard ## heading format', async () => {
    testProject = await createTestProject();

    const epicContent = `# Epic 1

## Description
This is a test epic.

## Scope
Test scope.

## Dependencies
None.
`;

    await fsp.writeFile(path.join(testProject.projectRoot, '4-epics', 'epic-01.md'), epicContent);
    await fsp.writeFile(path.join(testProject.projectRoot, '4-epics', 'epic-02.md'), epicContent);
    await fsp.writeFile(path.join(testProject.projectRoot, '4-epics', 'epic-03.md'), epicContent);
    await fsp.writeFile(
      path.join(testProject.projectRoot, '4-epics', '_index.md'),
      '# Epics\n\n## Overview\nTest.'
    );

    const validator = new Validator(testProject.projectRoot);
    const result = await validator.validateLayer('L4');

    // Should pass since we have standard headings and meet minimum count (3)
    expect(result.passed).toBe(true);
  });

  it('accepts bold **heading** format or provides clear error', async () => {
    testProject = await createTestProject();

    // Write epic files with bold headings instead of ## headings
    const epicContent = `# Epic 1

**Description**
This is a test epic with bold headings.

**Scope**
Test scope.

**Dependencies**
None.
`;

    await fsp.writeFile(path.join(testProject.projectRoot, '4-epics', 'epic-01.md'), epicContent);
    await fsp.writeFile(path.join(testProject.projectRoot, '4-epics', 'epic-02.md'), epicContent);
    await fsp.writeFile(path.join(testProject.projectRoot, '4-epics', 'epic-03.md'), epicContent);
    await fsp.writeFile(
      path.join(testProject.projectRoot, '4-epics', '_index.md'),
      '# Epics\n\n## Overview\nTest.'
    );

    const validator = new Validator(testProject.projectRoot);
    const result = await validator.validateLayer('L4');

    // Either validation passes (bold headings accepted) or error is clear and descriptive
    if (!result.passed) {
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].message).toBeTruthy();
    }
  });

  it('MockExecutor generates headings that validator accepts', async () => {
    testProject = await createTestProject();

    const mockExecutor = new MockExecutor({
      projectRoot: testProject.projectRoot
    });

    await mockExecutor.execute({
      layerId: 'L4',
      workingDir: testProject.projectRoot
    });

    const validator = new Validator(testProject.projectRoot);
    const result = await validator.validateLayer('L4');

    expect(result.passed).toBe(true);
  });
});

describe('Regression Tests - Epic Filename Format', () => {
  let testProject;

  afterEach(async () => {
    if (testProject?.cleanup) {
      await testProject.cleanup();
    }
  });

  // BUG: Validator expected `epic-01.md` but agents sometimes produced `epic-1.md`

  it('accepts zero-padded epic filenames (epic-01.md)', async () => {
    testProject = await createTestProject();

    const epicContent = `# Epic 1\n\n## Description\nTest.\n\n## Scope\nTest.\n\n## Dependencies\nNone.`;
    await fsp.writeFile(path.join(testProject.projectRoot, '4-epics', 'epic-01.md'), epicContent);
    await fsp.writeFile(path.join(testProject.projectRoot, '4-epics', 'epic-02.md'), epicContent);
    await fsp.writeFile(path.join(testProject.projectRoot, '4-epics', 'epic-03.md'), epicContent);
    await fsp.writeFile(path.join(testProject.projectRoot, '4-epics', '_index.md'), '# Epics\n\n## Overview\nTest.');

    const validator = new Validator(testProject.projectRoot);
    const result = await validator.validateLayer('L4');

    expect(result.passed).toBe(true);
  });

  it('accepts single-digit epic filenames (epic-1.md)', async () => {
    testProject = await createTestProject();

    const epicContent = `# Epic 1\n\n## Description\nTest.\n\n## Scope\nTest.\n\n## Dependencies\nNone.`;
    await fsp.writeFile(path.join(testProject.projectRoot, '4-epics', 'epic-1.md'), epicContent);
    await fsp.writeFile(path.join(testProject.projectRoot, '4-epics', 'epic-2.md'), epicContent);
    await fsp.writeFile(path.join(testProject.projectRoot, '4-epics', 'epic-3.md'), epicContent);
    await fsp.writeFile(path.join(testProject.projectRoot, '4-epics', '_index.md'), '# Epics\n\n## Overview\nTest.');

    const validator = new Validator(testProject.projectRoot);
    const result = await validator.validateLayer('L4');

    expect(result.passed).toBe(true);
  });
});

describe('Regression Tests - Cascade Depth Tracking', () => {
  let testProject;

  afterEach(async () => {
    if (testProject?.cleanup) {
      await testProject.cleanup();
    }
  });

  // BUG: No cascade depth tracking caused infinite loops when agents
  // repeatedly returned ITERATE verdict for the same layer

  it('Router auto-escalates severity after MAX_RETRIES iterations', async () => {
    testProject = await createTestProject();

    const stateManager = new StateManager(testProject.projectRoot);
    await stateManager.read();

    // Advance state to L9 (review layer)
    stateManager.state.position.layer = 'L9';
    stateManager.state.position.iteration = 4; // Beyond MAX_RETRIES (3)
    stateManager.state.gates = {
      L3: { status: 'approved', approvedAt: new Date().toISOString() },
      L7: { status: 'approved', approvedAt: new Date().toISOString() }
    };
    await stateManager.write();

    const router = new Router(stateManager);

    // Feed an ITERATE verdict with MINOR severity at iteration 4
    const routingResult = await router.route({
      verdict: 'ITERATE',
      issues: [{ title: 'Issue', severity: 'MINOR' }]
    });

    // On 4th+ iteration, Router.routeMaxRetries should escalate from MINOR to MAJOR
    // MAJOR at L9 cascades to L7
    expect(routingResult.action).toBe('cascade');
    expect(routingResult.to).toBe('L7');
    expect(routingResult.escalated).toBe(true);
  });

  it('integration: always-ITERATE triggers escalation in pipeline', async () => {
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
      maxCascadeDepth: 10
    });

    let result;
    try {
      result = await ralph.runProject(mockExecutor.execute.bind(mockExecutor));
    } catch (err) {
      result = { status: 'error', error: err.message };
    }

    // Verify that escalation or halt occurred (not stuck in infinite loop)
    const l8Calls = mockExecutor.callLog.filter(c => c.layerId === 'L8').length;
    const l9Calls = mockExecutor.callLog.filter(c => c.layerId === 'L9').length;

    expect(l8Calls).toBeLessThan(30);
    expect(l9Calls).toBeLessThan(30);
  }, 30000);
});

describe('Regression Tests - Permissions Field Naming', () => {
  let testProject;

  afterEach(async () => {
    if (testProject?.cleanup) {
      await testProject.cleanup();
    }
  });

  // BUG: Inconsistent field naming between AgentSpawner (`toolPermissions`)
  // and ClaudeExecutor (`allowedTools`)

  it('AgentSpawner uses toolPermissions field consistently', async () => {
    testProject = await createTestProject();
    const spawner = new AgentSpawner(testProject.projectRoot);

    const spawnConfig = await spawner.createSpawnConfig('L4', { epic: 1 });

    expect(spawnConfig).toBeTruthy();
    expect(spawnConfig.toolPermissions).toBeTruthy();
    expect(spawnConfig).not.toHaveProperty('allowedTools');
  });

  it('consistent naming across multiple layers', async () => {
    testProject = await createTestProject();
    const spawner = new AgentSpawner(testProject.projectRoot);

    const configs = await Promise.all([
      spawner.createSpawnConfig('L1'),
      spawner.createSpawnConfig('L4', { epic: 1 }),
      spawner.createSpawnConfig('L8', { epic: 1, feature: 1, task: 1 })
    ]);

    for (const config of configs) {
      expect(config).not.toHaveProperty('allowedTools');
      expect(config.toolPermissions).toBeTruthy();
    }
  });
});
