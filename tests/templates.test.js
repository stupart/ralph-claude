/**
 * Tests for project template system (lib/templates.js)
 */

const fs = require('fs').promises;
const path = require('path');
const os = require('os');
const {
  listTemplates,
  loadTemplate,
  resolveVariables,
  buildVariables,
  initProject,
  TEMPLATES_DIR
} = require('../lib/templates');

// Helper to create a temp directory for each test
async function createTempDir() {
  const tmpBase = path.join(os.tmpdir(), 'ralph-template-test');
  await fs.mkdir(tmpBase, { recursive: true });
  return await fs.mkdtemp(path.join(tmpBase, 'proj-'));
}

// Helper to clean up temp directory
async function cleanupDir(dir) {
  try {
    await fs.rm(dir, { recursive: true, force: true });
  } catch {
    // Ignore cleanup errors
  }
}

describe('resolveVariables', () => {
  test('replaces single variable', () => {
    const result = resolveVariables('Hello {{NAME}}!', { NAME: 'World' });
    expect(result).toBe('Hello World!');
  });

  test('replaces multiple occurrences of same variable', () => {
    const result = resolveVariables('{{X}} and {{X}}', { X: 'A' });
    expect(result).toBe('A and A');
  });

  test('replaces multiple different variables', () => {
    const result = resolveVariables('{{A}} {{B}} {{C}}', { A: '1', B: '2', C: '3' });
    expect(result).toBe('1 2 3');
  });

  test('leaves unresolved variables intact', () => {
    const result = resolveVariables('{{KNOWN}} {{UNKNOWN}}', { KNOWN: 'yes' });
    expect(result).toBe('yes {{UNKNOWN}}');
  });

  test('handles empty variables object', () => {
    const result = resolveVariables('No {{VARS}} here');
    expect(result).toBe('No {{VARS}} here');
  });

  test('handles empty string content', () => {
    const result = resolveVariables('', { X: 'ignored' });
    expect(result).toBe('');
  });
});

