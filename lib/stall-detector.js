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

class StallDetector {
  /**
   * @param {string} projectRoot - Absolute path to project root
   * @param {Object} options
   * @param {number} [options.thresholdMs=600000] - Stall threshold in ms (default 10 min)
   * @param {number} [options.pollIntervalMs=30000] - Check interval in ms (default 30 sec)
   * @param {string} [options.watchFile='_status.md'] - File to monitor
   * @param {Function} [options.onStall] - Callback when stall is detected: (stallInfo) => void
   * @param {Function} [options.onRecover] - Callback when activity resumes after a stall
   */
  constructor(projectRoot, options = {}) {
    this.projectRoot = projectRoot;
    this.thresholdMs = options.thresholdMs || 600000; // 10 minutes
    this.pollIntervalMs = options.pollIntervalMs || 30000; // 30 seconds
    this.watchFile = options.watchFile || '_status.md';
    this.filePath = path.join(projectRoot, this.watchFile);
    this.onStall = options.onStall || null;
    this.onRecover = options.onRecover || null;

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
  }

  /**
   * Start monitoring the file.
   * Records the current mtime as the baseline.
   */
  start() {
    if (this._running) return;
    this._running = true;
    this._stalled = false;
    this._lastMtime = this._getMtime();

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

    if (elapsed >= this.thresholdMs && !this._stalled) {
      this._stalled = true;
      this.stallCount++;

      if (this.onStall) {
        this.onStall({
          file: this.filePath,
          lastModified: new Date(this._lastMtime).toISOString(),
          stalledAt: new Date().toISOString(),
          elapsedMs: elapsed,
          thresholdMs: this.thresholdMs,
          stallCount: this.stallCount
        });
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

module.exports = { StallDetector };
