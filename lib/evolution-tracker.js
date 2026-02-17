'use strict';

const fs = require('fs');
const fsp = require('fs').promises;
const path = require('path');

/**
 * Minimum number of data points before a variant can be promoted.
 */
const MIN_DATA_POINTS = 3;

/**
 * Win rate threshold for promotion (>60%).
 */
const PROMOTION_THRESHOLD = 0.6;

class EvolutionTracker {
  /**
   * @param {string} resultsDir - Path to _ab-results/ directory
   */
  constructor(resultsDir) {
    this.resultsDir = resultsDir;
    this.evolutionPath = path.join(resultsDir, 'evolution.jsonl');
  }

  /**
   * Read all evolution records from the JSONL file.
   * @returns {Array<Object>} Parsed records
   */
  readRecords() {
    try {
      const content = fs.readFileSync(this.evolutionPath, 'utf8');
      return content.trim().split('\n')
        .map(line => {
          try { return JSON.parse(line); } catch { return null; }
        })
        .filter(Boolean);
    } catch (err) {
      if (err.code === 'ENOENT') return [];
      throw err;
    }
  }

  /**
   * Compute win rates per layer per variant.
   *
   * @returns {Object} Map of `{layerId}:{variant}` -> { wins, losses, ties, total, winRate }
   */
  computeWinRates() {
    const records = this.readRecords();
    const stats = {};

    for (const record of records) {
      const key = `${record.layerId}:${record.variant}`;
      if (!stats[key]) {
        stats[key] = {
          layerId: record.layerId,
          variant: record.variant,
          wins: 0,
          losses: 0,
          ties: 0,
          total: 0,
          highConfidenceWins: 0
        };
      }

      stats[key].total++;
      if (record.actualWinner === record.variant) {
        stats[key].wins++;
        if (record.confidence === 'HIGH') {
          stats[key].highConfidenceWins++;
        }
      } else if (record.actualWinner === 'tie') {
        stats[key].ties++;
      } else {
        stats[key].losses++;
      }
    }

    // Compute win rates
    for (const stat of Object.values(stats)) {
      stat.winRate = stat.total > 0 ? stat.wins / stat.total : 0;
    }

    return stats;
  }

  /**
   * Identify variants that should be promoted.
   * Criteria: >60% win rate with >= 3 data points.
   *
   * @returns {Array<Object>} Promotion candidates with layerId, variant, winRate, total
   */
  getPromotionCandidates() {
    const stats = this.computeWinRates();
    const candidates = [];

    for (const stat of Object.values(stats)) {
      if (stat.total >= MIN_DATA_POINTS && stat.winRate > PROMOTION_THRESHOLD) {
        candidates.push({
          layerId: stat.layerId,
          variant: stat.variant,
          winRate: stat.winRate,
          total: stat.total,
          wins: stat.wins,
          highConfidenceWins: stat.highConfidenceWins
        });
      }
    }

    // Sort by win rate descending
    candidates.sort((a, b) => b.winRate - a.winRate);
    return candidates;
  }

  /**
   * Get layers that have enough data to skip A/B testing.
   * These are layers where a variant has already won consistently.
   *
   * @param {string} variant - Variant name to check
   * @returns {string[]} Layer IDs that can skip A/B testing
   */
  getSkippableLayers(variant) {
    const candidates = this.getPromotionCandidates();
    return candidates
      .filter(c => c.variant === variant)
      .map(c => c.layerId);
  }

  /**
   * Get a summary of all tracked evolution data.
   * @returns {Object} Summary with per-layer stats and recommendations
   */
  getSummary() {
    const stats = this.computeWinRates();
    const candidates = this.getPromotionCandidates();
    const records = this.readRecords();

    return {
      totalRecords: records.length,
      perLayerStats: stats,
      promotionCandidates: candidates,
      uniqueVariants: [...new Set(records.map(r => r.variant))],
      uniqueLayers: [...new Set(records.map(r => r.layerId))]
    };
  }
}

module.exports = { EvolutionTracker, MIN_DATA_POINTS, PROMOTION_THRESHOLD };
