'use strict';

// ─── E3-F2-T1-S1: Require all component modules ─────────────────────

const terminal     = require('./terminal');
const { createState } = require('./state');
const inputHandler = require('./input');
const { render }   = require('./renderer');
const format       = require('./format');

// ─── E3-F3-T4-S2: Suppressed action messages ────────────────────────

const SUPPRESSED_MESSAGES = {
  'approve-gate': 'Gate approval available in integrated mode only',
  'deny-gate':    'Gate approval available in integrated mode only',
  'pause':        'Pause/resume available in integrated mode only',
  'resume':       'Pause/resume available in integrated mode only',
};

// ─── Module-level state ──────────────────────────────────────────────

let components = null;
let controllerState = null;
let stopped = false;
let frameCount = 0;
let renderInterval = null;
let renderScheduled = false;

// ─── E3-F2-T2-S2: doRender() — compose state snapshot and write ─────

function doRender() {
  if (stopped) return;
  const terminalSize = terminal.getSize();
  // Assemble snapshot from individual state getters (E1-F4-T4)
  const gateInfo = components.state.isGateWaiting();
  const snapshot = {
    layerStates: components.state.getLayerStates(),
    actorStates: components.state.getActorStates(),
    position:    components.state.getPosition(),
    eventLog:    components.state.getEventLog(controllerState.scrollOffset, terminalSize.rows - 10),
    costData:    components.state.getCostData(),
    gateWaiting: gateInfo.waiting,
    gateLayerId: gateInfo.layerId,
    mode:        components.state.getMode(),
    eventCount:  components.state.getEventCount(),
    // Additional fields the renderer expects from E2:
    layers:      components.state.getLayerStates(),
    events:      components.state.getEventLog(0, 1000),
    activeActor: components.state.getActiveActor() ? components.state.getActiveActor().name.toLowerCase() : null,
    projectDir:  controllerState.projectDir,
  };
  // controllerState fields read by renderer:
  //   mode, paused, currentOverlay, scrollOffset,
  //   transientMessage, inputMode, denyReasonBuffer, inputPrompt
  const output = render(snapshot, terminalSize, frameCount, controllerState);
  terminal.write(output);
}

// ─── E3-F2-T3-S2: scheduleRender with setImmediate coalescing ───────

function scheduleRender() {
  if (renderScheduled) return;
  renderScheduled = true;
  setImmediate(() => {
    renderScheduled = false;
    doRender();
  });
}

// ─── E3-F5-T1: Scroll helper ────────────────────────────────────────

function calculateFeedRows() {
  const { rows } = terminal.getSize();
  const chromeRows = 6;
  return Math.max(0, rows - chromeRows);
}

// Scroll state contract:
// - scrollOffset === 0: auto-scroll active, feed shows newest events
// - scrollOffset > 0: manual scroll, feed pinned to older window
// - Re-engagement: user presses 'j' (scroll-down) until scrollOffset reaches 0
// - New events while scrollOffset > 0 do NOT reset scrollOffset
// - Ring buffer eviction may reduce maxOffset (see clamp logic below)

function handleScrollUp() {
  const totalEvents = components.state.getEventCount();
  const visibleRows = calculateFeedRows();
  const maxOffset   = Math.max(0, totalEvents - visibleRows);
  controllerState.scrollOffset = Math.min(
    controllerState.scrollOffset + 1,
    maxOffset
  );
  scheduleRender();
}

function handleScrollDown() {
  controllerState.scrollOffset = Math.max(0, controllerState.scrollOffset - 1);
  scheduleRender();
}

function handleScroll(direction) {
  if (direction < 0) handleScrollUp();
  else               handleScrollDown();
}

// ─── E3-F3-T4-S1: Transient messages ────────────────────────────────

function showTransientMessage(message, durationMs) {
  if (durationMs === undefined) durationMs = 3000;

  clearTimeout(controllerState.transientTimer);
  controllerState.transientMessage = message;
  controllerState.transientTimer = setTimeout(() => {
    controllerState.transientMessage = null;
    controllerState.transientTimer = null;
    scheduleRender();
  }, durationMs);

  scheduleRender();
}

// ─── E3-F4-T1: Overlay toggle ───────────────────────────────────────

