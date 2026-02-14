/**
 * Validator Edge Case Tests
 *
 * Tests Validator behavior with missing directories, empty files,
 * malformed markdown, extra files, and no-rules layers.
 */

const fs = require('fs');
const fsp = require('fs').promises;
const path = require('path');
const { Validator } = require('../../lib/validator');
const { createTestProject } = require('../helpers/test-project');

describe('Validator Edge Cases - Missing Directories', () => {
  let testProject;

  afterEach(async () => {
    if (testProject?.cleanup) {
      await testProject.cleanup();
    }
  });

  it('returns descriptive error when 4-epics/ directory is missing', async () => {
    testProject = await createTestProject();

    // Delete the 4-epics directory
    const epicsPath = path.join(testProject.projectRoot, '4-epics');
    await fsp.rm(epicsPath, { recursive: true, force: true });

    const validator = new Validator(testProject.projectRoot);

    let result;
    let didThrow = false;

    try {
      result = await validator.validateLayer('L4');
    } catch (err) {
      didThrow = true;
    }

    // Should NOT throw ENOENT - should handle gracefully
    expect(didThrow).toBe(false);
    expect(result).toBeTruthy();
    expect(result.passed).toBe(false);

    // Check for descriptive error
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('handles missing 3-synthesis/ directory', async () => {
    testProject = await createTestProject();

    const synthesisPath = path.join(testProject.projectRoot, '3-synthesis');
    await fsp.rm(synthesisPath, { recursive: true, force: true });

    const validator = new Validator(testProject.projectRoot);
    const result = await validator.validateLayer('L3');

    expect(result.passed).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('handles missing 5-features/ directory without throwing', async () => {
    testProject = await createTestProject();

    const featuresPath = path.join(testProject.projectRoot, '5-features');
    await fsp.rm(featuresPath, { recursive: true, force: true });

    const validator = new Validator(testProject.projectRoot);

    let didThrow = false;
    let result;
    try {
      result = await validator.validateLayer('L5');
    } catch (err) {
      didThrow = true;
    }

    // Should NOT throw ENOENT - should handle gracefully
    expect(didThrow).toBe(false);
    expect(result).toBeTruthy();
    // L5 with missing directory and no L4 epics: validator may pass (0 dirs, 0 expected)
    // or fail (directory missing). Either way, no exception should propagate.
  });
});

describe('Validator Edge Cases - Empty Files', () => {
  let testProject;

  afterEach(async () => {
    if (testProject?.cleanup) {
      await testProject.cleanup();
    }
  });

  it('returns error for empty jtbd.md (0 bytes)', async () => {
    testProject = await createTestProject();

    // Create empty jtbd.md
    const jtbdPath = path.join(testProject.projectRoot, '3-synthesis', 'jtbd.md');
    await fsp.mkdir(path.dirname(jtbdPath), { recursive: true });
    await fsp.writeFile(jtbdPath, '');

    // Create valid journeys and architecture so we can isolate the jtbd error
    await fsp.writeFile(
      path.join(testProject.projectRoot, '3-synthesis', 'journeys.md'),
      '# Journeys\n\n## Journey 1\nTest.\n\n## Journey 2\nTest.'
    );
    await fsp.writeFile(
      path.join(testProject.projectRoot, '3-synthesis', 'architecture.md'),
      '# Architecture\n\n## Decision 1\nTest.'
    );

    const validator = new Validator(testProject.projectRoot);
    const result = await validator.validateLayer('L3');

    expect(result.passed).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('returns error for empty epic-01.md', async () => {
    testProject = await createTestProject();

    const epicsDir = path.join(testProject.projectRoot, '4-epics');
    await fsp.mkdir(epicsDir, { recursive: true });
    await fsp.writeFile(path.join(epicsDir, 'epic-01.md'), '');
    await fsp.writeFile(path.join(epicsDir, 'epic-02.md'), '');
    await fsp.writeFile(path.join(epicsDir, 'epic-03.md'), '');
    await fsp.writeFile(path.join(epicsDir, '_index.md'), '# Epics\n\n## Overview\nTest.');

    const validator = new Validator(testProject.projectRoot);
    const result = await validator.validateLayer('L4');

    expect(result.passed).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('returns error for empty architecture.md', async () => {
    testProject = await createTestProject();

    const synthDir = path.join(testProject.projectRoot, '3-synthesis');
    await fsp.mkdir(synthDir, { recursive: true });
    await fsp.writeFile(path.join(synthDir, 'architecture.md'), '');

    // Create valid jtbd.md and journeys.md
    await fsp.writeFile(
      path.join(synthDir, 'jtbd.md'),
      '# JTBD\n\n## JTBD 1\nTest.\n\n## JTBD 2\nTest.\n\n## JTBD 3\nTest.'
    );
    await fsp.writeFile(
      path.join(synthDir, 'journeys.md'),
      '# Journeys\n\n## Journey 1\nTest.\n\n## Journey 2\nTest.'
    );

    const validator = new Validator(testProject.projectRoot);
    const result = await validator.validateLayer('L3');

    expect(result.passed).toBe(false);

    const errorMessages = result.errors.map(e => e.message).join(' ');
    expect(errorMessages.length).toBeGreaterThan(0);
  });
});

describe('Validator Edge Cases - Malformed Markdown', () => {
  let testProject;

  afterEach(async () => {
    if (testProject?.cleanup) {
      await testProject.cleanup();
    }
  });

  it('detects missing required sections in epic file', async () => {
    testProject = await createTestProject();

    // Create epic missing Scope section
    const epicContent = `# Epic 1

## Description
This has description.

## Dependencies
But no Scope section.
`;

    const epicsDir = path.join(testProject.projectRoot, '4-epics');
    await fsp.mkdir(epicsDir, { recursive: true });
    await fsp.writeFile(path.join(epicsDir, 'epic-01.md'), epicContent);
    await fsp.writeFile(path.join(epicsDir, 'epic-02.md'), epicContent);
    await fsp.writeFile(path.join(epicsDir, 'epic-03.md'), epicContent);
    await fsp.writeFile(path.join(epicsDir, '_index.md'), '# Epics\n\n## Overview\nTest.');

    const validator = new Validator(testProject.projectRoot);
    const result = await validator.validateLayer('L4');

    expect(result.passed).toBe(false);

    const errorMessages = result.errors.map(e => e.message).join(' ');
    expect(errorMessages).toMatch(/scope/i);
  });

  it('detects non-markdown content in markdown file', async () => {
    testProject = await createTestProject();

    const nonMarkdownContent = `{
  "epic": "1",
  "description": "This is JSON, not markdown",
  "scope": "test"
}`;

    const epicsDir = path.join(testProject.projectRoot, '4-epics');
    await fsp.mkdir(epicsDir, { recursive: true });
    await fsp.writeFile(path.join(epicsDir, 'epic-01.md'), nonMarkdownContent);
    await fsp.writeFile(path.join(epicsDir, 'epic-02.md'), nonMarkdownContent);
    await fsp.writeFile(path.join(epicsDir, 'epic-03.md'), nonMarkdownContent);
    await fsp.writeFile(path.join(epicsDir, '_index.md'), '# Epics\n\n## Overview\nTest.');

    const validator = new Validator(testProject.projectRoot);
    const result = await validator.validateLayer('L4');

    expect(result.passed).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('detects plain text without markdown structure', async () => {
    testProject = await createTestProject();

    const plainTextContent = `Epic 1
Description: This is plain text without markdown headings.
Scope: Some scope.
Dependencies: None.`;

    const epicsDir = path.join(testProject.projectRoot, '4-epics');
    await fsp.mkdir(epicsDir, { recursive: true });
    await fsp.writeFile(path.join(epicsDir, 'epic-01.md'), plainTextContent);
    await fsp.writeFile(path.join(epicsDir, 'epic-02.md'), plainTextContent);
    await fsp.writeFile(path.join(epicsDir, 'epic-03.md'), plainTextContent);
    await fsp.writeFile(path.join(epicsDir, '_index.md'), '# Epics\n\n## Overview\nTest.');

    const validator = new Validator(testProject.projectRoot);
    const result = await validator.validateLayer('L4');

    expect(result.passed).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});

describe('Validator Edge Cases - Extra Files', () => {
  let testProject;

  afterEach(async () => {
    if (testProject?.cleanup) {
      await testProject.cleanup();
    }
  });

  it('ignores .DS_Store files in layer directories', async () => {
    testProject = await createTestProject();

    const epicContent = `# Epic 1

## Description
Valid epic.

## Scope
Test scope.

## Dependencies
None.
`;

    const epicsDir = path.join(testProject.projectRoot, '4-epics');
    await fsp.mkdir(epicsDir, { recursive: true });
    await fsp.writeFile(path.join(epicsDir, 'epic-01.md'), epicContent);
    await fsp.writeFile(path.join(epicsDir, 'epic-02.md'), epicContent);
    await fsp.writeFile(path.join(epicsDir, 'epic-03.md'), epicContent);
    await fsp.writeFile(path.join(epicsDir, '_index.md'), '# Epics\n\n## Overview\nTest.');

    // Add .DS_Store file
    await fsp.writeFile(path.join(epicsDir, '.DS_Store'), Buffer.from([0x00, 0x01, 0x02]));

    const validator = new Validator(testProject.projectRoot);
    const result = await validator.validateLayer('L4');

    expect(result.passed).toBe(true);
  });

  it('ignores temp.txt and other non-matching files', async () => {
    testProject = await createTestProject();

    const epicContent = `# Epic 1

## Description
Valid epic.

## Scope
Test scope.

## Dependencies
None.
`;

    const epicsDir = path.join(testProject.projectRoot, '4-epics');
    await fsp.mkdir(epicsDir, { recursive: true });
    await fsp.writeFile(path.join(epicsDir, 'epic-01.md'), epicContent);
    await fsp.writeFile(path.join(epicsDir, 'epic-02.md'), epicContent);
    await fsp.writeFile(path.join(epicsDir, 'epic-03.md'), epicContent);
    await fsp.writeFile(path.join(epicsDir, '_index.md'), '# Epics\n\n## Overview\nTest.');

    // Add extra files that should be ignored
    await fsp.writeFile(path.join(epicsDir, 'temp.txt'), 'Temporary notes');
    await fsp.writeFile(path.join(epicsDir, 'notes.md'), '# Random Notes\nNot an epic file.');
    await fsp.writeFile(path.join(epicsDir, 'README.md'), '# README\nThis directory contains epics.');

    const validator = new Validator(testProject.projectRoot);
    const result = await validator.validateLayer('L4');

    expect(result.passed).toBe(true);
  });

  it('validates only matching artifact patterns in 3-synthesis', async () => {
    testProject = await createTestProject();

    const synthDir = path.join(testProject.projectRoot, '3-synthesis');
    await fsp.mkdir(synthDir, { recursive: true });
    await fsp.writeFile(
      path.join(synthDir, 'jtbd.md'),
      '# JTBD\n\n## JTBD 1\nTest.\n\n## JTBD 2\nTest.\n\n## JTBD 3\nTest.'
    );
    await fsp.writeFile(
      path.join(synthDir, 'journeys.md'),
      '# Journeys\n\n## Journey 1\nTest.\n\n## Journey 2\nTest.'
    );
    await fsp.writeFile(
      path.join(synthDir, 'architecture.md'),
      '# Architecture\n\n## Decision 1\nTest.'
    );

    // Add extra files
    await fsp.writeFile(path.join(synthDir, 'scratch.md'), '# Scratch\nWork in progress.');
    await fsp.writeFile(path.join(synthDir, 'backup.md.bak'), 'Old version');

    const validator = new Validator(testProject.projectRoot);
    const result = await validator.validateLayer('L3');

    expect(result.passed).toBe(true);
  });
});

describe('Validator Edge Cases - No-Rules Layers', () => {
  let testProject;

  afterEach(async () => {
    if (testProject?.cleanup) {
      await testProject.cleanup();
    }
  });

  it('returns valid for layers with no validation rules (L8)', async () => {
    testProject = await createTestProject();

    const validator = new Validator(testProject.projectRoot);

    let result;
    let didThrow = false;

    try {
      result = await validator.validateLayer('L8');
    } catch (err) {
      didThrow = true;
    }

    expect(didThrow).toBe(false);

    // Should pass since L8 has no validation rules
    if (result) {
      expect(result.passed).toBe(true);
    }
  });

  it('handles L9 (judge layer) validation gracefully', async () => {
    testProject = await createTestProject();

    const validator = new Validator(testProject.projectRoot);
    const result = await validator.validateLayer('L9');

    expect(result).toBeTruthy();
    expect(result.passed).toBe(true);
  });

  it('handles L10 and L11 (judge layers) validation', async () => {
    testProject = await createTestProject();

    const validator = new Validator(testProject.projectRoot);

    const l10Result = await validator.validateLayer('L10');
    const l11Result = await validator.validateLayer('L11');

    expect(l10Result).toBeTruthy();
    expect(l11Result).toBeTruthy();
    expect(l10Result.passed).toBe(true);
    expect(l11Result.passed).toBe(true);
  });

  it('distinguishes between no-rules layers and invalid layers', async () => {
    testProject = await createTestProject();

    const validator = new Validator(testProject.projectRoot);

    // L8 - no rules (should pass)
    const l8Result = await validator.validateLayer('L8');

    // L4 with missing directory - has rules but invalid (should fail)
    await fsp.rm(path.join(testProject.projectRoot, '4-epics'), {
      recursive: true,
      force: true
    });
    const l4Result = await validator.validateLayer('L4');

    expect(l8Result.passed).toBe(true);
    expect(l4Result.passed).toBe(false);
  });
});
