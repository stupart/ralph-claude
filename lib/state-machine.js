/**
 * Layer Cake State Machine
 *
 * Manages project state using the filesystem as the primary persistence layer.
 * _status.md tracks the current position, folder structure indicates completion.
 */

const fs = require('fs').promises;
const { constants: fsConstants } = require('fs');
const path = require('path');

/**
 * Advisory file lock for concurrent access safety.
 * Uses O_EXCL (exclusive create) on a .lock file.
 * Includes stale lock detection: locks older than staleLockMs are broken.
 *
 * @param {string} lockPath - Path to the lock file
 * @param {Object} [options]
 * @param {number} [options.staleLockMs=30000] - Consider locks stale after this many ms
 * @param {number} [options.retryMs=50] - Retry interval when lock is held
 * @param {number} [options.timeoutMs=5000] - Max time to wait for lock before throwing
 */
async function acquireLock(lockPath, options = {}) {
  const { staleLockMs = 30000, retryMs = 50, timeoutMs = 5000 } = options;
  const deadline = Date.now() + timeoutMs;

  while (true) {
    try {
      // O_CREAT | O_EXCL | O_WRONLY — fails if file already exists
      const fd = await fs.open(lockPath, fsConstants.O_CREAT | fsConstants.O_EXCL | fsConstants.O_WRONLY);
      // Write PID and timestamp for stale detection
      await fd.writeFile(JSON.stringify({ pid: process.pid, timestamp: Date.now() }));
      await fd.close();
      return; // Lock acquired
    } catch (err) {
      if (err.code !== 'EEXIST') throw err;

      // Lock file exists — check if stale
      try {
        const content = await fs.readFile(lockPath, 'utf8');
        const lockInfo = JSON.parse(content);
        if (Date.now() - lockInfo.timestamp > staleLockMs) {
          // Stale lock — break it
          await fs.unlink(lockPath);
          continue; // Retry immediately
        }
      } catch {
        // Lock file corrupt or disappeared — try again
        try { await fs.unlink(lockPath); } catch { /* ignore */ }
        continue;
      }

      // Lock is held by another process — wait and retry
      if (Date.now() >= deadline) {
        throw new Error(`Failed to acquire lock on ${lockPath} within ${timeoutMs}ms`);
      }
      await new Promise(resolve => setTimeout(resolve, retryMs));
    }
  }
}

/**
 * Release an advisory file lock.
 * @param {string} lockPath - Path to the lock file
 */
async function releaseLock(lockPath) {
  try {
    await fs.unlink(lockPath);
  } catch {
    // Lock may have been broken by another process — ignore
  }
}

/**
 * Create a fresh default state for a new project.
 * Uses a factory function to ensure each call gets fresh timestamps
 * and deep-copied nested objects (no shared references).
 * @returns {Object} A new default state object
 */
function createDefaultState() {
  return {
    meta: {
      project: 'Untitled Project',
      started: new Date().toISOString(),
      lastUpdated: new Date().toISOString()
    },
    position: {
      layer: 'L1',
      phase: 'understand',
      agent: 'planner',
      epic: null,
      feature: null,
      task: null,
      iteration: 1
    },
    gates: {
      L3: { status: 'pending', approvedAt: null },
      L7: { status: 'pending', approvedAt: null }
    },
    history: []
  };
}

/** @deprecated Use createDefaultState() instead */
const DEFAULT_STATE = createDefaultState();

/**
 * Layer definitions from LAYER_CAKE
 */
const LAYERS = {
  L1: { name: 'Input', phase: 'understand', agent: 'planner', onPass: 'L2', onFail: null },
  L2: { name: 'Decompose', phase: 'understand', agent: 'planner', onPass: 'L3', onFail: null },
  L3: { name: 'Synthesize', phase: 'understand', agent: 'planner', onPass: 'L4', onFail: null, humanGate: true },
  L4: { name: 'Epic Definition', phase: 'plan', agent: 'planner', onPass: 'L5', onFail: 'L3' },
  L5: { name: 'Feature Planning', phase: 'plan', agent: 'planner', onPass: 'L6', onFail: 'L4' },
  L6: { name: 'Task Specification', phase: 'plan', agent: 'planner', onPass: 'L7', onFail: 'L5' },
  L7: { name: 'Subtask Definition', phase: 'plan', agent: 'planner', onPass: 'L8', onFail: 'L6', humanGate: true },
  L8: { name: 'Build', phase: 'build', agent: 'builder', onPass: 'L9', onFail: 'L8' },
  L9: { name: 'Feature Review', phase: 'review', agent: 'judge', onPass: 'L10', onFail: { minor: 'L8', major: 'L7', escalate: 'L6' } },
  L10: { name: 'Epic Review', phase: 'review', agent: 'judge', onPass: 'L11', onFail: { minor: 'L8', major: 'L6', escalate: 'L5' } },
  L11: { name: 'Final Review', phase: 'review', agent: 'judge', onPass: 'L12', onFail: { minor: 'L8', major: 'L5', escalate: 'L4' } },
  L12: { name: 'Analysis', phase: 'learn', agent: 'planner', onPass: 'COMPLETE', onFail: null }
};

