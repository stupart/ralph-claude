const { formatExecutionReport } = require('../lib/agent-spawner');

describe('L12 Execution Report Enhancement', () => {
  const mockReport = {
    perLayerMetrics: {
      'L8:E1': { duration: 1800000, timeoutCount: 1, retryCount: 1, retrySpeedupRatio: 7.5, attempts: [], status: 'complete' }
    },
    anomalies: [{ type: 'context_exhaustion', description: 'Retry succeeded 7.5x faster' }],
    reviewFindings: { severityCounts: { MINOR: 2, MAJOR: 1, ESCALATE: 0 } },
    aggregateMetrics: { totalRuntime: 3600000, timeoutWastePercentage: 40, firstAttemptSuccessRate: 50 },
    malformedLineCount: 0,
    noData: false
  };

  test('execution report produces markdown with all 4 subsections', () => {
    const output = formatExecutionReport(mockReport);
    expect(output).toContain('## Execution Analysis');
    expect(output).toContain('### Per-Layer Timing');
    expect(output).toContain('### Aggregate Metrics');
    expect(output).toContain('### Anomaly Flags');
    expect(output).toContain('### Review Finding Summary');
  });

  test('output contains waste percentage', () => {
    const output = formatExecutionReport(mockReport);
    expect(output).toContain('40.0%');
  });

  test('output contains anomaly flags', () => {
    const output = formatExecutionReport(mockReport);
    expect(output).toContain('context_exhaustion');
    expect(output).toContain('7.5x faster');
  });

  test('output contains per-layer timing data', () => {
    const output = formatExecutionReport(mockReport);
    expect(output).toContain('L8:E1');
    expect(output).toContain('1800000ms');
    expect(output).toContain('7.5x');
  });

  test('output contains review finding summary', () => {
    const output = formatExecutionReport(mockReport);
    expect(output).toContain('MINOR: 2');
    expect(output).toContain('MAJOR: 1');
    expect(output).toContain('ESCALATE: 0');
  });

  test('null report returns empty string', () => {
    expect(formatExecutionReport(null)).toBe('');
  });

  test('undefined report returns empty string', () => {
    expect(formatExecutionReport(undefined)).toBe('');
  });

  test('noData report returns empty string', () => {
    expect(formatExecutionReport({ noData: true })).toBe('');
  });

  test('partial report: timing present, anomalies omitted', () => {
    const partialReport = {
      perLayerMetrics: {
        'L8:E1': { duration: 1800000, timeoutCount: 0, retryCount: 0, retrySpeedupRatio: null, attempts: [], status: 'complete' }
      },
      anomalies: [],
      reviewFindings: { severityCounts: { MINOR: 0, MAJOR: 0, ESCALATE: 0 } },
      aggregateMetrics: { totalRuntime: 1800000, timeoutWastePercentage: 0, firstAttemptSuccessRate: 100 },
      noData: false
    };
    const output = formatExecutionReport(partialReport);
    expect(output).toContain('### Per-Layer Timing');
    expect(output).not.toContain('### Anomaly Flags');
  });

  test('report with no perLayerMetrics omits timing table', () => {
    const report = {
      perLayerMetrics: {},
      anomalies: [{ type: 'test', description: 'test desc' }],
      reviewFindings: { severityCounts: { MINOR: 0, MAJOR: 0, ESCALATE: 0 } },
      aggregateMetrics: { totalRuntime: 0, timeoutWastePercentage: 0, firstAttemptSuccessRate: 0 },
      noData: false
    };
    const output = formatExecutionReport(report);
    expect(output).not.toContain('### Per-Layer Timing');
    expect(output).toContain('### Anomaly Flags');
  });

  test('output is valid markdown with proper table formatting', () => {
    const output = formatExecutionReport(mockReport);
    // Check table headers
    expect(output).toContain('| Layer:Epic | Duration | Timeouts | Retries | Speedup Ratio |');
    expect(output).toContain('|---|---|---|---|---|');
  });
});
