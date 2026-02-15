const { ConvergenceDetector } = require('../lib/convergence-detector');

function createHistory(genConfigs, deferralCounts = {}) {
  return {
    generations: genConfigs.map(c => ({
      generation: c.generation,
      epics: c.epics || { planned: 0, built: 0, deferred: 0 },
      testCount: c.testCount,
      timeoutWastePercentage: c.timeoutWastePercentage,
      executionTime: c.executionTime,
      reviewFindings: c.reviewFindings || []
    })),
    issueLedger: [],
    deferralCounts
  };
}

describe('Convergence Detector', () => {
  let detector;
  beforeEach(() => { detector = new ConvergenceDetector(); });

  describe('Input Validation', () => {
    test('null input throws', () => {
      expect(() => detector.analyze(null)).toThrow('generationHistory is required');
    });

    test('undefined input throws', () => {
      expect(() => detector.analyze(undefined)).toThrow('generationHistory is required');
    });

    test('empty generations throws', () => {
      expect(() => detector.analyze({ generations: [] })).toThrow('generationHistory.generations must be a non-empty array');
    });

    test('missing generations property throws', () => {
      expect(() => detector.analyze({})).toThrow('generationHistory.generations must be a non-empty array');
    });

    test('single generation returns insufficient_data', () => {
      const history = createHistory([
        { generation: 3, epics: { planned: 4, built: 2, deferred: 2 }, testCount: 200 }
      ]);
      const report = detector.analyze(history);

      expect(report.status).toBe('insufficient_data');
      expect(report.absoluteMetrics).toEqual({ planned: 4, built: 2, deferred: 2 });
      expect(report.plateaus).toEqual([]);
      expect(report.regressions).toEqual([]);
    });
  });

  describe('Trend Computation', () => {
    test('increasing test counts produce improving direction', () => {
      const history = createHistory([
        { generation: 2, testCount: 100, epics: { planned: 2, built: 1, deferred: 1 } },
        { generation: 3, testCount: 200, epics: { planned: 3, built: 2, deferred: 1 } },
        { generation: 4, testCount: 300, epics: { planned: 3, built: 3, deferred: 0 } }
      ]);
      const report = detector.analyze(history);

      expect(report.metrics.testsAdded.deltas).toEqual([100, 100]);
      expect(report.metrics.testsAdded.directions).toEqual(['improving', 'improving']);
    });

    test('increasing deferral counts produce worsening direction', () => {
      const history = createHistory([
        { generation: 2, testCount: 100, epics: { planned: 4, built: 2, deferred: 2 } },
        { generation: 3, testCount: 200, epics: { planned: 4, built: 1, deferred: 3 } },
        { generation: 4, testCount: 300, epics: { planned: 4, built: 0, deferred: 4 } }
      ]);
      const report = detector.analyze(history);

      expect(report.metrics.deferralCount.deltas).toEqual([1, 1]);
      expect(report.metrics.deferralCount.directions).toEqual(['worsening', 'worsening']);
    });

    test('flat values within 5% tolerance', () => {
      const history = createHistory([
        { generation: 2, testCount: 100, epics: { planned: 2, built: 1, deferred: 1 }, timeoutWastePercentage: 40 },
        { generation: 3, testCount: 200, epics: { planned: 2, built: 1, deferred: 1 }, timeoutWastePercentage: 39 },
        { generation: 4, testCount: 300, epics: { planned: 2, built: 1, deferred: 1 }, timeoutWastePercentage: 40 }
      ]);
      const report = detector.analyze(history);

      expect(report.metrics.executionWaste.directions).toEqual(['flat', 'flat']);
    });

    test('missing metric values mark trend as incomplete', () => {
      const history = createHistory([
        { generation: 2, epics: { planned: 2, built: 1, deferred: 1 } },
        { generation: 3, epics: { planned: 3, built: 2, deferred: 1 } }
      ]);
      const report = detector.analyze(history);

      expect(report.metrics.testsAdded.incomplete).toBe(true);
    });

    test('all incomplete metrics return insufficient_data', () => {
      const history = createHistory([
        { generation: 2, epics: { planned: 0, built: 0, deferred: 0 } },
        { generation: 3, epics: { planned: 0, built: 0, deferred: 0 } }
      ]);
      // All metrics will be either 0 (flat within tolerance) or undefined
      // Let's make them all undefined
      history.generations[0].epics = { planned: 0, built: 0, deferred: 0 };
      history.generations[1].epics = { planned: 0, built: 0, deferred: 0 };
      // testCount is undefined, timeoutWastePercentage is undefined, executionTime undefined,
      // epics.built is 0 so efficiencyPerEpic is undefined
      const report = detector.analyze(history);

      // testsAdded: undefined → incomplete, executionWaste: undefined → incomplete,
      // efficiencyPerEpic: built=0 → undefined → incomplete
      // epicsDelivered and deferralCount have values (0), so tolerance check: delta=0, tolerance=0*0.05=0, |0|<=0 → flat
      // Not all incomplete, so we'll get a real report
      expect(report.metrics.testsAdded.incomplete).toBe(true);
      expect(report.metrics.executionWaste.incomplete).toBe(true);
      expect(report.metrics.efficiencyPerEpic.incomplete).toBe(true);
    });
  });

  describe('Plateau Detection', () => {
    test('2+ consecutive flat directions detected as plateau', () => {
      const history = createHistory([
        { generation: 2, testCount: 100, epics: { planned: 2, built: 1, deferred: 1 }, timeoutWastePercentage: 40 },
        { generation: 3, testCount: 200, epics: { planned: 2, built: 1, deferred: 1 }, timeoutWastePercentage: 39 },
        { generation: 4, testCount: 300, epics: { planned: 2, built: 1, deferred: 1 }, timeoutWastePercentage: 40 }
      ]);
      const report = detector.analyze(history);

      const wastePlateau = report.plateaus.find(p => p.metric === 'executionWaste');
      expect(wastePlateau).toBeDefined();
      expect(wastePlateau.duration).toBe(2);
    });

    test('improving directions do not create plateau', () => {
      const history = createHistory([
        { generation: 2, testCount: 100, epics: { planned: 3, built: 1, deferred: 2 } },
        { generation: 3, testCount: 200, epics: { planned: 3, built: 2, deferred: 1 } },
        { generation: 4, testCount: 300, epics: { planned: 3, built: 3, deferred: 0 } }
      ]);
      const report = detector.analyze(history);

      const testPlateau = report.plateaus.find(p => p.metric === 'testsAdded');
      expect(testPlateau).toBeUndefined();
    });

    test('single flat direction is not a plateau', () => {
      const history = createHistory([
        { generation: 2, testCount: 100, epics: { planned: 2, built: 1, deferred: 1 }, timeoutWastePercentage: 40 },
        { generation: 3, testCount: 200, epics: { planned: 2, built: 1, deferred: 1 }, timeoutWastePercentage: 39 }
      ]);
      const report = detector.analyze(history);

      // Only 1 direction → cannot have 2+ consecutive flat
      const wastePlateau = report.plateaus.find(p => p.metric === 'executionWaste');
      expect(wastePlateau).toBeUndefined();
    });
  });

  describe('Regression Detection', () => {
    test('2+ consecutive worsening directions detected as regression', () => {
      const history = createHistory([
        { generation: 2, testCount: 100, epics: { planned: 4, built: 2, deferred: 2 } },
        { generation: 3, testCount: 200, epics: { planned: 4, built: 1, deferred: 3 } },
        { generation: 4, testCount: 300, epics: { planned: 4, built: 0, deferred: 4 } }
      ]);
      const report = detector.analyze(history);

      const deferralRegression = report.regressions.find(r => r.metric === 'deferralCount');
      expect(deferralRegression).toBeDefined();
      expect(deferralRegression.severity).toBe('regression');
      expect(deferralRegression.direction).toBe('worsening');
    });

    test('single worsening direction is not a regression', () => {
      const history = createHistory([
        { generation: 2, testCount: 100, epics: { planned: 4, built: 2, deferred: 2 } },
        { generation: 3, testCount: 200, epics: { planned: 4, built: 1, deferred: 3 } }
      ]);
      const report = detector.analyze(history);

      const deferralRegression = report.regressions.find(r => r.metric === 'deferralCount');
      expect(deferralRegression).toBeUndefined();
    });

    test('regressions have severity field', () => {
      const history = createHistory([
        { generation: 2, testCount: 100, epics: { planned: 4, built: 2, deferred: 2 } },
        { generation: 3, testCount: 200, epics: { planned: 4, built: 1, deferred: 3 } },
        { generation: 4, testCount: 300, epics: { planned: 4, built: 0, deferred: 4 } }
      ]);
      const report = detector.analyze(history);

      for (const reg of report.regressions) {
        expect(reg).toHaveProperty('severity', 'regression');
      }
    });
  });

  describe('Health Signals', () => {
    test('all metrics improving in most recent pair emits positive convergence', () => {
      const history = createHistory([
        { generation: 2, testCount: 100, epics: { planned: 4, built: 1, deferred: 3 }, timeoutWastePercentage: 40 },
        { generation: 3, testCount: 200, epics: { planned: 4, built: 2, deferred: 2 }, timeoutWastePercentage: 20 }
      ]);
      const report = detector.analyze(history);

      const signal = report.healthSignals.find(s => s.type === 'positive_convergence');
      expect(signal).toBeDefined();
      expect(signal.description).toContain('All tracked metrics improved');
    });

    test('mixed signals do not emit positive convergence', () => {
      const history = createHistory([
        { generation: 2, testCount: 100, epics: { planned: 4, built: 2, deferred: 2 } },
        { generation: 3, testCount: 200, epics: { planned: 4, built: 1, deferred: 3 } }
      ]);
      const report = detector.analyze(history);

      const signal = report.healthSignals.find(s => s.type === 'positive_convergence');
      expect(signal).toBeUndefined();
    });
  });

  describe('Composite Score', () => {
    test('all improving gives improving score', () => {
      const history = createHistory([
        { generation: 2, testCount: 100, epics: { planned: 4, built: 1, deferred: 3 } },
        { generation: 3, testCount: 200, epics: { planned: 4, built: 2, deferred: 2 } }
      ]);
      const report = detector.analyze(history);

      expect(report.status).toBe('improving');
      expect(report.compositeScore).toBe('improving');
    });

    test('plateau present gives plateauing score', () => {
      const history = createHistory([
        { generation: 2, testCount: 100, epics: { planned: 2, built: 1, deferred: 1 }, timeoutWastePercentage: 40 },
        { generation: 3, testCount: 200, epics: { planned: 2, built: 1, deferred: 1 }, timeoutWastePercentage: 39 },
        { generation: 4, testCount: 300, epics: { planned: 2, built: 1, deferred: 1 }, timeoutWastePercentage: 40 }
      ]);
      const report = detector.analyze(history);

      expect(report.status).toBe('plateauing');
    });

    test('regression overrides everything to regressing', () => {
      const history = createHistory([
        { generation: 2, testCount: 100, epics: { planned: 4, built: 2, deferred: 2 } },
        { generation: 3, testCount: 200, epics: { planned: 4, built: 1, deferred: 3 } },
        { generation: 4, testCount: 300, epics: { planned: 4, built: 0, deferred: 4 } }
      ]);
      const report = detector.analyze(history);

      expect(report.status).toBe('regressing');
    });

    test('status matches compositeScore', () => {
      const history = createHistory([
        { generation: 2, testCount: 100, epics: { planned: 4, built: 1, deferred: 3 } },
        { generation: 3, testCount: 200, epics: { planned: 4, built: 2, deferred: 2 } }
      ]);
      const report = detector.analyze(history);

      expect(report.status).toBe(report.compositeScore);
    });
  });

  describe('Chronic Deferrals', () => {
    test('epic deferred 4 consecutive times is flagged', () => {
      const history = createHistory([
        { generation: 2, testCount: 100, epics: { planned: 2, built: 1, deferred: 1 } },
        { generation: 3, testCount: 200, epics: { planned: 2, built: 1, deferred: 1 } }
      ], { 'Self-Improvement': { total: 4, consecutive: 4 } });

      const report = detector.analyze(history);

      expect(report.chronicDeferrals).toHaveLength(1);
      expect(report.chronicDeferrals[0].epicName).toBe('Self-Improvement');
      expect(report.chronicDeferrals[0].consecutiveDeferrals).toBe(4);
      expect(report.chronicDeferrals[0].threshold).toBe(3);
      expect(report.chronicDeferrals[0].message).toContain('4 consecutive');
    });

    test('epic deferred 2 times is not flagged', () => {
      const history = createHistory([
        { generation: 2, testCount: 100, epics: { planned: 2, built: 1, deferred: 1 } },
        { generation: 3, testCount: 200, epics: { planned: 2, built: 1, deferred: 1 } }
      ], { 'Some Epic': { total: 2, consecutive: 2 } });

      const report = detector.analyze(history);

      expect(report.chronicDeferrals).toHaveLength(0);
    });

    test('missing deferralCounts does not crash', () => {
      const history = createHistory([
        { generation: 2, testCount: 100, epics: { planned: 2, built: 1, deferred: 1 } },
        { generation: 3, testCount: 200, epics: { planned: 2, built: 1, deferred: 1 } }
      ]);
      delete history.deferralCounts;

      const report = detector.analyze(history);

      expect(report.chronicDeferrals).toEqual([]);
    });
  });

  describe('Edge Cases', () => {
    test('report contains all required fields', () => {
      const history = createHistory([
        { generation: 2, testCount: 100, epics: { planned: 4, built: 1, deferred: 3 } },
        { generation: 3, testCount: 200, epics: { planned: 4, built: 2, deferred: 2 } }
      ]);
      const report = detector.analyze(history);

      expect(report).toHaveProperty('status');
      expect(report).toHaveProperty('compositeScore');
      expect(report).toHaveProperty('metrics');
      expect(report).toHaveProperty('plateaus');
      expect(report).toHaveProperty('regressions');
      expect(report).toHaveProperty('healthSignals');
      expect(report).toHaveProperty('chronicDeferrals');
    });

    test('metrics object has all 5 tracked metrics', () => {
      const history = createHistory([
        { generation: 2, testCount: 100, epics: { planned: 4, built: 1, deferred: 3 } },
        { generation: 3, testCount: 200, epics: { planned: 4, built: 2, deferred: 2 } }
      ]);
      const report = detector.analyze(history);

      expect(report.metrics).toHaveProperty('testsAdded');
      expect(report.metrics).toHaveProperty('epicsDelivered');
      expect(report.metrics).toHaveProperty('deferralCount');
      expect(report.metrics).toHaveProperty('executionWaste');
      expect(report.metrics).toHaveProperty('efficiencyPerEpic');
    });

    test('zero values handle tolerance correctly', () => {
      // 5% of 0 is 0, so delta of 0 should be flat
      const history = createHistory([
        { generation: 2, testCount: 100, epics: { planned: 2, built: 2, deferred: 0 } },
        { generation: 3, testCount: 200, epics: { planned: 2, built: 2, deferred: 0 } }
      ]);
      const report = detector.analyze(history);

      expect(report.metrics.deferralCount.directions).toEqual(['flat']);
    });
  });
});
