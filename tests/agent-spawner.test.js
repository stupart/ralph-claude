/**
 * Agent Spawner Tests (jest format)
 *
 * Tests for the Layer Cake agent spawner module.
 * Converted from custom runner to jest in gen4.
 */

const { AgentSpawner, AGENT_MODEL, AGENT_CONFIGS, LAYER_AGENTS, TOOL_PERMISSIONS, LAYER_CONTEXT, normalizeAgentType } = require('../lib/agent-spawner');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');

let TEST_ROOT;

beforeEach(async () => {
  TEST_ROOT = await fs.mkdtemp(path.join(os.tmpdir(), 'spawner-test-'));
  // Create templates directory with a basic template
  const templatesDir = path.join(TEST_ROOT, 'templates', 'agents');
  await fs.mkdir(templatesDir, { recursive: true });
  await fs.writeFile(path.join(templatesDir, 'planner-base.md'), 'You are a planner.\n{{LAYER_INSTRUCTIONS}}');
  await fs.writeFile(path.join(templatesDir, 'builder-base.md'), 'You are a builder.\n{{LAYER_INSTRUCTIONS}}');
  await fs.writeFile(path.join(templatesDir, 'judge-base.md'), 'You are a judge.\n{{LAYER_INSTRUCTIONS}}');
});

afterEach(async () => {
  await fs.rm(TEST_ROOT, { recursive: true, force: true });
});

describe('Layer-to-agent mapping', () => {
  test('L1-L7 map to planner', () => {
    const spawner = new AgentSpawner(TEST_ROOT);
    for (let i = 1; i <= 7; i++) {
      expect(spawner.getAgentType(`L${i}`)).toBe('planner');
    }
  });

  test('L8 maps to builder', () => {
    const spawner = new AgentSpawner(TEST_ROOT);
    expect(spawner.getAgentType('L8')).toBe('builder');
  });

  test('L9-L11 map to judge', () => {
    const spawner = new AgentSpawner(TEST_ROOT);
    for (let i = 9; i <= 11; i++) {
      expect(spawner.getAgentType(`L${i}`)).toBe('judge');
    }
  });

  test('L12 maps to planner', () => {
    const spawner = new AgentSpawner(TEST_ROOT);
    expect(spawner.getAgentType('L12')).toBe('planner');
  });

  test('Unknown layer defaults to planner', () => {
    const spawner = new AgentSpawner(TEST_ROOT);
    expect(spawner.getAgentType('L99')).toBe('planner');
  });
});

describe('Tool permissions', () => {
  test('Planner has Read/Write/Glob/Grep', () => {
    const spawner = new AgentSpawner(TEST_ROOT);
    const perms = spawner.getToolPermissions('planner');
    expect(perms.allowed).toContain('Read');
    expect(perms.allowed).toContain('Write');
    expect(perms.allowed).toContain('Glob');
    expect(perms.allowed).toContain('Grep');
  });

  test('Planner cannot use Bash or Edit', () => {
    const spawner = new AgentSpawner(TEST_ROOT);
    const perms = spawner.getToolPermissions('planner');
    expect(perms.forbidden).toContain('Bash');
    expect(perms.forbidden).toContain('Edit');
  });

  test('Builder has all implementation tools, /chrome forbidden', () => {
    const spawner = new AgentSpawner(TEST_ROOT);
    const perms = spawner.getToolPermissions('builder');
    expect(perms.allowed).toContain('Bash');
    expect(perms.allowed).toContain('Edit');
    expect(perms.allowed).toContain('Write');
    expect(perms.forbidden).toContain('/chrome');
    expect(perms.forbidden).toHaveLength(1);
  });

  test('Judge has Read/Glob/Grep only', () => {
    const spawner = new AgentSpawner(TEST_ROOT);
    const perms = spawner.getToolPermissions('judge');
    expect(perms.allowed).toContain('Read');
    expect(perms.allowed).toContain('Glob');
    expect(perms.forbidden).toContain('Write');
    expect(perms.forbidden).toContain('Edit');
  });

  test('Judge has limited Bash (tests_only)', () => {
    const spawner = new AgentSpawner(TEST_ROOT);
    const perms = spawner.getToolPermissions('judge');
    expect(perms.limited?.Bash).toBe('tests_only');
  });
});

describe('Tool usage validation', () => {
  test('allows planner to Read', () => {
    const spawner = new AgentSpawner(TEST_ROOT);
    const result = spawner.validateToolUsage('planner', 'Read');
    expect(result.allowed).toBe(true);
  });

  test('denies planner from Bash', () => {
    const spawner = new AgentSpawner(TEST_ROOT);
    const result = spawner.validateToolUsage('planner', 'Bash');
    expect(result.allowed).toBe(false);
  });

  test('allows judge Bash for test commands', () => {
    const spawner = new AgentSpawner(TEST_ROOT);
    const result = spawner.validateToolUsage('judge', 'Bash', { command: 'npm test' });
    expect(result.allowed).toBe(true);
  });

  test('denies judge Bash for non-test commands', () => {
    const spawner = new AgentSpawner(TEST_ROOT);
    const result = spawner.validateToolUsage('judge', 'Bash', { command: 'rm -rf /' });
    expect(result.allowed).toBe(false);
  });

  test('denies unknown agent type', () => {
    const spawner = new AgentSpawner(TEST_ROOT);
    const result = spawner.validateToolUsage('hacker', 'Bash');
    expect(result.allowed).toBe(false);
  });
});

