/**
 * Validator Tests (jest format)
 *
 * Tests for the Layer Cake validator module.
 * Converted from custom runner to jest in gen4.
 */

const { Validator, ValidationResult, MINIMUMS, REQUIRED_SECTIONS } = require('../lib/validator');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');

let TEST_ROOT;

beforeEach(async () => {
  TEST_ROOT = await fs.mkdtemp(path.join(os.tmpdir(), 'val-test-'));
});

afterEach(async () => {
  await fs.rm(TEST_ROOT, { recursive: true, force: true });
});

describe('ValidationResult', () => {
  test('starts with passed=true', () => {
    const result = new ValidationResult();
    expect(result.passed).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.warnings).toHaveLength(0);
  });

  test('addError sets passed to false', () => {
    const result = new ValidationResult();
    result.addError('Something failed');
    expect(result.passed).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].message).toBe('Something failed');
  });

  test('addWarning does not affect passed', () => {
    const result = new ValidationResult();
    result.addWarning('Minor issue');
    expect(result.passed).toBe(true);
    expect(result.warnings).toHaveLength(1);
  });

  test('setCount adds error when below minimum', () => {
    const result = new ValidationResult();
    result.setCount('epics', 2, 3);
    expect(result.passed).toBe(false);
    expect(result.counts.epics.count).toBe(2);
    expect(result.counts.epics.minimum).toBe(3);
    expect(result.counts.epics.met).toBe(false);
  });

  test('setCount passes when at or above minimum', () => {
    const result = new ValidationResult();
    result.setCount('epics', 5, 3);
    expect(result.passed).toBe(true);
    expect(result.counts.epics.met).toBe(true);
  });
});

describe('Validator tier minimums', () => {
  test('uses correct tier minimums', () => {
    const small = new Validator(TEST_ROOT, 'small');
    expect(small.minimums.epics).toBe(3);

    const micro = new Validator(TEST_ROOT, 'micro');
    expect(micro.minimums.epics).toBe(1);

    const medium = new Validator(TEST_ROOT, 'medium');
    expect(medium.minimums.epics).toBe(4);

    const large = new Validator(TEST_ROOT, 'large');
    expect(large.minimums.epics).toBe(5);
  });

  test('defaults to small tier for unknown tier', () => {
    const v = new Validator(TEST_ROOT, 'nonexistent');
    expect(v.minimums.epics).toBe(3);
  });

  test('micro tier has lower minimums than small', () => {
    expect(MINIMUMS.micro.epics).toBeLessThan(MINIMUMS.small.epics);
    expect(MINIMUMS.micro.features).toBeLessThan(MINIMUMS.small.features);
  });

  test('large tier has higher minimums than medium', () => {
    expect(MINIMUMS.large.epics).toBeGreaterThan(MINIMUMS.medium.epics);
    expect(MINIMUMS.large.subtasks).toBeGreaterThan(MINIMUMS.medium.subtasks);
  });
});

describe('Required sections', () => {
  test('REQUIRED_SECTIONS has correct keys', () => {
    expect(REQUIRED_SECTIONS.epic).toBeDefined();
    expect(REQUIRED_SECTIONS.feature).toBeDefined();
    expect(REQUIRED_SECTIONS.task).toBeDefined();
    expect(REQUIRED_SECTIONS.subtask).toBeDefined();
  });

  test('hasSection detects markdown sections', () => {
    const v = new Validator(TEST_ROOT);
    expect(v.hasSection('## Description\nSome text', 'Description')).toBe(true);
    expect(v.hasSection('### Scope\nSome text', 'Scope')).toBe(true);
    expect(v.hasSection('Some text without headers', 'Description')).toBe(false);
  });

  test('validateFeatureFile reports missing sections as errors', async () => {
    const v = new Validator(TEST_ROOT);
    const featurePath = path.join(TEST_ROOT, 'test-feature.md');
    await fs.writeFile(featurePath, '# Feature\n\nSome content without required sections\n- [ ] check\n');

    const result = new ValidationResult();
    await v.validateFeatureFile(featurePath, result);

    expect(result.passed).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  test('validateSections reports missing sections as errors', () => {
    const v = new Validator(TEST_ROOT);
    const content = 'Epic 1\nSome content without proper sections';
    const result = new ValidationResult();
    v.validateSections(content, 'epic', result);

    expect(result.passed).toBe(false);
    expect(result.errors.some(e => e.message.includes('Missing required'))).toBe(true);
  });
});

describe('Counting', () => {
  test('countMarkdownItems counts epic headers', () => {
    const v = new Validator(TEST_ROOT);
    const content = '## Epic 1\nContent\n## Epic 2\nContent\n## Epic 3\nContent';
    expect(v.countMarkdownItems(content, 'epic')).toBe(3);
  });

  test('countMarkdownItems counts JTBD headers', () => {
    const v = new Validator(TEST_ROOT);
    const content = '## Job 1\nContent\n## Job 2\nContent';
    expect(v.countMarkdownItems(content, 'JTBD')).toBe(2);
  });

  test('countMarkdownItems returns 0 for no matches', () => {
    const v = new Validator(TEST_ROOT);
    expect(v.countMarkdownItems('No headers here', 'epic')).toBe(0);
  });
});

describe('Layer validation', () => {
  test('returns warning for unsupported layers', async () => {
    const v = new Validator(TEST_ROOT);
    const result = await v.validateLayer('L1');
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  test('L4 errors on missing epics.md', async () => {
    const v = new Validator(TEST_ROOT);
    await fs.mkdir(path.join(TEST_ROOT, '4-epics'), { recursive: true });

    const result = await v.validateLayer('L4');
    expect(result.passed).toBe(false);
  });
});
