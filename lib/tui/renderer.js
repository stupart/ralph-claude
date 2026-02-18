'use strict';

const { LAYERS } = require('../state-machine.js');
const { formatTokens } = require('./format.js');

// ─── Feature 01: Brand Palette and Display Constants ──────────────

// F1-T1: PALETTE constant with all 24-bit ANSI escape sequences
const PALETTE = {
  // Actors
  ralph:   '\x1b[38;2;255;107;53m',
  planner: '\x1b[38;2;16;185;129m',
  builder: '\x1b[38;2;59;130;246m',
  judge:   '\x1b[38;2;139;92;246m',
  human:   '\x1b[38;2;245;158;11m',

  // Semantic
  pass: '\x1b[38;2;34;197;94m',
  fail: '\x1b[38;2;239;68;68m',

  // Surface
  bg: '\x1b[48;2;26;26;26m',
  fg: '\x1b[38;2;250;250;250m',

  // Styles
  dim:   '\x1b[2m',
  bold:  '\x1b[1m',
  reset: '\x1b[0m',
};

// F1-T2: Canonical display name mapping with { full, short } structure
const LAYER_DISPLAY_NAMES = {
  L1:  { full: 'Input Gathering', short: 'Input' },
  L2:  { full: 'Decomposition', short: 'Decomp' },
  L3:  { full: 'Synthesis', short: 'Synth' },
  L4:  { full: 'Epic Definition', short: 'Epics' },
  L5:  { full: 'Feature Planning', short: 'Features' },
  L6:  { full: 'Task Specification', short: 'Tasks' },
  L7:  { full: 'Subtask Definition', short: 'Subtasks' },
  L8:  { full: 'Build', short: 'Build' },
  L9:  { full: 'Feature Review', short: 'FeatRev' },
  L10: { full: 'Epic Review', short: 'EpicRev' },
  L11: { full: 'Final Review', short: 'FinalRev' },
  L12: { full: 'Retrospective', short: 'Retro' },
};

// F1-T3: SPINNER_FRAMES and Unicode constants
const SPINNER_FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];

const BOX = {
  tl: '┌', tr: '┐',
  bl: '└', br: '┘',
  h:  '─',
  v:  '│',
  teeL: '├', teeR: '┤',
};

const INDICATORS = {
  done:         '✓',
  active:       null,  // replaced by spinner frame at render time
  pending:      '·',
  iterating:    '↻',
  gate_waiting: '⏳',
  error:        '✗',
};

const BADGE = '▐';

// ─── Shared Utilities ─────────────────────────────────────────────

function moveTo(row, col) {
  return `\x1b[${row};${col}H`;
}

// F3-T3-S2: Truncate visible (non-ANSI) text with ellipsis
function truncateVisible(text, maxWidth) {
  if (maxWidth <= 0) return '';
  if (text.length <= maxWidth) return text;
  if (maxWidth <= 3) return '...'.slice(0, maxWidth);
  return text.slice(0, maxWidth - 3) + '...';
}

// F4-T4: ANSI-aware text truncation
function truncateAnsi(text, maxWidth) {
  if (maxWidth <= 0) return '';
  const cutWidth = maxWidth - 1; // reserve 1 for ellipsis
  let result = '';
  let displayWidth = 0;
  let inEscape = false;
  let didTruncate = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    if (inEscape) {
      result += ch;
      if (ch.charCodeAt(0) >= 0x40 && ch.charCodeAt(0) <= 0x7e) {
        inEscape = false;
      }
      continue;
    }

    if (ch === '\x1b' && text[i + 1] === '[') {
      inEscape = true;
      result += ch;
      continue;
    }

    if (displayWidth < cutWidth) {
      result += ch;
      displayWidth++;
    } else if (displayWidth === cutWidth && !didTruncate) {
      didTruncate = true;
    }
  }

  if (didTruncate) {
    result += '\u2026' + PALETTE.reset;
  }

  return result;
}

