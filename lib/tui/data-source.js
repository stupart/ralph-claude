/**
 * Data Source Adapters
 *
 * Provides two factory functions:
 * - createWatchSource(projectDir): File-based adapter for `ralph watch` mode.
 *   Replays _events.jsonl synchronously, then tails new events via fs.watch.
 *   Polls _status.md for pipeline position updates.
 *
 * - createIntegratedSource(ralphInstance): In-process adapter for `ralph run --tui`.
 *   Attaches handlers to Ralph's event emitter, normalizes to common format.
 *   Exposes gate approval/denial and pause/resume methods.
 *
 * Both sources emit 'event' events with NormalizedEvent objects:
 * { timestamp, type, layer, epic, verdict, message, meta }
 */

const { EventEmitter } = require('node:events');
const fs = require('node:fs');
const path = require('node:path');

/**
 * Normalize a raw JSONL event to the standard internal schema.
 * All fields are guaranteed non-undefined.
 */
function normalizeEvent(raw) {
  return {
    timestamp: raw.timestamp || new Date().toISOString(),
    type: raw.type || 'unknown',
    layer: raw.layer || null,
    epic: raw.epic || null,
    verdict: raw.verdict || null,
    message: raw.message || '',
    meta: raw.meta || {}
  };
}

/**
 * Normalize a Ralph in-process event to the standard internal schema.
 */
function normalizeIntegratedEvent(eventType, data) {
  const timestamp = new Date().toISOString();
  const base = { timestamp, layer: data.layerId || null, epic: null, verdict: null, message: '', meta: {} };

  switch (eventType) {
    case 'layerStart':
      return { ...base, type: 'layer_start', message: `Layer ${data.layerId} started` };
    case 'layerComplete':
      return { ...base, type: 'layer_end', message: `Layer ${data.layerId} completed` };
    case 'agentSpawn':
      return { ...base, type: 'agent_spawn', message: `Agent spawned for ${data.layerId}` };
    case 'validationResult':
      return { ...base, type: 'verdict', verdict: data.verdict, meta: { issues: data.issues || [], severity: data.severity || null } };
    case 'routingDecision':
      return { ...base, type: 'routing', meta: { cascadeTarget: data.target || null } };
    case 'humanGateRequired':
      return { ...base, type: 'gate_waiting', message: `Gate approval required for ${data.layerId}` };
    case 'gateTimeout':
      return { ...base, type: 'gate_timeout', message: `Gate timed out for ${data.layerId}` };
    case 'gateRejection':
      return { ...base, type: 'gate_denial', message: `Gate denied for ${data.layerId}` };
    case 'costUpdate':
      return { ...base, type: 'cost_update', meta: { inputTokens: data.inputTokens || 0, outputTokens: data.outputTokens || 0 } };
    case 'error':
      return { ...base, type: 'error', message: data.message || 'Unknown error' };
    default:
      return { ...base, type: eventType, message: String(data) };
  }
}

// ─── Watch Mode Data Source ──────────────────────────────────────────

function createWatchSource(projectDir) {
  const source = new EventEmitter();
  const eventsPath = path.join(projectDir, '_events.jsonl');
  const statusPath = path.join(projectDir, '_status.md');

  let byteOffset = 0;
  let lineBuffer = '';
  let fileWatcher = null;
  let dirWatcher = null;
  let statusInterval = null;
  let lastStatusJson = '';
  let destroyed = false;

  function processNewData(data) {
    if (destroyed) return;
    const combined = lineBuffer + data;
    const parts = combined.split('\n');
    lineBuffer = combined.endsWith('\n') ? '' : parts.pop();
    for (const line of parts) {
      if (!line.trim()) continue;
      try {
        const raw = JSON.parse(line);
        source.emit('event', normalizeEvent(raw));
      } catch { /* skip malformed */ }
    }
  }

  function startTailing() {
    if (destroyed) return;
    fileWatcher = fs.watch(eventsPath, (eventType) => {
      if (destroyed) return;
      if (eventType !== 'change') return;
      try {
        const stat = fs.statSync(eventsPath);
        if (stat.size < byteOffset) {
          // File was replaced — reset and replay
          byteOffset = 0;
          lineBuffer = '';
          const fd = fs.openSync(eventsPath, 'r');
          const buf = Buffer.alloc(stat.size);
          fs.readSync(fd, buf, 0, stat.size, 0);
          fs.closeSync(fd);
          byteOffset = stat.size;
          processNewData(buf.toString('utf8'));
          return;
        }
        if (stat.size <= byteOffset) return;
        const fd = fs.openSync(eventsPath, 'r');
        const bufSize = stat.size - byteOffset;
        const buf = Buffer.alloc(bufSize);
        fs.readSync(fd, buf, 0, bufSize, byteOffset);
        fs.closeSync(fd);
        byteOffset = stat.size;
        processNewData(buf.toString('utf8'));
      } catch { /* skip read errors */ }
    });
  }

  function replayAndTail() {
    if (destroyed) return;
    try {
      const content = fs.readFileSync(eventsPath, 'utf8');
      byteOffset = Buffer.byteLength(content, 'utf8');
      const lines = content.split('\n').filter(line => line.trim());
      for (const line of lines) {
        try {
          const raw = JSON.parse(line);
          source.emit('event', normalizeEvent(raw));
        } catch { /* skip malformed */ }
      }
    } catch (err) {
      if (err.code !== 'ENOENT') throw err;
      byteOffset = 0;
    }
    startTailing();
  }

  // Defer initial replay to next tick so callers can attach listeners first
  process.nextTick(() => {
    if (destroyed) return;
    try {
      const content = fs.readFileSync(eventsPath, 'utf8');
      byteOffset = Buffer.byteLength(content, 'utf8');
      const lines = content.split('\n').filter(line => line.trim());
      for (const line of lines) {
        try {
          const raw = JSON.parse(line);
          source.emit('event', normalizeEvent(raw));
        } catch { /* skip malformed JSONL line */ }
      }
      startTailing();
    } catch (err) {
      if (err.code === 'ENOENT') {
        byteOffset = 0;
        // Watch directory for file creation
        dirWatcher = fs.watch(projectDir, (eventType, filename) => {
          if (destroyed) return;
          if (filename === '_events.jsonl') {
            if (dirWatcher) { dirWatcher.close(); dirWatcher = null; }
            replayAndTail();
          }
        });
      }
      // Other errors: silently skip (filesystem issues shouldn't crash TUI)
    }
  });

  // Status file polling
  function pollStatus() {
    if (destroyed) return;
    try {
      const content = fs.readFileSync(statusPath, 'utf8');
      const layer = (content.match(/- \*\*Layer:\*\* (.+)/) || [])[1] || null;
      const phase = (content.match(/- \*\*Phase:\*\* (.+)/) || [])[1] || null;
      const epic = (content.match(/- \*\*Epic:\*\* (.+)/) || [])[1] || null;
      const feature = (content.match(/- \*\*Feature:\*\* (.+)/) || [])[1] || null;
      const task = (content.match(/- \*\*Task:\*\* (.+)/) || [])[1] || null;
      const iteration = (content.match(/- \*\*Iteration:\*\* (\d+)/) || [])[1] || null;
      const parsed = {
        layer: layer && layer !== 'None' ? layer : null,
        phase: phase && phase !== 'None' ? phase : null,
        epic: epic && epic !== 'None' ? epic : null,
        feature: feature && feature !== 'None' ? feature : null,
        task: task && task !== 'None' ? task : null,
        iteration: iteration ? Number(iteration) : null
      };
      const json = JSON.stringify(parsed);
      if (json !== lastStatusJson) {
        lastStatusJson = json;
        source.emit('status', parsed);
      }
    } catch (err) {
      if (err.code !== 'ENOENT') { /* unexpected error — skip silently */ }
    }
  }

  statusInterval = setInterval(pollStatus, 1000);
  // Initial poll deferred so callers can attach status listener
  process.nextTick(pollStatus);

  // Destroy
  source.destroy = function() {
    if (destroyed) return;
    destroyed = true;
    if (fileWatcher) { fileWatcher.close(); fileWatcher = null; }
    if (dirWatcher) { dirWatcher.close(); dirWatcher = null; }
    if (statusInterval) { clearInterval(statusInterval); statusInterval = null; }
    source.removeAllListeners();
  };

  return source;
}

