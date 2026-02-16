/**
 * EventLogger - Structured event log for Layer Cake orchestration
 *
 * Writes machine-readable JSONL events to _events.jsonl alongside _status.md.
 * Each line is a JSON object: { timestamp, type, layer, epic, verdict, message }
 *
 * Consumers can tail this file for live updates, parse it for dashboards,
 * or feed it into alerting systems.
 */

const fs = require('fs');
const path = require('path');

/**
 * Event types emitted by the orchestrator
 */
const EVENT_TYPES = {
  LAYER_START: 'layer_start',
  LAYER_END: 'layer_end',
  VERDICT: 'verdict',
  ERROR: 'error',
  GATE_APPROVAL: 'gate_approval',
  GATE_WAITING: 'gate_waiting',
  STALL_DETECTED: 'stall_detected',
  COST_UPDATE: 'cost_update',
  VERDICT_COVERAGE: 'verdict_coverage'
};

class EventLogger {
  /**
   * @param {string} projectRoot - Absolute path to project root
   * @param {Object} options
   * @param {string} [options.filename='_events.jsonl'] - Output filename
   * @param {boolean} [options.enabled=true] - Whether logging is active
   */
  constructor(projectRoot, options = {}) {
    this.projectRoot = projectRoot;
    this.filename = options.filename || '_events.jsonl';
    this.enabled = options.enabled !== false;
    this.filePath = path.join(projectRoot, this.filename);
    /** @type {Array<Object>} In-memory buffer of events (for testing/inspection) */
    this.buffer = [];
  }

  /**
   * Log a structured event. Appends one JSON line to the events file.
   *
   * @param {Object} event
   * @param {string} event.type - One of EVENT_TYPES
   * @param {string} [event.layer] - Layer ID (e.g. 'L1', 'L8')
   * @param {string} [event.epic] - Epic name if applicable
   * @param {string} [event.verdict] - 'PASS' or 'ITERATE' if applicable
   * @param {string} [event.message] - Human-readable description
   * @param {Object} [event.meta] - Any additional metadata
   */
  log(event) {
    if (!this.enabled) return;

    const entry = {
      timestamp: new Date().toISOString(),
      type: event.type || 'unknown',
      layer: event.layer || null,
      epic: event.epic || null,
      verdict: event.verdict || null,
      message: event.message || '',
      ...(event.meta ? { meta: event.meta } : {})
    };

    this.buffer.push(entry);

    try {
      fs.appendFileSync(this.filePath, JSON.stringify(entry) + '\n', 'utf8');
    } catch (err) {
      // If we can't write to disk, the event is still in the buffer.
      // Don't throw - logging should never crash the orchestrator.
      if (process.env.NODE_ENV !== 'test') {
        console.error(`EventLogger: failed to write to ${this.filePath}: ${err.message}`);
      }
    }
  }

  /**
   * Convenience: log a layer_start event
   */
  layerStart(layerId, layerName, epic) {
    this.log({
      type: EVENT_TYPES.LAYER_START,
      layer: layerId,
      epic: epic || null,
      message: `Starting layer ${layerId}: ${layerName}`
    });
  }

  /**
   * Convenience: log a layer_end event
   */
  layerEnd(layerId, nextLayer, epic) {
    this.log({
      type: EVENT_TYPES.LAYER_END,
      layer: layerId,
      epic: epic || null,
      message: `Layer ${layerId} complete, advancing to ${nextLayer || 'COMPLETE'}`
    });
  }

  /**
   * Convenience: log a verdict event
   */
  verdict(layerId, verdictValue, issues, epic) {
    this.log({
      type: EVENT_TYPES.VERDICT,
      layer: layerId,
      epic: epic || null,
      verdict: verdictValue,
      message: `Verdict at ${layerId}: ${verdictValue}`,
      meta: issues && issues.length > 0 ? { issueCount: issues.length, issues } : undefined
    });
  }

  /**
   * Convenience: log an error event
   */
  error(layerId, errorMessage, epic) {
    this.log({
      type: EVENT_TYPES.ERROR,
      layer: layerId,
      epic: epic || null,
      message: errorMessage
    });
  }

  /**
   * Convenience: log a gate approval event
   */
  gateApproval(layerId) {
    this.log({
      type: EVENT_TYPES.GATE_APPROVAL,
      layer: layerId,
      message: `Human gate approved at ${layerId}`
    });
  }

  /**
   * Convenience: log a gate waiting event
   */
  gateWaiting(layerId) {
    this.log({
      type: EVENT_TYPES.GATE_WAITING,
      layer: layerId,
      message: `Waiting for human gate approval at ${layerId}`
    });
  }

  /**
   * Read all events from the log file
   * @returns {Array<Object>} Parsed events
   */
  readAll() {
    try {
      const content = fs.readFileSync(this.filePath, 'utf8').trim();
      if (!content) return [];
      return content.split('\n').map(line => JSON.parse(line));
    } catch (err) {
      if (err.code === 'ENOENT') return [];
      throw err;
    }
  }

  /**
   * Get count of events by type
   * @returns {Object} Map of type -> count
   */
  getCounts() {
    const events = this.readAll();
    const counts = {};
    for (const event of events) {
      counts[event.type] = (counts[event.type] || 0) + 1;
    }
    return counts;
  }

  /**
   * Clear the event log file (for testing or resets)
   */
  clear() {
    this.buffer = [];
    try {
      fs.writeFileSync(this.filePath, '', 'utf8');
    } catch {
      // Ignore errors on clear
    }
  }
}

module.exports = { EventLogger, EVENT_TYPES };
