'use strict';

const path = require('path');
const os = require('os');
const fsPromises = require('fs').promises;

// We need to mock child_process and agent-spawner before requiring prompt-editor
jest.mock('child_process', () => ({
  execFile: jest.fn((cmd, args, cb) => cb(null))
}));

jest.mock('../../lib/agent-spawner', () => ({
  AgentSpawner: jest.fn().mockImplementation(() => ({
    createSpawnConfig: jest.fn().mockResolvedValue({
      prompt: 'Assembled prompt text here',
      model: 'opus'
    }),
    estimateContextBudget: jest.fn().mockReturnValue({
      estimatedTokens: 1000,
      budgetFraction: 0.05
    })
  }))
}));

const { PromptEditor } = require('../../lib/prompt-editor');
const { execFile } = require('child_process');
const { AgentSpawner } = require('../../lib/agent-spawner');
const fs = require('fs');

describe('PromptEditor', () => {
  let tmpDir, originalEditor;

  beforeEach(async () => {
    tmpDir = await fsPromises.mkdtemp(path.join(os.tmpdir(), 'prompt-edit-'));
    // Create mock templates
    await fsPromises.writeFile(path.join(tmpDir, 'builder.md'),
      '# Builder\n{{CONTEXT}}\n{{LAYER_INSTRUCTIONS}}');
    await fsPromises.writeFile(path.join(tmpDir, 'judge-base.md'),
      '# Judge\n{{CONTEXT}}\n{{LAYER_INSTRUCTIONS}}');
    await fsPromises.writeFile(path.join(tmpDir, 'judge-L9-feature-review.md'),
      '# Judge L9\n{{CONTEXT}}');
    await fsPromises.writeFile(path.join(tmpDir, 'planner-base.md'),
      '# Planner Base\n{{CONTEXT}}\n{{LAYER_INSTRUCTIONS}}');
    await fsPromises.writeFile(path.join(tmpDir, 'planner-L1-L2-input.md'),
      '# Planner\n{{CONTEXT}}');

    originalEditor = process.env.EDITOR;
    jest.clearAllMocks();
  });

  afterEach(async () => {
    if (originalEditor !== undefined) {
      process.env.EDITOR = originalEditor;
    } else {
      delete process.env.EDITOR;
    }
    await fsPromises.rm(tmpDir, { recursive: true, force: true });
    jest.restoreAllMocks();
  });

  describe('_resolveTemplate()', () => {
    test('resolves L8-builder to builder.md', async () => {
      const editor = new PromptEditor(tmpDir, tmpDir);
      const result = await editor._resolveTemplate('L8-builder');
      expect(result.filename).toBe('builder.md');
    });

    test('resolves L9-judge to judge-L9-feature-review.md', async () => {
      const editor = new PromptEditor(tmpDir, tmpDir);
      const result = await editor._resolveTemplate('L9-judge');
      expect(result.filename).toBe('judge-L9-feature-review.md');
    });

    test('resolves planner-base by filename', async () => {
      const editor = new PromptEditor(tmpDir, tmpDir);
      const result = await editor._resolveTemplate('planner-base');
      expect(result.filename).toBe('planner-base.md');
    });

    test('resolves L1-planner to planner-L1-L2-input.md', async () => {
      const editor = new PromptEditor(tmpDir, tmpDir);
      const result = await editor._resolveTemplate('L1-planner');
      expect(result.filename).toBe('planner-L1-L2-input.md');
    });

    test('falls back to base template when layer-specific not found', async () => {
      const editor = new PromptEditor(tmpDir, tmpDir);
      const result = await editor._resolveTemplate('L4-judge');
      expect(result.filename).toBe('judge-base.md');
    });

    test('returns error for unknown identifier', async () => {
      const editor = new PromptEditor(tmpDir, tmpDir);
      const result = await editor._resolveTemplate('nonexistent');
      expect(result.error).toBeDefined();
      expect(result.error).toContain('Unknown template identifier');
      expect(result.validIdentifiers).toBeDefined();
      expect(Array.isArray(result.validIdentifiers)).toBe(true);
    });
  });

  describe('edit()', () => {
    test('displays path message when $EDITOR is not set', async () => {
      delete process.env.EDITOR;
      const editor = new PromptEditor(tmpDir, tmpDir);
      const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      await editor.edit('builder');
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('$EDITOR is not set')
      );
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('builder.md')
      );
    });

    test('logs error for unknown identifier', async () => {
      const editor = new PromptEditor(tmpDir, tmpDir);
      const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      await editor.edit('does-not-exist');
      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Unknown template identifier')
      );
    });

    test('opens $EDITOR with correct file path via execFile', async () => {
      process.env.EDITOR = 'nano';
      const editor = new PromptEditor(tmpDir, tmpDir);

      // Mock fs.watch
      const mockWatcher = { close: jest.fn() };
      jest.spyOn(fs, 'watch').mockReturnValue(mockWatcher);

      // execFile already mocked globally
      execFile.mockImplementation((cmd, args, cb) => {
        expect(cmd).toBe('nano');
        expect(args[0]).toContain('builder.md');
        cb(null);
      });

      await editor.edit('builder');

      expect(execFile).toHaveBeenCalled();
      expect(fs.watch).toHaveBeenCalled();
      expect(mockWatcher.close).toHaveBeenCalled();
    });

    test('handles $EDITOR non-zero exit', async () => {
      process.env.EDITOR = 'false';
      const editor = new PromptEditor(tmpDir, tmpDir);

      const mockWatcher = { close: jest.fn() };
      jest.spyOn(fs, 'watch').mockReturnValue(mockWatcher);

      execFile.mockImplementation((cmd, args, cb) => {
        const err = new Error('exit code 1');
        err.code = 1;
        cb(err);
      });

      const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      await editor.edit('builder');
      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining('$EDITOR exited with code')
      );
      expect(mockWatcher.close).toHaveBeenCalled();
    });
  });

  describe('_renderPreview()', () => {
    test('displays assembled prompt with token count', async () => {
      const editor = new PromptEditor(tmpDir, tmpDir);

      const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      const entry = {
        filename: 'builder.md',
        filePath: path.join(tmpDir, 'builder.md'),
        agentType: 'builder',
        layerMapping: ['L8']
      };

      await editor._renderPreview(entry);
      expect(logSpy).toHaveBeenCalledWith('\n--- Assembled Prompt Preview ---');
      expect(logSpy).toHaveBeenCalledWith('Assembled prompt text here');
      expect(logSpy).toHaveBeenCalledWith('--- End Preview ---');
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('tokens')
      );
    });

    test('shows budget percentage', async () => {
      const editor = new PromptEditor(tmpDir, tmpDir);

      const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      const entry = {
        filename: 'builder.md',
        filePath: path.join(tmpDir, 'builder.md'),
        agentType: 'builder',
        layerMapping: ['L8']
      };

      await editor._renderPreview(entry);
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('% of context budget')
      );
    });

    test('warns about unresolved template variables', async () => {
      const editor = new PromptEditor(tmpDir, tmpDir);

      // Override the mock to return unresolved variables
      AgentSpawner.mockImplementation(() => ({
        createSpawnConfig: jest.fn().mockResolvedValue({
          prompt: 'Some text {{UNRESOLVED}} more text',
          model: 'opus'
        }),
        estimateContextBudget: jest.fn().mockReturnValue({
          estimatedTokens: 500,
          budgetFraction: 0.025
        })
      }));

      const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      const entry = {
        filename: 'builder.md',
        filePath: path.join(tmpDir, 'builder.md'),
        agentType: 'builder',
        layerMapping: ['L8']
      };

      await editor._renderPreview(entry);
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Unresolved template variables')
      );
    });

    test('handles errors gracefully', async () => {
      const editor = new PromptEditor(tmpDir, tmpDir);

      AgentSpawner.mockImplementation(() => ({
        createSpawnConfig: jest.fn().mockRejectedValue(new Error('spawn failed'))
      }));

      const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const entry = {
        filename: 'builder.md',
        filePath: path.join(tmpDir, 'builder.md'),
        agentType: 'builder',
        layerMapping: ['L8']
      };

      await editor._renderPreview(entry);
      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Preview error: spawn failed')
      );
    });

    test('uses default layer for type when layerMapping is empty', async () => {
      const editor = new PromptEditor(tmpDir, tmpDir);

      const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      const entry = {
        filename: 'judge-base.md',
        filePath: path.join(tmpDir, 'judge-base.md'),
        agentType: 'judge',
        layerMapping: []
      };

      await editor._renderPreview(entry);
      expect(AgentSpawner).toHaveBeenCalled();
      const instance = AgentSpawner.mock.results[
        AgentSpawner.mock.results.length - 1
      ].value;
      expect(instance.createSpawnConfig).toHaveBeenCalledWith(
        'L9',
        expect.any(Object)
      );
    });
  });

  describe('_defaultLayerForType()', () => {
    test('returns L8 for builder', () => {
      const editor = new PromptEditor(tmpDir, tmpDir);
      expect(editor._defaultLayerForType('builder')).toBe('L8');
    });

    test('returns L9 for judge', () => {
      const editor = new PromptEditor(tmpDir, tmpDir);
      expect(editor._defaultLayerForType('judge')).toBe('L9');
    });

    test('returns L4 for planner', () => {
      const editor = new PromptEditor(tmpDir, tmpDir);
      expect(editor._defaultLayerForType('planner')).toBe('L4');
    });

    test('returns L1 for unknown type', () => {
      const editor = new PromptEditor(tmpDir, tmpDir);
      expect(editor._defaultLayerForType('unknown')).toBe('L1');
    });
  });
});
