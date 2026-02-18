'use strict';

// ─── E3-F1-T1-S1: KEY_MAP constant for all single-byte bindings ─────

const KEY_MAP = {
  'q':    'quit',
  '\x03': 'quit',       // Ctrl+C
  'p':    'pause',
  'r':    'resume',
  'a':    'approve-gate',
  'd':    'deny-gate',
  'j':    'scroll-down',
  'k':    'scroll-up',
  'l':    'toggle-layer-overlay',
  'c':    'toggle-cost-overlay',
  '?':    'toggle-help-overlay',
};

// ─── E3-F1-T3-S1: Watch mode suppression ─────────────────────────────

const WATCH_SUPPRESSED = new Set([
  'pause',
  'resume',
  'approve-gate',
  'deny-gate',
]);

// ─── Module-level state ──────────────────────────────────────────────

let keyCallback = null;
let suppressedCallback = null;
let rawCharCallback = null;
let stdinRef = null;
let currentMode = 'watch';
let destroyed = false;

// ─── E3-F1-T2-S1: Escape sequence state machine ─────────────────────

let escapeState = 'NORMAL';
let escapeTimeout = null;

// ─── E3-F1-T3-S1: Mode-aware dispatch ───────────────────────────────

function dispatchAction(action) {
  if (destroyed) return;
  if (currentMode === 'watch' && WATCH_SUPPRESSED.has(action)) {
    if (suppressedCallback) suppressedCallback(action);
    return;
  }
  if (keyCallback) keyCallback(action);
}

// ─── E3-F1-T1-S2 + T2-S1: handleData with escape state machine ─────

function handleData(buf) {
  const str = buf.toString('utf8');

  for (const ch of str) {
    if (escapeState === 'NORMAL') {
      if (ch === '\x1b') {
        escapeState = 'ESCAPE_RECEIVED';
        // E3-F1-T2-S2: Start 50ms escape timeout
        clearTimeout(escapeTimeout);
        escapeTimeout = setTimeout(() => {
          escapeState = 'NORMAL';
          escapeTimeout = null;
          dispatchAction('dismiss-overlay');
        }, 50);
      } else {
        const action = KEY_MAP[ch];
        if (action !== undefined) dispatchAction(action);
        // E3-F3-T2-S2: Forward ALL normal-state chars (mapped and unmapped)
        // to rawCharCallback. Controller uses this for text input mode:
        // when inputMode==='text', handleAction absorbs mapped-key actions
        // and rawCharCallback routes the raw char to handleTextInput.
        if (rawCharCallback) rawCharCallback(ch);
      }
    } else if (escapeState === 'ESCAPE_RECEIVED') {
      clearTimeout(escapeTimeout);
      escapeTimeout = null;
      if (ch === '[') {
        escapeState = 'ESCAPE_BRACKET';
      } else {
        escapeState = 'NORMAL';
      }
    } else if (escapeState === 'ESCAPE_BRACKET') {
      escapeState = 'NORMAL';
      if (ch === 'A') dispatchAction('scroll-up');
      else if (ch === 'B') dispatchAction('scroll-down');
      // Unrecognised final byte: return to NORMAL silently
    }
  }
}

// ─── E3-F1-T4-S1: init(stdin, mode) ─────────────────────────────────

function init(stdin, mode) {
  // Guard against double-init: detach old listener first
  if (stdinRef) {
    stdinRef.removeListener('data', handleData);
  }
  stdinRef = stdin;
  currentMode = mode || 'watch';
  destroyed = false;
  stdin.on('data', handleData);
}

// ─── E3-F1-T4-S1: onKey(callback) ───────────────────────────────────

function onKey(callback) {
  keyCallback = callback;
}

// ─── E3-F1-T3-S2: onSuppressed(callback) ────────────────────────────

function onSuppressed(callback) {
  suppressedCallback = callback;
}

// ─── E3-F3-T2-S2: Raw character callback for text input mode ─────

function onRawChar(callback) {
  rawCharCallback = callback;
}

// ─── E3-F1-T4-S2: destroy() ─────────────────────────────────────────

function destroy() {
  if (stdinRef) {
    stdinRef.removeListener('data', handleData);
    stdinRef = null;
  }
  clearTimeout(escapeTimeout);
  escapeTimeout = null;
  destroyed = true;
  keyCallback = null;
  suppressedCallback = null;
  rawCharCallback = null;
}

module.exports = { init, onKey, onSuppressed, onRawChar, destroy };