// F2-T3-S2: Format elapsed time as HH:MM:SS or MM:SS
function formatElapsed(ms) {
  if (ms < 0) ms = 0;
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const mm = String(m).padStart(2, '0');
  const ss = String(s).padStart(2, '0');
  if (h > 0) return `${h}:${mm}:${ss}`;
  return `${mm}:${ss}`;
}

// ─── Feature 02: Pipeline Strip Renderer ──────────────────────────

// F2-T2: State-dependent coloring
const STATUS_STYLES = {
  done:         PALETTE.dim,
  active:       PALETTE.bold,
  pending:      '',
  iterating:    PALETTE.bold,
  gate_waiting: PALETTE.human,
  error:        PALETTE.fail,
};

function getActorColor(layerKey) {
  const layer = LAYERS[layerKey];
  if (!layer) return PALETTE.fg;
  return PALETTE[layer.agent] || PALETTE.fg;
}

// F6-T2: Gate-waiting pulse
function getPulseStyle(frameCount) {
  return frameCount % 2 === 0; // true = bright phase, false = dim phase
}

// F2-T2/T4: Get cell label with state, actor color, indicator, and width tier
function getCellContent(cell, frameCount, cellWidth) {
  const { key, layerState } = cell;
  const status = layerState.status || 'pending';
  const actorColor = getActorColor(key);

  // Style prefix: dynamic for gate_waiting, static for others
  let stylePrefix;
  if (status === 'gate_waiting') {
    const pulseBright = getPulseStyle(frameCount);
    stylePrefix = pulseBright
      ? PALETTE.human + PALETTE.bold
      : PALETTE.human + PALETTE.dim;
  } else {
    stylePrefix = STATUS_STYLES[status] || '';
  }

  // Indicator
  let indicator;
  if (status === 'active') {
    indicator = SPINNER_FRAMES[frameCount % SPINNER_FRAMES.length];
  } else {
    indicator = INDICATORS[status] || INDICATORS.pending;
  }

  // Width tier: full names >= 14, short names >= 8, indicator only >= 3
  let text;
  const displayName = LAYER_DISPLAY_NAMES[key];
  if (cellWidth >= 14) {
    text = indicator + ' ' + (displayName ? displayName.full : key);
  } else if (cellWidth >= 8) {
    text = indicator + ' ' + (displayName ? displayName.short : key);
  } else {
    text = indicator;
  }

  // Truncate to cellWidth visible chars, then pad
  const visible = text.slice(0, cellWidth).padEnd(cellWidth, ' ');
  return stylePrefix + actorColor + visible;
}

// F2-T1-S2: Render a single cell with ANSI cursor positioning
function renderCell(cell, row, frameCount, cellWidth) {
  let buf = moveTo(row, cell.col);
  const label = getCellContent(cell, frameCount, cellWidth);
  buf += label;
  buf += PALETTE.reset;
  return buf;
}

// F2-T4-S2: Compact single-line mode for narrow terminals
function renderSingleLineStrip(state, terminalSize, frameCount) {
  const layerKeys = Object.keys(LAYERS);
  let buf = moveTo(2, 1);

  for (const key of layerKeys) {
    const layerState = state.layers ? (state.layers.get ? state.layers.get(key) : state.layers[key]) : { status: 'pending' };
    const status = (layerState && layerState.status) || 'pending';

    let stylePrefix;
    if (status === 'gate_waiting') {
      const pulseBright = getPulseStyle(frameCount);
      stylePrefix = pulseBright
        ? PALETTE.human + PALETTE.bold
        : PALETTE.human + PALETTE.dim;
    } else {
      stylePrefix = STATUS_STYLES[status] || '';
    }

    const actorColor = getActorColor(key);
    const indicator = status === 'active'
      ? SPINNER_FRAMES[frameCount % SPINNER_FRAMES.length]
      : (INDICATORS[status] || INDICATORS.pending);

    buf += stylePrefix + actorColor + indicator + PALETTE.reset;
  }

  buf += '\x1b[K'; // erase to end of line
  return { buf, rowsUsed: 1 };
}