describe('buildVariables', () => {
  test('resolves auto:iso-date', () => {
    const vars = buildVariables({ DATE: 'auto:iso-date' });
    expect(vars.DATE).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  test('resolves auto:date to YYYY-MM-DD', () => {
    const vars = buildVariables({ DATE: 'auto:date' });
    expect(vars.DATE).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  test('uses override over auto', () => {
    const vars = buildVariables(
      { DATE: 'auto:iso-date' },
      { DATE: 'custom-date' }
    );
    expect(vars.DATE).toBe('custom-date');
  });

  test('defaults prompt variables to empty string', () => {
    const vars = buildVariables({ NAME: 'prompt:Enter name' });
    expect(vars.NAME).toBe('');
  });

  test('uses override for prompt variables', () => {
    const vars = buildVariables(
      { NAME: 'prompt:Enter name' },
      { NAME: 'My Project' }
    );
    expect(vars.NAME).toBe('My Project');
  });

  test('handles unknown auto type', () => {
    const vars = buildVariables({ X: 'auto:unknown' });
    expect(vars.X).toBe('');
  });
});

describe('listTemplates', () => {
  test('lists the built-in web-app template', async () => {
    const templates = await listTemplates();
    expect(templates.length).toBeGreaterThanOrEqual(1);
    const webApp = templates.find(t => t.name === 'web-app');
    expect(webApp).toBeDefined();
    expect(webApp.description).toBeTruthy();
  });

  test('returns empty array for non-existent directory', async () => {
    const templates = await listTemplates('/nonexistent/path');
    expect(templates).toEqual([]);
  });

  test('skips directories without template.json', async () => {
    const tmpDir = await createTempDir();
    try {
      await fs.mkdir(path.join(tmpDir, 'invalid-template'));
      const templates = await listTemplates(tmpDir);
      expect(templates).toEqual([]);
    } finally {
      await cleanupDir(tmpDir);
    }
  });
});

describe('loadTemplate', () => {
  test('loads web-app template manifest', async () => {
    const manifest = await loadTemplate('web-app');
    expect(manifest.name).toBe('web-app');
    expect(manifest.folders).toContain('1-input');
    expect(manifest.files['CLAUDE.md']).toBeDefined();
    expect(manifest.files['_status.md']).toBeDefined();
  });

  test('throws for non-existent template', async () => {
    await expect(loadTemplate('nonexistent'))
      .rejects.toThrow(/not found/);
  });

  test('throws for template with invalid JSON', async () => {
    const tmpDir = await createTempDir();
    try {
      const badTemplate = path.join(tmpDir, 'bad');
      await fs.mkdir(badTemplate, { recursive: true });
      await fs.writeFile(path.join(badTemplate, 'template.json'), '{invalid}');
      await expect(loadTemplate('bad', tmpDir))
        .rejects.toThrow(/invalid template.json/);
    } finally {
      await cleanupDir(tmpDir);
    }
  });

  test('throws for template missing required fields', async () => {
    const tmpDir = await createTempDir();
    try {
      const noName = path.join(tmpDir, 'noname');
      await fs.mkdir(noName, { recursive: true });
      await fs.writeFile(path.join(noName, 'template.json'), JSON.stringify({
        folders: [], files: {}
      }));
      await expect(loadTemplate('noname', tmpDir))
        .rejects.toThrow(/missing "name"/);
    } finally {
      await cleanupDir(tmpDir);
    }
  });
});

describe('initProject', () => {
  let tmpDir;

  beforeEach(async () => {
    tmpDir = await createTempDir();
  });

  afterEach(async () => {
    await cleanupDir(tmpDir);
  });

  test('creates folder structure from web-app template', async () => {
    const projectDir = path.join(tmpDir, 'my-project');
    const result = await initProject('web-app', projectDir);

    expect(result.template).toBe('web-app');
    expect(result.folders).toContain('1-input');
    expect(result.folders).toContain('3-synthesis');
    expect(result.folders).toContain('8-analysis');

    // Verify folders exist on disk
    for (const folder of result.folders) {
      const stat = await fs.stat(path.join(projectDir, folder));
      expect(stat.isDirectory()).toBe(true);
    }
  });

  test('copies and processes template files', async () => {
    const projectDir = path.join(tmpDir, 'my-project');
    const result = await initProject('web-app', projectDir, {
      variables: { PROJECT_NAME: 'Test App' }
    });

    expect(result.files).toContain('CLAUDE.md');
    expect(result.files).toContain('_status.md');
    expect(result.files).toContain('1-input/brain-dump.md');

    // Verify CLAUDE.md exists and has content
    const claudeContent = await fs.readFile(path.join(projectDir, 'CLAUDE.md'), 'utf8');
    expect(claudeContent).toContain('Ralph');
    expect(claudeContent).toContain('Layer Cake');

    // Verify brain-dump.md was copied to subdirectory
    const brainDump = await fs.readFile(path.join(projectDir, '1-input', 'brain-dump.md'), 'utf8');
    expect(brainDump).toContain('Brain Dump');
  });

  test('resolves DATE variable in _status.md', async () => {
    const projectDir = path.join(tmpDir, 'date-test');
    await initProject('web-app', projectDir);

    const statusContent = await fs.readFile(path.join(projectDir, '_status.md'), 'utf8');
    // DATE should be resolved, not still contain {{DATE}}
    expect(statusContent).not.toContain('{{DATE}}');
    expect(statusContent).toContain('L1');
  });

  test('returns result with all created items', async () => {
    const projectDir = path.join(tmpDir, 'result-test');
    const result = await initProject('web-app', projectDir);

    expect(result.targetDir).toBe(projectDir);
    expect(result.template).toBe('web-app');
    expect(result.folders.length).toBeGreaterThan(0);
    expect(result.files.length).toBeGreaterThan(0);
    expect(result.variables).toBeDefined();
  });

  test('throws for non-existent template', async () => {
    const projectDir = path.join(tmpDir, 'bad-template');
    await expect(initProject('nonexistent', projectDir))
      .rejects.toThrow(/not found/);
  });

  test('uses custom templates directory', async () => {
    // Create a custom template
    const customTemplateDir = path.join(tmpDir, 'custom-templates', 'minimal');
    await fs.mkdir(customTemplateDir, { recursive: true });
    await fs.writeFile(path.join(customTemplateDir, 'template.json'), JSON.stringify({
      name: 'minimal',
      description: 'Minimal template',
      folders: ['1-input'],
      files: { 'hello.txt': 'hello.txt' },
      variables: {}
    }));
    await fs.writeFile(path.join(customTemplateDir, 'hello.txt'), 'Hello from template');

    const projectDir = path.join(tmpDir, 'custom-project');
    const result = await initProject('minimal', projectDir, {
      templatesDir: path.join(tmpDir, 'custom-templates')
    });

    expect(result.template).toBe('minimal');
    const content = await fs.readFile(path.join(projectDir, 'hello.txt'), 'utf8');
    expect(content).toBe('Hello from template');
  });
});
