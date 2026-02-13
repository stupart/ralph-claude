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

describe('Edge cases: empty and whitespace content', () => {
  test('countMarkdownItems returns 0 for empty string', () => {
    const v = new Validator(TEST_ROOT);
    expect(v.countMarkdownItems('', 'epic')).toBe(0);
  });

  test('countMarkdownItems returns 0 for null/undefined', () => {
    const v = new Validator(TEST_ROOT);
    expect(v.countMarkdownItems(null, 'epic')).toBe(0);
    expect(v.countMarkdownItems(undefined, 'epic')).toBe(0);
  });

  test('countMarkdownItems returns 0 for whitespace-only content', () => {
    const v = new Validator(TEST_ROOT);
    expect(v.countMarkdownItems('   \n  \n\t\t\n', 'epic')).toBe(0);
  });

  test('extractItems returns empty array for empty/null content', () => {
    const v = new Validator(TEST_ROOT);
    expect(v.extractItems('', 'epic')).toEqual([]);
    expect(v.extractItems(null, 'epic')).toEqual([]);
    expect(v.extractItems(undefined, 'epic')).toEqual([]);
  });

  test('extractItems returns empty array for whitespace-only content', () => {
    const v = new Validator(TEST_ROOT);
    expect(v.extractItems('  \n  \n', 'epic')).toEqual([]);
  });

  test('hasSection returns false for empty/null content', () => {
    const v = new Validator(TEST_ROOT);
    expect(v.hasSection('', 'Description')).toBe(false);
    expect(v.hasSection(null, 'Description')).toBe(false);
    expect(v.hasSection(undefined, 'Description')).toBe(false);
  });

  test('hasSection returns false for whitespace-only content', () => {
    const v = new Validator(TEST_ROOT);
    expect(v.hasSection('   \n\t\n  ', 'Description')).toBe(false);
  });

  test('validateFeatureFile handles empty file gracefully', async () => {
    const v = new Validator(TEST_ROOT);
    const featurePath = path.join(TEST_ROOT, 'empty-feature.md');
    await fs.writeFile(featurePath, '');

    const result = new ValidationResult();
    await v.validateFeatureFile(featurePath, result);

    expect(result.passed).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  test('validateFeatureFile handles whitespace-only file', async () => {
    const v = new Validator(TEST_ROOT);
    const featurePath = path.join(TEST_ROOT, 'ws-feature.md');
    await fs.writeFile(featurePath, '   \n  \n\t\n');

    const result = new ValidationResult();
    await v.validateFeatureFile(featurePath, result);

    expect(result.passed).toBe(false);
  });
});

describe('Edge cases: CRLF line endings', () => {
  test('countMarkdownItems counts headers with CRLF line endings', () => {
    const v = new Validator(TEST_ROOT);
    const content = '## Epic 1\r\nContent\r\n## Epic 2\r\nContent\r\n## Epic 3\r\nContent';
    expect(v.countMarkdownItems(content, 'epic')).toBe(3);
  });

  test('countMarkdownItems counts JTBD headers with CRLF', () => {
    const v = new Validator(TEST_ROOT);
    const content = '## Job 1\r\nContent\r\n## Job 2\r\nContent';
    expect(v.countMarkdownItems(content, 'JTBD')).toBe(2);
  });

  test('extractItems handles CRLF content', () => {
    const v = new Validator(TEST_ROOT);
    const content = '## Epic 1\r\nDescription\r\n## Epic 2\r\nOther';
    const items = v.extractItems(content, 'epic');
    expect(items).toHaveLength(2);
  });

  test('hasSection detects sections with CRLF', () => {
    const v = new Validator(TEST_ROOT);
    expect(v.hasSection('## Description\r\nSome text\r\n## Scope\r\nMore', 'Description')).toBe(true);
    expect(v.hasSection('## Description\r\nSome text\r\n## Scope\r\nMore', 'Scope')).toBe(true);
  });

  test('validateFeatureFile handles CRLF file', async () => {
    const v = new Validator(TEST_ROOT);
    const featurePath = path.join(TEST_ROOT, 'crlf-feature.md');
    await fs.writeFile(featurePath,
      '# Feature\r\n## Overview\r\nTest\r\n## Requirements\r\nTest\r\n## Acceptance Criteria\r\n- [ ] Done\r\n## Planned Tasks\r\nTest\r\n'
    );

    const result = new ValidationResult();
    await v.validateFeatureFile(featurePath, result);

    expect(result.passed).toBe(true);
  });
});

describe('Edge cases: unicode content', () => {
  test('countMarkdownItems works with unicode body content', () => {
    const v = new Validator(TEST_ROOT);
    const content = '## Epic 1\n\u5185\u5bb9\u63cf\u8ff0\n## Epic 2\n\u00c9l\u00e8ves et \u00e9tudiants\n## Epic 3\n\ud83d\ude80 Launch';
    expect(v.countMarkdownItems(content, 'epic')).toBe(3);
  });

  test('hasSection works with unicode section names', () => {
    const v = new Validator(TEST_ROOT);
    expect(v.hasSection('## Description\nUnicode: \u00fc\u00f6\u00e4\u00df \u2603\ufe0f', 'Description')).toBe(true);
  });

  test('extractItems works with unicode content', () => {
    const v = new Validator(TEST_ROOT);
    const content = '## Epic 1\n\ud83d\ude80 Rocket feature\n## Epic 2\n\u00c9l\u00e8ves';
    const items = v.extractItems(content, 'epic');
    expect(items).toHaveLength(2);
  });
});

describe('Edge cases: malformed markdown headers', () => {
  test('countMarkdownItems ignores headers without numbers', () => {
    const v = new Validator(TEST_ROOT);
    expect(v.countMarkdownItems('## Epic\nContent', 'epic')).toBe(0);
    expect(v.countMarkdownItems('## Epic without number\nContent', 'epic')).toBe(0);
  });

  test('countMarkdownItems ignores headers with wrong level', () => {
    const v = new Validator(TEST_ROOT);
    // Single # should not match (pattern requires ##)
    expect(v.countMarkdownItems('# Epic 1\nContent', 'epic')).toBe(0);
    // ### should not match
    expect(v.countMarkdownItems('### Epic 1\nContent', 'epic')).toBe(0);
  });

  test('countMarkdownItems ignores headers without space after ##', () => {
    const v = new Validator(TEST_ROOT);
    expect(v.countMarkdownItems('##Epic 1\nContent', 'epic')).toBe(0);
  });

  test('hasSection handles regex special chars in section name', () => {
    const v = new Validator(TEST_ROOT);
    // Section name with parens and dots should not break regex
    expect(v.hasSection('## Requirements (v2.0)\nContent', 'Requirements (v2.0)')).toBe(true);
    expect(v.hasSection('## Config.yaml\nContent', 'Config.yaml')).toBe(true);
  });
});

describe('Edge cases: extremely long lines', () => {
  test('countMarkdownItems handles very long lines between headers', () => {
    const v = new Validator(TEST_ROOT);
    const longLine = 'x'.repeat(100000);
    const content = `## Epic 1\n${longLine}\n## Epic 2\n${longLine}\n## Epic 3\n${longLine}`;
    expect(v.countMarkdownItems(content, 'epic')).toBe(3);
  });

  test('hasSection works with very long content', () => {
    const v = new Validator(TEST_ROOT);
    const longContent = 'x'.repeat(100000);
    expect(v.hasSection(`## Description\n${longContent}`, 'Description')).toBe(true);
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
