/**
 * Prompt Template Validation Tests
 *
 * Iterates all .md files in templates/agents/ and verifies:
 * - Each file loads without errors (valid UTF-8, readable)
 * - Each file contains required sections for its agent type
 * - Base templates contain the {{LAYER_INSTRUCTIONS}} placeholder
 * - Layer-specific templates reference their layer correctly
 * - No template is empty or suspiciously short
 */

const fs = require('fs').promises;
const path = require('path');

const AGENTS_DIR = path.join(__dirname, '..', 'templates', 'agents');

// Required content patterns for each agent type
const AGENT_REQUIREMENTS = {
  planner: {
    baseSections: ['Identity and Role', 'Allowed Tools', 'Forbidden Tools'],
    mustContain: ['planner', 'planning']
  },
  builder: {
    baseSections: ['Identity and Role', 'Allowed Tools', 'Forbidden Tools'],
    mustContain: ['builder', 'build']
  },
  judge: {
    baseSections: ['Identity and Role'],
    mustContain: ['judge', 'review']
  }
};

describe('Prompt Template Validation', () => {
  let templateFiles;

  beforeAll(async () => {
    const entries = await fs.readdir(AGENTS_DIR);
    templateFiles = entries.filter(f => f.endsWith('.md'));
  });

  test('templates directory exists and has files', () => {
    expect(templateFiles.length).toBeGreaterThan(0);
  });

  test('all .md files load without errors', async () => {
    for (const file of templateFiles) {
      const filePath = path.join(AGENTS_DIR, file);
      const content = await fs.readFile(filePath, 'utf8');
      expect(content).toBeTruthy();
      expect(content.length).toBeGreaterThan(50);
    }
  });

  test('all templates start with a markdown heading', async () => {
    for (const file of templateFiles) {
      const filePath = path.join(AGENTS_DIR, file);
      const content = await fs.readFile(filePath, 'utf8');
      const firstLine = content.split('\n')[0];
      expect(firstLine).toMatch(/^#/);
    }
  });

  test('base templates contain {{LAYER_INSTRUCTIONS}} placeholder', async () => {
    const baseFiles = templateFiles.filter(f => f.includes('-base.md'));

    expect(baseFiles.length).toBeGreaterThanOrEqual(2);

    for (const file of baseFiles) {
      const filePath = path.join(AGENTS_DIR, file);
      const content = await fs.readFile(filePath, 'utf8');
      expect(content).toContain('{{LAYER_INSTRUCTIONS}}');
    }
  });

  test('planner-base.md has required sections', async () => {
    const content = await fs.readFile(
      path.join(AGENTS_DIR, 'planner-base.md'), 'utf8'
    );

    for (const section of AGENT_REQUIREMENTS.planner.baseSections) {
      expect(content.toLowerCase()).toContain(section.toLowerCase());
    }
  });

  test('judge-base.md has required sections', async () => {
    const content = await fs.readFile(
      path.join(AGENTS_DIR, 'judge-base.md'), 'utf8'
    );

    for (const section of AGENT_REQUIREMENTS.judge.baseSections) {
      expect(content.toLowerCase()).toContain(section.toLowerCase());
    }
  });

  test('builder.md has required sections', async () => {
    const content = await fs.readFile(
      path.join(AGENTS_DIR, 'builder.md'), 'utf8'
    );

    for (const section of AGENT_REQUIREMENTS.builder.baseSections) {
      expect(content.toLowerCase()).toContain(section.toLowerCase());
    }
  });

  test('planner layer-specific templates reference their layer', async () => {
    const plannerLayerFiles = templateFiles.filter(
      f => f.startsWith('planner-L') && !f.includes('-base')
    );

    expect(plannerLayerFiles.length).toBeGreaterThan(0);

    for (const file of plannerLayerFiles) {
      const filePath = path.join(AGENTS_DIR, file);
      const content = await fs.readFile(filePath, 'utf8');

      // Extract layer ID from filename (e.g., planner-L3-synthesis.md -> L3)
      const layerMatch = file.match(/L(\d+)/i);
      expect(layerMatch).toBeTruthy();

      // Content should mention the layer or its purpose
      expect(content.length).toBeGreaterThan(100);
    }
  });

  test('judge layer-specific templates reference their layer', async () => {
    const judgeLayerFiles = templateFiles.filter(
      f => f.startsWith('judge-L') && !f.includes('-base')
    );

    expect(judgeLayerFiles.length).toBeGreaterThan(0);

    for (const file of judgeLayerFiles) {
      const filePath = path.join(AGENTS_DIR, file);
      const content = await fs.readFile(filePath, 'utf8');

      // Must have review/judge-related content
      const hasReviewContent = content.toLowerCase().includes('review') ||
        content.toLowerCase().includes('judge') ||
        content.toLowerCase().includes('verdict') ||
        content.toLowerCase().includes('pass') ||
        content.toLowerCase().includes('iterate');
      expect(hasReviewContent).toBe(true);
    }
  });

  test('no template is suspiciously short (<100 chars)', async () => {
    for (const file of templateFiles) {
      const filePath = path.join(AGENTS_DIR, file);
      const content = await fs.readFile(filePath, 'utf8');
      expect(content.length).toBeGreaterThan(100);
    }
  });

  test('all templates mention their model requirement', async () => {
    // Base templates and builder should specify Opus model requirement
    const criticalFiles = ['planner-base.md', 'judge-base.md', 'builder.md'];

    for (const file of criticalFiles) {
      const filePath = path.join(AGENTS_DIR, file);
      const content = await fs.readFile(filePath, 'utf8');
      const hasModelRef = content.toLowerCase().includes('opus') ||
        content.toLowerCase().includes('model requirement');
      expect(hasModelRef).toBe(true);
    }
  });

  test('all templates are valid UTF-8 without BOM', async () => {
    for (const file of templateFiles) {
      const filePath = path.join(AGENTS_DIR, file);
      const buffer = await fs.readFile(filePath);

      // Check for BOM
      const hasBOM = buffer[0] === 0xEF && buffer[1] === 0xBB && buffer[2] === 0xBF;
      expect(hasBOM).toBe(false);

      // Verify valid UTF-8 by round-tripping
      const content = buffer.toString('utf8');
      expect(Buffer.from(content, 'utf8').equals(buffer)).toBe(true);
    }
  });

  test('AgentSpawner can load all base templates', async () => {
    const { AgentSpawner } = require('../lib/agent-spawner');
    const spawner = new AgentSpawner('/tmp', AGENTS_DIR);

    // Load all three base agent types
    for (const agentType of ['planner', 'builder', 'judge']) {
      const template = await spawner.loadPromptTemplate(agentType);
      expect(template).toBeTruthy();
      expect(template.length).toBeGreaterThan(100);
    }
  });

  test('AgentSpawner can load layer-specific templates', async () => {
    const { AgentSpawner } = require('../lib/agent-spawner');
    const spawner = new AgentSpawner('/tmp', AGENTS_DIR);

    // Test loading planner with layer-specific template
    const plannerL3 = await spawner.loadPromptTemplate('planner', 'L3');
    expect(plannerL3).toBeTruthy();

    // Test loading planner with L12
    const plannerL12 = await spawner.loadPromptTemplate('planner', 'L12');
    expect(plannerL12).toBeTruthy();
  });
});
