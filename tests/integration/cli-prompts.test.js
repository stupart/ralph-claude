'use strict';

// Mock all Prompt Lab modules to isolate CLI routing tests
jest.mock('../../lib/prompt-registry', () => ({
  PromptRegistry: jest.fn().mockImplementation(() => ({
    scan: jest.fn().mockResolvedValue([
      {
        filename: 'builder.md',
        agentType: 'builder',
        layerMapping: ['L8'],
        templateVariables: ['CONTEXT'],
        charCount: 500,
        estimatedTokens: 125,
        lastModified: new Date('2026-02-15T00:00:00Z'),
        isVariant: false,
        variantName: null,
        variants: []
      },
      {
        filename: 'judge-base.md',
        agentType: 'judge',
        layerMapping: [],
        templateVariables: ['LAYER_INSTRUCTIONS'],
        charCount: 1000,
        estimatedTokens: 250,
        lastModified: new Date('2026-02-14T00:00:00Z'),
        isVariant: false,
        variantName: null,
        variants: []
      }
    ])
  }))
}));

jest.mock('../../lib/prompt-editor', () => ({
  PromptEditor: jest.fn().mockImplementation(() => ({
    edit: jest.fn().mockResolvedValue(undefined)
  }))
}));

jest.mock('../../lib/prompt-tester', () => ({
  PromptTester: jest.fn().mockImplementation(() => ({
    test: jest.fn().mockResolvedValue({
      filename: 'test-result.json',
      result: { variants: [] }
    })
  }))
}));

jest.mock('../../lib/prompt-metrics', () => ({
  PromptMetrics: jest.fn().mockImplementation(() => ({
    report: jest.fn().mockResolvedValue({
      formatted: 'Variant  Win Rate\noriginal 100%',
      summary: 'Winner: original'
    })
  }))
}));

const { cmdPrompts } = require('../../bin/ralph-cli');
const { PromptRegistry } = require('../../lib/prompt-registry');
const { PromptEditor } = require('../../lib/prompt-editor');
const { PromptTester } = require('../../lib/prompt-tester');
const { PromptMetrics } = require('../../lib/prompt-metrics');

