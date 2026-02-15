const fs = require('fs');
const readline = require('readline');
const path = require('path');

/**
 * @typedef {Object} ExecutionReport
 * @property {Object} perLayerMetrics
 * @property {Array} anomalies
 * @property {Object} reviewFindings
 * @property {Object} aggregateMetrics
 * @property {number} malformedLineCount
 * @property {Object|null} baselineComparison
 * @property {boolean} noData
 */

class ExecutionAnalyzer {
  async analyze(eventsFilePath, baselineMetrics = null) {
    if (!fs.existsSync(eventsFilePath)) {
      throw new Error(`Events file not found: ${eventsFilePath}`);
    }

    // Reset accumulators
    this._timingMap = new Map();
    this._perLayerMetrics = {};
    this._verdictEvents = [];
    this._retryEvents = [];
    this._errorEvents = [];
    this._malformedLineCount = 0;
    this._eventCount = 0;

    await new Promise((resolve) => {
      const rl = readline.createInterface({ input: fs.createReadStream(eventsFilePath), crlfDelay: Infinity });
      rl.on('line', (line) => {
        let event;
        try { event = JSON.parse(line); } catch { this._malformedLineCount++; return; }
        this._eventCount++;
        if (event.type === 'layer_start') this._onLayerStart(event);
        else if (event.type === 'layer_end') this._onLayerEnd(event);
        else if (event.type === 'verdict') this._onVerdict(event);
        else if (event.type === 'error') this._onError(event);
        else if (event.type === 'agent_retry') this._onAgentRetry(event);
      });
      rl.on('close', resolve);
    });

    if (this._eventCount === 0) {
      return { perLayerMetrics: {}, anomalies: [], reviewFindings: {}, aggregateMetrics: {}, malformedLineCount: this._malformedLineCount, baselineComparison: null, noData: true };
    }

    this._computeRetrySpeedups();
    const anomalies = this._detectAnomalies();
    const reviewFindings = this._extractReviewFindings();
    const aggregateMetrics = this._computeAggregateMetrics();
    const baselineComparison = this._compareBaseline(aggregateMetrics, baselineMetrics);

    return {
      perLayerMetrics: this._perLayerMetrics,
      anomalies,
      reviewFindings,
      aggregateMetrics,
      malformedLineCount: this._malformedLineCount,
      baselineComparison,
      noData: false
    };
  }

  _onLayerStart(event) {
    const key = `${event.layer}:${event.epic || 'all'}`;
    this._timingMap.set(key, { layer: event.layer, epic: event.epic, startTime: event.timestamp });
  }

  _onLayerEnd(event) {
    const key = `${event.layer}:${event.epic || 'all'}`;
    const start = this._timingMap.get(key);
    if (!this._perLayerMetrics[key]) {
      this._perLayerMetrics[key] = { layer: event.layer, epic: event.epic, duration: null, timeoutCount: 0, retryCount: 0, retrySpeedupRatio: null, attempts: [], status: 'complete' };
    }
    if (start) {
      const duration = Date.parse(event.timestamp) - Date.parse(start.startTime);
      this._perLayerMetrics[key].duration = duration;
      this._perLayerMetrics[key].attempts.push({ duration, timedOut: false });
    } else {
      this._perLayerMetrics[key].status = 'incomplete';
    }
  }

  _onError(event) {
    if (event.message && /timeout|timed.out|SIGTERM/i.test(event.message)) {
      const key = `${event.layer}:${event.epic || 'all'}`;
      if (!this._perLayerMetrics[key]) {
        this._perLayerMetrics[key] = { layer: event.layer, epic: event.epic, duration: null, timeoutCount: 0, retryCount: 0, retrySpeedupRatio: null, attempts: [], status: 'complete' };
      }
      this._perLayerMetrics[key].timeoutCount++;
      this._perLayerMetrics[key].attempts.push({ duration: event.meta?.duration || null, timedOut: true });
    }
    this._errorEvents.push(event);
  }

  _onAgentRetry(event) {
    const key = `${event.layer}:${event.epic || 'all'}`;
    if (!this._perLayerMetrics[key]) {
      this._perLayerMetrics[key] = { layer: event.layer, epic: event.epic, duration: null, timeoutCount: 0, retryCount: 0, retrySpeedupRatio: null, attempts: [], status: 'complete' };
    }
    this._perLayerMetrics[key].retryCount++;
    this._retryEvents.push(event);
  }

