/**
 * Agent Spawner Tests (jest format)
 *
 * Tests for the Layer Cake agent spawner module.
 * Converted from custom runner to jest in gen4.
 */

const { AgentSpawner, TemplateCache, AGENT_MODEL, AGENT_CONFIGS, LAYER_AGENTS, TOOL_PERMISSIONS, LAYER_CONTEXT, normalizeAgentType } = require('../lib/agent-spawner');
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

describe('TemplateCache', () => {
  test('returns null on cache miss', async () => {
    const cache = new TemplateCache();
    const result = await cache.get('/nonexistent/path.md');
    expect(result).toBeNull();
  });

  test('caches and retrieves file content', async () => {
    const cache = new TemplateCache();
    const filePath = path.join(TEST_ROOT, 'templates', 'agents', 'planner-base.md');
    const stat = await fs.stat(filePath);
    const content = await fs.readFile(filePath, 'utf8');

    cache.set(filePath, content, stat.mtimeMs);
    const cached = await cache.get(filePath);
    expect(cached).toBe(content);
  });

  test('invalidates cache when file mtime changes', async () => {
    const cache = new TemplateCache();
    const filePath = path.join(TEST_ROOT, 'templates', 'agents', 'planner-base.md');

    // Cache with old mtime
    cache.set(filePath, 'old content', 1000);
    const result = await cache.get(filePath);
    // mtime won't match the fake 1000ms, so should invalidate
    expect(result).toBeNull();
    expect(cache.size).toBe(0); // evicted
  });

  test('evicts oldest entry when at capacity', async () => {
    const cache = new TemplateCache(2);
    const filePath1 = path.join(TEST_ROOT, 'templates', 'agents', 'planner-base.md');
    const filePath2 = path.join(TEST_ROOT, 'templates', 'agents', 'builder-base.md');
    const filePath3 = path.join(TEST_ROOT, 'templates', 'agents', 'judge-base.md');

    const stat1 = await fs.stat(filePath1);
    const stat2 = await fs.stat(filePath2);
    const stat3 = await fs.stat(filePath3);

    cache.set(filePath1, 'planner', stat1.mtimeMs);
    cache.set(filePath2, 'builder', stat2.mtimeMs);
    expect(cache.size).toBe(2);

    // Adding a third should evict the first (oldest)
    cache.set(filePath3, 'judge', stat3.mtimeMs);
    expect(cache.size).toBe(2);

    // filePath1 should have been evicted from the internal Map
    expect(cache.cache.has(filePath1)).toBe(false);
    // filePath2 and filePath3 should still be present
    expect(cache.cache.has(filePath2)).toBe(true);
    expect(cache.cache.has(filePath3)).toBe(true);
  });

  test('clear removes all entries', () => {
    const cache = new TemplateCache();
    cache.set('/a', 'a', 1);
    cache.set('/b', 'b', 2);
    expect(cache.size).toBe(2);

    cache.clear();
    expect(cache.size).toBe(0);
  });
});

describe('Cached prompt loading', () => {
  test('loadPromptTemplate returns same result on second call (from cache)', async () => {
    const spawner = new AgentSpawner(TEST_ROOT);
    const first = await spawner.loadPromptTemplate('planner');
    const second = await spawner.loadPromptTemplate('planner');
    expect(first).toBe(second);
    expect(spawner.templateCache.size).toBeGreaterThan(0);
  });

  test('readCachedFile returns cached content on second read', async () => {
    const spawner = new AgentSpawner(TEST_ROOT);
    const filePath = path.join(TEST_ROOT, 'templates', 'agents', 'planner-base.md');

    const first = await spawner.readCachedFile(filePath);
    expect(spawner.templateCache.size).toBe(1);

    const second = await spawner.readCachedFile(filePath);
    expect(second).toBe(first);
  });

  test('readCachedFile invalidates on file change', async () => {
    const spawner = new AgentSpawner(TEST_ROOT);
    const filePath = path.join(TEST_ROOT, 'templates', 'agents', 'planner-base.md');

    const first = await spawner.readCachedFile(filePath);

    // Modify the file (with a small delay to ensure mtime differs)
    await new Promise(r => setTimeout(r, 50));
    await fs.writeFile(filePath, 'Updated planner template.\n{{LAYER_INSTRUCTIONS}}');

    const second = await spawner.readCachedFile(filePath);
    expect(second).not.toBe(first);
    expect(second).toContain('Updated planner template');
  });
});
