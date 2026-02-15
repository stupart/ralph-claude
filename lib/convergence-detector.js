/**
 * @typedef {Object} ConvergenceReport
 * @property {string} status - 'improving'|'plateauing'|'regressing'|'insufficient_data'
 * @property {string} compositeScore
 * @property {Object} metrics
 * @property {Array} plateaus
 * @property {Array} regressions
 * @property {Array} healthSignals
 * @property {Array} chronicDeferrals
 */

class ConvergenceDetector {
  analyze(generationHistory) {
    if (!generationHistory) throw new Error('generationHistory is required');
    if (!Array.isArray(generationHistory.generations) || generationHistory.generations.length === 0) {
      throw new Error('generationHistory.generations must be a non-empty array');
    }
    if (generationHistory.generations.length === 1) {
      const gen = generationHistory.generations[0];
      return {
        status: 'insufficient_data',
        metrics: {},
        plateaus: [],
        regressions: [],
        healthSignals: [],
        chronicDeferrals: [],
        absoluteMetrics: { planned: gen.epics.planned, built: gen.epics.built, deferred: gen.epics.deferred }
      };
    }

    const trends = this._computeTrends(generationHistory.generations);
    const allIncomplete = Object.values(trends).every(t => t.incomplete);
    if (allIncomplete) {
      return {
        status: 'insufficient_data',
        metrics: trends,
        plateaus: [],
        regressions: [],
        healthSignals: [],
        chronicDeferrals: [],
        note: 'All metrics have incomplete data'
      };
    }

    const plateaus = this._detectPlateaus(trends, generationHistory.generations);
    const regressions = this._detectRegressions(trends, generationHistory.generations);
    const healthSignals = this._detectHealthSignals(trends);
    const compositeScore = this._computeCompositeScore(plateaus, regressions, healthSignals);
    const chronicDeferrals = this._detectChronicDeferrals(generationHistory);

    return {
      status: compositeScore,
      compositeScore,
      metrics: trends,
      plateaus,
      regressions,
      healthSignals,
      chronicDeferrals
    };
  }

  _computeTrends(generations) {
    const metricDefs = [
      { name: 'testsAdded', extract: g => g.testCount, desiredDirection: 'increasing' },
      { name: 'epicsDelivered', extract: g => g.epics.built, desiredDirection: 'increasing' },
      { name: 'deferralCount', extract: g => g.epics.deferred, desiredDirection: 'decreasing' },
      { name: 'executionWaste', extract: g => g.timeoutWastePercentage, desiredDirection: 'decreasing' },
      { name: 'efficiencyPerEpic', extract: g => g.epics.built > 0 ? g.executionTime / g.epics.built : undefined, desiredDirection: 'decreasing' }
    ];

    const trends = {};
    for (const def of metricDefs) {
      const values = generations.map(def.extract);
      const deltas = [];
      const directions = [];
      let incomplete = false;

      for (let i = 0; i < values.length - 1; i++) {
        const v0 = values[i], v1 = values[i + 1];
        if (v0 === undefined || v0 === null || Number.isNaN(v0) ||
            v1 === undefined || v1 === null || Number.isNaN(v1)) { incomplete = true; continue; }
        const delta = values[i + 1] - values[i];
        deltas.push(delta);
        const tolerance = Math.abs(values[i]) * 0.05;
        if (Math.abs(delta) <= tolerance) {
          directions.push('flat');
        } else if ((def.desiredDirection === 'increasing' && delta > 0) || (def.desiredDirection === 'decreasing' && delta < 0)) {
          directions.push('improving');
        } else {
          directions.push('worsening');
        }
      }

      trends[def.name] = { values, deltas, directions, incomplete };
    }
    return trends;
  }

  _detectPlateaus(trends, generations) {
    const plateaus = [];
    for (const [metric, trend] of Object.entries(trends)) {
      let runStart = null;
      for (let i = 0; i < trend.directions.length; i++) {
        if (trend.directions[i] === 'flat') {
          if (runStart === null) runStart = i;
        } else {
          if (runStart !== null && (i - runStart) >= 2) {
            plateaus.push({
              metric,
              startGeneration: generations[runStart].generation,
              endGeneration: generations[i].generation,
              value: trend.values[runStart],
              duration: i - runStart
            });
          }
          runStart = null;
        }
      }
      if (runStart !== null && (trend.directions.length - runStart) >= 2) {
        plateaus.push({
          metric,
          startGeneration: generations[runStart].generation,
          endGeneration: generations[trend.directions.length].generation,
          value: trend.values[runStart],
          duration: trend.directions.length - runStart
        });
      }
    }
    return plateaus;
  }

  _detectRegressions(trends, generations) {
    const regressions = [];
    for (const [metric, trend] of Object.entries(trends)) {
      let runStart = null;
      for (let i = 0; i < trend.directions.length; i++) {
        if (trend.directions[i] === 'worsening') {
          if (runStart === null) runStart = i;
        } else {
          if (runStart !== null && (i - runStart) >= 2) {
            regressions.push({
              metric,
              startGeneration: generations[runStart].generation,
              endGeneration: generations[i].generation,
              direction: 'worsening',
              severity: 'regression'
            });
          }
          runStart = null;
        }
      }
      if (runStart !== null && (trend.directions.length - runStart) >= 2) {
        regressions.push({
          metric,
          startGeneration: generations[runStart].generation,
          endGeneration: generations[trend.directions.length].generation,
          direction: 'worsening',
          severity: 'regression'
        });
      }
    }
    return regressions;
  }

  _detectHealthSignals(trends) {
    const signals = [];
    const metricsWithData = Object.values(trends).filter(t => t.directions.length > 0 && !t.incomplete);
    if (metricsWithData.length > 0 && metricsWithData.every(t => t.directions[t.directions.length - 1] === 'improving')) {
      signals.push({ type: 'positive_convergence', description: 'All tracked metrics improved in the most recent generation' });
    }
    return signals;
  }

  _computeCompositeScore(plateaus, regressions, healthSignals) {
    if (regressions.length > 0) return 'regressing';
    if (plateaus.length > 0) return 'plateauing';
    return 'improving';
  }

  _detectChronicDeferrals(generationHistory) {
    const chronic = [];
    const deferralCounts = generationHistory.deferralCounts || {};
    for (const [epicName, counts] of Object.entries(deferralCounts)) {
      if (counts.consecutive >= 3) {
        chronic.push({
          epicName,
          consecutiveDeferrals: counts.consecutive,
          totalDeferrals: counts.total,
          threshold: 3,
          message: `Deferred ${counts.consecutive} consecutive generations`
        });
      }
    }
    return chronic;
  }
}

module.exports = { ConvergenceDetector };
