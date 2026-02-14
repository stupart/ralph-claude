'use strict';

const { PromptRegistry } = require('../../lib/prompt-registry');
const fs = require('fs').promises;
const os = require('os');
const path = require('path');

describe('PromptRegistry', () => {
  let tmpDir, registry;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'prompt-reg-'));
    await fs.writeFile(path.join(tmpDir, 'builder.md'),
      '# Builder\n{{CONTEXT}}\n{{LAYER_INSTRUCTIONS}}');
    await fs.writeFile(path.join(tmpDir, 'judge-base.md'),
      '# Judge\n{{CONTEXT}}\n{{LAYER_INSTRUCTIONS}}');
    await fs.writeFile(path.join(tmpDir, 'planner-L1-L2-input.md'),
      '# Planner\n{{CONTEXT}}');
    await fs.writeFile(path.join(tmpDir, 'planner-base.md'),
      '# Planner Base\n{{CONTEXT}}\n{{LAYER_INSTRUCTIONS}}');
    registry = new PromptRegistry(tmpDir);
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  describe('scan()', () => {
    test('returns entries for all .md files', async () => {
      const entries = await registry.scan();
      expect(entries).toHaveLength(4);
      const filenames = entries.map(e => e.filename);
      expect(filenames).toContain('builder.md');
      expect(filenames).toContain('judge-base.md');
      expect(filenames).toContain('planner-L1-L2-input.md');
      expect(filenames).toContain('planner-base.md');
    });

    test('ignores non-.md files', async () => {
      await fs.writeFile(path.join(tmpDir, 'readme.txt'), 'not a template');
      const entries = await registry.scan();
      expect(entries).toHaveLength(4);
    });

    test('extracts correct agentType from filename', async () => {
      const entries = await registry.scan();
      const builder = entries.find(e => e.filename === 'builder.md');
      const judge = entries.find(e => e.filename === 'judge-base.md');
      const planner = entries.find(e => e.filename === 'planner-L1-L2-input.md');

      expect(builder.agentType).toBe('builder');
      expect(judge.agentType).toBe('judge');
      expect(planner.agentType).toBe('planner');
    });

    test('extracts layerMapping from filename', async () => {
      const entries = await registry.scan();
      const builder = entries.find(e => e.filename === 'builder.md');
      const planner = entries.find(e => e.filename === 'planner-L1-L2-input.md');
      const judgeBase = entries.find(e => e.filename === 'judge-base.md');

      expect(builder.layerMapping).toEqual(['L8']);
      expect(planner.layerMapping).toEqual(['L1', 'L2']);
      expect(judgeBase.layerMapping).toEqual([]); // base templates have no specific layer
    });

    test('extracts template variables', async () => {
      const entries = await registry.scan();
      const builder = entries.find(e => e.filename === 'builder.md');
      expect(builder.templateVariables).toContain('CONTEXT');
      expect(builder.templateVariables).toContain('LAYER_INSTRUCTIONS');
      expect(builder.templateVariables).toHaveLength(2);

      const planner = entries.find(e => e.filename === 'planner-L1-L2-input.md');
      expect(planner.templateVariables).toEqual(['CONTEXT']);
    });

    test('deduplicates template variables', async () => {
      await fs.writeFile(path.join(tmpDir, 'dup-test.md'),
        '{{CONTEXT}} some text {{CONTEXT}} more text');
      // Need a new registry to pick up the new file
      // But we need to handle non-standard agent types
      const entries = await registry.scan();
      const dupTest = entries.find(e => e.filename === 'dup-test.md');
      // dup-test doesn't start with planner/builder/judge, so unknown type
      expect(dupTest.agentType).toBe('unknown');
      expect(dupTest.templateVariables).toEqual(['CONTEXT']);
    });

    test('computes charCount and estimatedTokens', async () => {
      const entries = await registry.scan();
      const builder = entries.find(e => e.filename === 'builder.md');
      const content = '# Builder\n{{CONTEXT}}\n{{LAYER_INSTRUCTIONS}}';
      expect(builder.charCount).toBe(content.length);
      expect(builder.estimatedTokens).toBe(Math.ceil(content.length / 4));
    });

    test('includes lastModified as Date', async () => {
      const entries = await registry.scan();
      const builder = entries.find(e => e.filename === 'builder.md');
      expect(builder.lastModified.getTime).toBeDefined();
      expect(typeof builder.lastModified.getTime()).toBe('number');
    });

    test('handles empty directory', async () => {
      const emptyDir = await fs.mkdtemp(path.join(os.tmpdir(), 'prompt-empty-'));
      const emptyRegistry = new PromptRegistry(emptyDir);
      const entries = await emptyRegistry.scan();
      expect(entries).toEqual([]);
      await fs.rm(emptyDir, { recursive: true, force: true });
    });

    test('handles nonexistent directory', async () => {
      const noDir = path.join(os.tmpdir(), 'nonexistent-dir-' + Date.now());
      const noRegistry = new PromptRegistry(noDir);
      const entries = await noRegistry.scan();
      expect(entries).toEqual([]);
    });

    test('handles empty files', async () => {
      await fs.writeFile(path.join(tmpDir, 'planner-empty.md'), '');
      const entries = await registry.scan();
      const empty = entries.find(e => e.filename === 'planner-empty.md');
      expect(empty.charCount).toBe(0);
      expect(empty.estimatedTokens).toBe(0);
      expect(empty.templateVariables).toEqual([]);
    });

    test('sets default variant fields on originals', async () => {
      const entries = await registry.scan();
      for (const entry of entries) {
        expect(entry.isVariant).toBe(false);
        expect(entry.variantName).toBeNull();
        expect(entry.baselinePath).toBeNull();
        expect(entry.variants).toEqual([]);
      }
    });
  });

  describe('variant scanning', () => {
    test('discovers variants and associates with baselines', async () => {
      await fs.mkdir(path.join(tmpDir, 'variants'));
      await fs.writeFile(
        path.join(tmpDir, 'variants', 'judge-base.vivid.md'),
        '# Vivid Judge\n{{CONTEXT}}\n{{LAYER_INSTRUCTIONS}}'
      );
      const entries = await registry.scan();
      const variant = entries.find(e => e.isVariant);
      expect(variant).toBeDefined();
      expect(variant.variantName).toBe('vivid');
      expect(variant.baselinePath).toBe(path.join(tmpDir, 'judge-base.md'));
      expect(variant.filename).toBe('judge-base.vivid.md');
    });

    test('populates original variants array with variant references', async () => {
      await fs.mkdir(path.join(tmpDir, 'variants'));
      await fs.writeFile(
        path.join(tmpDir, 'variants', 'judge-base.vivid.md'),
        '# Vivid Judge\n{{CONTEXT}}\n{{LAYER_INSTRUCTIONS}}'
      );
      const entries = await registry.scan();
      const original = entries.find(e => e.filename === 'judge-base.md');
      expect(original.variants).toHaveLength(1);
      expect(original.variants[0].name).toBe('vivid');
      expect(original.variants[0].filePath).toContain('judge-base.vivid.md');
    });

    test('warns on variable mismatch - missing variables', async () => {
      await fs.mkdir(path.join(tmpDir, 'variants'));
      await fs.writeFile(
        path.join(tmpDir, 'variants', 'judge-base.minimal.md'),
        '# Minimal Judge\n{{CONTEXT}}'
        // Missing {{LAYER_INSTRUCTIONS}}
      );
      const entries = await registry.scan();
      const variant = entries.find(e => e.variantName === 'minimal');
      expect(variant.variableWarnings).toBeDefined();
      expect(variant.variableWarnings.missing).toContain('LAYER_INSTRUCTIONS');
      expect(variant.variableWarnings.extra).toEqual([]);
    });

    test('warns on variable mismatch - extra variables', async () => {
      await fs.mkdir(path.join(tmpDir, 'variants'));
      await fs.writeFile(
        path.join(tmpDir, 'variants', 'judge-base.extra.md'),
        '# Extra Judge\n{{CONTEXT}}\n{{LAYER_INSTRUCTIONS}}\n{{EXTRA_VAR}}'
      );
      const entries = await registry.scan();
      const variant = entries.find(e => e.variantName === 'extra');
      expect(variant.variableWarnings).toBeDefined();
      expect(variant.variableWarnings.extra).toContain('EXTRA_VAR');
    });

    test('no variableWarnings when variables match', async () => {
      await fs.mkdir(path.join(tmpDir, 'variants'));
      await fs.writeFile(
        path.join(tmpDir, 'variants', 'judge-base.vivid.md'),
        '# Vivid Judge\n{{CONTEXT}}\n{{LAYER_INSTRUCTIONS}}'
      );
      const entries = await registry.scan();
      const variant = entries.find(e => e.variantName === 'vivid');
      expect(variant.variableWarnings).toBeUndefined();
    });

    test('handles missing variants directory', async () => {
      // Don't create variants/ subdirectory
      const entries = await registry.scan();
      expect(entries).toHaveLength(4);
      expect(entries.every(e => !e.isVariant)).toBe(true);
    });

    test('warns on unmatched variant filename', async () => {
      await fs.mkdir(path.join(tmpDir, 'variants'));
      await fs.writeFile(
        path.join(tmpDir, 'variants', 'nonexistent-base.vivid.md'),
        '# Orphan Variant\n{{CONTEXT}}'
      );
      const entries = await registry.scan();
      const variant = entries.find(e => e.variantName === 'vivid');
      expect(variant.baselinePath).toBeNull();
      expect(variant.warnings).toContain(
        "No baseline found for variant 'nonexistent-base.vivid.md'"
      );
    });

    test('handles multiple variants for same original', async () => {
      await fs.mkdir(path.join(tmpDir, 'variants'));
      await fs.writeFile(
        path.join(tmpDir, 'variants', 'builder.vivid.md'),
        '# Vivid Builder\n{{CONTEXT}}\n{{LAYER_INSTRUCTIONS}}'
      );
      await fs.writeFile(
        path.join(tmpDir, 'variants', 'builder.terse.md'),
        '# Terse Builder\n{{CONTEXT}}\n{{LAYER_INSTRUCTIONS}}'
      );
      const entries = await registry.scan();
      const original = entries.find(e => e.filename === 'builder.md');
      expect(original.variants).toHaveLength(2);
      const variantNames = original.variants.map(v => v.name);
      expect(variantNames).toContain('vivid');
      expect(variantNames).toContain('terse');
    });
  });

  describe('filter()', () => {
    beforeEach(async () => {
      await fs.mkdir(path.join(tmpDir, 'variants'));
      await fs.writeFile(
        path.join(tmpDir, 'variants', 'judge-base.vivid.md'),
        '# Vivid Judge\n{{CONTEXT}}\n{{LAYER_INSTRUCTIONS}}'
      );
      await registry.scan();
    });

    test('filters by agentType', () => {
      const judges = registry.filter({ agentType: 'judge' });
      expect(judges.every(e => e.agentType === 'judge')).toBe(true);
      expect(judges.length).toBeGreaterThan(0);
    });

    test('filters by layer', () => {
      const l1 = registry.filter({ layer: 'L1' });
      expect(l1.every(e => e.layerMapping.includes('L1'))).toBe(true);
      expect(l1.length).toBeGreaterThan(0);
    });

    test('filters by variantStatus originalsOnly', () => {
      const originals = registry.filter({ variantStatus: 'originalsOnly' });
      expect(originals.every(e => !e.isVariant)).toBe(true);
    });

    test('filters by variantStatus isVariant', () => {
      const variants = registry.filter({ variantStatus: 'isVariant' });
      expect(variants.every(e => e.isVariant)).toBe(true);
      expect(variants).toHaveLength(1);
    });

    test('filters by variantStatus hasVariants', () => {
      const withVariants = registry.filter({ variantStatus: 'hasVariants' });
      expect(withVariants.every(e => !e.isVariant && e.variants.length > 0)).toBe(true);
      expect(withVariants).toHaveLength(1);
      expect(withVariants[0].filename).toBe('judge-base.md');
    });

    test('combines multiple filters', () => {
      const judgeVariants = registry.filter({ agentType: 'judge', variantStatus: 'isVariant' });
      expect(judgeVariants).toHaveLength(1);
      expect(judgeVariants[0].agentType).toBe('judge');
      expect(judgeVariants[0].isVariant).toBe(true);
    });

    test('returns all entries with no criteria', () => {
      const all = registry.filter();
      expect(all).toHaveLength(5); // 4 originals + 1 variant
    });

    test('returns empty array when no match', () => {
      const none = registry.filter({ agentType: 'nonexistent' });
      expect(none).toEqual([]);
    });

    test('returns empty array when scan not called', () => {
      const freshRegistry = new PromptRegistry(tmpDir);
      const results = freshRegistry.filter({ agentType: 'judge' });
      expect(results).toEqual([]);
    });
  });

  describe('diff()', () => {
    test('identifies added and removed lines', async () => {
      const file1 = path.join(tmpDir, 'original.md');
      const file2 = path.join(tmpDir, 'variant.md');
      await fs.writeFile(file1, 'line1\nline2\nline3');
      await fs.writeFile(file2, 'line1\nline2\nnew-line');

      const result = await registry.diff(file2, file1);
      expect(result.added).toContain('new-line');
      expect(result.removed).toContain('line3');
      expect(result.unchanged).toContain('line1');
      expect(result.unchanged).toContain('line2');
    });

    test('returns empty diff for identical files', async () => {
      const file1 = path.join(tmpDir, 'same1.md');
      const file2 = path.join(tmpDir, 'same2.md');
      await fs.writeFile(file1, 'identical\ncontent');
      await fs.writeFile(file2, 'identical\ncontent');

      const result = await registry.diff(file2, file1);
      expect(result.added).toEqual([]);
      expect(result.removed).toEqual([]);
      expect(result.unchanged).toEqual(['identical', 'content']);
    });

    test('returns correct summary counts', async () => {
      const file1 = path.join(tmpDir, 'orig.md');
      const file2 = path.join(tmpDir, 'var.md');
      await fs.writeFile(file1, 'a\nb\nc');
      await fs.writeFile(file2, 'a\nx\ny');

      const result = await registry.diff(file2, file1);
      expect(result.summary.addedCount).toBe(2); // x, y
      expect(result.summary.removedCount).toBe(2); // b, c
      expect(result.summary.unchangedCount).toBe(1); // a
    });

    test('handles completely different files', async () => {
      const file1 = path.join(tmpDir, 'all-old.md');
      const file2 = path.join(tmpDir, 'all-new.md');
      await fs.writeFile(file1, 'old1\nold2');
      await fs.writeFile(file2, 'new1\nnew2');

      const result = await registry.diff(file2, file1);
      expect(result.added).toEqual(['new1', 'new2']);
      expect(result.removed).toEqual(['old1', 'old2']);
      expect(result.unchanged).toEqual([]);
    });
  });

  describe('layer mapping edge cases', () => {
    test('judge-L10-L11-reviews maps to L10, L11', async () => {
      await fs.writeFile(path.join(tmpDir, 'judge-L10-L11-reviews.md'), '# Judge');
      const entries = await registry.scan();
      const judge = entries.find(e => e.filename === 'judge-L10-L11-reviews.md');
      expect(judge.layerMapping).toEqual(['L10', 'L11']);
    });

    test('planner-L12-retrospective maps to L12', async () => {
      await fs.writeFile(path.join(tmpDir, 'planner-L12-retrospective.md'), '# Planner');
      const entries = await registry.scan();
      const planner = entries.find(e => e.filename === 'planner-L12-retrospective.md');
      expect(planner.layerMapping).toEqual(['L12']);
    });
  });
});