function handleOverlayToggle(type) {
  const isOpening = controllerState.currentOverlay !== type;

  // Size guard applies to open-only; closing must always succeed
  // so user can dismiss an overlay even after resizing the terminal smaller.
  if (isOpening) {
    const { cols, rows } = terminal.getSize();
    if (cols < 80 || rows < 24) {
      showTransientMessage('Terminal too small for overlays (need 80x24)');
      return;
    }
  }

  controllerState.currentOverlay = isOpening ? type : null;
  scheduleRender();
}

// ─── E3-F4-T2: Escape dismissal ─────────────────────────────────────

// Priority order: text input cancel > overlay dismiss > no-op
// Rationale: user pressing Escape while typing a denial reason should
// cancel the text input, not also close any open overlay.
function handleDismiss() {
  if (controllerState.inputMode === 'text') {
    cancelDenyGate();
    return;
  }
  if (controllerState.currentOverlay !== null) {
    controllerState.currentOverlay = null;
    scheduleRender();
  }
}

// ─── E3-F3-T1: Gate approval ────────────────────────────────────────

function handleApproveGate() {
  if (controllerState.mode === 'watch') {
    showTransientMessage('Gate approval available in integrated mode only');
    return;
  }
  const gateInfo = components.state.isGateWaiting();
  if (!gateInfo.waiting) return;
  const layerId = gateInfo.layerId;
  components.dataSource.approveGate(layerId);

  const syntheticEvent = {
    type:      'gate_approval',
    layerId,
    timestamp: Date.now(),
    display:   `Gate approved for layer ${layerId}`,
  };
  components.state.addFormattedEvent(syntheticEvent);
  scheduleRender();
}

// ─── E3-F3-T2: Gate denial ──────────────────────────────────────────

function handleDenyGate() {
  if (controllerState.mode === 'watch') {
    showTransientMessage('Gate approval available in integrated mode only');
    return;
  }
  const gateInfo = components.state.isGateWaiting();
  if (!gateInfo.waiting) return;

  controllerState.inputMode    = 'text';
  controllerState.inputPrompt  = 'Deny reason: ';
  controllerState.denyReasonBuffer = '';
  scheduleRender();
}

function handleTextInput(ch) {
  if (ch === '\r' || ch === '\n') {
    submitDenyGate();
  } else if (ch === '\x1b') {
    cancelDenyGate();
  } else if (ch === '\x7f' || ch === '\b') {
    controllerState.denyReasonBuffer =
      controllerState.denyReasonBuffer.slice(0, -1);
    scheduleRender();
  } else if (ch >= ' ') {
    controllerState.denyReasonBuffer += ch;
    scheduleRender();
  }
}

function submitDenyGate() {
  const gateInfo = components.state.isGateWaiting();
  const layerId  = gateInfo.layerId;
  const reason   = controllerState.denyReasonBuffer;
  components.dataSource.denyGate(layerId, reason);
  controllerState.inputMode = 'normal';
  scheduleRender();
}

function cancelDenyGate() {
  controllerState.inputMode = 'normal';
  controllerState.denyReasonBuffer = '';
  scheduleRender();
}

// ─── E3-F3-T3: Pause/Resume ─────────────────────────────────────────

function handlePause() {
  if (controllerState.mode === 'watch') {
    showTransientMessage('Pause/resume available in integrated mode only');
    return;
  }
  if (controllerState.paused) return;

  components.dataSource.pause();
  controllerState.paused = true;

  components.state.addFormattedEvent({
    type:      'paused',
    timestamp: Date.now(),
    display:   'Pipeline paused',
  });
  scheduleRender();
}

function handleResume() {
  if (controllerState.mode === 'watch') {
    showTransientMessage('Pause/resume available in integrated mode only');
    return;
  }
  if (!controllerState.paused) return;

  components.dataSource.resume();
  controllerState.paused = false;

  components.state.addFormattedEvent({
    type:      'resumed',
    timestamp: Date.now(),
    display:   'Pipeline resumed',
  });
  scheduleRender();
}

// ─── E3-F3-T4-S2: Suppressed key feedback ───────────────────────────

function handleSuppressed(action) {
  const message = SUPPRESSED_MESSAGES[action];
  if (message) showTransientMessage(message);
}