describe('CLI prompts command', () => {
  let originalArgv;

  beforeEach(() => {
    originalArgv = process.argv;
    jest.clearAllMocks();
  });

  afterEach(() => {
    process.argv = originalArgv;
    jest.restoreAllMocks();
  });

  describe('subcommand routing', () => {
    test('no subcommand defaults to list', async () => {
      process.argv = ['node', 'ralph', 'prompts'];
      const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      await cmdPrompts();
      expect(PromptRegistry).toHaveBeenCalled();
    });

    test('list routes to registry scan', async () => {
      process.argv = ['node', 'ralph', 'prompts', 'list'];
      const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      await cmdPrompts();
      expect(PromptRegistry).toHaveBeenCalled();
      // Verify table output
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Template'));
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('builder.md'));
    });

    test('edit routes to editor with identifier', async () => {
      process.argv = ['node', 'ralph', 'prompts', 'edit', 'L8-builder'];
      await cmdPrompts();
      expect(PromptEditor).toHaveBeenCalled();
      const editorInstance = PromptEditor.mock.results[0].value;
      expect(editorInstance.edit).toHaveBeenCalledWith('L8-builder');
    });

    test('test routes to tester with variants', async () => {
      process.argv = ['node', 'ralph', 'prompts', 'test', 'L9-judge',
        '--variants', 'original,vivid'];
      const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      await cmdPrompts();
      expect(PromptTester).toHaveBeenCalled();
      const testerInstance = PromptTester.mock.results[0].value;
      expect(testerInstance.test).toHaveBeenCalledWith(
        'L9-judge',
        ['original', 'vivid'],
        { real: false }
      );
    });

    test('report routes to metrics', async () => {
      process.argv = ['node', 'ralph', 'prompts', 'report'];
      const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      await cmdPrompts();
      expect(PromptMetrics).toHaveBeenCalled();
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Win Rate'));
    });

    test('unknown subcommand shows help', async () => {
      process.argv = ['node', 'ralph', 'prompts', 'foo'];
      const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      await cmdPrompts();
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Unknown subcommand'));
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('list, edit, test, report'));
    });
  });

  describe('argument parsing', () => {
    test('edit extracts identifier from argv[4]', async () => {
      process.argv = ['node', 'ralph', 'prompts', 'edit', 'planner-base'];
      await cmdPrompts();
      const editorInstance = PromptEditor.mock.results[0].value;
      expect(editorInstance.edit).toHaveBeenCalledWith('planner-base');
    });

    test('edit with no identifier shows usage', async () => {
      process.argv = ['node', 'ralph', 'prompts', 'edit'];
      const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      await cmdPrompts();
      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Usage: ralph prompts edit')
      );
      expect(PromptEditor).not.toHaveBeenCalled();
    });

    test('test parses --variants comma list', async () => {
      process.argv = ['node', 'ralph', 'prompts', 'test', 'L9-judge',
        '--variants', 'original,vivid,terse'];
      jest.spyOn(console, 'log').mockImplementation(() => {});
      await cmdPrompts();
      const testerInstance = PromptTester.mock.results[0].value;
      expect(testerInstance.test).toHaveBeenCalledWith(
        'L9-judge',
        ['original', 'vivid', 'terse'],
        { real: false }
      );
    });

    test('test parses --real flag', async () => {
      process.argv = ['node', 'ralph', 'prompts', 'test', 'L9-judge',
        '--variants', 'original,vivid', '--real'];
      jest.spyOn(console, 'log').mockImplementation(() => {});
      await cmdPrompts();
      const testerInstance = PromptTester.mock.results[0].value;
      expect(testerInstance.test).toHaveBeenCalledWith(
        'L9-judge',
        ['original', 'vivid'],
        { real: true }
      );
    });

    test('test with missing identifier shows error', async () => {
      process.argv = ['node', 'ralph', 'prompts', 'test'];
      const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      await cmdPrompts();
      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Usage: ralph prompts test')
      );
    });

    test('test with missing --variants shows error', async () => {
      process.argv = ['node', 'ralph', 'prompts', 'test', 'L9-judge'];
      const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      await cmdPrompts();
      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining('--variants is required')
      );
    });

    test('report parses --last N', async () => {
      process.argv = ['node', 'ralph', 'prompts', 'report', '--last', '5'];
      jest.spyOn(console, 'log').mockImplementation(() => {});
      await cmdPrompts();
      const metricsInstance = PromptMetrics.mock.results[0].value;
      expect(metricsInstance.report).toHaveBeenCalledWith({ last: 5 });
    });

    test('report without --last uses empty options', async () => {
      process.argv = ['node', 'ralph', 'prompts', 'report'];
      jest.spyOn(console, 'log').mockImplementation(() => {});
      await cmdPrompts();
      const metricsInstance = PromptMetrics.mock.results[0].value;
      expect(metricsInstance.report).toHaveBeenCalledWith({});
    });
  });

  describe('list output', () => {
    test('handles empty scan result', async () => {
      PromptRegistry.mockImplementation(() => ({
        scan: jest.fn().mockResolvedValue([])
      }));
      process.argv = ['node', 'ralph', 'prompts', 'list'];
      const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      await cmdPrompts();
      expect(logSpy).toHaveBeenCalledWith('No templates found.');
    });
  });

  describe('report output', () => {
    test('handles report with message (no results)', async () => {
      PromptMetrics.mockImplementation(() => ({
        report: jest.fn().mockResolvedValue({
          message: 'No results match the specified filters.',
          resultCount: 0
        })
      }));
      process.argv = ['node', 'ralph', 'prompts', 'report'];
      const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      await cmdPrompts();
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('No results match')
      );
    });
  });

  describe('regression: existing commands still route', () => {
    test('parseArgs handles init command', () => {
      const { parseArgs } = require('../../bin/ralph-cli');
      const result = parseArgs(['node', 'ralph', 'init']);
      expect(result.command).toBe('init');
    });

    test('parseArgs handles run command', () => {
      const { parseArgs } = require('../../bin/ralph-cli');
      const result = parseArgs(['node', 'ralph', 'run']);
      expect(result.command).toBe('run');
    });

    test('parseArgs handles status command', () => {
      const { parseArgs } = require('../../bin/ralph-cli');
      const result = parseArgs(['node', 'ralph', 'status']);
      expect(result.command).toBe('status');
    });

    test('parseArgs handles help command', () => {
      const { parseArgs } = require('../../bin/ralph-cli');
      const result = parseArgs(['node', 'ralph', 'help']);
      expect(result.command).toBe('help');
    });

    test('parseArgs handles prompts command', () => {
      const { parseArgs } = require('../../bin/ralph-cli');
      const result = parseArgs(['node', 'ralph', 'prompts']);
      expect(result.command).toBe('prompts');
    });
  });
});