// F2-T1: Main pipeline strip renderer
function renderPipelineStrip(state, terminalSize, frameCount) {
  const { cols } = terminalSize;
  const cellWidth = Math.floor(cols / 12);

  // Edge case: degenerate terminals
  if (cellWidth < 3) return renderSingleLineStrip(state, terminalSize, frameCount);

  const layerKeys = Object.keys(LAYERS); // L1..L12 in definition order
  const cells = layerKeys.map((key, index) => {
    const layerState = state.layers ? (state.layers.get ? state.layers.get(key) : state.layers[key]) : null;
    return {
      key,
      layerState: layerState || { status: 'pending' },
      col: index * cellWidth + 1,
      width: cellWidth,
    };
  });

  let buf = '';
  const stripRow = 2; // Row 1 is header

  for (const cell of cells) {
    buf += renderCell(cell, stripRow, frameCount, cellWidth);
  }

  // F2-T3: Sub-progress and elapsed time for active cell
  const subRow = stripRow + 1;
  const activeCell = cells.find(c => c.layerState.status === 'active');

  if (activeCell && activeCell.layerState.subProgress) {
    const subText = String(activeCell.layerState.subProgress)
      .slice(0, activeCell.width)
      .padEnd(activeCell.width, ' ');
    buf += moveTo(subRow, activeCell.col);
    buf += PALETTE.dim + PALETTE.fg + subText + PALETTE.reset;
  }

  if (activeCell && activeCell.layerState.startedAt) {
    const startedAt = activeCell.layerState.startedAt instanceof Date
      ? activeCell.layerState.startedAt.getTime()
      : activeCell.layerState.startedAt;
    const elapsed = formatElapsed(Date.now() - startedAt);
    const elapsedCol = activeCell.col + activeCell.width - elapsed.length;
    buf += moveTo(subRow, Math.max(activeCell.col, elapsedCol));
    buf += PALETTE.dim + elapsed + PALETTE.reset;
  }

  // Return rows consumed: 1 (strip) + 1 (sub-progress) = 2
  return { buf, rowsUsed: 2 };
}

// ─── Feature 03: Actor Status Panel ───────────────────────────────

const ACTOR_ORDER = ['Ralph', 'Planner', 'Builder', 'Judge', 'Human'];
const MIN_ROWS_FOR_ACTORS = 24;

// F3-T3: Task description from position
function getTaskDescription(state) {
  const pos = state.position || {};
  const parts = [];

  if (pos.layer) {
    const name = LAYER_DISPLAY_NAMES[pos.layer];
    parts.push(name ? name.full : pos.layer);
  }
  if (pos.epic)    parts.push(pos.epic);
  if (pos.feature) parts.push(pos.feature);
  if (pos.task)    parts.push(pos.task);

  let desc = parts.join(' > ') || 'idle';

  if (pos.iteration && pos.iteration > 1) {
    desc += ` (iter ${pos.iteration})`;
  }

  return desc;
}

// F3-T2-S2: Render idle actor line
function renderIdleActorLine(actorName, color) {
  return PALETTE.dim + color + actorName + PALETTE.reset;
}

// F3-T2: Render actor line (active or idle)
function renderActorLine(actorName, actorKey, color, cols, state) {
  const activeActor = state.activeActor || null;
  const isActive = activeActor !== null && activeActor === actorKey;

  if (isActive) {
    const availWidth = cols - 11; // 7 (longest name "Planner") + 4 margin
    const desc = truncateVisible(getTaskDescription(state), Math.max(0, availWidth));
    const line = actorName + ': ' + desc;
    return PALETTE.bold + color + line + PALETTE.reset;
  }

  return renderIdleActorLine(actorName, color);
}

// F3-T1/T4: Actor status panel
function renderActorStatus(state, terminalSize, stripRowsUsed) {
  const { cols, rows } = terminalSize;

  // F3-T4: Height guard
  const showActors = rows >= MIN_ROWS_FOR_ACTORS;
  if (!showActors) return { buf: '', rowsUsed: 0 };

  const actorStartRow = 1 + stripRowsUsed + 1; // header=1, strip, gap
  let buf = '';

  for (let i = 0; i < ACTOR_ORDER.length; i++) {
    const actorName = ACTOR_ORDER[i];
    const actorKey = actorName.toLowerCase();
    const color = PALETTE[actorKey] || PALETTE.fg;
    const row = actorStartRow + i;

    buf += moveTo(row, 1);
    buf += renderActorLine(actorName, actorKey, color, cols, state);
    buf += '\x1b[K'; // clear to end of line
  }

  return { buf, rowsUsed: ACTOR_ORDER.length };
}