// ─── E3-F2-T4: Keyboard action dispatch ─────────────────────────────

function handleAction(action) {
  switch (action) {
    case 'quit':                  stop(); break;
    case 'toggle-layer-overlay':  handleOverlayToggle('layer-detail'); break;
    case 'toggle-cost-overlay':   handleOverlayToggle('cost'); break;
    case 'toggle-help-overlay':   handleOverlayToggle('help'); break;
    case 'dismiss-overlay':       handleDismiss(); break;
    case 'scroll-up':             handleScroll(-1); break;
    case 'scroll-down':           handleScroll(1); break;
    case 'approve-gate':          handleApproveGate(); break;
    case 'deny-gate':             handleDenyGate(); break;
    case 'pause':                 handlePause(); break;
    case 'resume':                handleResume(); break;
    default: break;
  }
}

// ─── E3-F2-T1: Component initialization sequence ────────────────────

function start(mode, options) {
  stopped = false;
  frameCount = 0;

  try {
    terminal.init();
    const stateStore = createState(mode, options.projectDir);
    inputHandler.init(process.stdin, mode);

    components = {
      terminal,
      dataSource: options.dataSource,
      state: stateStore,
      inputHandler,
    };
  } catch (err) {
    stop();
    throw err;
  }

  // E3-F2-T1-S2: Initialize controllerState
  controllerState = {
    mode,
    paused:           false,
    currentOverlay:   null,
    scrollOffset:     0,
    transientMessage: null,
    transientTimer:   null,
    inputMode:        'normal',
    denyReasonBuffer: '',
    inputPrompt:      '',
    projectDir:       options.projectDir,
    autoApprove:      options.autoApprove || false,
    dryRun:           options.dryRun || false,
  };

  // E3-F2-T2-S1: 250ms render interval
  renderInterval = setInterval(() => {
    frameCount++;
    doRender();
  }, 250);

  // E3-F2-T3-S1: Route dataSource 'event' emissions
  const dataSource = options.dataSource;

  dataSource.on('event', (rawEvent) => {
    const formattedEvent = format.formatEvent(rawEvent);
    const countBefore    = components.state.getEventCount();
    components.state.addFormattedEvent(formattedEvent);
    const countAfter     = components.state.getEventCount();

    // E3-F5-T2-S2: If ring buffer evicted an old event, clamp scrollOffset
    if (countAfter <= countBefore) {
      const visibleRows = calculateFeedRows();
      const maxOffset   = Math.max(0, countAfter - visibleRows);
      controllerState.scrollOffset = Math.min(
        controllerState.scrollOffset,
        maxOffset
      );
    }

    // E4-F2-T5: Auto-approve gates when autoApprove is set
    if (rawEvent.type === 'gate_waiting' && controllerState.autoApprove && rawEvent.layer) {
      setImmediate(() => {
        if (stopped) return;
        components.dataSource.approveGate(rawEvent.layer);
        const layerName = rawEvent.layer;
        components.state.addFormattedEvent({
          type:      'gate_approval',
          timestamp: Date.now(),
          display:   `Gate auto-approved: ${layerName}`,
        });
        scheduleRender();
      });
    }

    scheduleRender();
  });

  // E3-F2-T3-S2: Route dataSource 'status' emissions
  dataSource.on('status', (statusData) => {
    components.state.processStatus(statusData);
    scheduleRender();
  });

  // E3-F2-T4-S1: Register keyboard callbacks
  inputHandler.onKey(handleAction);
  inputHandler.onSuppressed(handleSuppressed);
}

// ─── E3-F2-T5: Graceful shutdown ────────────────────────────────────

function stop() {
  if (stopped) return;
  stopped = true;

  clearInterval(renderInterval);
  renderInterval = null;

  if (controllerState && controllerState.transientTimer) {
    clearTimeout(controllerState.transientTimer);
    controllerState.transientTimer = null;
  }

  if (components) {
    components.inputHandler.destroy();
    if (components.dataSource && typeof components.dataSource.destroy === 'function') {
      components.dataSource.destroy();
    }
    components.terminal.cleanup();
    components = null;
  }
}

module.exports = { start, stop };
