'use strict';

const { PromptMetrics } = require('../../lib/prompt-metrics');
const fs = require('fs').promises;
const os = require('os');
const path = require('path');

const VALID_RESULT_PASS_WIN = {
  timestamp: '2026-02-15T10:30:00Z',
  layer: 'L9',
  agentType: 'judge',
  mode: 'mock',
  variants: [
    {
      name: 'original',
      templatePath: 'templates/agents/judge-base.md',
      output: { verdict: 'PASS', issues: [], rawOutput: '...' },
      metrics: { tokenCount: 1200, issueCount: 3, specificIssues: 2 }
    },
    {
      name: 'vivid',
      templatePath: 'templates/agents/variants/judge-base.vivid.md',
      output: { verdict: 'ITERATE', issues: [], rawOutput: '...' },
      metrics: { tokenCount: 1800, issueCount: 7, specificIssues: 6 }
    }
  ],
  comparison: { winner: 'original' }
};

const VALID_RESULT_TIED = {
  timestamp: '2026-02-15T11:00:00Z',
  layer: 'L9',
  agentType: 'judge',
  mode: 'mock',
  variants: [
    {
      name: 'original',
      templatePath: 'templates/agents/judge-base.md',
      output: { verdict: 'PASS', issues: [], rawOutput: '...' },
      metrics: { tokenCount: 1000, issueCount: 0, specificIssues: 0 }
    },
    {
      name: 'vivid',
      templatePath: 'templates/agents/variants/judge-base.vivid.md',
      output: { verdict: 'PASS', issues: [], rawOutput: '...' },
      metrics: { tokenCount: 1500, issueCount: 0, specificIssues: 0 }
    }
  ],
  comparison: { winner: 'tie' }
};

const VALID_RESULT_L8 = {
  timestamp: '2026-02-15T09:00:00Z',
  layer: 'L8',
  agentType: 'builder',
  mode: 'mock',
  variants: [
    {
      name: 'original',
      templatePath: 'templates/agents/builder.md',
      output: { verdict: 'PASS', issues: [], rawOutput: '...' },
      metrics: { tokenCount: 800, issueCount: 2, specificIssues: 1 }
    },
    {
      name: 'vivid',
      templatePath: 'templates/agents/variants/builder.vivid.md',
      output: { verdict: 'PASS', issues: [], rawOutput: '...' },
      metrics: { tokenCount: 900, issueCount: 3, specificIssues: 2 }
    }
  ],
  comparison: { winner: 'tie' }
};

