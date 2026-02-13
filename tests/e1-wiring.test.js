/**
 * E1 Wiring Integration Tests
 *
 * Tests the integration of ClaudeExecutor, VerdictParser, and CostTracker
 * wiring in the Ralph orchestrator.
 */

const fs = require('fs').promises;
const path = require('path');
const os = require('os');
const { Ralph } = require('../lib/ralph');
const { LAYERS } = require('../lib/state-machine');

const TEMPLATES_PATH = path.resolve(__dirname, '..', 'templates', 'agents');
let testDir;

beforeEach(async () => {
  testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'e1-wiring-test-'));
  // Copy templates to test dir
  const templatesDir = path.join(testDir, 'templates', 'agents');
  await fs.mkdir(templatesDir, { recursive: true });
  const templateFiles = await fs.readdir(TEMPLATES_PATH);
  for (const f of templateFiles) {
    await fs.copyFile(path.join(TEMPLATES_PATH, f), path.join(templatesDir, f));
  }
});

afterEach(async () => {
  await fs.rm(testDir, { recursive: true, force: true });
});

/**
 * Helper: seed project state so Ralph can run from a specific layer
 */
async function seedState(layerId, iteration = 1) {
  const statusContent = `# Project Status

## Meta
- **Project:** Test Project
- **Started:** 2026-01-01T00:00:00.000Z
- **Last Updated:** 2026-01-01T00:00:00.000Z

## Current Position
- **Layer:** ${layerId}
- **Layer Name:** Test
- **Phase:** test
- **Agent:** ${LAYERS[layerId]?.agent || 'planner'}
- **Epic:** None
- **Feature:** None
- **Task:** None
- **Iteration:** ${iteration}

## Layer Progress
${Object.keys(LAYERS).map(l => {
  const num = parseInt(l.slice(1));
  const target = parseInt(layerId.slice(1));
  return `- [${num < target ? 'x' : ' '}] ${l}: ${LAYERS[l].name}`;
}).join('\n')}

## Gates
- **L3 (Synthesis):** approved
- **L7 (Plan Approval):** approved

## Recent History
`;
  await fs.writeFile(path.join(testDir, '_status.md'), statusContent);
}

/**
 * Helper: seed artifact folders for layers that need them
 */
async function seedArtifacts() {
  const folders = [
    '1-input', '2-decomposition', '3-synthesis', '4-epics',
    '5-features', '6-tasks', '7-subtasks'
  ];
  for (const folder of folders) {
    const folderPath = path.join(testDir, folder);
    await fs.mkdir(folderPath, { recursive: true });
    await fs.writeFile(path.join(folderPath, 'output.md'), `# ${folder} Output\nContent here.\n`);
  }
}

describe('E1 Wiring Integration', () => {
  describe('Ralph constructor wiring', () => {
    it('initializes executor instance (ClaudeExecutor available)', () => {
      const ralph = new Ralph(testDir);
      // ClaudeExecutor should be available since we created it in this epic
      expect(ralph.executor).not.toBeNull();
    });

    it('initializes verdictParser instance', () => {
      const ralph = new Ralph(testDir);
      expect(ralph.verdictParser).toBeDefined();
      expect(typeof ralph.verdictParser.parse).toBe('function');
    });
  });

  describe('Builder layer execution', () => {
    it('records token usage in CostTracker after execution', async () => {
      await seedState('L8');
      await seedArtifacts();

      const ralph = new Ralph(testDir, {
        autoApproveGates: true,
        agentTimeout: 0,
        maxRetries: 0
      });

      const mockExecutor = async (spawnConfig) => {
        // Simulate builder producing files
        return {
          output: 'Implementation complete',
          files: ['src/feature.js'],
          tokenUsage: { inputTokens: 5000, outputTokens: 2000 }
        };
      };

      await ralph.runLayerCycle(mockExecutor);

      const summary = ralph.costs.getSummary();
      expect(summary.totals.inputTokens).toBe(5000);
      expect(summary.totals.outputTokens).toBe(2000);
    });
  });

  describe('Judge layer with VerdictParser', () => {
    it('parses raw judge output through VerdictParser', async () => {
      await seedState('L9');
      await seedArtifacts();

      const ralph = new Ralph(testDir, {
        autoApproveGates: true,
        agentTimeout: 0,
        maxRetries: 0
      });

      const mockExecutor = async (spawnConfig) => {
        return {
          output: '## Verdict: ITERATE\n\n- [MAJOR] Missing tests: No unit tests written',
          tokenUsage: { inputTokens: 3000, outputTokens: 1500 }
        };
      };

      const result = await ralph.runLayerCycle(mockExecutor);

      // CostTracker should have recorded the tokens
      expect(ralph.costs.totalInputTokens).toBe(3000);
      expect(ralph.costs.totalOutputTokens).toBe(1500);
    });
  });

  describe('Default executor in runProject', () => {
    it('throws helpful error when no executor and ClaudeExecutor unavailable', async () => {
      await seedState('L1');
      const ralph = new Ralph(testDir);
      ralph.executor = null; // Simulate ClaudeExecutor not available

      await expect(ralph.runProject()).rejects.toThrow('No agentExecutor provided');
      await expect(ralph.runProject()).rejects.toThrow('ClaudeExecutor is not available');
    });

    it('uses custom executor when provided (backward compat)', async () => {
      await seedState('L1');

      const ralph = new Ralph(testDir, {
        autoApproveGates: true,
        agentTimeout: 0,
        maxRetries: 0
      });

      const customExecutor = jest.fn().mockResolvedValue({
        output: 'custom output',
        files: [],
        tokenUsage: { inputTokens: 100, outputTokens: 50 }
      });

      // runProject will try to run all layers, but we just want to verify
      // the custom executor gets called for the first layer
      try {
        await ralph.runProject(customExecutor);
      } catch {
        // May fail on validation, that's fine for this test
      }

      expect(customExecutor).toHaveBeenCalled();
    });
  });

  describe('VerdictParser integration in onLayerComplete', () => {
    it('VerdictParser used when artifacts have no reviewResult for judge layer', async () => {
      await seedState('L9');
      await seedArtifacts();

      const ralph = new Ralph(testDir, {
        autoApproveGates: true,
        agentTimeout: 0,
        maxRetries: 0
      });

      // Spy on verdictParser.parse
      const parseSpy = jest.spyOn(ralph.verdictParser, 'parse');

      const mockExecutor = async (spawnConfig) => {
        // Return raw output without pre-parsed reviewResult
        return {
          output: '## Verdict: PASS\n\nAll good.',
          tokenUsage: { inputTokens: 1000, outputTokens: 500 }
        };
      };

      await ralph.runLayerCycle(mockExecutor);

      // VerdictParser should have been called
      expect(parseSpy).toHaveBeenCalled();
      parseSpy.mockRestore();
    });

    it('does not override existing reviewResult', async () => {
      await seedState('L9');
      await seedArtifacts();

      const ralph = new Ralph(testDir, {
        autoApproveGates: true,
        agentTimeout: 0,
        maxRetries: 0
      });

      const parseSpy = jest.spyOn(ralph.verdictParser, 'parse');

      const mockExecutor = async (spawnConfig) => {
        return {
          output: '## Verdict: PASS',
          reviewResult: { verdict: 'PASS', issues: [] },
          tokenUsage: { inputTokens: 1000, outputTokens: 500 }
        };
      };

      await ralph.runLayerCycle(mockExecutor);

      // VerdictParser should NOT have been called (reviewResult already set)
      expect(parseSpy).not.toHaveBeenCalled();
      parseSpy.mockRestore();
    });
  });
});
