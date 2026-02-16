/**
 * StallDetector - Watchdog for stuck orchestration
 *
 * Monitors _status.md last-modified time and fires a callback when
 * no update has been seen for a configurable threshold (default 10 minutes).
 *
 * This would have caught both Chrome stalls during the skill tree meta-test
 * where the orchestrator hung for 5+ hours with no state change.
 */

const fs = require('fs');
const path = require('path');

/**
 * Default per-layer stall thresholds in milliseconds.
 * Calibrated to v7 observed durations with 3x safety margin.
 */
const DEFAULT_LAYER_THRESHOLDS = {
  L1: 300000,   // 5 min
  L2: 300000,   // 5 min
  L3: 300000,   // 5 min
  L4: 300000,   // 5 min
  L5: 300000,   // 5 min
  L6: 300000,   // 5 min
  L7: 900000,   // 15 min
  L8: 1800000,  // 30 min
  L9: 600000,   // 10 min
  L10: 600000,  // 10 min
  L11: 600000,  // 10 min
  L12: 600000   // 10 min
};

class StallDetector {
  /**
   * @param {string} projectRoot - Absolute path to project root
   * @param {Object} options
   * @param {number} [options.thresholdMs=600000] - Stall threshold in ms (default 10 min)
   * @param {number} [options.pollIntervalMs=30000] - Check interval in ms (default 30 sec)
   * @param {string} [options.watchFile='_status.md'] - File to monitor
   * @param {Function} [options.onStall] - Callback when stall is detected (warning tier): (stallInfo) => void
   * @param {Function} [options.onCritical] - Callback when stall reaches critical tier (2x threshold): (stallInfo) => void
   * @param {Function} [options.onRecover] - Callback when activity resumes after a stall
   * @param {Object} [options.layerThresholds] - Per-layer threshold map (e.g. { L8: 1800000 })
   * @param {boolean} [options.killOnCritical=false] - Whether to kill the agent process at critical tier
   */
  constructor(projectRoot, options = {}) {
    this.projectRoot = projectRoot;
    this.thresholdMs = options.thresholdMs || 600000; // 10 minutes
    this.pollIntervalMs = options.pollIntervalMs || 30000; // 30 seconds
    this.watchFile = options.watchFile || '_status.md';
    this.filePath = path.join(projectRoot, this.watchFile);
    this.onStall = options.onStall || null;
    this.onRecover = options.onRecover || null;
    this._onCritical = options.onCritical || null;
    this._layerThresholds = options.layerThresholds || null;
    this._killOnCritical = options.killOnCritical || false;

    /** @private Active threshold used by the polling loop */
    this._activeThreshold = this.thresholdMs;
    /** @private Current layer ID */
    this._currentLayer = null;
    /** @private AbortController for the current agent session */
    this._abortController = null;

    /** @private */
    this._timer = null;
    /** @private */
    this._lastMtime = null;
    /** @private */
    this._stalled = false;
    /** @private */
    this._running = false;
    /** @private Track stall count for testing */
    this.stallCount = 0;
    /** @private Whether warning has fired for current stall episode */
    this._warningFired = false;
    /** @private Whether critical has fired for current stall episode */
    this._criticalFired = false;
  }

  /**
   * Set the current layer, updating the active threshold from layerThresholds.
   * Resets stall state since a layer transition means the previous layer completed normally.
   * @param {string} layerId - Layer ID (e.g. 'L8', 'L3')
   */
  setLayer(layerId) {
    this._currentLayer = layerId || null;

    // Look up threshold for this layer
    if (layerId && this._layerThresholds && this._layerThresholds[layerId] !== undefined) {
      this._activeThreshold = this._layerThresholds[layerId];
    } else {
      // Fallback to flat thresholdMs
      this._activeThreshold = this.thresholdMs;
    }

    // Reset stall state for the new layer
    this._stalled = false;
    this._warningFired = false;
    this._criticalFired = false;

    // Reset lastMtime to current time to prevent immediate stall detection on new layer
    if (this._running) {
      this._lastMtime = Date.now();
    }
  }

  /**
   * Set the AbortController for the current agent session.
   * Used for kill-on-critical functionality.
   * @param {AbortController|null} controller
   */
  setAbortController(controller) {
    this._abortController = controller || null;
  }

