/**
 * Verdict Coverage Metric Tests (E2-F4)
 *
 * Tests for:
 * - verdict_coverage event type exists in EventLogger
 * - Coverage calculation logic (total, parseable, percentage, per-layer breakdown)
 * - Runner accumulates parsedExplicitly from verdict parser results
 */

const { EventLogger, EVENT_TYPES } = require('../lib/event-logger');
const { VerdictParser } = require('../lib/verdict-parser');
const os = require('os');
const path = require('path');
const fs = require('fs');

describe('Verdict Coverage Event Type', () => {
  it('EVENT_TYPES includes VERDICT_COVERAGE', () => {
    expect(EVENT_TYPES.VERDICT_COVERAGE).toBe('verdict_coverage');
  });

  it('EventLogger can log verdict_coverage events', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'verdict-cov-'));
    const logger = new EventLogger(tmpDir);

    logger.log({
      type: EVENT_TYPES.VERDICT_COVERAGE,
      message: 'Verdict coverage: 3/4 (75%) parseable',
      meta: {
        totalVerdicts: 4,
        parseableCount: 3,
        parseablePercentage: 75,
        perLayer: {
          L9: { total: 2, parseable: 2, percentage: 100 },
          L10: { total: 2, parseable: 1, percentage: 50 }
        }
      }
    });

    const events = logger.readAll();
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('verdict_coverage');
    expect(events[0].meta.totalVerdicts).toBe(4);
    expect(events[0].meta.parseableCount).toBe(3);
    expect(events[0].meta.parseablePercentage).toBe(75);
    expect(events[0].meta.perLayer.L9.percentage).toBe(100);
    expect(events[0].meta.perLayer.L10.percentage).toBe(50);

    fs.rmSync(tmpDir, { recursive: true, force: true });
  });
});

describe('Coverage Calculation Logic', () => {
  /**
   * Replicate the runner's coverage calculation logic for unit testing.
   * This mirrors bin/run-layer-cake-on-self.js lines 642-668.
   */
  function calculateCoverage(verdictResults) {
    if (verdictResults.length === 0) return null;

    const totalVerdicts = verdictResults.length;
    const parseableCount = verdictResults.filter(r => r.parsedExplicitly).length;
    const parseablePercentage = Math.round((parseableCount / totalVerdicts) * 100);

    const perLayer = {};
    for (const r of verdictResults) {
      if (!perLayer[r.layer]) {
        perLayer[r.layer] = { total: 0, parseable: 0 };
      }
      perLayer[r.layer].total++;
      if (r.parsedExplicitly) perLayer[r.layer].parseable++;
    }
    for (const layer of Object.keys(perLayer)) {
      const l = perLayer[layer];
      l.percentage = Math.round((l.parseable / l.total) * 100);
    }

    return { totalVerdicts, parseableCount, parseablePercentage, perLayer };
  }

  it('all parseable → 100%', () => {
    const results = [
      { layer: 'L9', epic: 'epic-a', verdict: 'PASS', parsedExplicitly: true },
      { layer: 'L9', epic: 'epic-b', verdict: 'ITERATE', parsedExplicitly: true },
      { layer: 'L10', epic: 'epic-a', verdict: 'PASS', parsedExplicitly: true }
    ];
    const cov = calculateCoverage(results);
    expect(cov.totalVerdicts).toBe(3);
    expect(cov.parseableCount).toBe(3);
    expect(cov.parseablePercentage).toBe(100);
  });

  it('mixed parseable/unparseable → correct percentage', () => {
    const results = [
      { layer: 'L9', epic: 'epic-a', verdict: 'PASS', parsedExplicitly: true },
      { layer: 'L9', epic: 'epic-b', verdict: 'PASS', parsedExplicitly: false },
      { layer: 'L10', epic: 'epic-a', verdict: 'PASS', parsedExplicitly: true },
      { layer: 'L10', epic: 'epic-b', verdict: 'ITERATE', parsedExplicitly: false }
    ];
    const cov = calculateCoverage(results);
    expect(cov.totalVerdicts).toBe(4);
    expect(cov.parseableCount).toBe(2);
    expect(cov.parseablePercentage).toBe(50);
  });

  it('none parseable → 0%', () => {
    const results = [
      { layer: 'L9', epic: 'epic-a', verdict: 'PASS', parsedExplicitly: false },
      { layer: 'L9', epic: 'epic-b', verdict: 'PASS', parsedExplicitly: false }
    ];
    const cov = calculateCoverage(results);
    expect(cov.parseableCount).toBe(0);
    expect(cov.parseablePercentage).toBe(0);
  });

  it('empty results → null (no metric logged)', () => {
    expect(calculateCoverage([])).toBeNull();
  });

  it('per-layer breakdown is correct', () => {
    const results = [
      { layer: 'L9', epic: 'epic-a', verdict: 'PASS', parsedExplicitly: true },
      { layer: 'L9', epic: 'epic-b', verdict: 'PASS', parsedExplicitly: true },
      { layer: 'L10', epic: 'epic-a', verdict: 'PASS', parsedExplicitly: false },
      { layer: 'L11', epic: 'epic-a', verdict: 'ITERATE', parsedExplicitly: true }
    ];
    const cov = calculateCoverage(results);
    expect(cov.perLayer.L9).toEqual({ total: 2, parseable: 2, percentage: 100 });
    expect(cov.perLayer.L10).toEqual({ total: 1, parseable: 0, percentage: 0 });
    expect(cov.perLayer.L11).toEqual({ total: 1, parseable: 1, percentage: 100 });
  });

  it('rounds percentage correctly', () => {
    const results = [
      { layer: 'L9', epic: 'epic-a', verdict: 'PASS', parsedExplicitly: true },
      { layer: 'L9', epic: 'epic-b', verdict: 'PASS', parsedExplicitly: true },
      { layer: 'L9', epic: 'epic-c', verdict: 'PASS', parsedExplicitly: false }
    ];
    const cov = calculateCoverage(results);
    // 2/3 = 66.666... → rounds to 67
    expect(cov.parseablePercentage).toBe(67);
  });
});