describe('Prompt loading', () => {
  test('loadPromptTemplate loads base template', async () => {
    const spawner = new AgentSpawner(TEST_ROOT);
    const prompt = await spawner.loadPromptTemplate('planner');
    expect(prompt).toContain('You are a planner');
  });

  test('loadPromptTemplate loads builder template', async () => {
    const spawner = new AgentSpawner(TEST_ROOT);
    const prompt = await spawner.loadPromptTemplate('builder');
    expect(prompt).toContain('You are a builder');
  });
});

describe('Context assembly', () => {
  test('assembleContext returns layer description', async () => {
    const spawner = new AgentSpawner(TEST_ROOT);
    const context = await spawner.assembleContext('L1');
    expect(context.layer).toBe('L1');
    expect(context.description.length).toBeGreaterThan(0);
  });

  test('assembleContext loads files for layer', async () => {
    const inputDir = path.join(TEST_ROOT, '1-input');
    await fs.mkdir(inputDir, { recursive: true });
    await fs.writeFile(path.join(inputDir, 'brain-dump.md'), 'Some content');

    const spawner = new AgentSpawner(TEST_ROOT);
    const context = await spawner.assembleContext('L2');
    expect(context.files.length).toBeGreaterThan(0);
  });
});

describe('Spawn config', () => {
  test('createSpawnConfig returns complete config', async () => {
    const spawner = new AgentSpawner(TEST_ROOT);
    const config = await spawner.createSpawnConfig('L4', { epic: null, feature: null });
    expect(config.agentType).toBe('planner');
    expect(config.model).toBe(AGENT_MODEL);
    expect(config.layerId).toBe('L4');
    expect(config.permissions).toBeDefined();
    expect(config.context).toBeDefined();
    expect(config.timestamp).toBeDefined();
  });

  test('createSpawnConfig uses opus model for all agent types', async () => {
    const spawner = new AgentSpawner(TEST_ROOT);

    const plannerConfig = await spawner.createSpawnConfig('L4', {});
    expect(plannerConfig.model).toBe('opus');

    const builderConfig = await spawner.createSpawnConfig('L8', {});
    expect(builderConfig.model).toBe('opus');

    const judgeConfig = await spawner.createSpawnConfig('L9', {});
    expect(judgeConfig.model).toBe('opus');
  });
});

describe('LAYER_CONTEXT completeness', () => {
  test('has entries for all layers', () => {
    for (let i = 1; i <= 12; i++) {
      expect(LAYER_CONTEXT[`L${i}`]).toBeDefined();
      expect(LAYER_CONTEXT[`L${i}`].description.length).toBeGreaterThan(0);
    }
  });
});

describe('Pattern matching', () => {
  test('matchesPattern handles wildcards', () => {
    const spawner = new AgentSpawner(TEST_ROOT);
    expect(spawner.matchesPattern('anything.md', '*')).toBe(true);
    expect(spawner.matchesPattern('feature-1.md', 'feature-*.md')).toBe(true);
    expect(spawner.matchesPattern('task-1.md', 'feature-*.md')).toBe(false);
    expect(spawner.matchesPattern('exact.md', 'exact.md')).toBe(true);
  });
});

describe('Agent type normalization', () => {
  test('normalizeAgentType maps "reviewer" to "judge"', () => {
    expect(normalizeAgentType('reviewer')).toBe('judge');
    expect(normalizeAgentType('review')).toBe('judge');
  });

  test('normalizeAgentType passes through canonical names', () => {
    expect(normalizeAgentType('planner')).toBe('planner');
    expect(normalizeAgentType('builder')).toBe('builder');
    expect(normalizeAgentType('judge')).toBe('judge');
  });

  test('getToolPermissions accepts "reviewer" alias', () => {
    const spawner = new AgentSpawner(TEST_ROOT);
    const perms = spawner.getToolPermissions('reviewer');
    expect(perms.allowed).toContain('Read');
    expect(perms.forbidden).toContain('Write');
  });

  test('validateToolUsage accepts "reviewer" alias', () => {
    const spawner = new AgentSpawner(TEST_ROOT);
    expect(spawner.validateToolUsage('reviewer', 'Read').allowed).toBe(true);
    expect(spawner.validateToolUsage('reviewer', 'Write').allowed).toBe(false);
  });
});