  /**
   * Start monitoring the file.
   * Records the current mtime as the baseline.
   */
  start() {
    if (this._running) return;
    this._running = true;
    this._stalled = false;
    this._warningFired = false;
    this._criticalFired = false;
    this._lastMtime = this._getMtime();

    // If a layer was set before starting, apply its threshold
    if (this._currentLayer && this._layerThresholds && this._layerThresholds[this._currentLayer] !== undefined) {
      this._activeThreshold = this._layerThresholds[this._currentLayer];
    }

    this._timer = setInterval(() => {
      this._check();
    }, this.pollIntervalMs);

    // Ensure the interval doesn't prevent Node from exiting
    if (this._timer && this._timer.unref) {
      this._timer.unref();
    }
  }

  /**
   * Stop monitoring.
   */
  stop() {
    if (this._timer) {
      clearInterval(this._timer);
      this._timer = null;
    }
    this._running = false;
  }

  /**
   * Check if the file has been updated within the threshold.
   * Two-tier check: warning at 1x threshold, critical at 2x threshold.
   * @private
   */
  _check() {
    const currentMtime = this._getMtime();
    const now = Date.now();

    if (currentMtime === null) {
      // File doesn't exist yet - not a stall, just not started
      return;
    }

    // Update baseline if file has been modified
    if (this._lastMtime !== null && currentMtime > this._lastMtime) {
      if (this._stalled) {
        // Was stalled but activity resumed
        this._stalled = false;
        this._warningFired = false;
        this._criticalFired = false;
        if (this.onRecover) {
          this.onRecover({
            file: this.filePath,
            resumedAt: new Date().toISOString(),
            lastMtime: new Date(currentMtime).toISOString()
          });
        }
      }
      this._lastMtime = currentMtime;
      return;
    }

    // If lastMtime was null (first check), set it
    if (this._lastMtime === null) {
      this._lastMtime = currentMtime;
      return;
    }

    // Check if stall threshold has been exceeded
    const elapsed = now - this._lastMtime;
    const activeThreshold = this._activeThreshold;

    // Warning tier: 1x threshold
    if (elapsed >= activeThreshold && !this._warningFired) {
      this._stalled = true;
      this._warningFired = true;
      this.stallCount++;

      if (this.onStall) {
        this.onStall({
          file: this.filePath,
          lastModified: new Date(this._lastMtime).toISOString(),
          stalledAt: new Date().toISOString(),
          elapsedMs: elapsed,
          thresholdMs: activeThreshold,
          stallCount: this.stallCount,
          tier: 'warning'
        });
      }
    }

    // Critical tier: 2x threshold
    if (elapsed >= activeThreshold * 2 && !this._criticalFired) {
      this._criticalFired = true;

      if (this._onCritical) {
        this._onCritical({
          file: this.filePath,
          lastModified: new Date(this._lastMtime).toISOString(),
          stalledAt: new Date().toISOString(),
          elapsedMs: elapsed,
          thresholdMs: activeThreshold,
          stallCount: this.stallCount,
          tier: 'critical'
        });
      }

      // Kill on critical if enabled
      if (this._killOnCritical) {
        if (this._abortController) {
          this._abortController.abort();
        } else {
          console.warn('StallDetector: killOnCritical enabled but no AbortController set, skipping kill');
        }
      }
    }
  }

  /**
   * Get the mtime of the watched file in milliseconds.
   * Returns null if file doesn't exist.
   * @returns {number|null}
   * @private
   */
  _getMtime() {
    try {
      const stat = fs.statSync(this.filePath);
      return stat.mtimeMs;
    } catch {
      return null;
    }
  }

  /**
   * Get current stall status.
   * @returns {{ stalled: boolean, elapsedMs: number|null, lastModified: string|null }}
   */
  getStatus() {
    const currentMtime = this._getMtime();

    if (currentMtime === null) {
      return { stalled: false, elapsedMs: null, lastModified: null };
    }

    const elapsed = Date.now() - (this._lastMtime || currentMtime);
    return {
      stalled: this._stalled,
      elapsedMs: elapsed,
      lastModified: new Date(currentMtime).toISOString()
    };
  }

  /**
   * Whether the detector is currently running.
   * @returns {boolean}
   */
  isRunning() {
    return this._running;
  }
}

module.exports = { StallDetector, DEFAULT_LAYER_THRESHOLDS };
