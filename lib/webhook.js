/**
 * Webhook - HTTP POST notifications for Layer Cake state changes
 *
 * Sends JSON payloads to a configured URL on key orchestration events.
 * Designed for Slack, Discord, or any HTTP endpoint integration.
 *
 * Usage:
 *   const webhook = new Webhook('https://hooks.slack.com/services/...');
 *   webhook.send({ type: 'layer_start', layer: 'L4', ... });
 *
 * Payloads follow the same schema as EventLogger events:
 *   { timestamp, type, layer, epic, verdict, message, meta? }
 */

const http = require('http');
const https = require('https');
const { URL } = require('url');

class Webhook {
  /**
   * @param {string|null} url - Webhook endpoint URL (null or empty disables)
   * @param {Object} options
   * @param {number} [options.timeoutMs=5000] - Request timeout
   * @param {number} [options.maxRetries=1] - Retry count on failure
   * @param {Object} [options.headers={}] - Additional headers
   */
  constructor(url, options = {}) {
    this.url = url || null;
    this.enabled = Boolean(this.url);
    this.timeoutMs = options.timeoutMs || 5000;
    this.maxRetries = options.maxRetries || 1;
    this.headers = options.headers || {};

    /** @type {Array<Object>} History of payloads sent (for testing/debugging) */
    this.history = [];
    /** @type {number} Count of failed deliveries */
    this.failureCount = 0;
  }

  /**
   * Send a JSON payload to the webhook URL.
   *
   * @param {Object} payload - Event data to POST
   * @returns {Promise<boolean>} Whether delivery succeeded
   */
  async send(payload) {
    if (!this.enabled) return false;

    const entry = {
      timestamp: new Date().toISOString(),
      ...payload
    };

    this.history.push(entry);

    let lastError;
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        await this._post(entry);
        return true;
      } catch (err) {
        lastError = err;
      }
    }

    this.failureCount++;
    if (process.env.NODE_ENV !== 'test') {
      console.error(`Webhook: failed to deliver to ${this.url}: ${lastError.message}`);
    }
    return false;
  }

  /**
   * HTTP POST implementation.
   * @param {Object} data - JSON payload
   * @returns {Promise<void>}
   * @private
   */
  _post(data) {
    return new Promise((resolve, reject) => {
      let parsedUrl;
      try {
        parsedUrl = new URL(this.url);
      } catch (err) {
        reject(new Error(`Invalid webhook URL: ${this.url}`));
        return;
      }

      const body = JSON.stringify(data);
      const transport = parsedUrl.protocol === 'https:' ? https : http;

      const options = {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
        path: parsedUrl.pathname + parsedUrl.search,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
          'User-Agent': 'ralph-layer-cake/1.0',
          ...this.headers
        },
        timeout: this.timeoutMs
      };

      const req = transport.request(options, (res) => {
        // Consume response data to free socket
        res.resume();

        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve();
        } else {
          reject(new Error(`HTTP ${res.statusCode}`));
        }
      });

      req.on('error', (err) => reject(err));
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });

      req.write(body);
      req.end();
    });
  }

  /**
   * Convenience: send layer start event
   */
  async layerStart(layerId, layerName, epic) {
    return this.send({
      type: 'layer_start',
      layer: layerId,
      epic: epic || null,
      message: `Starting layer ${layerId}: ${layerName}`
    });
  }

  /**
   * Convenience: send layer end event
   */
  async layerEnd(layerId, nextLayer) {
    return this.send({
      type: 'layer_end',
      layer: layerId,
      message: `Layer ${layerId} complete, advancing to ${nextLayer || 'COMPLETE'}`
    });
  }

  /**
   * Convenience: send verdict event
   */
  async verdict(layerId, verdictValue, issues) {
    return this.send({
      type: 'verdict',
      layer: layerId,
      verdict: verdictValue,
      message: `Verdict at ${layerId}: ${verdictValue}`,
      meta: { issueCount: (issues || []).length }
    });
  }

  /**
   * Convenience: send error event
   */
  async error(layerId, errorMessage) {
    return this.send({
      type: 'error',
      layer: layerId,
      message: errorMessage
    });
  }

  /**
   * Convenience: send completion event
   */
  async complete() {
    return this.send({
      type: 'complete',
      message: 'Project completed successfully'
    });
  }
}

module.exports = { Webhook };