// ─── Feature 04: Event Feed ───────────────────────────────────────

const STATUS_BAR_ROWS = 1;

// F4-T2-S1: Format time from timestamp
function formatTime(timestamp) {
  try {
    const d = new Date(timestamp);
    if (isNaN(d.getTime())) return '--:--:--';
    const h = String(d.getHours()).padStart(2, '0');
    const m = String(d.getMinutes()).padStart(2, '0');
    const s = String(d.getSeconds()).padStart(2, '0');
    return `${h}:${m}:${s}`;
  } catch {
    return '--:--:--';
  }
}

// F4-T2-S1: Render event lines with HH:MM:SS BADGE format
function renderEventLines(events, feedStartRow, cols) {
  let buf = '';

  for (let i = 0; i < events.length; i++) {
    const event = events[i];
    const timeStr = formatTime(event.timestamp);
    const actorColor = event.color ? (PALETTE[event.color] || PALETTE.fg) : PALETTE.fg;
    const text = truncateAnsi(event.text || '', cols - 12); // 12 = time + badge + spaces

    const line = PALETTE.dim + timeStr + PALETTE.reset
      + ' ' + actorColor + BADGE + PALETTE.reset
      + ' ' + text;

    buf += moveTo(feedStartRow + i, 1);
    buf += line;
    buf += '\x1b[K'; // erase to end of line
  }

  return buf;
}

// F4-T2-S2: Empty feed placeholder
function renderEmptyFeed(feedStartRow, cols) {
  const text = 'Waiting for events...';
  const col = Math.max(1, Math.floor((cols - text.length) / 2) + 1);

  let buf = '';
  buf += moveTo(feedStartRow, col);
  buf += PALETTE.dim + PALETTE.fg + text + PALETTE.reset;
  buf += '\x1b[K';
  return buf;
}

// F4-T3: Scroll-aware event slice selection
function selectEventSlice(events, maxLines, scrollOffset) {
  if (maxLines <= 0) return [];

  if (scrollOffset === 0) {
    // Auto-scroll: show the latest events
    const start = Math.max(0, events.length - maxLines);
    return events.slice(start);
  }

  // User has scrolled up: show events above the latest window
  const endIndex = Math.max(0, events.length - scrollOffset);
  const startIndex = Math.max(0, endIndex - maxLines);
  return events.slice(startIndex, endIndex);
}

// F4-T1: Main event feed renderer
function renderEventFeed(state, terminalSize, feedStartRow, controllerState) {
  const { cols, rows } = terminalSize;
  // feedStartRow = 1 (header) + stripRowsUsed + actorRowsUsed + 1 (separator)
  const feedAvailableRows = Math.max(0, rows - feedStartRow - STATUS_BAR_ROWS);

  // Guard: nothing fits
  if (feedAvailableRows === 0) return '';

  const events = state.events || [];

  // Empty state
  if (events.length === 0) {
    return renderEmptyFeed(feedStartRow, cols);
  }

  // Scroll-aware slice
  const scrollOffset = (controllerState && controllerState.scrollOffset) || 0;
  const visibleEvents = selectEventSlice(events, feedAvailableRows, scrollOffset);

  // Line rendering
  let buf = renderEventLines(visibleEvents, feedStartRow, cols);

  // F4-T3-S2: Scroll indicator
  if (scrollOffset > 0 && events.length > feedAvailableRows) {
    const indicatorRow = feedStartRow + feedAvailableRows - 1;
    const indicatorText = '\u2193 New events below';
    buf += moveTo(indicatorRow, 1);
    buf += PALETTE.human + PALETTE.dim + indicatorText + PALETTE.reset;
    buf += '\x1b[K';
  }

  return buf;
}