/**
 * Folder structure for each layer
 */
const LAYER_FOLDERS = {
  L1: '1-input',
  L2: '2-decomposition',
  L3: '3-synthesis',
  L4: '4-epics',
  L5: '5-features',
  L6: '6-tasks',
  L7: '7-subtasks',
  L8: null, // Build doesn't create a folder
  L9: null, // Review creates files in feature folders
  L10: null,
  L11: null,
  L12: '8-analysis'
};

class StateManager {
  constructor(projectRoot) {
    this.projectRoot = projectRoot;
    this.statusPath = path.join(projectRoot, '_status.md');
    this.lockPath = path.join(projectRoot, '_status.md.lock');
    this.state = null;
  }

  /**
   * Read current state from _status.md
   * @returns {Object} Current state
   */
  async read() {
    try {
      const content = await fs.readFile(this.statusPath, 'utf8');
      this.state = this.parseStatusFile(content);
      return this.state;
    } catch (err) {
      if (err.code === 'ENOENT') {
        // File doesn't exist, initialize new state
        this.state = createDefaultState();
        return this.state;
      }
      throw new Error(`Failed to read _status.md: ${err.message}`);
    }
  }

  /**
   * Write current state to _status.md (atomic + locked).
   * Uses advisory file locking to prevent corruption from concurrent access,
   * and atomic write (temp + rename) for crash safety.
   * Validates forward layer transitions against the filesystem to prevent
   * agents from self-advancing without producing required artifacts (BUG-002).
   */
  async write() {
    if (!this.state) {
      throw new Error('No state to write. Call read() first.');
    }

    // BUG-002 fix: validate forward transitions against filesystem
    if (this._previousLayer) {
      await this.validateLayerAdvancement(this._previousLayer, this.state.position.layer);
      this._previousLayer = null;
    }

    // Acquire advisory lock for concurrent safety
    await acquireLock(this.lockPath);
    try {
      this.state.meta.lastUpdated = new Date().toISOString();
      const content = this.formatStatusFile(this.state);

      // Atomic write: write to temp, then rename
      const tempPath = `${this.statusPath}.tmp`;
      await fs.writeFile(tempPath, content, 'utf8');
      try {
        await fs.rename(tempPath, this.statusPath);
      } catch (renameErr) {
        // Clean up temp file on rename failure
        try {
          await fs.unlink(tempPath);
        } catch {
          // Ignore cleanup errors
        }
        throw renameErr;
      }
    } finally {
      await releaseLock(this.lockPath);
    }
  }

  /**
   * Validate that a forward layer transition has filesystem evidence.
   * Prevents agents from self-advancing _status.md without producing artifacts (BUG-002).
   * Only validates forward transitions (advancing). Cascades and iterations are always allowed.
   * @param {string} fromLayer - Layer we are advancing from (e.g. 'L3')
   * @param {string} toLayer - Layer we are advancing to (e.g. 'L4')
   * @throws {Error} if the transition is forward and the prerequisite folder is empty or missing
   */
  async validateLayerAdvancement(fromLayer, toLayer) {
    if (!fromLayer || !toLayer || fromLayer === toLayer) return;
    if (toLayer === 'COMPLETE') return;

    const fromNum = parseInt(fromLayer.slice(1));
    const toNum = parseInt(toLayer.slice(1));

    // Only validate forward transitions
    if (toNum <= fromNum) return;

    // Check that the departing layer's folder exists and has content
    const folder = LAYER_FOLDERS[fromLayer];
    if (!folder) return; // L8-L11 don't have folders, skip

    const folderPath = path.join(this.projectRoot, folder);
    try {
      const entries = await fs.readdir(folderPath);
      const hasContent = entries.some(e => !e.startsWith('.'));
      if (!hasContent) {
        throw new Error(
          `BUG-002 guard: Cannot advance from ${fromLayer} to ${toLayer} — ` +
          `folder "${folder}" exists but has no artifacts. ` +
          `The agent must produce output before advancing.`
        );
      }
    } catch (err) {
      if (err.code === 'ENOENT') {
        throw new Error(
          `BUG-002 guard: Cannot advance from ${fromLayer} to ${toLayer} — ` +
          `folder "${folder}" does not exist. ` +
          `The agent must produce output before advancing.`
        );
      }
      // Re-throw if it's our own validation error
      if (err.message.includes('BUG-002')) throw err;
      // Ignore other filesystem errors (permissions etc.)
    }
  }

