/**
 * ParallelExecutor - Concurrent Epic Builder
 *
 * Runs multiple independent epics concurrently using a bounded work queue.
 * Each epic goes through its own L8 build -> L9 review cycle.
 *
 * Usage:
 *   const executor = new ParallelExecutor(ralph, agentExecutor, { concurrency: 2 });
 *   const results = await executor.runEpics(['epic-auth', 'epic-api', 'epic-ui']);
 *
 * Features:
 * - Configurable concurrency limit (default 2)
 * - Work queue with FIFO ordering
 * - Per-epic result collection (success, error, escalated)
 * - Integrates with Ralph's event system for logging
 * - Graceful handling of failures (one epic failing doesn't stop others)
 */

class ParallelExecutor {
  /**
   * @param {import('./ralph').Ralph} ralph - Ralph orchestrator instance
   * @param {Function} agentExecutor - Agent executor function (same as runLayerCycle)
   * @param {Object} [options]
   * @param {number} [options.concurrency=2] - Maximum concurrent epics
   */
  constructor(ralph, agentExecutor, options = {}) {
    this.ralph = ralph;
    this.agentExecutor = agentExecutor;
    this.concurrency = options.concurrency || 2;

    /** @type {Array<{epic: string, status: string, result: Object}>} */
    this.results = [];
    /** @type {number} */
    this.activeCount = 0;
    /** @type {boolean} */
    this.running = false;
  }

  /**
   * Run multiple epics concurrently with bounded parallelism.
   *
   * @param {string[]} epicNames - List of epic directory names to build
   * @returns {Promise<Object>} Summary of all epic results
   */
  async runEpics(epicNames) {
    if (!epicNames || epicNames.length === 0) {
      return { status: 'no_epics', results: [], summary: { total: 0, passed: 0, failed: 0, escalated: 0 } };
    }

    this.running = true;
    this.results = [];
    this.activeCount = 0;

    this.ralph.log(`ParallelExecutor: running ${epicNames.length} epics with concurrency ${this.concurrency}`);

    // Create work queue
    const queue = [...epicNames];
    const workers = [];

    // Spawn up to `concurrency` workers
    const workerCount = Math.min(this.concurrency, queue.length);
    for (let i = 0; i < workerCount; i++) {
      workers.push(this._worker(queue, i));
    }

    // Wait for all workers to finish
    await Promise.all(workers);

    this.running = false;

    // Build summary
    const summary = this._buildSummary();
    this.ralph.log(`ParallelExecutor: complete. ${summary.passed} passed, ${summary.failed} failed, ${summary.escalated} escalated`);

    return {
      status: summary.failed > 0 || summary.escalated > 0 ? 'partial' : 'all_passed',
      results: this.results,
      summary
    };
  }

  /**
   * Worker loop: pulls epics from the queue and processes them.
   * @param {string[]} queue - Shared mutable queue (FIFO)
   * @param {number} workerId - Worker index (for logging)
   * @private
   */
  async _worker(queue, workerId) {
    while (queue.length > 0) {
      const epic = queue.shift();
      if (!epic) break; // Queue exhausted by another worker

      this.activeCount++;
      this.ralph.log(`Worker ${workerId}: starting epic "${epic}" (${this.activeCount} active)`);

      try {
        const result = await this.ralph.runEpicCycle(this.agentExecutor, epic);

        if (result.status === 'error') {
          this.results.push({ epic, status: 'failed', result });
          this.ralph.log(`Worker ${workerId}: epic "${epic}" failed: ${result.error || result.message}`);
        } else if (result.epicEscalated) {
          this.results.push({ epic, status: 'escalated', result });
          this.ralph.log(`Worker ${workerId}: epic "${epic}" escalated`);
        } else {
          this.results.push({ epic, status: 'passed', result });
          this.ralph.log(`Worker ${workerId}: epic "${epic}" passed`);
        }
      } catch (err) {
        this.results.push({ epic, status: 'failed', result: { error: err.message } });
        this.ralph.log(`Worker ${workerId}: epic "${epic}" threw: ${err.message}`);
      } finally {
        this.activeCount--;
      }
    }
  }

  /**
   * Build a summary of all results.
   * @returns {{ total: number, passed: number, failed: number, escalated: number }}
   * @private
   */
  _buildSummary() {
    const summary = { total: this.results.length, passed: 0, failed: 0, escalated: 0 };
    for (const r of this.results) {
      if (r.status === 'passed') summary.passed++;
      else if (r.status === 'escalated') summary.escalated++;
      else summary.failed++;
    }
    return summary;
  }

  /**
   * Get the current results (may be partial if still running).
   * @returns {Array<{epic: string, status: string, result: Object}>}
   */
  getResults() {
    return [...this.results];
  }

  /**
   * Check if the executor is currently running.
   * @returns {boolean}
   */
  isRunning() {
    return this.running;
  }
}

module.exports = { ParallelExecutor };