// ─── Feature 05: Overlay System ───────────────────────────────────

// F5-T2: Severity icons for layer detail
const SEVERITY_ICONS = {
  error:   PALETTE.fail  + '!',
  warning: PALETTE.human + '~',
  info:    PALETTE.dim   + '\u00B7',
};

// F5-T2: Layer detail content renderer
function renderLayerDetailContent(state, innerRow, innerCol, innerWidth, innerHeight) {
  const detail = state.layerDetail || {};
  let buf = '';
  let row = innerRow;

  // Title
  const displayName = LAYER_DISPLAY_NAMES[detail.layerKey];
  const layerName = displayName ? displayName.full : (detail.layerKey || 'Unknown Layer');
  buf += moveTo(row++, innerCol);
  buf += PALETTE.bold + PALETTE.fg + layerName + PALETTE.reset;

  // Unstarted guard
  const issues = detail.issues || [];
  if (issues.length === 0 && !detail.layerKey) {
    buf += moveTo(row++, innerCol);
    buf += PALETTE.dim + 'Layer not yet started' + PALETTE.reset;
    return buf;
  }

  // Agent
  const agentColor = PALETTE[detail.agent] || PALETTE.fg;
  buf += moveTo(row++, innerCol);
  buf += 'Agent: ' + agentColor + (detail.agent || 'unknown') + PALETTE.reset;

  // Duration
  buf += moveTo(row++, innerCol);
  buf += 'Duration: ' + formatElapsed(detail.durationMs || 0);

  // Status
  buf += moveTo(row++, innerCol);
  buf += 'Status: ' + (detail.status || 'unknown');

  // Verdict
  if (detail.verdict) {
    const verdictColor = detail.verdict === 'PASS' ? PALETTE.pass : PALETTE.fail;
    buf += moveTo(row++, innerCol);
    buf += 'Verdict: ' + verdictColor + detail.verdict + PALETTE.reset;
  }

  // Issues list
  if (issues.length > 0) {
    row++; // blank separator
    buf += moveTo(row++, innerCol);
    buf += PALETTE.bold + 'Issues:' + PALETTE.reset;

    for (const issue of issues) {
      const icon = SEVERITY_ICONS[issue.severity] || SEVERITY_ICONS.info;
      const cascade = issue.cascadeTo ? ' \u2192 ' + issue.cascadeTo : '';
      const line = icon + PALETTE.reset + ' ' + (issue.message || '') + cascade;
      const truncated = truncateVisible(line, innerWidth);
      buf += moveTo(row++, innerCol);
      buf += truncated + PALETTE.reset;
      if (row >= innerRow + innerHeight) break; // overflow guard
    }
  }

  return buf;
}