  /**
   * Parse _status.md content into state object
   */
  parseStatusFile(content) {
    const state = createDefaultState();

    // Extract key-value pairs from markdown
    const lines = content.split('\n');
    let currentSection = null;

    for (const line of lines) {
      if (line.startsWith('## ')) {
        currentSection = line.slice(3).trim().toLowerCase();
        continue;
      }

      const match = line.match(/^- \*\*(.+?):\*\* (.+)$/);
      if (match) {
        const [, key, value] = match;
        this.setStateValue(state, currentSection, key.toLowerCase(), value);
      }
    }

    return state;
  }

  /**
   * Set a value in the state object based on section and key
   */
  setStateValue(state, section, key, value) {
    switch (section) {
      case 'meta':
        if (key === 'project') state.meta.project = value;
        if (key === 'started') state.meta.started = value;
        if (key === 'last updated') state.meta.lastUpdated = value;
        break;
      case 'current position':
        if (key === 'layer') state.position.layer = value;
        if (key === 'layer name') state.position.phase = LAYERS[state.position.layer]?.phase || 'unknown';
        if (key === 'epic') state.position.epic = value === 'None' ? null : value;
        if (key === 'feature') state.position.feature = value === 'None' ? null : value;
        if (key === 'task') state.position.task = value === 'None' ? null : value;
        if (key === 'iteration') state.position.iteration = parseInt(value) || 1;
        break;
      case 'gates':
        // Parse gate status lines like "L3 (Synthesis): approved" or "L7 (Plan Approval): pending"
        {
          const gateMatch = key.match(/^(l\d+)/i);
          if (gateMatch) {
            const gateLayer = gateMatch[1].toUpperCase();
            if (!state.gates) state.gates = {};
            const status = value.trim().toLowerCase();
            state.gates[gateLayer] = {
              status: status,
              approvedAt: status === 'approved' ? (state.gates[gateLayer]?.approvedAt || null) : null
            };
          }
        }
        break;
      default:
        // History and other sections handled separately if needed
        break;
    }

    // Derive agent from layer
    if (state.position.layer) {
      state.position.agent = LAYERS[state.position.layer]?.agent || 'unknown';
    }
  }

  /**
   * Format state object as _status.md content
   */
  formatStatusFile(state) {
    const layer = LAYERS[state.position.layer];
    const lines = [
      '# Project Status',
      '',
      '## Meta',
      `- **Project:** ${state.meta.project}`,
      `- **Started:** ${state.meta.started}`,
      `- **Last Updated:** ${state.meta.lastUpdated}`,
      '',
      '## Current Position',
      `- **Layer:** ${state.position.layer}`,
      `- **Layer Name:** ${layer?.name || 'Unknown'}`,
      `- **Phase:** ${layer?.phase || 'Unknown'}`,
      `- **Agent:** ${layer?.agent || 'Unknown'}`,
      `- **Epic:** ${state.position.epic || 'None'}`,
      `- **Feature:** ${state.position.feature || 'None'}`,
      `- **Task:** ${state.position.task || 'None'}`,
      `- **Iteration:** ${state.position.iteration}`,
      '',
      '## Layer Progress'
    ];

    // Add layer checkboxes
    for (const layerId of Object.keys(LAYERS)) {
      const layerNum = parseInt(layerId.slice(1));
      const currentNum = parseInt(state.position.layer.slice(1));
      const completed = layerNum < currentNum;
      const checkbox = completed ? '[x]' : '[ ]';
      lines.push(`- ${checkbox} ${layerId}: ${LAYERS[layerId].name}`);
    }

    lines.push('', '## Gates');
    lines.push(`- **L3 (Synthesis):** ${state.gates?.L3?.status || 'pending'}`);
    lines.push(`- **L7 (Plan Approval):** ${state.gates?.L7?.status || 'pending'}`);

    lines.push('', '## Recent History');
    const recentHistory = (state.history || []).slice(-5);
    for (const entry of recentHistory) {
      lines.push(`- ${entry.timestamp}: ${entry.action}`);
    }

    lines.push('');
    return lines.join('\n');
  }