  _onVerdict(event) {
    if (['L9', 'L10', 'L11'].includes(event.layer)) {
      this._verdictEvents.push(event);
    }
  }

  _computeRetrySpeedups() {
    for (const [key, metrics] of Object.entries(this._perLayerMetrics)) {
      const attempts = metrics.attempts;
      if (attempts.length >= 2) {
        const first = attempts[0];
        const last = attempts[attempts.length - 1];
        if (first.duration && last.duration && !last.timedOut && first.timedOut) {
          metrics.retrySpeedupRatio = first.duration / last.duration;
        }
      }
    }
  }

  _detectAnomalies() {
    const anomalies = [];
    for (const [key, metrics] of Object.entries(this._perLayerMetrics)) {
      if (metrics.retrySpeedupRatio && metrics.retrySpeedupRatio > 2.0) {
        anomalies.push({
          type: 'context_exhaustion',
          layer: metrics.layer,
          epic: metrics.epic,
          speedupRatio: metrics.retrySpeedupRatio,
          description: `Retry succeeded ${metrics.retrySpeedupRatio.toFixed(1)}x faster — likely context exhaustion, not genuine timeout`
        });
      }
      if (metrics.timeoutCount >= 2 && metrics.status !== 'complete') {
        anomalies.push({
          type: 'misconfiguration',
          layer: metrics.layer,
          epic: metrics.epic,
          consecutiveTimeouts: metrics.timeoutCount,
          description: `Layer ${metrics.layer} timed out ${metrics.timeoutCount} consecutive times — likely misconfigured timeout or impossible task`
        });
      }
    }
    return anomalies;
  }

  _extractReviewFindings() {
    const bySeverity = { MINOR: [], MAJOR: [], ESCALATE: [] };
    const byLayer = { L9: [], L10: [], L11: [] };
    const severityCounts = { MINOR: 0, MAJOR: 0, ESCALATE: 0 };

    for (const event of this._verdictEvents) {
      const issues = (event.meta && event.meta.issues) || [];
      for (const issue of issues) {
        const entry = { title: issue.title, description: issue.description, severity: issue.severity, layer: event.layer };
        if (bySeverity[issue.severity]) bySeverity[issue.severity].push(entry);
        if (byLayer[event.layer]) byLayer[event.layer].push(entry);
        if (severityCounts[issue.severity] !== undefined) severityCounts[issue.severity]++;
      }
    }

    return { bySeverity, byLayer, severityCounts };
  }

  _computeAggregateMetrics() {
    let totalRuntime = 0;
    let totalTimedOutDuration = 0;
    let firstAttemptSuccesses = 0;
    let totalLayers = 0;

    for (const metrics of Object.values(this._perLayerMetrics)) {
      totalLayers++;
      if (metrics.duration !== null) totalRuntime += metrics.duration;

      for (const attempt of metrics.attempts) {
        if (attempt.timedOut && attempt.duration) totalTimedOutDuration += attempt.duration;
      }

      if (metrics.retryCount === 0 && metrics.duration !== null) firstAttemptSuccesses++;
    }

    const timeoutWastePercentage = totalRuntime > 0 ? (totalTimedOutDuration / (totalRuntime + totalTimedOutDuration)) * 100 : 0;
    const firstAttemptSuccessRate = totalLayers > 0 ? (firstAttemptSuccesses / totalLayers) * 100 : 0;

    return { totalRuntime, timeoutWastePercentage, firstAttemptSuccessRate, totalLayers };
  }

  _compareBaseline(current, baseline) {
    if (!baseline) return null;
    const comparisons = [];
    const metrics = [
      { name: 'timeoutWastePercentage', desiredDirection: 'decreasing' },
      { name: 'firstAttemptSuccessRate', desiredDirection: 'increasing' },
      { name: 'totalRuntime', desiredDirection: 'decreasing' }
    ];
    for (const def of metrics) {
      if (current[def.name] !== undefined && baseline[def.name] !== undefined) {
        const delta = current[def.name] - baseline[def.name];
        const improving = (def.desiredDirection === 'decreasing' && delta < 0) || (def.desiredDirection === 'increasing' && delta > 0);
        comparisons.push({
          metric: def.name,
          current: current[def.name],
          baseline: baseline[def.name],
          delta,
          direction: improving ? 'improving' : 'worsening',
          description: `${def.name}: ${baseline[def.name]} → ${current[def.name]} (${delta > 0 ? '+' : ''}${delta.toFixed(1)})`
        });
      }
    }
    return comparisons;
  }
}

module.exports = { ExecutionAnalyzer };