// F5-T3: Cost content renderer
function renderCostContent(state, innerRow, innerCol, innerWidth, innerHeight) {
  const costData = state.costData || { perLayer: {}, perAgent: {}, totals: {} };
  let buf = '';
  let row = innerRow;

  // Title
  buf += moveTo(row++, innerCol);
  buf += PALETTE.bold + PALETTE.fg + 'Cost Breakdown' + PALETTE.reset;
  row++; // blank line

  const layerEntries = Object.entries(costData.perLayer || {});

  // Empty state guard
  if (layerEntries.length === 0) {
    buf += moveTo(row, innerCol);
    buf += PALETTE.dim + 'No cost data available' + PALETTE.reset;
    return buf;
  }

  // Layer table header
  buf += moveTo(row++, innerCol);
  buf += PALETTE.bold
    + 'Layer'.padEnd(14)
    + 'Tokens In'.padEnd(10)
    + 'Tokens Out'.padEnd(10)
    + 'Total'.padEnd(10)
    + PALETTE.reset;

  // Layer rows
  for (const [layerKey, lr] of layerEntries) {
    if (row >= innerRow + innerHeight) break;
    const displayName = LAYER_DISPLAY_NAMES[layerKey];
    const name = truncateVisible(displayName ? displayName.short : layerKey, 13).padEnd(14);
    const tIn  = formatTokens(lr.input || 0).padEnd(10);
    const tOut = formatTokens(lr.output || 0).padEnd(10);
    const tot  = formatTokens((lr.input || 0) + (lr.output || 0)).padEnd(10);
    buf += moveTo(row++, innerCol);
    buf += PALETTE.fg + name + PALETTE.dim + tIn + tOut + tot + PALETTE.reset;
  }

  // Per-agent section
  row++; // blank separator
  buf += moveTo(row++, innerCol);
  buf += PALETTE.bold + 'Per Agent' + PALETTE.reset;

  const COST_AGENTS = ['ralph', 'planner', 'builder', 'judge'];
  const agentData = costData.perAgent || {};
  for (const agentKey of COST_AGENTS) {
    if (row >= innerRow + innerHeight) break;
    const ad = agentData[agentKey] || {};
    const color = PALETTE[agentKey] || PALETTE.fg;
    const name = agentKey.charAt(0).toUpperCase() + agentKey.slice(1);
    buf += moveTo(row++, innerCol);
    buf += color + name.padEnd(14) + PALETTE.dim
      + formatTokens(ad.input || 0).padEnd(10)
      + formatTokens(ad.output || 0).padEnd(10)
      + formatTokens((ad.input || 0) + (ad.output || 0)).padEnd(10)
      + PALETTE.reset;
  }

  // Totals row
  const t = costData.totals || {};
  buf += moveTo(row++, innerCol);
  buf += PALETTE.bold + 'TOTALS'.padEnd(14)
    + formatTokens(t.input || 0).padEnd(10)
    + formatTokens(t.output || 0).padEnd(10)
    + formatTokens((t.input || 0) + (t.output || 0)).padEnd(10)
    + PALETTE.reset;

  return buf;
}

// F5-T4: Help content renderer
const HELP_ITEMS = [
  { key: 'q',      description: 'Quit',                     integrated: false },
  { key: 'l',      description: 'Show layer detail',        integrated: false },
  { key: '$',      description: 'Show cost breakdown',      integrated: false },
  { key: '?',      description: 'Show this help',           integrated: false },
  { key: 'Esc',    description: 'Close overlay',            integrated: false },
  { key: '\u2191/\u2193',   description: 'Scroll event feed',        integrated: false },
  { key: 'p',      description: 'Pause/resume',             integrated: true  },
  { key: 'r',      description: 'Retry current layer',      integrated: true  },
  { key: 'a',      description: 'Approve gate',             integrated: true  },
  { key: 'd',      description: 'Reject gate',              integrated: true  },
  { key: 'Enter',  description: 'Confirm prompt',           integrated: true  },
];

function renderHelpContent(innerRow, innerCol, innerWidth, innerHeight) {
  let buf = '';
  let row = innerRow;

  buf += moveTo(row++, innerCol);
  buf += PALETTE.bold + PALETTE.fg + 'Keyboard Shortcuts' + PALETTE.reset;
  row++; // blank line

  const colWidth = Math.floor(innerWidth / 2);
  const halfCount = Math.ceil(HELP_ITEMS.length / 2);

  for (let i = 0; i < HELP_ITEMS.length; i++) {
    const item = HELP_ITEMS[i];
    const isRight = i >= halfCount;
    const targetRow = isRight
      ? innerRow + 2 + (i - halfCount)
      : row++;
    const targetCol = isRight ? innerCol + colWidth : innerCol;

    const integratedSuffix = item.integrated
      ? ' ' + PALETTE.dim + '(integrated mode)' + PALETTE.reset
      : '';

    buf += moveTo(targetRow, targetCol);
    buf += PALETTE.bold + PALETTE.ralph + item.key.padEnd(6) + PALETTE.reset;
    buf += ' ' + PALETTE.fg + item.description + PALETTE.reset + integratedSuffix;
  }

  return buf;
}