  /**
   * Advance to the next layer (on PASS)
   */
  async advance() {
    if (!this.state) await this.read();

    const currentLayer = LAYERS[this.state.position.layer];
    if (!currentLayer) {
      throw new Error(`Unknown layer: ${this.state.position.layer}`);
    }

    const nextLayer = currentLayer.onPass;
    if (nextLayer === 'COMPLETE') {
      this.addHistory('Project completed');
      this.state.position.layer = 'COMPLETE';
      await this.write();
      return { action: 'complete', layer: 'COMPLETE' };
    }

    // Check for human gate
    if (currentLayer.humanGate) {
      const gateStatus = this.state.gates?.[this.state.position.layer]?.status;
      if (gateStatus !== 'approved') {
        return { action: 'waiting_human', layer: this.state.position.layer, gate: true };
      }
    }

    // Create folder for next layer if needed
    const folder = LAYER_FOLDERS[nextLayer];
    if (folder) {
      await this.ensureFolder(folder);
    }

    const previousLayer = this.state.position.layer;
    this.state.position.layer = nextLayer;
    this.state.position.phase = LAYERS[nextLayer].phase;
    this.state.position.agent = LAYERS[nextLayer].agent;
    this.state.position.iteration = 1; // Reset iteration on advance

    // Track previous layer for BUG-002 validation in write()
    this._previousLayer = previousLayer;

    this.addHistory(`Advanced from ${previousLayer} to ${nextLayer}`);
    await this.write();

    return { action: 'advance', from: previousLayer, to: nextLayer };
  }

  /**
   * Stay at current layer (on MINOR iteration)
   */
  async iterate() {
    if (!this.state) await this.read();

    this.state.position.iteration++;
    this.addHistory(`Iteration ${this.state.position.iteration} at ${this.state.position.layer}`);
    await this.write();

    return {
      action: 'iterate',
      layer: this.state.position.layer,
      iteration: this.state.position.iteration
    };
  }

  /**
   * Cascade back to earlier layer (on MAJOR/ESCALATE)
   * @param {string} targetLayer - Layer to cascade to (e.g., 'L6')
   */
  async cascade(targetLayer) {
    if (!this.state) await this.read();

    if (!LAYERS[targetLayer]) {
      throw new Error(`Invalid cascade target: ${targetLayer}`);
    }

    const previousLayer = this.state.position.layer;
    this.state.position.layer = targetLayer;
    this.state.position.phase = LAYERS[targetLayer].phase;
    this.state.position.agent = LAYERS[targetLayer].agent;
    this.state.position.iteration = 1; // Reset iteration on cascade

    this.addHistory(`Cascaded from ${previousLayer} to ${targetLayer}`);
    await this.write();

    return { action: 'cascade', from: previousLayer, to: targetLayer };
  }

  /**
   * Approve a human gate
   * @param {string} layer - Gate layer (L3 or L7)
   */
  async approveGate(layer) {
    if (!this.state) await this.read();

    if (!this.state.gates) this.state.gates = {};
    this.state.gates[layer] = {
      status: 'approved',
      approvedAt: new Date().toISOString()
    };

    this.addHistory(`Human approved gate at ${layer}`);
    await this.write();

    return { action: 'gate_approved', layer };
  }

  /**
   * Get current layer info
   */
  getCurrentLayer() {
    if (!this.state) return null;
    return {
      id: this.state.position.layer,
      ...LAYERS[this.state.position.layer]
    };
  }

  /**
   * Check if a layer is complete
   */
  isLayerComplete(layerId) {
    if (!this.state) return false;
    const currentNum = parseInt(this.state.position.layer.slice(1));
    const checkNum = parseInt(layerId.slice(1));
    return checkNum < currentNum;
  }

  /**
   * Get project progress
   */
  getProgress() {
    if (!this.state) return { completed: 0, total: 12, percentage: 0 };
    const currentNum = parseInt(this.state.position.layer.slice(1)) || 0;
    return {
      completed: currentNum - 1,
      total: 12,
      percentage: Math.round(((currentNum - 1) / 12) * 100)
    };
  }

  /**
   * Add entry to history
   */
  addHistory(action) {
    if (!this.state.history) this.state.history = [];
    this.state.history.push({
      timestamp: new Date().toISOString(),
      action
    });
    // Keep last 50 entries
    if (this.state.history.length > 50) {
      this.state.history = this.state.history.slice(-50);
    }
  }

  /**
   * Ensure a folder exists
   */
  async ensureFolder(folderName) {
    const folderPath = path.join(this.projectRoot, folderName);
    try {
      await fs.mkdir(folderPath, { recursive: true });
    } catch (err) {
      if (err.code !== 'EEXIST') throw err;
    }
  }
}

module.exports = { StateManager, LAYERS, LAYER_FOLDERS, DEFAULT_STATE, createDefaultState, acquireLock, releaseLock };
