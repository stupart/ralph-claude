const { BrainDumpGenerator } = require('../lib/brain-dump-generator');

function createValidHistory(overrides = {}) {
  return {
    generations: [
      { generation: 3, epics: { planned: 4, built: 2, deferred: 2 }, testCount: 200, reviewFindings: [] },
      { generation: 4, epics: { planned: 4, built: 3, deferred: 1 }, testCount: 500, reviewFindings: [] }
    ],
    issueLedger: [],
    deferralCounts: {},
    ...overrides
  };
}

function createValidReport(overrides = {}) {
  return {
    status: 'improving',
    compositeScore: 'improving',
    metrics: {},
    plateaus: [],
    regressions: [],
    healthSignals: [],
    chronicDeferrals: [],
    ...overrides
  };
}

function createValidMetadata(overrides = {}) {
  return {
    moduleCount: 20,
    testCount: 862,
    recentChanges: 'Added prompt lab modules',
    ...overrides
  };
}

describe('Brain Dump Generator', () => {
  let generator;
  beforeEach(() => { generator = new BrainDumpGenerator(); });

  describe('Input Validation', () => {
    test('null generationHistory throws', () => {
      expect(() => generator.generate(null, createValidReport(), createValidMetadata())).toThrow('generationHistory is required');
    });

    test('null convergenceReport throws', () => {
      expect(() => generator.generate(createValidHistory(), null, createValidMetadata())).toThrow('convergenceReport is required');
    });

    test('null codebaseMetadata throws', () => {
      expect(() => generator.generate(createValidHistory(), createValidReport(), null)).toThrow('codebaseMetadata is required');
    });

    test('empty history returns skeleton template', () => {
      const history = createValidHistory({ generations: [] });
      const output = generator.generate(history, createValidReport(), createValidMetadata());

      expect(output).toMatch(/## Project Context/);
      expect(output).toMatch(/## Current State Summary/);
      expect(output).toMatch(/## Meta-Problem Analysis/);
      expect(output).toMatch(/## Proposed Epics/);
      expect(output).toMatch(/## Constraints and "What NOT to Do"/);
      expect(output).toMatch(/No historical data available\. Manual input required\./);
    });

    test('empty history includes codebase metadata', () => {
      const history = createValidHistory({ generations: [] });
      const output = generator.generate(history, createValidReport(), createValidMetadata());

      expect(output).toMatch(/Module count: 20/);
      expect(output).toMatch(/Test count: 862/);
    });

    test('partial metadata shows data unavailable', () => {
      const history = createValidHistory({ generations: [] });
      const output = generator.generate(history, createValidReport(), { moduleCount: 20 });

      expect(output).toMatch(/\(data unavailable\)/);
    });
  });

  describe('Chronic Deferrals', () => {
    test('epic deferred 4x includes MUST deliver language', () => {
      const history = createValidHistory({
        deferralCounts: { 'Self-Improvement': { total: 4, consecutive: 4 } }
      });
      const output = generator.generate(history, createValidReport(), createValidMetadata());

      expect(output).toMatch(/MUST deliver or explicitly cancel/);
    });

    test('epic deferred 2x not included in chronic deferrals section', () => {
      const history = createValidHistory({
        deferralCounts: { 'Some Epic': { total: 2, consecutive: 2 } }
      });
      const output = generator.generate(history, createValidReport(), createValidMetadata());

      expect(output).not.toMatch(/MUST deliver or explicitly cancel/);
    });

    test('chronic deferrals sorted by consecutive count descending', () => {
      const history = createValidHistory({
        deferralCounts: {
          'Epic A': { total: 3, consecutive: 3 },
          'Epic B': { total: 5, consecutive: 5 }
        }
      });
      const output = generator.generate(history, createValidReport(), createValidMetadata());

      const indexA = output.indexOf('Epic A');
      const indexB = output.indexOf('Epic B');
      expect(indexB).toBeLessThan(indexA);
    });
  });

  describe('Issue Surfacing', () => {
    test('recurring issue formatted correctly', () => {
      const history = createValidHistory({
        issueLedger: [
          { title: 'stale registry', severity: 'MINOR', recurrenceCount: 2, generations: [3, 4] }
        ]
      });
      const output = generator.generate(history, createValidReport(), createValidMetadata());

      expect(output).toMatch(/\*\*stale registry\*\*: Found in 2 generations \(v3, v4\)\. MINOR\./);
    });

    test('non-recurring issue not surfaced', () => {
      const history = createValidHistory({
        issueLedger: [
          { title: 'one-time issue', severity: 'MINOR', recurrenceCount: 1, generations: [3] }
        ]
      });
      const output = generator.generate(history, createValidReport(), createValidMetadata());

      expect(output).not.toMatch(/one-time issue/);
    });

    test('more than 10 recurring issues shows overflow note', () => {
      const issues = [];
      for (let i = 0; i < 12; i++) {
        issues.push({ title: `issue-${i}`, severity: 'MINOR', recurrenceCount: 2, generations: [3, 4] });
      }
      const history = createValidHistory({ issueLedger: issues });
      const output = generator.generate(history, createValidReport(), createValidMetadata());

      expect(output).toMatch(/\.\.\.and 2 additional recurring issues/);
    });

    test('empty ledger produces no recurring issues section', () => {
      const output = generator.generate(createValidHistory(), createValidReport(), createValidMetadata());

      expect(output).not.toMatch(/Recurring Pain Points/);
    });
  });

  describe('Epic Prioritization', () => {
    test('deferred epic scores higher than convergence-driven proposal', () => {
      const history = createValidHistory({
        deferralCounts: { 'Self-Improvement': { total: 4, consecutive: 4 } }
      });
      const report = createValidReport({
        plateaus: [{ metric: 'executionWaste', startGeneration: 2, endGeneration: 4 }]
      });
      const output = generator.generate(history, report, createValidMetadata());

      const deferralIndex = output.indexOf('Self-Improvement');
      const plateauIndex = output.indexOf('Break executionWaste plateau');
      expect(deferralIndex).toBeLessThan(plateauIndex);
    });

    test('each proposal includes rationale', () => {
      const history = createValidHistory({
        deferralCounts: { 'Self-Improvement': { total: 3, consecutive: 3 } }
      });
      const output = generator.generate(history, createValidReport(), createValidMetadata());

      expect(output).toMatch(/\*\*Rationale\*\*/);
    });

    test('no deferred epics still produces convergence-driven proposals', () => {
      const report = createValidReport({
        regressions: [{ metric: 'deferralCount', startGeneration: 2, endGeneration: 4 }]
      });
      const output = generator.generate(createValidHistory(), report, createValidMetadata());

      expect(output).toMatch(/Address deferralCount regression/);
    });

    test('proposals sorted by score descending', () => {
      const history = createValidHistory({
        deferralCounts: {
          'Low Priority': { total: 1, consecutive: 1 },
          'High Priority': { total: 4, consecutive: 4 }
        }
      });
      const output = generator.generate(history, createValidReport(), createValidMetadata());

      const highIdx = output.indexOf('High Priority');
      const lowIdx = output.indexOf('Low Priority');
      expect(highIdx).toBeLessThan(lowIdx);
    });
  });

  describe('Constraints', () => {
    test('regression produces Do NOT ignore constraint', () => {
      const report = createValidReport({
        regressions: [{ metric: 'executionWaste', startGeneration: 2, endGeneration: 4 }]
      });
      const output = generator.generate(createValidHistory(), report, createValidMetadata());

      expect(output).toMatch(/Do NOT ignore executionWaste/);
    });

    test('chronic deferral produces Do NOT defer constraint', () => {
      const history = createValidHistory({
        deferralCounts: { 'Self-Improvement': { total: 4, consecutive: 4 } }
      });
      const output = generator.generate(history, createValidReport(), createValidMetadata());

      expect(output).toMatch(/Do NOT defer "Self-Improvement" again/);
    });

    test('recurring issue produces Do NOT ignore constraint', () => {
      const history = createValidHistory({
        issueLedger: [
          { title: 'stale registry', severity: 'MINOR', recurrenceCount: 3, generations: [2, 3, 4] }
        ]
      });
      const output = generator.generate(history, createValidReport(), createValidMetadata());

      expect(output).toMatch(/Do NOT ignore "stale registry"/);
    });

    test('general pipeline stability constraint always present', () => {
      const output = generator.generate(createValidHistory(), createValidReport(), createValidMetadata());

      expect(output).toMatch(/Do NOT modify core pipeline modules/);
    });
  });

  describe('Markdown Assembly', () => {
    test('output contains all 5 required sections', () => {
      const output = generator.generate(createValidHistory(), createValidReport(), createValidMetadata());

      expect(output).toMatch(/## Project Context/);
      expect(output).toMatch(/## Current State Summary/);
      expect(output).toMatch(/## Meta-Problem Analysis/);
      expect(output).toMatch(/## Proposed Epics/);
      expect(output).toMatch(/## Constraints and "What NOT to Do"/);
    });

    test('title includes next generation number', () => {
      const output = generator.generate(createValidHistory(), createValidReport(), createValidMetadata());

      expect(output).toMatch(/# Brain Dump: Layer Cake v5/);
    });

    test('convergence status in meta-problem section', () => {
      const output = generator.generate(createValidHistory(), createValidReport(), createValidMetadata());

      expect(output).toMatch(/Convergence status: \*\*improving\*\*/);
    });

    test('project context includes version and module count', () => {
      const output = generator.generate(createValidHistory(), createValidReport(), createValidMetadata());

      expect(output).toMatch(/Current version: v4/);
      expect(output).toMatch(/Module count: 20/);
    });

    test('constraints are numbered', () => {
      const output = generator.generate(createValidHistory(), createValidReport(), createValidMetadata());

      expect(output).toMatch(/1\. Do NOT modify core pipeline modules/);
    });

    test('output is a string not a file path', () => {
      const output = generator.generate(createValidHistory(), createValidReport(), createValidMetadata());

      expect(typeof output).toBe('string');
      expect(output).not.toMatch(/^\//); // Not a file path
    });
  });

  describe('Edge Cases', () => {
    test('no deferred epics and all improving', () => {
      const output = generator.generate(createValidHistory(), createValidReport(), createValidMetadata());

      expect(output).toMatch(/## Proposed Epics/);
      expect(output).toMatch(/## Constraints/);
    });

    test('partial metadata with missing fields', () => {
      const output = generator.generate(createValidHistory(), createValidReport(), { moduleCount: 20 });

      expect(output).toMatch(/\(data unavailable\)/);
    });

    test('large issue ledger caps at 10', () => {
      const issues = [];
      for (let i = 0; i < 15; i++) {
        issues.push({ title: `issue-${i}`, severity: 'MINOR', recurrenceCount: 2, generations: [3, 4] });
      }
      const history = createValidHistory({ issueLedger: issues });
      const output = generator.generate(history, createValidReport(), createValidMetadata());

      // Should show 10 issues + overflow note
      const matches = output.match(/\*\*issue-\d+\*\*/g) || [];
      expect(matches.length).toBe(10);
      expect(output).toMatch(/\.\.\.and 5 additional recurring issues/);
    });

    test('regressing convergence report appears in meta-problem', () => {
      const report = createValidReport({
        compositeScore: 'regressing',
        regressions: [{ metric: 'deferralCount', startGeneration: 2, endGeneration: 4 }]
      });
      const output = generator.generate(createValidHistory(), report, createValidMetadata());

      expect(output).toMatch(/Convergence status: \*\*regressing\*\*/);
    });
  });
});