// F5-T1-S2: Overlay content dispatcher
function renderOverlayContent(overlayType, state, startRow, startCol, boxWidth, boxHeight) {
  const innerRow = startRow + 1;
  const innerCol = startCol + 2;
  const innerWidth = boxWidth - 4;
  const innerHeight = boxHeight - 2;

  switch (overlayType) {
    case 'layer-detail':
      return renderLayerDetailContent(state, innerRow, innerCol, innerWidth, innerHeight);
    case 'cost':
      return renderCostContent(state, innerRow, innerCol, innerWidth, innerHeight);
    case 'help':
      return renderHelpContent(innerRow, innerCol, innerWidth, innerHeight);
    default:
      return '';
  }
}

// F5-T1: Main overlay renderer
function renderOverlay(overlayType, state, terminalSize) {
  const { cols, rows } = terminalSize;

  // Terminal size guard
  if (cols < 80 || rows < 24) return '';

  const boxWidth  = Math.floor(cols * 0.75);
  const boxHeight = Math.floor(rows * 0.75);
  const startCol  = Math.floor((cols - boxWidth) / 2) + 1;
  const startRow  = Math.floor((rows - boxHeight) / 2) + 1;

  let buf = '';

  // Top border
  buf += moveTo(startRow, startCol);
  buf += PALETTE.bg + PALETTE.fg + BOX.tl + BOX.h.repeat(boxWidth - 2) + BOX.tr;

  // Middle rows (content area)
  for (let r = 1; r < boxHeight - 1; r++) {
    buf += moveTo(startRow + r, startCol);
    buf += PALETTE.bg + BOX.v + ' '.repeat(boxWidth - 2) + BOX.v;
  }

  // Bottom border
  buf += moveTo(startRow + boxHeight - 1, startCol);
  buf += PALETTE.bg + BOX.bl + BOX.h.repeat(boxWidth - 2) + BOX.br + PALETTE.reset;

  // Content
  buf += renderOverlayContent(overlayType, state, startRow, startCol, boxWidth, boxHeight);

  return buf;
}

// ─── Feature 06: Animation System ─────────────────────────────────

// F6-T3: Header bar rendering
function renderHeader(state, terminalSize) {
  const { cols } = terminalSize;
  const title = ' Layer Cake TUI ';

  const mode = state.mode || 'watch';
  const modeStr = mode === 'integrated' ? '[integrated]' : '[watch]';

  let projectPath = state.projectDir || '';
  const maxPathLen = 30;
  if (projectPath.length > maxPathLen) {
    projectPath = '\u2026' + projectPath.slice(-(maxPathLen - 1));
  }

  const rightStr = ' ' + projectPath + '  ' + modeStr + ' ';
  const fillLen = Math.max(0, cols - title.length - rightStr.length);
  const fill = ' '.repeat(fillLen);

  let buf = moveTo(1, 1);
  buf += PALETTE.bg + PALETTE.ralph + PALETTE.bold + title + PALETTE.reset;
  buf += PALETTE.bg + fill;
  buf += PALETTE.dim + PALETTE.fg + rightStr + PALETTE.reset;

  return buf;
}

