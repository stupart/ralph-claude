/**
 * State Accumulation Engine
 *
 * Maintains the single source of truth for the TUI pipeline state.
 * Accumulates state from events via processEvent(), updates position from
 * status file via processStatus(), and exposes getter methods for renderer
 * consumption.
 *
 * Uses a ring buffer (capped at 1000 entries) for the event log.
 * All state reads are through getter methods — no direct field access.
 */

const { LAYERS } = require('../state-machine.js');

const MAX_EVENTS = 1000;
const AGENT_MAP = { planner: 'Planner', builder: 'Builder', judge: 'Judge' };

function createState(mode, projectDir) {
  // ─── Layer State ────────────────────────────────────────────────
  const layers = new Map();
  for (const [id, def] of Object.entries(LAYERS)) {
    layers.set(id, {
      id, name: def.name, phase: def.phase, agent: def.agent,
      state: 'pending', startedAt: null, completedAt: null,
      durationMs: null, subProgress: null, iteration: 0,
      verdict: null, issues: []
    });
  }

  // ─── Actor State ────────────────────────────────────────────────
  const actors = new Map([
    ['Ralph', { name: 'Ralph', state: 'idle', color: 'ralph', currentTask: null }],
    ['Planner', { name: 'Planner', state: 'idle', color: 'planner', currentTask: null }],
    ['Builder', { name: 'Builder', state: 'idle', color: 'builder', currentTask: null }],
    ['Judge', { name: 'Judge', state: 'idle', color: 'judge', currentTask: null }],
    ['Human', { name: 'Human', state: 'idle', color: 'human', currentTask: null }]
  ]);

  // ─── Position ───────────────────────────────────────────────────
  const position = {
    layer: null, layerName: null, phase: null, actor: null,
    epic: null, feature: null, task: null, iteration: 0
  };

  // ─── Cost Tracking ──────────────────────────────────────────────
  const costs = {
    perLayer: new Map(),
    perAgent: new Map(),
    totals: { input: 0, output: 0, calls: 0 }
  };

  // ─── Gates ──────────────────────────────────────────────────────
  const gates = new Map([
    ['L3', { status: 'pending', waitingSince: null }],
    ['L7', { status: 'pending', waitingSince: null }]
  ]);

  // ─── Cascades ───────────────────────────────────────────────────
  const cascades = [];

  // ─── Meta ───────────────────────────────────────────────────────
  const meta = { mode, projectDir, startedAt: new Date(), isComplete: false };

  // ─── Ring Buffer ────────────────────────────────────────────────
  const events = [];
  let eventCount = 0;

  // ─── State Object ───────────────────────────────────────────────
  const state = { layers, position, actors, costs, gates, cascades, meta };

  // ─── Actor Derivation Helper ────────────────────────────────────
  function updateActiveActor(actorName, taskDescription) {
    for (const actor of actors.values()) {
      actor.state = 'idle';
      actor.currentTask = null;
    }
    const actor = actors.get(actorName);
    if (actor) {
      actor.state = 'active';
      actor.currentTask = taskDescription || null;
    }
  }

  // ─── Ring Buffer Methods ────────────────────────────────────────

  state.addFormattedEvent = function(formatted) {
    if (events.length < MAX_EVENTS) {
      events.push(formatted);
    } else {
      events[eventCount % MAX_EVENTS] = formatted;
    }
    eventCount++;
  };

  state.getEventLog = function(offset, limit) {
    const total = Math.min(eventCount, MAX_EVENTS);
    const start = Math.max(0, Math.min(offset || 0, total));
    const end = Math.min(start + (limit || total), total);
    if (eventCount <= MAX_EVENTS) {
      return events.slice(start, end);
    }
    // Circular buffer: oldest is at eventCount % MAX_EVENTS
    const result = [];
    const oldest = eventCount % MAX_EVENTS;
    for (let i = start; i < end; i++) {
      result.push(events[(oldest + i) % MAX_EVENTS]);
    }
    return result;
  };

  state.getEventCount = function() {
    return Math.min(eventCount, MAX_EVENTS);
  };

  // ─── processEvent ──────────────────────────────────────────────

  state.processEvent = function(event) {
    const layer = event.layer ? layers.get(event.layer) : null;

    switch (event.type) {
      case 'layer_start':
        if (layer) {
          if (layer.state === 'active') layer.iteration++;
          layer.state = 'active';
          layer.startedAt = new Date(event.timestamp);
          layer.completedAt = null;
          layer.durationMs = null;
          position.layer = event.layer;
          position.layerName = layer.name;
          position.phase = layer.phase;
          position.actor = layer.agent;
          updateActiveActor(AGENT_MAP[layer.agent] || 'Ralph', layer.name);
        }
        break;

      case 'layer_end':
        if (layer) {
          layer.state = 'done';
          layer.completedAt = new Date(event.timestamp);
          if (layer.startedAt) {
            layer.durationMs = layer.completedAt - layer.startedAt;
          }
        }
        break;

      case 'verdict':
        if (layer) {
          layer.verdict = event.verdict;
          if (event.verdict === 'ITERATE') layer.state = 'iterating';
          if (event.meta && event.meta.issues) layer.issues = event.meta.issues;
        }
        break;

      case 'cost_update': {
        const inp = (event.meta && event.meta.inputTokens) || 0;
        const out = (event.meta && event.meta.outputTokens) || 0;
        costs.totals.input += inp;
        costs.totals.output += out;
        costs.totals.calls++;
        if (event.layer) {
          const lc = costs.perLayer.get(event.layer) || { input: 0, output: 0, calls: 0 };
          lc.input += inp; lc.output += out; lc.calls++;
          costs.perLayer.set(event.layer, lc);
          // Per-agent cost accumulation
          const layerDef = LAYERS[event.layer];
          if (layerDef) {
            const actorName = AGENT_MAP[layerDef.agent] || 'Ralph';
            const ac = costs.perAgent.get(actorName) || { input: 0, output: 0, calls: 0 };
            ac.input += inp; ac.output += out; ac.calls++;
            costs.perAgent.set(actorName, ac);
          }
        }
        break;
      }

      case 'gate_waiting':
        if (layer) layer.state = 'gate_waiting';
        if (gates.has(event.layer)) {
          gates.get(event.layer).status = 'waiting';
          gates.get(event.layer).waitingSince = new Date(event.timestamp);
        }
        updateActiveActor('Human', `Gate approval for ${event.layer}`);
        break;

      case 'gate_approval':
        if (layer && layer.state === 'gate_waiting') layer.state = 'active';
        if (gates.has(event.layer)) gates.get(event.layer).status = 'approved';
        break;

      case 'gate_denial':
        if (gates.has(event.layer)) gates.get(event.layer).status = 'denied';
        break;

      case 'gate_timeout':
        if (gates.has(event.layer)) gates.get(event.layer).status = 'timeout';
        break;

      case 'error':
        if (layer) layer.state = 'error';
        break;

      case 'routing':
        if (event.meta && event.meta.cascadeTarget) {
          cascades.push({
            from: event.layer, to: event.meta.cascadeTarget,
            severity: (event.meta && event.meta.severity) || 'MINOR',
            timestamp: new Date(event.timestamp)
          });
        }
        break;

      default:
        // Unknown event types: no state mutation
        break;
    }

    // Add to event log ring buffer (store the raw event for later formatting)
    state.addFormattedEvent(event);
  };

  // ─── processStatus ─────────────────────────────────────────────

  state.processStatus = function(parsedStatus) {
    if (parsedStatus.layer !== undefined && parsedStatus.layer !== null) {
      position.layer = parsedStatus.layer;
      const layerDef = LAYERS[parsedStatus.layer];
      if (layerDef) {
        position.layerName = layerDef.name;
        position.phase = layerDef.phase;
        position.actor = layerDef.agent;
      }
    }
    if (parsedStatus.epic !== undefined && parsedStatus.epic !== null) position.epic = parsedStatus.epic;
    if (parsedStatus.feature !== undefined && parsedStatus.feature !== null) position.feature = parsedStatus.feature;
    if (parsedStatus.task !== undefined && parsedStatus.task !== null) position.task = parsedStatus.task;
    if (parsedStatus.iteration !== undefined && parsedStatus.iteration !== null) position.iteration = parsedStatus.iteration;

    // Update active layer's subProgress
    if (position.layer) {
      const layer = layers.get(position.layer);
      if (layer && parsedStatus.epic) {
        layer.subProgress = `Epic ${parsedStatus.epic}`;
        if (parsedStatus.feature) layer.subProgress = `Feature ${parsedStatus.feature}`;
      }
    }
  };

  // ─── Getter Methods ─────────────────────────────────────────────

  state.getLayerStates = function() {
    const result = [];
    for (const [id, layer] of layers) {
      const entry = { ...layer };
      if (layer.state === 'active' && layer.startedAt) {
        entry.elapsed = Date.now() - layer.startedAt.getTime();
      }
      result.push(entry);
    }
    return result;
  };

  state.getPosition = function() { return { ...position }; };
  state.getMode = function() { return meta.mode; };

  state.isGateWaiting = function() {
    for (const [layerId, gate] of gates) {
      if (gate.status === 'waiting') return { waiting: true, layerId };
    }
    return { waiting: false };
  };

  state.getActiveActor = function() {
    if (!position.layer) return null;
    const layer = layers.get(position.layer);
    if (!layer || layer.state !== 'active') return null;
    const actorName = AGENT_MAP[layer.agent] || 'Ralph';
    const actor = actors.get(actorName);
    return actor ? { name: actor.name, color: actor.color, task: actor.currentTask } : null;
  };

  state.getActorStates = function() {
    return Array.from(actors.values());
  };

  state.getCostData = function() {
    return {
      perLayer: Object.fromEntries(costs.perLayer),
      perAgent: Object.fromEntries(costs.perAgent),
      totals: { ...costs.totals }
    };
  };

  state.getLayerDetail = function(layerId) {
    const layer = layers.get(layerId);
    if (!layer) return null;
    return {
      agent: layer.agent, duration: layer.durationMs, state: layer.state,
      verdict: layer.verdict, issues: layer.issues || [],
      cascadeTarget: cascades.find(c => c.from === layerId)?.to || null
    };
  };

  return state;
}

module.exports = { createState };
