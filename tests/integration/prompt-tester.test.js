'use strict';

const path = require('path');
const os = require('os');
const fsPromises = require('fs').promises;

// Mock AgentSpawner
jest.mock('../../lib/agent-spawner', () => ({
  AgentSpawner: jest.fn().mockImplementation(() => ({
    createSpawnConfig: jest.fn().mockResolvedValue({
      prompt: 'assembled prompt',
      model: 'opus',
      agentType: 'judge',
      layerId: 'L9'
    }),
    loadPromptTemplate: jest.fn(),
    estimateContextBudget: jest.fn().mockReturnValue({
      estimatedTokens: 500,
      budgetFraction: 0.025
    })
  }))
}));

// Mock MockExecutor
jest.mock('../../tests/helpers/mock-executor', () => ({
  MockExecutor: jest.fn().mockImplementation(() => ({
    execute: jest.fn().mockResolvedValue({
      output: '## Verdict: PASS\n\nNo issues found.',
      files: [],
      tokenUsage: { inputTokens: 100, outputTokens: 50 }
    })
  }))
}));

// Mock ClaudeExecutor
jest.mock('../../lib/claude-executor', () => ({
  ClaudeExecutor: jest.fn().mockImplementation(() => ({
    execute: jest.fn().mockResolvedValue({
      output: '## Verdict: PASS\n\nReal execution.',
      files: [],
      tokenUsage: { inputTokens: 200, outputTokens: 100 }
    })
  }))
}));

const { PromptTester } = require('../../lib/prompt-tester');
const { MockExecutor } = require('../../tests/helpers/mock-executor');
const { ClaudeExecutor } = require('../../lib/claude-executor');