// F6-T4 + E3-F5-T4: Status bar rendering with full four-level priority stack
function renderStatusBar(state, terminalSize, controllerState) {
  const { cols, rows } = terminalSize;
  const scrollOffset      = (controllerState && controllerState.scrollOffset) || 0;
  const transientMessage  = controllerState && controllerState.transientMessage;
  const isPaused          = controllerState && controllerState.paused;
  const gateWaiting       = state && state.gateWaiting;
  const inputMode         = controllerState && controllerState.inputMode;
  const mode              = (state && state.mode) || 'watch';

  // E4-F3-T2: Dry run and options from controllerState
  const isDryRun        = controllerState && controllerState.dryRun;

  // Left: four-level priority hint
  let hintText, hintStyle;

  if (inputMode === 'text') {
    // Priority 0 (highest): text input mode for gate denial
    const prompt = (controllerState && controllerState.inputPrompt) || 'Deny reason: ';
    const buffer = (controllerState && controllerState.denyReasonBuffer) || '';
    hintText = ' ' + prompt + buffer;
    hintStyle = PALETTE.human;
  } else if (gateWaiting) {
    // Priority 1: gate waiting prompt
    hintText = ' [a] Approve  [d] Reject  [Enter] Confirm';
    hintStyle = PALETTE.human;
  } else if (transientMessage) {
    // Priority 2: transient feedback message
    hintText = ' ' + transientMessage;
    hintStyle = PALETTE.human;
  } else if (scrollOffset > 0) {
    // Priority 3: scrolled-away indicator
    hintText = ` \u2191 ${scrollOffset} events above \u2014 j/k to navigate`;
    hintStyle = PALETTE.dim;
  } else {
    // Priority 4 (lowest): default key hints
    const dryRunPrefix = isDryRun ? '[DRY RUN] ' : '';
    hintText = ' ' + dryRunPrefix + '[l] layer  [$] cost  [?] help  [q] quit';
    hintStyle = PALETTE.dim + PALETTE.fg;
  }

  // Right: PAUSED + mode
  const pausedVisible = isPaused ? '[PAUSED] ' : '';
  const modeVisible = mode + ' ';
  const rightVisible = pausedVisible + modeVisible;

  const leftLen = Math.min(hintText.length, cols - rightVisible.length - 1);
  const fillLen = Math.max(0, cols - leftLen - rightVisible.length);
  const fill = ' '.repeat(fillLen);

  let buf = moveTo(rows, 1);
  buf += PALETTE.bg + hintStyle + hintText.slice(0, leftLen) + PALETTE.reset;
  buf += PALETTE.bg + fill;
  if (isPaused) buf += PALETTE.fail + '[PAUSED]' + PALETTE.reset + ' ';
  buf += PALETTE.dim + mode + ' ' + PALETTE.reset;

  return buf;
}

// F6-T5: Main render function — double-buffered frame composition
function render(state, terminalSize, frameCount, controllerState) {
  frameCount = frameCount || 0;
  controllerState = controllerState || {};
  let buf = '';

  // Hide cursor, move to home to minimize flicker
  buf += '\x1b[?25l';
  buf += '\x1b[H';

  // 1. Header (row 1)
  buf += renderHeader(state, terminalSize);

  // 2. Pipeline strip (row 2+)
  const stripResult = renderPipelineStrip(state, terminalSize, frameCount);
  buf += stripResult.buf;

  // 3. Actor status panel (below strip)
  // actorResult.rowsUsed is 0 when rows < 24 — event feed expands to fill the space
  const actorResult = renderActorStatus(state, terminalSize, stripResult.rowsUsed);
  buf += actorResult.buf;

  // 4. Event feed (below actors, above status bar)
  const feedStartRow = 1                    // header
    + stripResult.rowsUsed                  // pipeline strip (1 or 2 rows)
    + actorResult.rowsUsed                  // 0 when hidden, 5 when visible
    + 1;                                    // separator row
  buf += renderEventFeed(state, terminalSize, feedStartRow, controllerState);

  // 5. Status bar (last row)
  buf += renderStatusBar(state, terminalSize, controllerState);

  // 6. Overlay (rendered last, on top of everything)
  // E3-F4-T3-S2: controllerState.currentOverlay drives overlay rendering
  const overlayType = controllerState && controllerState.currentOverlay;
  if (overlayType) {
    buf += renderOverlay(overlayType, state, terminalSize);
  }

  // Show cursor when user input is expected (text input or overlay open)
  const needsCursor = state.gateWaiting || overlayType || (controllerState && controllerState.inputMode === 'text');
  if (needsCursor) buf += '\x1b[?25h';

  return buf;
}

// ─── Module Exports ───────────────────────────────────────────────

module.exports = {
  // Primary public interface
  render,
  PALETTE,

  // Constants (also used by controller)
  LAYER_DISPLAY_NAMES,
  SPINNER_FRAMES,
  BOX,
  INDICATORS,
  BADGE,

  // Utilities (exported for unit testing)
  formatElapsed,
  formatTokens,
  truncateAnsi,
  truncateVisible,
  selectEventSlice,
};