describe('PromptMetrics', () => {
  let tmpDir, metrics;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'prompt-metrics-'));
    const resultsDir = path.join(tmpDir, '_prompt-tests');
    await fs.mkdir(resultsDir, { recursive: true });
    metrics = new PromptMetrics(tmpDir);
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
    jest.restoreAllMocks();
  });

  describe('_loadResults()', () => {
    test('loads valid JSON files', async () => {
      await fs.writeFile(
        path.join(tmpDir, '_prompt-tests', 'test1.json'),
        JSON.stringify(VALID_RESULT_PASS_WIN)
      );
      const results = await metrics._loadResults();
      expect(results).toHaveLength(1);
      expect(results[0].layer).toBe('L9');
    });

    test('sorts by timestamp descending', async () => {
      await fs.writeFile(
        path.join(tmpDir, '_prompt-tests', 'old.json'),
        JSON.stringify(VALID_RESULT_L8) // older timestamp
      );
      await fs.writeFile(
        path.join(tmpDir, '_prompt-tests', 'new.json'),
        JSON.stringify(VALID_RESULT_PASS_WIN) // newer timestamp
      );
      const results = await metrics._loadResults();
      expect(results[0].timestamp).toBe('2026-02-15T10:30:00Z');
      expect(results[1].timestamp).toBe('2026-02-15T09:00:00Z');
    });

    test('skips malformed JSON with warning', async () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      await fs.writeFile(
        path.join(tmpDir, '_prompt-tests', 'bad.json'),
        'not json {{{}'
      );
      await fs.writeFile(
        path.join(tmpDir, '_prompt-tests', 'good.json'),
        JSON.stringify(VALID_RESULT_PASS_WIN)
      );
      const results = await metrics._loadResults();
      expect(results).toHaveLength(1);
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Skipping malformed file')
      );
    });

    test('skips files with missing required fields', async () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      await fs.writeFile(
        path.join(tmpDir, '_prompt-tests', 'incomplete.json'),
        JSON.stringify({ invalid: true })
      );
      const results = await metrics._loadResults();
      expect(results).toHaveLength(0);
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('missing fields')
      );
    });

    test('skips files with empty variants array', async () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      await fs.writeFile(
        path.join(tmpDir, '_prompt-tests', 'empty-variants.json'),
        JSON.stringify({ timestamp: 'x', layer: 'L9', agentType: 'judge', variants: [] })
      );
      const results = await metrics._loadResults();
      expect(results).toHaveLength(0);
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('variants must be a non-empty array')
      );
    });

    test('returns empty array for missing directory', async () => {
      const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      const noDir = new PromptMetrics(path.join(os.tmpdir(), 'nonexistent-' + Date.now()));
      const results = await noDir._loadResults();
      expect(results).toEqual([]);
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('No test results found')
      );
    });

    test('returns empty array for empty directory', async () => {
      const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      // _prompt-tests/ exists but has no JSON files
      const results = await metrics._loadResults();
      expect(results).toEqual([]);
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('No test results found')
      );
    });
  });

  describe('metric computation', () => {
    beforeEach(async () => {
      await fs.writeFile(
        path.join(tmpDir, '_prompt-tests', 'test1.json'),
        JSON.stringify(VALID_RESULT_PASS_WIN)
      );
    });

    test('PASS wins over ITERATE in win rate', async () => {
      const report = await metrics.report({ format: 'json' });
      expect(report.winRate.original).toBe(100);
      expect(report.winRate.vivid).toBe(0);
    });

    test('tied verdicts produce 50/50 win rate', async () => {
      // Replace with tied result
      await fs.writeFile(
        path.join(tmpDir, '_prompt-tests', 'test1.json'),
        JSON.stringify(VALID_RESULT_TIED)
      );
      const report = await metrics.report({ format: 'json' });
      expect(report.winRate.original).toBe(50);
      expect(report.winRate.vivid).toBe(50);
    });

    test('specificity computes specific/total ratio', async () => {
      const report = await metrics.report({ format: 'json' });
      // original: 2 specific / 3 total = 0.67
      expect(report.specificity.original).toBeCloseTo(0.67, 2);
      // vivid: 6 specific / 7 total = 0.86
      expect(report.specificity.vivid).toBeCloseTo(0.86, 2);
    });

    test('zero issues produce N/A specificity', async () => {
      await fs.writeFile(
        path.join(tmpDir, '_prompt-tests', 'test1.json'),
        JSON.stringify(VALID_RESULT_TIED) // zero issues
      );
      const report = await metrics.report({ format: 'json' });
      expect(report.specificity.original).toBe('N/A');
      expect(report.specificity.vivid).toBe('N/A');
    });

    test('token efficiency computes issues/tokens', async () => {
      const report = await metrics.report({ format: 'json' });
      // original: 3 issues / 1200 tokens = 0.0025
      expect(report.tokenEfficiency.original).toBeCloseTo(0.0025, 4);
      // vivid: 7 issues / 1800 tokens = 0.0039
      expect(report.tokenEfficiency.vivid).toBeCloseTo(0.0039, 4);
    });
  });

  describe('filtering', () => {
    beforeEach(async () => {
      await fs.writeFile(
        path.join(tmpDir, '_prompt-tests', 'test1.json'),
        JSON.stringify(VALID_RESULT_PASS_WIN)
      );
      await fs.writeFile(
        path.join(tmpDir, '_prompt-tests', 'test2.json'),
        JSON.stringify(VALID_RESULT_TIED)
      );
      await fs.writeFile(
        path.join(tmpDir, '_prompt-tests', 'test3.json'),
        JSON.stringify(VALID_RESULT_L8)
      );
    });

    test('--last N limits to N most recent', async () => {
      const report = await metrics.report({ last: 1, format: 'json' });
      expect(report.resultCount).toBe(1);
    });

    test('layer filter restricts to matching layer', async () => {
      const report = await metrics.report({ layer: 'L8', format: 'json' });
      expect(report.resultCount).toBe(1);
    });

    test('variant filter restricts to results containing variant', async () => {
      const report = await metrics.report({ variant: 'vivid', format: 'json' });
      expect(report.resultCount).toBe(3); // all have vivid
    });

    test('empty filter results produce helpful message', async () => {
      const report = await metrics.report({ layer: 'L99', format: 'json' });
      expect(report.resultCount).toBe(0);
      expect(report.message).toContain('No results match');
    });
  });

  describe('formatting', () => {
    beforeEach(async () => {
      await fs.writeFile(
        path.join(tmpDir, '_prompt-tests', 'test1.json'),
        JSON.stringify(VALID_RESULT_PASS_WIN)
      );
    });

    test('table has correct column headers', async () => {
      const report = await metrics.report();
      expect(report.formatted).toContain('Variant');
      expect(report.formatted).toContain('Win Rate');
      expect(report.formatted).toContain('Specificity');
      expect(report.formatted).toContain('Token Eff.');
    });

    test('table contains variant data', async () => {
      const report = await metrics.report();
      expect(report.formatted).toContain('original');
      expect(report.formatted).toContain('vivid');
      expect(report.formatted).toContain('100%');
    });

    test('summary shows winner', async () => {
      const report = await metrics.report();
      expect(report.summary).toBe('Winner: original');
    });

    test('summary shows no clear winner for tied results', async () => {
      await fs.writeFile(
        path.join(tmpDir, '_prompt-tests', 'test1.json'),
        JSON.stringify(VALID_RESULT_TIED)
      );
      const report = await metrics.report();
      expect(report.summary).toBe('No clear winner');
    });

    test('JSON format returns raw metrics without formatted string', async () => {
      const report = await metrics.report({ format: 'json' });
      expect(report.formatted).toBeUndefined();
      expect(report.winRate).toBeDefined();
      expect(report.specificity).toBeDefined();
    });

    test('shows result count', async () => {
      const report = await metrics.report();
      expect(report.formatted).toContain('1 test run');
    });
  });

  describe('_determineSummary()', () => {
    test('returns winner name when clear winner', () => {
      expect(metrics._determineSummary({ a: 80, b: 20 })).toBe('Winner: a');
    });

    test('returns no clear winner when tied', () => {
      expect(metrics._determineSummary({ a: 50, b: 50 })).toBe('No clear winner');
    });

    test('returns no data for empty rates', () => {
      expect(metrics._determineSummary({})).toBe('No data');
    });
  });
});
