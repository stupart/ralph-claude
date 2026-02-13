/**
 * Agent Spawner Tests
 *
 * Tests for the Layer Cake agent spawner module.
 * Run with: node tests/agent-spawner.test.js
 */

const { AgentSpawner, AGENT_MODEL, AGENT_CONFIGS, LAYER_AGENTS, TOOL_PERMISSIONS, LAYER_CONTEXT, normalizeAgentType } = require('../lib/agent-spawner');
const fs = require('fs').promises;
const path = require('path');

const TEST_ROOT = path.join(__dirname, '.test-spawner-project');

// Simple test framework
let passed = 0;
let failed = 0;

function test(name, fn) {
  return async () => {
    try {
      await fn();
      console.log(`  ✓ ${name}`);
      passed++;
    } catch (err) {
      console.log(`  ✗ ${name}`);
      console.log(`    Error: ${err.message}`);
      failed++;
    }
  };
}

function assert(condition, message) {
  if (!condition) throw new Error(message || 'Assertion failed');
}

async function setup() {
  await fs.mkdir(TEST_ROOT, { recursive: true });
  // Create templates directory with a basic template
  const templatesDir = path.join(TEST_ROOT, 'templates', 'agents');
  await fs.mkdir(templatesDir, { recursive: true });
  await fs.writeFile(path.join(templatesDir, 'planner-base.md'), 'You are a planner.\n{{LAYER_INSTRUCTIONS}}');
  await fs.writeFile(path.join(templatesDir, 'builder-base.md'), 'You are a builder.\n{{LAYER_INSTRUCTIONS}}');
  await fs.writeFile(path.join(templatesDir, 'judge-base.md'), 'You are a judge.\n{{LAYER_INSTRUCTIONS}}');
}

async function cleanup() {
  try {
    await fs.rm(TEST_ROOT, { recursive: true, force: true });
  } catch {}
}

// ============= Tests =============

