/**
 * Event Formatting Pipeline
 *
 * Transforms raw pipeline events into display-ready strings with actor
 * attribution and color information. Provides utility formatters for
 * timestamps and token counts.
 *
 * Actor resolution priority:
 * 1. Event type override (gate → Human, routing → Ralph, verdict → Judge)
 * 2. Layer lookup (LAYERS[layerId].agent → actor name)
 * 3. Fallback to 'Ralph' for pipeline-level events
 */

const { LAYERS } = require('../state-machine.js');

// ─── Actor Lookup Tables ──────────────────────────────────────────

const AGENT_TO_ACTOR = { planner: 'Planner', builder: 'Builder', judge: 'Judge' };

const ACTOR_FOR_LAYER = {};
for (const [id, def] of Object.entries(LAYERS)) {
  ACTOR_FOR_LAYER[id] = AGENT_TO_ACTOR[def.agent] || 'Ralph';
}

const ACTOR_FOR_EVENT_TYPE = {
  gate_waiting: 'Human', gate_approval: 'Human',
  gate_denial: 'Human', gate_timeout: 'Human',
  routing: 'Ralph', stall_detected: 'Ralph',
  cascade_depth_exceeded: 'Ralph',
  verdict: 'Judge'
};

const ACTOR_COLORS = {
  Ralph: 'ralph', Planner: 'planner',
  Builder: 'builder', Judge: 'judge', Human: 'human'
};

// ─── Actor Resolution ─────────────────────────────────────────────

function resolveActor(event) {
  if (ACTOR_FOR_EVENT_TYPE[event.type]) return ACTOR_FOR_EVENT_TYPE[event.type];
  if (event.layer && ACTOR_FOR_LAYER[event.layer]) return ACTOR_FOR_LAYER[event.layer];
  return 'Ralph';
}

// ─── Utility Formatters ───────────────────────────────────────────

function formatTimestamp(isoString) {
  try {
    if (!isoString) return '--:--:--';
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return '--:--:--';
    const h = String(date.getHours()).padStart(2, '0');
    const m = String(date.getMinutes()).padStart(2, '0');
    const s = String(date.getSeconds()).padStart(2, '0');
    return `${h}:${m}:${s}`;
  } catch {
    return '--:--:--';
  }
}

function formatTokens(count) {
  if (typeof count !== 'number' || isNaN(count)) return '0';
  if (count < 1000) return String(Math.round(count));
  if (count < 1000000) return (count / 1000).toFixed(1) + 'k';
  return (count / 1000000).toFixed(1) + 'm';
}

function formatDuration(ms) {
  if (typeof ms !== 'number' || isNaN(ms)) return '?';
  if (ms < 60000) return `${Math.round(ms / 1000)}s`;
  return `${Math.floor(ms / 60000)}m ${Math.round((ms % 60000) / 1000)}s`;
}

// ─── Event Formatting ─────────────────────────────────────────────

function formatEvent(event) {
  const actor = resolveActor(event);
  const color = ACTOR_COLORS[actor] || 'ralph';
  const layerName = event.layer ? (LAYERS[event.layer]?.name || event.layer) : '';
  let text;

  switch (event.type) {
    case 'layer_start':
      text = `${layerName} started`;
      break;

    case 'layer_end':
      text = event.meta?.duration
        ? `${layerName} completed (${formatDuration(event.meta.duration)})`
        : `${layerName} completed`;
      break;

    case 'verdict': {
      const issueCount = event.meta?.issues?.length || 0;
      const breakdown = issueCount > 0
        ? event.meta.issues.reduce((acc, i) => { acc[i.severity] = (acc[i.severity] || 0) + 1; return acc; }, {})
        : {};
      const breakdownStr = Object.entries(breakdown).map(([s, c]) => `${c} ${s.toLowerCase()}`).join(', ');
      text = `${layerName}: ${event.verdict}${issueCount > 0 ? ` (${issueCount} issues: ${breakdownStr})` : ''}`;
      break;
    }

    case 'cost_update':
      text = `Cost: +${formatTokens(event.meta?.inputTokens || 0)} in / +${formatTokens(event.meta?.outputTokens || 0)} out`;
      break;

    case 'gate_waiting':
      text = `Gate approval required for ${layerName}`;
      break;

    case 'gate_approval':
      text = `Gate approved for ${layerName}`;
      break;

    case 'gate_denial':
      text = `Gate denied for ${layerName}`;
      break;

    case 'gate_timeout':
      text = `Gate timed out for ${layerName}`;
      break;

    case 'error':
      text = `Error: ${event.message || 'Unknown error'}`;
      break;

    case 'stall_detected':
      text = `Stall detected in ${layerName}`;
      break;

    case 'routing':
      text = `Routing: ${event.layer} \u2192 ${event.meta?.cascadeTarget || '?'}`;
      break;

    case 'agent_spawn':
      text = `${actor} spawned for ${layerName}`;
      break;

    case 'agent_complete':
      text = `${actor} completed ${layerName}`;
      break;

    case 'agent_retry':
      text = `${actor} retrying ${layerName}`;
      break;

    case 'cascade_depth_exceeded':
      text = `Cascade depth exceeded at ${layerName}`;
      break;

    case 'partial_completion':
      text = `Partial completion: ${event.message || ''}`;
      break;

    case 'pipeline_paused':
      text = 'Pipeline paused';
      break;

    case 'pipeline_resumed':
      text = 'Pipeline resumed';
      break;

    default:
      text = event.message || event.type;
      break;
  }

  return { text, actor, color };
}

module.exports = {
  formatEvent, resolveActor, formatTimestamp, formatTokens, formatDuration,
  ACTOR_FOR_LAYER, ACTOR_FOR_EVENT_TYPE, ACTOR_COLORS
};