describe('Runner Source - Verdict Coverage Integration', () => {
  const runnerSource = fs.readFileSync(
    path.join(__dirname, '..', 'bin', 'run-layer-cake-on-self.js'), 'utf8'
  );

  it('runner has _verdictResults accumulator', () => {
    expect(runnerSource).toContain('_verdictResults');
  });

  it('runner pushes parsedExplicitly to accumulator', () => {
    expect(runnerSource).toContain('parsedExplicitly: artifacts.reviewResult.parsedExplicitly');
  });

  it('runner logs verdict_coverage event', () => {
    expect(runnerSource).toContain('VERDICT_COVERAGE');
  });

  it('runner calculates per-layer breakdown', () => {
    expect(runnerSource).toContain('perLayer');
  });

  it('runner skips logging when no verdicts collected', () => {
    expect(runnerSource).toContain('_verdictResults.length > 0');
  });
});

describe('VerdictParser parsedExplicitly integration', () => {
  let parser;
  beforeEach(() => { parser = new VerdictParser(); });

  it('accumulator can collect results from multiple parse calls', () => {
    const accumulator = [];

    const r1 = parser.parse('## Verdict: PASS');
    accumulator.push({ layer: 'L9', epic: 'epic-a', verdict: r1.verdict, parsedExplicitly: r1.parsedExplicitly });

    const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
    const r2 = parser.parse('No verdict here, just text.');
    accumulator.push({ layer: 'L9', epic: 'epic-b', verdict: r2.verdict, parsedExplicitly: r2.parsedExplicitly });
    warnSpy.mockRestore();

    const r3 = parser.parse('Overall: ITERATE');
    accumulator.push({ layer: 'L10', epic: 'epic-a', verdict: r3.verdict, parsedExplicitly: r3.parsedExplicitly });

    expect(accumulator).toHaveLength(3);
    expect(accumulator[0].parsedExplicitly).toBe(true);
    expect(accumulator[1].parsedExplicitly).toBe(false);
    expect(accumulator[2].parsedExplicitly).toBe(true);

    // Calculate coverage
    const parseable = accumulator.filter(r => r.parsedExplicitly).length;
    expect(parseable).toBe(2);
    expect(Math.round((parseable / accumulator.length) * 100)).toBe(67);
  });
});