const tests = [
  // --- Layer-to-agent mapping ---
  test('L1-L7 map to planner', async () => {
    const spawner = new AgentSpawner(TEST_ROOT);
    for (let i = 1; i <= 7; i++) {
      assert(spawner.getAgentType(`L${i}`) === 'planner', `L${i} should map to planner`);
    }
  }),

  test('L8 maps to builder', async () => {
    const spawner = new AgentSpawner(TEST_ROOT);
    assert(spawner.getAgentType('L8') === 'builder', 'L8 should map to builder');
  }),

  test('L9-L11 map to judge', async () => {
    const spawner = new AgentSpawner(TEST_ROOT);
    for (let i = 9; i <= 11; i++) {
      assert(spawner.getAgentType(`L${i}`) === 'judge', `L${i} should map to judge`);
    }
  }),

  test('L12 maps to planner', async () => {
    const spawner = new AgentSpawner(TEST_ROOT);
    assert(spawner.getAgentType('L12') === 'planner', 'L12 should map to planner');
  }),

  test('Unknown layer defaults to planner', async () => {
    const spawner = new AgentSpawner(TEST_ROOT);
    assert(spawner.getAgentType('L99') === 'planner', 'Unknown layer should default to planner');
  }),

  // --- Tool permissions ---
  test('Planner has Read/Write/Glob/Grep', async () => {
    const spawner = new AgentSpawner(TEST_ROOT);
    const perms = spawner.getToolPermissions('planner');
    assert(perms.allowed.includes('Read'), 'Planner should have Read');
    assert(perms.allowed.includes('Write'), 'Planner should have Write');
    assert(perms.allowed.includes('Glob'), 'Planner should have Glob');
    assert(perms.allowed.includes('Grep'), 'Planner should have Grep');
  }),

  test('Planner cannot use Bash or Edit', async () => {
    const spawner = new AgentSpawner(TEST_ROOT);
    const perms = spawner.getToolPermissions('planner');
    assert(perms.forbidden.includes('Bash'), 'Planner should not have Bash');
    assert(perms.forbidden.includes('Edit'), 'Planner should not have Edit');
  }),

  test('Builder has all implementation tools, /chrome forbidden', async () => {
    const spawner = new AgentSpawner(TEST_ROOT);
    const perms = spawner.getToolPermissions('builder');
    assert(perms.allowed.includes('Bash'), 'Builder should have Bash');
    assert(perms.allowed.includes('Edit'), 'Builder should have Edit');
    assert(perms.allowed.includes('Write'), 'Builder should have Write');
    assert(perms.forbidden.includes('/chrome'), 'Builder should have /chrome forbidden');
    assert(perms.forbidden.length === 1, 'Builder should only have /chrome forbidden');
  }),

  test('Judge has Read/Glob/Grep only', async () => {
    const spawner = new AgentSpawner(TEST_ROOT);
    const perms = spawner.getToolPermissions('judge');
    assert(perms.allowed.includes('Read'), 'Judge should have Read');
    assert(perms.allowed.includes('Glob'), 'Judge should have Glob');
    assert(perms.forbidden.includes('Write'), 'Judge should not have Write');
    assert(perms.forbidden.includes('Edit'), 'Judge should not have Edit');
  }),

  test('Judge has limited Bash (tests_only)', async () => {
    const spawner = new AgentSpawner(TEST_ROOT);
    const perms = spawner.getToolPermissions('judge');
    assert(perms.limited && perms.limited.Bash === 'tests_only', 'Judge Bash should be tests_only');
  }),

  // --- Tool validation ---
  test('validateToolUsage allows planner to Read', async () => {
    const spawner = new AgentSpawner(TEST_ROOT);
    const result = spawner.validateToolUsage('planner', 'Read');
    assert(result.allowed === true, 'Planner should be allowed to Read');
  }),

  test('validateToolUsage denies planner from Bash', async () => {
    const spawner = new AgentSpawner(TEST_ROOT);
    const result = spawner.validateToolUsage('planner', 'Bash');
    assert(result.allowed === false, 'Planner should be denied Bash');
  }),

  test('validateToolUsage allows judge Bash for test commands', async () => {
    const spawner = new AgentSpawner(TEST_ROOT);
    const result = spawner.validateToolUsage('judge', 'Bash', { command: 'npm test' });
    assert(result.allowed === true, 'Judge should be allowed Bash for tests');
  }),

  test('validateToolUsage denies judge Bash for non-test commands', async () => {
    const spawner = new AgentSpawner(TEST_ROOT);
    const result = spawner.validateToolUsage('judge', 'Bash', { command: 'rm -rf /' });
    assert(result.allowed === false, 'Judge should be denied non-test Bash');
  }),

  test('validateToolUsage denies unknown agent type', async () => {
    const spawner = new AgentSpawner(TEST_ROOT);
    const result = spawner.validateToolUsage('hacker', 'Bash');
    assert(result.allowed === false, 'Unknown agent should be denied');
  }),

  // --- Prompt loading ---
  test('loadPromptTemplate loads base template', async () => {
    const spawner = new AgentSpawner(TEST_ROOT);
    const prompt = await spawner.loadPromptTemplate('planner');
    assert(prompt.includes('You are a planner'), 'Should load planner template');
  }),

  test('loadPromptTemplate loads builder template', async () => {
    const spawner = new AgentSpawner(TEST_ROOT);
    const prompt = await spawner.loadPromptTemplate('builder');
    assert(prompt.includes('You are a builder'), 'Should load builder template');
  }),

  // --- Context assembly ---
  test('assembleContext returns layer description', async () => {
    const spawner = new AgentSpawner(TEST_ROOT);
    const context = await spawner.assembleContext('L1');
    assert(context.layer === 'L1', 'Context should have layer');
    assert(context.description.length > 0, 'Context should have description');
  }),

  test('assembleContext loads files for layer', async () => {
    // Create some input files
    const inputDir = path.join(TEST_ROOT, '1-input');
    await fs.mkdir(inputDir, { recursive: true });
    await fs.writeFile(path.join(inputDir, 'brain-dump.md'), 'Some content');

    const spawner = new AgentSpawner(TEST_ROOT);
    const context = await spawner.assembleContext('L2');
    assert(context.files.length > 0, 'Should find input files for L2');

    // Cleanup
    await fs.rm(inputDir, { recursive: true, force: true });
  }),

  // --- Spawn config ---
  test('createSpawnConfig returns complete config', async () => {
    const spawner = new AgentSpawner(TEST_ROOT);
    const config = await spawner.createSpawnConfig('L4', { epic: null, feature: null });

    assert(config.agentType === 'planner', 'Should be planner for L4');
    assert(config.model === AGENT_MODEL, 'Should use correct model');
    assert(config.layerId === 'L4', 'Layer should be L4');
    assert(config.permissions !== undefined, 'Should have permissions');
    assert(config.context !== undefined, 'Should have context');
    assert(config.timestamp !== undefined, 'Should have timestamp');
  }),

  test('createSpawnConfig uses opus model for all agent types', async () => {
    const spawner = new AgentSpawner(TEST_ROOT);

    const plannerConfig = await spawner.createSpawnConfig('L4', {});
    assert(plannerConfig.model === 'opus', 'Planner should use opus');

    const builderConfig = await spawner.createSpawnConfig('L8', {});
    assert(builderConfig.model === 'opus', 'Builder should use opus');

    const judgeConfig = await spawner.createSpawnConfig('L9', {});
    assert(judgeConfig.model === 'opus', 'Judge should use opus');
  }),

  // --- LAYER_CONTEXT completeness ---
  test('LAYER_CONTEXT has entries for all layers', async () => {
    for (let i = 1; i <= 12; i++) {
      assert(LAYER_CONTEXT[`L${i}`] !== undefined, `LAYER_CONTEXT should have L${i}`);
      assert(LAYER_CONTEXT[`L${i}`].description.length > 0, `L${i} should have a description`);
    }
  }),

  // --- Pattern matching ---
  test('matchesPattern handles wildcards', async () => {
    const spawner = new AgentSpawner(TEST_ROOT);
    assert(spawner.matchesPattern('anything.md', '*') === true, '* should match anything');
    assert(spawner.matchesPattern('feature-1.md', 'feature-*.md') === true, 'Should match wildcard');
    assert(spawner.matchesPattern('task-1.md', 'feature-*.md') === false, 'Should not match different prefix');
    assert(spawner.matchesPattern('exact.md', 'exact.md') === true, 'Should match exact');
  }),

  // --- Agent type normalization ---
  test('normalizeAgentType maps "reviewer" to "judge"', async () => {
    assert(normalizeAgentType('reviewer') === 'judge', '"reviewer" should normalize to "judge"');
    assert(normalizeAgentType('review') === 'judge', '"review" should normalize to "judge"');
  }),

  test('normalizeAgentType passes through canonical names', async () => {
    assert(normalizeAgentType('planner') === 'planner', '"planner" should stay "planner"');
    assert(normalizeAgentType('builder') === 'builder', '"builder" should stay "builder"');
    assert(normalizeAgentType('judge') === 'judge', '"judge" should stay "judge"');
  }),

  test('getToolPermissions accepts "reviewer" alias', async () => {
    const spawner = new AgentSpawner(TEST_ROOT);
    const perms = spawner.getToolPermissions('reviewer');
    assert(perms.allowed.includes('Read'), '"reviewer" should resolve to judge permissions with Read');
    assert(perms.forbidden.includes('Write'), '"reviewer" should resolve to judge permissions with Write forbidden');
  }),

  test('validateToolUsage accepts "reviewer" alias', async () => {
    const spawner = new AgentSpawner(TEST_ROOT);
    const result = spawner.validateToolUsage('reviewer', 'Read');
    assert(result.allowed === true, '"reviewer" should be allowed to Read (as judge)');
    const result2 = spawner.validateToolUsage('reviewer', 'Write');
    assert(result2.allowed === false, '"reviewer" should not be allowed to Write (as judge)');
  })
];

// ============= Run Tests =============

async function runTests() {
  console.log('\nAgent Spawner Tests');
  console.log('====================\n');

  await setup();

  for (const testFn of tests) {
    await testFn();
  }

  await cleanup();

  console.log(`\nResults: ${passed} passed, ${failed} failed\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Test runner error:', err);
  process.exit(1);
});
