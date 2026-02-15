const fs = require('fs');
const path = require('path');
const os = require('os');
const { ExecutionAnalyzer } = require('../lib/execution-analyzer');

function writeEvents(dir, events) {
  const filePath = path.join(dir, '_events.jsonl');
  fs.writeFileSync(filePath, events.map(e => JSON.stringify(e)).join('\n') + '\n');
  return filePath;
}

function writeRawLines(dir, lines) {
  const filePath = path.join(dir, '_events.jsonl');
  fs.writeFileSync(filePath, lines.join('\n') + '\n');
  return filePath;
}

describe('Execution Analyzer', () => {
  let tmpDir, analyzer;
  beforeEach(() => { tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'exec-analyzer-')); analyzer = new ExecutionAnalyzer(); });
  afterEach(() => { fs.rmSync(tmpDir, { recursive: true, force: true }); });

  describe('Stream Parsing', () => {
    test('missing file throws descriptive error', async () => {
      await expect(analyzer.analyze('/nonexistent/path/_events.jsonl'))
        .rejects.toThrow('Events file not found: /nonexistent/path/_events.jsonl');
    });

    test('empty file returns noData report', async () => {
      const filePath = path.join(tmpDir, '_events.jsonl');
      fs.writeFileSync(filePath, '');
      const report = await analyzer.analyze(filePath);
      expect(report.noData).toBe(true);
      expect(report.perLayerMetrics).toEqual({});
      expect(report.anomalies).toEqual([]);
      expect(report.baselineComparison).toBeNull();
    });

    test('malformed lines counted not crashed', async () => {
      const validEvents = [];
      for (let i = 0; i < 100; i++) {
        validEvents.push(JSON.stringify({ type: 'layer_start', layer: 'L1', timestamp: new Date().toISOString() }));
      }
      const lines = [
        'not valid json',
        ...validEvents,
        '{broken',
        '{{{{',
      ];
      const filePath = writeRawLines(tmpDir, lines);
      const report = await analyzer.analyze(filePath);
      expect(report.malformedLineCount).toBe(3);
      expect(report.noData).toBe(false);
    });

    test('valid events routed to correct accumulators', async () => {
      const start = new Date('2026-01-01T00:00:00Z');
      const end = new Date(start.getTime() + 600000);
      const filePath = writeEvents(tmpDir, [
        { type: 'layer_start', layer: 'L1', epic: 'E1', timestamp: start.toISOString() },
        { type: 'layer_end', layer: 'L1', epic: 'E1', timestamp: end.toISOString() },
        { type: 'verdict', layer: 'L9', meta: { issues: [{ title: 'test', severity: 'MINOR', description: 'desc' }] } },
        { type: 'error', layer: 'L8', epic: 'E1', message: 'timeout occurred' },
        { type: 'agent_retry', layer: 'L8', epic: 'E1' }
      ]);
      const report = await analyzer.analyze(filePath);
      expect(report.noData).toBe(false);
      expect(report.perLayerMetrics['L1:E1']).toBeDefined();
      expect(report.perLayerMetrics['L1:E1'].duration).toBe(600000);
    });
  });

  describe('Per-Layer Metrics', () => {
    test('L8 duration computed from start/end pair', async () => {
      const start = new Date('2026-01-01T00:00:00Z');
      const end = new Date(start.getTime() + 1800000);
      const filePath = writeEvents(tmpDir, [
        { type: 'layer_start', layer: 'L8', epic: 'E1', timestamp: start.toISOString() },
        { type: 'layer_end', layer: 'L8', epic: 'E1', timestamp: end.toISOString() }
      ]);
      const report = await analyzer.analyze(filePath);
      expect(report.perLayerMetrics['L8:E1'].duration).toBe(1800000);
    });

    test('layer_end without matching start has status incomplete', async () => {
      const filePath = writeEvents(tmpDir, [
        { type: 'layer_end', layer: 'L5', epic: 'E2', timestamp: new Date('2026-01-01T01:00:00Z').toISOString() }
      ]);
      const report = await analyzer.analyze(filePath);
      expect(report.perLayerMetrics['L5:E2'].status).toBe('incomplete');
      expect(report.perLayerMetrics['L5:E2'].duration).toBeNull();
    });

    test('metrics keyed by layer:epic combination', async () => {
      const start = new Date('2026-01-01T00:00:00Z');
      const filePath = writeEvents(tmpDir, [
        { type: 'layer_start', layer: 'L8', epic: 'Pipeline Integrity', timestamp: start.toISOString() },
        { type: 'layer_end', layer: 'L8', epic: 'Pipeline Integrity', timestamp: new Date(start.getTime() + 1000).toISOString() }
      ]);
      const report = await analyzer.analyze(filePath);
      expect(report.perLayerMetrics['L8:Pipeline Integrity']).toBeDefined();
    });

    test('layer without epic uses "all" key', async () => {
      const start = new Date('2026-01-01T00:00:00Z');
      const filePath = writeEvents(tmpDir, [
        { type: 'layer_start', layer: 'L1', timestamp: start.toISOString() },
        { type: 'layer_end', layer: 'L1', timestamp: new Date(start.getTime() + 5000).toISOString() }
      ]);
      const report = await analyzer.analyze(filePath);
      expect(report.perLayerMetrics['L1:all']).toBeDefined();
      expect(report.perLayerMetrics['L1:all'].duration).toBe(5000);
    });
  });

  describe('Retry Speedup', () => {
    test('first attempt 30min timeout + retry 4min success gives speedup ratio 7.5', async () => {
      const t0 = new Date('2026-01-01T00:00:00Z');
      const filePath = writeEvents(tmpDir, [
        // First attempt: timeout at 30 min
        { type: 'error', layer: 'L8', epic: 'E1', message: 'Agent execution timed out', meta: { duration: 1800000 } },
        // Retry event
        { type: 'agent_retry', layer: 'L8', epic: 'E1' },
        // Second attempt: succeeds at 4 min
        { type: 'layer_start', layer: 'L8', epic: 'E1', timestamp: t0.toISOString() },
        { type: 'layer_end', layer: 'L8', epic: 'E1', timestamp: new Date(t0.getTime() + 240000).toISOString() }
      ]);
      const report = await analyzer.analyze(filePath);
      expect(report.perLayerMetrics['L8:E1'].retrySpeedupRatio).toBe(7.5);
    });

    test('no retries leaves speedup ratio null', async () => {
      const start = new Date('2026-01-01T00:00:00Z');
      const filePath = writeEvents(tmpDir, [
        { type: 'layer_start', layer: 'L5', epic: 'E1', timestamp: start.toISOString() },
        { type: 'layer_end', layer: 'L5', epic: 'E1', timestamp: new Date(start.getTime() + 300000).toISOString() }
      ]);
      const report = await analyzer.analyze(filePath);
      expect(report.perLayerMetrics['L5:E1'].retrySpeedupRatio).toBeNull();
    });
  });

  describe('Anomaly Detection', () => {
    test('speedup ratio 7.5x triggers context_exhaustion anomaly', async () => {
      const t0 = new Date('2026-01-01T00:00:00Z');
      const filePath = writeEvents(tmpDir, [
        { type: 'error', layer: 'L8', epic: 'E1', message: 'timed out', meta: { duration: 1800000 } },
        { type: 'agent_retry', layer: 'L8', epic: 'E1' },
        { type: 'layer_start', layer: 'L8', epic: 'E1', timestamp: t0.toISOString() },
        { type: 'layer_end', layer: 'L8', epic: 'E1', timestamp: new Date(t0.getTime() + 240000).toISOString() }
      ]);
      const report = await analyzer.analyze(filePath);
      const anomaly = report.anomalies.find(a => a.type === 'context_exhaustion');
      expect(anomaly).toBeDefined();
      expect(anomaly.speedupRatio).toBe(7.5);
      expect(anomaly.description).toContain('7.5');
    });

    test('speedup ratio 1.5x does not trigger anomaly', async () => {
      const t0 = new Date('2026-01-01T00:00:00Z');
      const filePath = writeEvents(tmpDir, [
        { type: 'error', layer: 'L8', epic: 'E1', message: 'timed out', meta: { duration: 300000 } },
        { type: 'agent_retry', layer: 'L8', epic: 'E1' },
        { type: 'layer_start', layer: 'L8', epic: 'E1', timestamp: t0.toISOString() },
        { type: 'layer_end', layer: 'L8', epic: 'E1', timestamp: new Date(t0.getTime() + 200000).toISOString() }
      ]);
      const report = await analyzer.analyze(filePath);
      const anomaly = report.anomalies.find(a => a.type === 'context_exhaustion');
      expect(anomaly).toBeUndefined();
    });

    test('2 consecutive timeouts without success triggers misconfiguration', async () => {
      const filePath = writeEvents(tmpDir, [
        { type: 'error', layer: 'L6', epic: 'E2', message: 'SIGTERM', meta: { duration: 1800000 } },
        { type: 'error', layer: 'L6', epic: 'E2', message: 'timeout occurred', meta: { duration: 1800000 } },
        { type: 'layer_end', layer: 'L6', epic: 'E2', timestamp: new Date().toISOString() }
      ]);
      const report = await analyzer.analyze(filePath);
      // The layer_end without matching start makes status 'incomplete'
      const anomaly = report.anomalies.find(a => a.type === 'misconfiguration');
      expect(anomaly).toBeDefined();
      expect(anomaly.consecutiveTimeouts).toBe(2);
    });
  });

  describe('Review Findings', () => {
    test('verdict with 2 MINOR issues gives correct severity count', async () => {
      const filePath = writeEvents(tmpDir, [
        { type: 'verdict', layer: 'L9', meta: { issues: [
          { title: 'Missing test', severity: 'MINOR', description: 'No test for edge case' },
          { title: 'Style issue', severity: 'MINOR', description: 'Inconsistent naming' }
        ]}}
      ]);
      const report = await analyzer.analyze(filePath);
      expect(report.reviewFindings.severityCounts.MINOR).toBe(2);
    });

    test('L9 verdict issues grouped under byLayer.L9', async () => {
      const filePath = writeEvents(tmpDir, [
        { type: 'verdict', layer: 'L9', meta: { issues: [
          { title: 'Bug', severity: 'MAJOR', description: 'Crash on null' }
        ]}}
      ]);
      const report = await analyzer.analyze(filePath);
      expect(report.reviewFindings.byLayer.L9).toHaveLength(1);
      expect(report.reviewFindings.byLayer.L9[0].title).toBe('Bug');
    });

    test('MAJOR issue grouped under bySeverity.MAJOR', async () => {
      const filePath = writeEvents(tmpDir, [
        { type: 'verdict', layer: 'L10', meta: { issues: [
          { title: 'Integration failure', severity: 'MAJOR', description: 'API mismatch' }
        ]}}
      ]);
      const report = await analyzer.analyze(filePath);
      expect(report.reviewFindings.bySeverity.MAJOR).toHaveLength(1);
    });

    test('no verdict events gives all counts zero', async () => {
      const filePath = writeEvents(tmpDir, [
        { type: 'layer_start', layer: 'L1', timestamp: new Date().toISOString() }
      ]);
      const report = await analyzer.analyze(filePath);
      expect(report.reviewFindings.severityCounts).toEqual({ MINOR: 0, MAJOR: 0, ESCALATE: 0 });
      expect(report.reviewFindings.bySeverity.MINOR).toEqual([]);
      expect(report.reviewFindings.byLayer.L9).toEqual([]);
    });

    test('non-review layer verdict events are ignored', async () => {
      const filePath = writeEvents(tmpDir, [
        { type: 'verdict', layer: 'L5', meta: { issues: [
          { title: 'Plan issue', severity: 'MINOR', description: 'desc' }
        ]}}
      ]);
      const report = await analyzer.analyze(filePath);
      expect(report.reviewFindings.severityCounts.MINOR).toBe(0);
    });
  });

  describe('Aggregate Metrics', () => {
    test('total runtime is sum of all layer durations', async () => {
      const t0 = new Date('2026-01-01T00:00:00Z');
      const filePath = writeEvents(tmpDir, [
        { type: 'layer_start', layer: 'L1', epic: 'E1', timestamp: t0.toISOString() },
        { type: 'layer_end', layer: 'L1', epic: 'E1', timestamp: new Date(t0.getTime() + 100000).toISOString() },
        { type: 'layer_start', layer: 'L2', epic: 'E1', timestamp: new Date(t0.getTime() + 100000).toISOString() },
        { type: 'layer_end', layer: 'L2', epic: 'E1', timestamp: new Date(t0.getTime() + 300000).toISOString() }
      ]);
      const report = await analyzer.analyze(filePath);
      expect(report.aggregateMetrics.totalRuntime).toBe(300000);
    });

    test('timeout waste percentage computed accurately', async () => {
      // Scenario: 30min timeout wasted, 50min total successful runtime
      // Waste = 30 / (50 + 30) = 37.5%
      const t0 = new Date('2026-01-01T00:00:00Z');
      const filePath = writeEvents(tmpDir, [
        { type: 'error', layer: 'L8', epic: 'E1', message: 'timed out', meta: { duration: 1800000 } },
        { type: 'agent_retry', layer: 'L8', epic: 'E1' },
        { type: 'layer_start', layer: 'L8', epic: 'E1', timestamp: t0.toISOString() },
        { type: 'layer_end', layer: 'L8', epic: 'E1', timestamp: new Date(t0.getTime() + 3000000).toISOString() }
      ]);
      const report = await analyzer.analyze(filePath);
      expect(report.aggregateMetrics.timeoutWastePercentage).toBeCloseTo(37.5, 0);
    });

    test('all layers succeed first try gives 100% first-attempt rate', async () => {
      const t0 = new Date('2026-01-01T00:00:00Z');
      const filePath = writeEvents(tmpDir, [
        { type: 'layer_start', layer: 'L1', epic: 'E1', timestamp: t0.toISOString() },
        { type: 'layer_end', layer: 'L1', epic: 'E1', timestamp: new Date(t0.getTime() + 1000).toISOString() },
        { type: 'layer_start', layer: 'L2', epic: 'E1', timestamp: new Date(t0.getTime() + 1000).toISOString() },
        { type: 'layer_end', layer: 'L2', epic: 'E1', timestamp: new Date(t0.getTime() + 2000).toISOString() }
      ]);
      const report = await analyzer.analyze(filePath);
      expect(report.aggregateMetrics.firstAttemptSuccessRate).toBe(100);
    });

    test('no layers gives all metrics zero', async () => {
      // Only verdict events, no layer start/end
      const filePath = writeEvents(tmpDir, [
        { type: 'verdict', layer: 'L9', meta: { issues: [] } }
      ]);
      const report = await analyzer.analyze(filePath);
      expect(report.aggregateMetrics.totalRuntime).toBe(0);
      expect(report.aggregateMetrics.totalLayers).toBe(0);
    });
  });

  describe('Baseline Comparison', () => {
    test('35pp improvement flagged as improving', async () => {
      const t0 = new Date('2026-01-01T00:00:00Z');
      const filePath = writeEvents(tmpDir, [
        { type: 'layer_start', layer: 'L1', epic: 'E1', timestamp: t0.toISOString() },
        { type: 'layer_end', layer: 'L1', epic: 'E1', timestamp: new Date(t0.getTime() + 100000).toISOString() }
      ]);
      const baseline = { timeoutWastePercentage: 40, firstAttemptSuccessRate: 60, totalRuntime: 200000 };
      const report = await analyzer.analyze(filePath, baseline);
      expect(report.baselineComparison).not.toBeNull();
      const wasteComp = report.baselineComparison.find(c => c.metric === 'timeoutWastePercentage');
      expect(wasteComp.direction).toBe('improving');
      expect(wasteComp.delta).toBeLessThan(0);
    });

    test('no baseline provided gives null comparison', async () => {
      const t0 = new Date('2026-01-01T00:00:00Z');
      const filePath = writeEvents(tmpDir, [
        { type: 'layer_start', layer: 'L1', timestamp: t0.toISOString() },
        { type: 'layer_end', layer: 'L1', timestamp: new Date(t0.getTime() + 1000).toISOString() }
      ]);
      const report = await analyzer.analyze(filePath);
      expect(report.baselineComparison).toBeNull();
    });

    test('full report is JSON-serializable', async () => {
      const t0 = new Date('2026-01-01T00:00:00Z');
      const filePath = writeEvents(tmpDir, [
        { type: 'layer_start', layer: 'L1', epic: 'E1', timestamp: t0.toISOString() },
        { type: 'layer_end', layer: 'L1', epic: 'E1', timestamp: new Date(t0.getTime() + 1000).toISOString() },
        { type: 'verdict', layer: 'L9', meta: { issues: [{ title: 'test', severity: 'MINOR', description: 'd' }] } }
      ]);
      const baseline = { timeoutWastePercentage: 40, firstAttemptSuccessRate: 60, totalRuntime: 200000 };
      const report = await analyzer.analyze(filePath, baseline);
      expect(() => JSON.stringify(report)).not.toThrow();
    });
  });

  describe('Edge Cases', () => {
    test('file with only malformed lines returns noData', async () => {
      const filePath = writeRawLines(tmpDir, ['bad json', '{nope', '???']);
      const report = await analyzer.analyze(filePath);
      expect(report.noData).toBe(true);
      expect(report.malformedLineCount).toBe(3);
    });

    test('reanalyze resets accumulators', async () => {
      const t0 = new Date('2026-01-01T00:00:00Z');
      const file1 = writeEvents(tmpDir, [
        { type: 'layer_start', layer: 'L1', epic: 'E1', timestamp: t0.toISOString() },
        { type: 'layer_end', layer: 'L1', epic: 'E1', timestamp: new Date(t0.getTime() + 1000).toISOString() }
      ]);
      await analyzer.analyze(file1);

      // Second analysis on different data
      const dir2 = fs.mkdtempSync(path.join(os.tmpdir(), 'exec-analyzer2-'));
      const file2 = writeEvents(dir2, [
        { type: 'layer_start', layer: 'L5', epic: 'E2', timestamp: t0.toISOString() },
        { type: 'layer_end', layer: 'L5', epic: 'E2', timestamp: new Date(t0.getTime() + 2000).toISOString() }
      ]);
      const report2 = await analyzer.analyze(file2);
      expect(report2.perLayerMetrics['L1:E1']).toBeUndefined();
      expect(report2.perLayerMetrics['L5:E2']).toBeDefined();
      fs.rmSync(dir2, { recursive: true, force: true });
    });

    test('verdict event with no meta.issues handled gracefully', async () => {
      const filePath = writeEvents(tmpDir, [
        { type: 'verdict', layer: 'L9' },
        { type: 'verdict', layer: 'L10', meta: {} }
      ]);
      const report = await analyzer.analyze(filePath);
      expect(report.reviewFindings.severityCounts).toEqual({ MINOR: 0, MAJOR: 0, ESCALATE: 0 });
    });

    test('error event without timeout keyword does not increment timeoutCount', async () => {
      const filePath = writeEvents(tmpDir, [
        { type: 'error', layer: 'L8', epic: 'E1', message: 'Process crashed with signal SIGABRT' }
      ]);
      const report = await analyzer.analyze(filePath);
      expect(report.perLayerMetrics['L8:E1']).toBeUndefined();
    });
  });
});
