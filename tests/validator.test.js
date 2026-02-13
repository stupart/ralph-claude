/**
 * Validator Tests
 *
 * Tests for the Layer Cake validator module.
 * Run with: node tests/validator.test.js
 */

const { Validator, ValidationResult, MINIMUMS, REQUIRED_SECTIONS } = require('../lib/validator');
const fs = require('fs').promises;
const path = require('path');

const TEST_ROOT = path.join(__dirname, '.test-validator-project');

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
}

async function cleanup() {
  try {
    await fs.rm(TEST_ROOT, { recursive: true, force: true });
  } catch {}
}

// ============= Tests =============

const tests = [
  // --- ValidationResult ---
  test('ValidationResult starts with passed=true', async () => {
    const result = new ValidationResult();
    assert(result.passed === true, 'Should start as passed');
    assert(result.errors.length === 0, 'Should have no errors');
    assert(result.warnings.length === 0, 'Should have no warnings');
  }),

  test('addError sets passed to false', async () => {
    const result = new ValidationResult();
    result.addError('Something failed');
    assert(result.passed === false, 'Should be failed');
    assert(result.errors.length === 1, 'Should have 1 error');
    assert(result.errors[0].message === 'Something failed', 'Error message should match');
  }),

  test('addWarning does not affect passed', async () => {
    const result = new ValidationResult();
    result.addWarning('Minor issue');
    assert(result.passed === true, 'Should still be passed');
    assert(result.warnings.length === 1, 'Should have 1 warning');
  }),

  test('setCount adds error when below minimum', async () => {
    const result = new ValidationResult();
    result.setCount('epics', 2, 3);
    assert(result.passed === false, 'Should fail when below minimum');
    assert(result.counts.epics.count === 2, 'Count should be 2');
    assert(result.counts.epics.minimum === 3, 'Minimum should be 3');
    assert(result.counts.epics.met === false, 'met should be false');
  }),

  test('setCount passes when at or above minimum', async () => {
    const result = new ValidationResult();
    result.setCount('epics', 5, 3);
    assert(result.passed === true, 'Should pass when above minimum');
    assert(result.counts.epics.met === true, 'met should be true');
  }),

  // --- Minimum count validation ---
  test('Validator uses correct tier minimums', async () => {
    const small = new Validator(TEST_ROOT, 'small');
    assert(small.minimums.epics === 3, 'Small tier epics should be 3');

    const micro = new Validator(TEST_ROOT, 'micro');
    assert(micro.minimums.epics === 1, 'Micro tier epics should be 1');

    const medium = new Validator(TEST_ROOT, 'medium');
    assert(medium.minimums.epics === 4, 'Medium tier epics should be 4');

    const large = new Validator(TEST_ROOT, 'large');
    assert(large.minimums.epics === 5, 'Large tier epics should be 5');
  }),

  test('Validator defaults to small tier for unknown tier', async () => {
    const v = new Validator(TEST_ROOT, 'nonexistent');
    assert(v.minimums.epics === 3, 'Should default to small tier');
  }),

  // --- Required section checking ---
  test('REQUIRED_SECTIONS has correct keys', async () => {
    assert(REQUIRED_SECTIONS.epic !== undefined, 'Should have epic');
    assert(REQUIRED_SECTIONS.feature !== undefined, 'Should have feature');
    assert(REQUIRED_SECTIONS.task !== undefined, 'Should have task');
    assert(REQUIRED_SECTIONS.subtask !== undefined, 'Should have subtask');
  }),

  test('hasSection detects markdown sections', async () => {
    const v = new Validator(TEST_ROOT);
    assert(v.hasSection('## Description\nSome text', 'Description') === true,
      'Should find Description section');
    assert(v.hasSection('### Scope\nSome text', 'Scope') === true,
      'Should find Scope section');
    assert(v.hasSection('Some text without headers', 'Description') === false,
      'Should not find missing section');
  }),

  // --- Missing sections as errors (not warnings) ---
  test('validateFeatureFile reports missing sections as errors', async () => {
    const v = new Validator(TEST_ROOT);
    const featurePath = path.join(TEST_ROOT, 'test-feature.md');
    // Create a feature file missing required sections
    await fs.writeFile(featurePath, '# Feature\n\nSome content without required sections\n- [ ] check\n');

    const result = new ValidationResult();
    await v.validateFeatureFile(featurePath, result);

    assert(result.passed === false, 'Should fail for missing sections');
    assert(result.errors.length > 0, 'Should have errors (not just warnings) for missing sections');

    // Clean up
    await fs.unlink(featurePath);
  }),

  test('validateSections reports missing sections as errors', async () => {
    const v = new Validator(TEST_ROOT);
    const content = 'Epic 1\nSome content without proper sections';
    const result = new ValidationResult();
    v.validateSections(content, 'epic', result);

    assert(result.passed === false, 'Should fail for missing required sections');
    assert(result.errors.some(e => e.message.includes('Missing required')),
      'Error message should mention missing required sections');
  }),

  // --- Tier-adjusted minimums ---
  test('micro tier has lower minimums than small', async () => {
    assert(MINIMUMS.micro.epics < MINIMUMS.small.epics, 'Micro epics should be less than small');
    assert(MINIMUMS.micro.features < MINIMUMS.small.features, 'Micro features should be less than small');
  }),

  test('large tier has higher minimums than medium', async () => {
    assert(MINIMUMS.large.epics > MINIMUMS.medium.epics, 'Large epics should be more than medium');
    assert(MINIMUMS.large.subtasks > MINIMUMS.medium.subtasks, 'Large subtasks should be more than medium');
  }),

  // --- Counting ---
  test('countMarkdownItems counts epic headers', async () => {
    const v = new Validator(TEST_ROOT);
    const content = '## Epic 1\nContent\n## Epic 2\nContent\n## Epic 3\nContent';
    assert(v.countMarkdownItems(content, 'epic') === 3, 'Should count 3 epics');
  }),

  test('countMarkdownItems counts JTBD headers', async () => {
    const v = new Validator(TEST_ROOT);
    const content = '## Job 1\nContent\n## Job 2\nContent';
    assert(v.countMarkdownItems(content, 'JTBD') === 2, 'Should count 2 JTBDs');
  }),

  test('countMarkdownItems returns 0 for no matches', async () => {
    const v = new Validator(TEST_ROOT);
    assert(v.countMarkdownItems('No headers here', 'epic') === 0, 'Should return 0');
  }),

  // --- Layer validation ---
  test('validateLayer returns warning for unsupported layers', async () => {
    const v = new Validator(TEST_ROOT);
    const result = await v.validateLayer('L1');
    assert(result.warnings.length > 0, 'Should have warning for unsupported layer');
  }),

  test('validateLayer L4 errors on missing epics.md', async () => {
    const v = new Validator(TEST_ROOT);
    // Ensure 4-epics dir exists but no epics.md
    await fs.mkdir(path.join(TEST_ROOT, '4-epics'), { recursive: true });

    const result = await v.validateLayer('L4');
    assert(result.passed === false, 'Should fail when epics.md is missing');

    await fs.rm(path.join(TEST_ROOT, '4-epics'), { recursive: true, force: true });
  })
];

// ============= Run Tests =============

async function runTests() {
  console.log('\nValidator Tests');
  console.log('================\n');

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