describe('PromptTester', () => {
  let tmpDir, tester;

  beforeEach(async () => {
    tmpDir = await fsPromises.mkdtemp(path.join(os.tmpdir(), 'prompt-tester-'));
    // Create template structure
    await fsPromises.mkdir(path.join(tmpDir, 'templates', 'agents', 'variants'), { recursive: true });
    await fsPromises.writeFile(
      path.join(tmpDir, 'templates', 'agents', 'judge-base.md'),
      '# Judge\n{{CONTEXT}}\n{{LAYER_INSTRUCTIONS}}'
    );
    await fsPromises.writeFile(
      path.join(tmpDir, 'templates', 'agents', 'builder.md'),
      '# Builder\n{{CONTEXT}}\n{{LAYER_INSTRUCTIONS}}'
    );
    await fsPromises.writeFile(
      path.join(tmpDir, 'templates', 'agents', 'variants', 'judge-base.vivid.md'),
      '# Vivid Judge\n{{CONTEXT}}\n{{LAYER_INSTRUCTIONS}}'
    );
    tester = new PromptTester(tmpDir);
    jest.clearAllMocks();
  });

  afterEach(async () => {
    await fsPromises.rm(tmpDir, { recursive: true, force: true });
  });

  describe('_resolveVariants()', () => {
    test('resolves "original" to base template', async () => {
      const { resolved } = await tester._resolveVariants('judge-base', ['original']);
      expect(resolved).toHaveLength(1);
      expect(resolved[0].name).toBe('original');
      expect(resolved[0].templatePath).toContain('judge-base.md');
      expect(resolved[0].content).toContain('# Judge');
    });

    test('resolves named variant to variants/ file', async () => {
      const { resolved } = await tester._resolveVariants('judge-base', ['vivid']);
      expect(resolved).toHaveLength(1);
      expect(resolved[0].name).toBe('vivid');
      expect(resolved[0].templatePath).toContain('judge-base.vivid.md');
      expect(resolved[0].content).toContain('# Vivid Judge');
    });

    test('resolves both original and variant', async () => {
      const { resolved } = await tester._resolveVariants('judge-base', ['original', 'vivid']);
      expect(resolved).toHaveLength(2);
      expect(resolved[0].name).toBe('original');
      expect(resolved[1].name).toBe('vivid');
    });

    test('throws for unknown variant with available list', async () => {
      await expect(
        tester._resolveVariants('judge-base', ['nonexistent'])
      ).rejects.toThrow(/Unknown variant 'nonexistent'/);
    });

    test('throws for unknown identifier', async () => {
      await expect(
        tester._resolveVariants('nonexistent', ['original'])
      ).rejects.toThrow(/Unknown template/);
    });
  });

  describe('test()', () => {
    test('executes variants via MockExecutor and stores results', async () => {
      const { filename, result } = await tester.test('judge-base', ['original', 'vivid']);
      expect(filename).toMatch(/\.json$/);
      expect(result.agentType).toBe('judge');
      expect(result.variants).toHaveLength(2);
      expect(result.comparison).toBeDefined();
      expect(result.mode).toBe('mock');
    });

    test('creates _prompt-tests/ directory if missing', async () => {
      const testsDir = path.join(tmpDir, '_prompt-tests');
      // Verify it doesn't exist initially
      await expect(fsPromises.access(testsDir)).rejects.toThrow();

      await tester.test('judge-base', ['original']);

      // Verify it was created
      const stat = await fsPromises.stat(testsDir);
      expect(stat.isDirectory()).toBe(true);
    });

    test('writes JSON file to _prompt-tests/', async () => {
      await tester.test('judge-base', ['original', 'vivid']);

      const testsDir = path.join(tmpDir, '_prompt-tests');
      const files = await fsPromises.readdir(testsDir);
      expect(files).toHaveLength(1);
      expect(files[0]).toMatch(/\.json$/);

      const content = JSON.parse(
        await fsPromises.readFile(path.join(testsDir, files[0]), 'utf-8')
      );
      expect(content.timestamp).toBeDefined();
      expect(content.layer).toBeDefined();
      expect(content.agentType).toBe('judge');
      expect(content.variants).toHaveLength(2);
      expect(content.comparison).toBeDefined();
    });

    test('handles single variant test', async () => {
      const { result } = await tester.test('judge-base', ['original']);
      expect(result.variants).toHaveLength(1);
      expect(result.comparison.winner).toBe('original');
    });

    test('uses ClaudeExecutor when real: true', async () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      await tester.test('judge-base', ['original'], { real: true });
      expect(ClaudeExecutor).toHaveBeenCalled();
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('real API calls')
      );
    });

    test('stores mode: real for real runs', async () => {
      jest.spyOn(console, 'warn').mockImplementation(() => {});
      const { result } = await tester.test('judge-base', ['original'], { real: true });
      expect(result.mode).toBe('real');
    });
  });

  describe('result parsing', () => {
    test('parses verdict from MockExecutor output', async () => {
      const { result } = await tester.test('judge-base', ['original']);
      expect(result.variants[0].output.verdict).toBeDefined();
    });

    test('computes metrics for each variant', async () => {
      const { result } = await tester.test('judge-base', ['original']);
      const metrics = result.variants[0].metrics;
      expect(metrics).toHaveProperty('tokenCount');
      expect(metrics).toHaveProperty('issueCount');
      expect(metrics).toHaveProperty('specificIssues');
      expect(metrics).toHaveProperty('reliability');
    });

    test('handles empty output with warning', async () => {
      MockExecutor.mockImplementation(() => ({
        execute: jest.fn().mockResolvedValue({
          output: '',
          files: [],
          tokenUsage: null
        })
      }));
      tester = new PromptTester(tmpDir);

      const { result } = await tester.test('judge-base', ['original']);
      expect(result.variants[0].warnings).toContain(
        'MockExecutor returned empty output'
      );
    });
  });

  describe('comparison', () => {
    test('PASS wins over ITERATE', async () => {
      // First variant: PASS, second: ITERATE
      let callCount = 0;
      MockExecutor.mockImplementation(() => ({
        execute: jest.fn().mockImplementation(async () => {
          callCount++;
          if (callCount === 1) {
            return {
              output: '## Verdict: PASS\n\nNo issues.',
              files: [],
              tokenUsage: { inputTokens: 100, outputTokens: 50 }
            };
          }
          return {
            output: '## Verdict: ITERATE\n\n[MINOR] Issue: something at file.js:10',
            files: [],
            tokenUsage: { inputTokens: 100, outputTokens: 50 }
          };
        })
      }));
      tester = new PromptTester(tmpDir);

      const { result } = await tester.test('judge-base', ['original', 'vivid']);
      // PASS > ITERATE, so 'original' should win
      expect(result.comparison.winner).toBe('original');
    });

    test('tied verdicts result in tie', async () => {
      MockExecutor.mockImplementation(() => ({
        execute: jest.fn().mockResolvedValue({
          output: '## Verdict: PASS\n\nNo issues.',
          files: [],
          tokenUsage: { inputTokens: 100, outputTokens: 50 }
        })
      }));
      tester = new PromptTester(tmpDir);

      const { result } = await tester.test('judge-base', ['original', 'vivid']);
      expect(result.comparison.winner).toBe('tie');
    });
  });

  describe('JSON storage', () => {
    test('filename matches naming convention', async () => {
      const { filename } = await tester.test('judge-base', ['original', 'vivid']);
      // {ISO-timestamp}-{layer}-{variant1}-{variant2}.json
      expect(filename).toMatch(/^\d{4}-\d{2}-\d{2}T.*-.*-original-vivid\.json$/);
    });

    test('result matches test result schema', async () => {
      const { result } = await tester.test('judge-base', ['original', 'vivid']);
      expect(result).toHaveProperty('timestamp');
      expect(result).toHaveProperty('layer');
      expect(result).toHaveProperty('agentType');
      expect(result).toHaveProperty('mode');
      expect(result).toHaveProperty('variants');
      expect(result).toHaveProperty('comparison');
      expect(result.comparison).toHaveProperty('winner');
      expect(result.comparison).toHaveProperty('specificity');
      expect(result.comparison).toHaveProperty('tokenEfficiency');
    });
  });

  describe('_defaultLayerForType()', () => {
    test('returns L8 for builder', () => {
      expect(tester._defaultLayerForType('builder')).toBe('L8');
    });

    test('returns L9 for judge', () => {
      expect(tester._defaultLayerForType('judge')).toBe('L9');
    });

    test('returns L4 for planner', () => {
      expect(tester._defaultLayerForType('planner')).toBe('L4');
    });
  });
});