// ─── Integrated Mode Data Source ─────────────────────────────────────

function createIntegratedSource(ralphInstance) {
  if (!ralphInstance || typeof ralphInstance.on !== 'function') {
    throw new Error('Invalid Ralph instance: expected event emitter interface');
  }

  const source = new EventEmitter();
  const handlers = [];
  const pendingGates = new Map();
  let destroyed = false;

  // Attach handlers to all Ralph event types
  const eventTypes = [
    'layerStart', 'layerComplete', 'agentSpawn', 'validationResult',
    'routingDecision', 'humanGateRequired', 'gateTimeout', 'gateRejection',
    'costUpdate', 'error'
  ];

  for (const eventType of eventTypes) {
    const handler = (data) => {
      if (destroyed) return;

      // Capture gate callbacks for humanGateRequired
      if (eventType === 'humanGateRequired' && data.resolve && data.reject) {
        pendingGates.set(data.layerId, { resolve: data.resolve, reject: data.reject });
      }

      const normalized = normalizeIntegratedEvent(eventType, data);
      source.emit('event', normalized);
    };
    ralphInstance.on(eventType, handler);
    handlers.push({ eventType, handler });
  }

  // Gate approval/denial
  source.approveGate = function(layerId) {
    const gate = pendingGates.get(layerId);
    if (!gate) return;
    gate.resolve();
    pendingGates.delete(layerId);
    source.emit('event', {
      timestamp: new Date().toISOString(),
      type: 'gate_approval', layer: layerId, epic: null,
      verdict: null, message: `Gate approved for ${layerId}`, meta: {}
    });
  };

  source.denyGate = function(layerId, feedback) {
    const gate = pendingGates.get(layerId);
    if (!gate) return;
    gate.reject(feedback || 'Denied by user');
    pendingGates.delete(layerId);
    source.emit('event', {
      timestamp: new Date().toISOString(),
      type: 'gate_denial', layer: layerId, epic: null,
      verdict: null, message: `Gate denied for ${layerId}`, meta: { feedback }
    });
  };

  // Pause/Resume
  source.pause = function() {
    if (typeof ralphInstance.pause === 'function') {
      ralphInstance.pause();
    }
    source.emit('event', {
      timestamp: new Date().toISOString(),
      type: 'pipeline_paused', layer: null, epic: null,
      verdict: null, message: 'Pipeline paused', meta: {}
    });
  };

  source.resume = function() {
    if (typeof ralphInstance.resume === 'function') {
      ralphInstance.resume();
    }
    source.emit('event', {
      timestamp: new Date().toISOString(),
      type: 'pipeline_resumed', layer: null, epic: null,
      verdict: null, message: 'Pipeline resumed', meta: {}
    });
  };

  // Destroy
  source.destroy = function() {
    if (destroyed) return;
    destroyed = true;
    for (const { eventType, handler } of handlers) {
      if (typeof ralphInstance.removeListener === 'function') {
        ralphInstance.removeListener(eventType, handler);
      }
    }
    pendingGates.clear();
    source.removeAllListeners();
  };

  return source;
}

module.exports = { createWatchSource, createIntegratedSource };
