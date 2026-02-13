/**
 * Notifier - macOS push notifications for Layer Cake events
 *
 * Uses terminal-notifier (the binary, NOT osascript) to send push
 * notifications at key orchestration events: layer transitions,
 * review verdicts, stalls, errors, and completion.
 *
 * terminal-notifier is preferred because:
 * - It works from headless/SSH sessions
 * - Supports grouping (so old notifications get replaced)
 * - Has sound support
 * - Does not require full AppleScript permissions
 */

const { execFile } = require('child_process');

/**
 * Default path to terminal-notifier binary.
 * Override with options.binPath if installed elsewhere.
 */
const DEFAULT_BIN_PATH = 'terminal-notifier';

class Notifier {
  /**
   * @param {Object} options
   * @param {boolean} [options.enabled=true] - Whether notifications are active
   * @param {string} [options.binPath='terminal-notifier'] - Path to terminal-notifier binary
   * @param {string} [options.appIcon] - Path to app icon
   * @param {string} [options.sound='default'] - Notification sound name or null to disable
   * @param {string} [options.group='ralph-layer-cake'] - Notification group ID
   */
  constructor(options = {}) {
    this.enabled = options.enabled !== false;
    this.binPath = options.binPath || DEFAULT_BIN_PATH;
    this.appIcon = options.appIcon || null;
    this.sound = options.sound !== undefined ? options.sound : 'default';
    this.group = options.group || 'ralph-layer-cake';

    /** @type {Array<Object>} History of notifications sent (for testing) */
    this.history = [];
  }

  /**
   * Send a notification via terminal-notifier.
   *
   * @param {Object} opts
   * @param {string} opts.title - Notification title
   * @param {string} opts.message - Notification body
   * @param {string} [opts.subtitle] - Notification subtitle
   * @param {string} [opts.sound] - Override default sound
   * @param {string} [opts.group] - Override default group
   * @returns {Promise<boolean>} Whether notification was sent successfully
   */
  async send(opts) {
    if (!this.enabled) return false;

    const { title, message, subtitle } = opts;
    if (!title || !message) return false;

    const entry = {
      timestamp: new Date().toISOString(),
      title,
      message,
      subtitle: subtitle || null
    };
    this.history.push(entry);

    const args = [
      '-title', title,
      '-message', message,
      '-group', opts.group || this.group
    ];

    if (subtitle) {
      args.push('-subtitle', subtitle);
    }

    const sound = opts.sound !== undefined ? opts.sound : this.sound;
    if (sound) {
      args.push('-sound', sound);
    }

    if (this.appIcon) {
      args.push('-appIcon', this.appIcon);
    }

    return new Promise((resolve) => {
      execFile(this.binPath, args, (err) => {
        if (err) {
          // Notification failure should never crash the orchestrator
          if (process.env.NODE_ENV !== 'test') {
            console.error(`Notifier: failed to send notification: ${err.message}`);
          }
          resolve(false);
        } else {
          resolve(true);
        }
      });
    });
  }

  /**
   * Convenience: notify layer transition
   */
  async layerTransition(fromLayer, toLayer) {
    return this.send({
      title: 'Layer Cake',
      subtitle: `${fromLayer} -> ${toLayer}`,
      message: `Advanced from ${fromLayer} to ${toLayer}`
    });
  }

  /**
   * Convenience: notify review verdict
   */
  async reviewVerdict(layerId, verdict, issueCount) {
    const icon = verdict === 'PASS' ? 'PASS' : 'ITERATE';
    const detail = issueCount ? ` (${issueCount} issue${issueCount > 1 ? 's' : ''})` : '';
    return this.send({
      title: `Layer Cake: ${icon}`,
      subtitle: `Review at ${layerId}`,
      message: `Verdict: ${verdict}${detail}`
    });
  }

  /**
   * Convenience: notify stall detected
   */
  async stallDetected(elapsedSeconds) {
    return this.send({
      title: 'Layer Cake: STALL DETECTED',
      message: `No status update for ${Math.round(elapsedSeconds)} seconds`,
      sound: 'Basso' // Distinctive sound for stalls
    });
  }

  /**
   * Convenience: notify error
   */
  async error(layerId, errorMessage) {
    return this.send({
      title: 'Layer Cake: ERROR',
      subtitle: `Layer ${layerId}`,
      message: errorMessage,
      sound: 'Sosumi'
    });
  }

  /**
   * Convenience: notify project completion
   */
  async projectComplete() {
    return this.send({
      title: 'Layer Cake: COMPLETE',
      message: 'Project completed successfully!',
      sound: 'Glass'
    });
  }
}

module.exports = { Notifier };
