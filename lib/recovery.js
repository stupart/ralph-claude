/**
 * Layer Cake Recovery Manager
 *
 * Handles recovery from interrupted or inconsistent states by comparing
 * the _status.md state with actual filesystem artifacts.
 */

const fs = require('fs').promises;
const path = require('path');
const { StateManager, LAYERS, LAYER_DEPS, LAYER_FOLDERS, createDefaultState } = require('./state-machine');

/**
 * Layer folder names used for filesystem scanning
 */
const SCAN_FOLDERS = {
  L1: '1-input',
  L2: '2-decomposition',
  L3: '3-synthesis',
  L4: '4-epics',
  L5: '5-features',
  L6: '6-tasks',
  L7: '7-subtasks',
  L12: '8-analysis'
};

class RecoveryManager {
  /**
   * @param {string} projectRoot - Absolute path to the project root
   */
  constructor(projectRoot) {
    this.projectRoot = projectRoot;
    this.stateManager = new StateManager(projectRoot);
    this.log = [];
  }

  /**
   * Add a log entry for recovery operations
   * @param {string} message
   */
  _log(message) {
    const entry = {
      timestamp: new Date().toISOString(),
      message
    };
    this.log.push(entry);
  }

  /**
   * Scan the filesystem to determine which layers have produced artifacts.
   * Checks folder existence and non-emptiness for each layer's output directory.
   * @returns {Object} Map of layerId -> { exists: boolean, hasContent: boolean, files: string[] }
   */
  async scanFilesystem() {
    const scan = {};

    for (const [layerId, folder] of Object.entries(SCAN_FOLDERS)) {
      if (!folder) {
        scan[layerId] = { exists: false, hasContent: false, files: [] };
        continue;
      }

      const folderPath = path.join(this.projectRoot, folder);
      try {
        const entries = await fs.readdir(folderPath);
        const nonHidden = entries.filter(e => !e.startsWith('.'));
        scan[layerId] = {
          exists: true,
          hasContent: nonHidden.length > 0,
          files: nonHidden
        };
      } catch (err) {
        if (err.code === 'ENOENT') {
          scan[layerId] = { exists: false, hasContent: false, files: [] };
        } else {
          this._log(`Error scanning ${folder}: ${err.message}`);
          scan[layerId] = { exists: false, hasContent: false, files: [], error: err.message };
        }
      }
    }

    return scan;
  }

  /**
   * Determine the highest completed layer based on filesystem artifacts.
   * A layer is considered complete if its output folder exists and has content.
   * @param {Object} scan - Result from scanFilesystem()
   * @returns {string} The highest layer that appears complete, or 'L1' if none
   */
  inferLayerFromFilesystem(scan) {
    // Walk layers in order; the layer after the last completed one is where we should be
    const layerOrder = ['L1', 'L2', 'L3', 'L4', 'L5', 'L6', 'L7'];
    let lastCompleted = null;

    for (const layerId of layerOrder) {
      const info = scan[layerId];
      if (info && info.exists && info.hasContent) {
        lastCompleted = layerId;
      } else {
        break; // Stop at first gap
      }
    }

    if (!lastCompleted) return 'L1';

    // The next layer after the last completed one
    const nextLayer = LAYERS[lastCompleted]?.onPass;
    return nextLayer || 'L1';
  }

  /**
   * Check whether a layer can be safely resumed by verifying that all its
   * dependency layers have artifacts on the filesystem.
   * Uses LAYER_DEPS for dependency-aware validation instead of simple linear order.
   *
   * @param {string} layerId - Layer to check (e.g., 'L8')
   * @param {Object} scan - Result from scanFilesystem()
   * @returns {{ canResume: boolean, missingDeps: string[] }}
   */
  checkDependenciesMet(layerId, scan) {
    const deps = LAYER_DEPS[layerId] || [];
    const missingDeps = [];

    for (const depLayer of deps) {
      const folder = SCAN_FOLDERS[depLayer];
      if (!folder) continue; // L8-L11 don't have folders, skip

      const info = scan[depLayer];
      if (!info || !info.exists || !info.hasContent) {
        missingDeps.push(depLayer);
      }
    }

    return {
      canResume: missingDeps.length === 0,
      missingDeps
    };
  }

  /**
   * Compare the expected state (from _status.md) with the actual filesystem state.
   * Returns a recovery plan describing mismatches and recommended actions.
   * @returns {Object} Recovery plan
   */
  async reconcile() {
    this._log('Starting reconciliation...');

    // Check if _status.md actually exists on disk
    let statusState = null;
    let statusExists = false;
    try {
      await fs.access(path.join(this.projectRoot, '_status.md'));
      statusExists = true;
      statusState = await this.stateManager.read();
    } catch (err) {
      if (err.code === 'ENOENT') {
        this._log('No _status.md file found on disk');
        statusExists = false;
      } else {
        this._log(`Could not read status file: ${err.message}`);
        statusExists = false;
      }
    }

    // Scan filesystem for actual artifacts
    const scan = await this.scanFilesystem();
    const inferredLayer = this.inferLayerFromFilesystem(scan);

    this._log(`Status file layer: ${statusState?.position?.layer || 'NONE'}`);
    this._log(`Inferred layer from filesystem: ${inferredLayer}`);

    // Build recovery plan
    const plan = {
      statusFileExists: statusExists,
      statusLayer: statusState?.position?.layer || null,
      inferredLayer: inferredLayer,
      filesystemScan: scan,
      mismatches: [],
      actions: []
    };

    if (!statusExists) {
      plan.mismatches.push({
        type: 'missing_status',
        description: 'No _status.md file found'
      });
      plan.actions.push({
        type: 'create_status',
        targetLayer: inferredLayer,
        description: `Create _status.md at ${inferredLayer} based on filesystem`
      });
    } else if (statusState.position.layer !== inferredLayer) {
      const statusNum = parseInt((statusState.position.layer || 'L0').slice(1));
      const inferredNum = parseInt(inferredLayer.slice(1));

      if (statusNum > inferredNum) {
        plan.mismatches.push({
          type: 'status_ahead',
          description: `Status (${statusState.position.layer}) is ahead of filesystem (${inferredLayer})`
        });
        plan.actions.push({
          type: 'rewind_status',
          from: statusState.position.layer,
          to: inferredLayer,
          description: `Rewind status to ${inferredLayer} to match filesystem`
        });
      } else {
        plan.mismatches.push({
          type: 'status_behind',
          description: `Status (${statusState.position.layer}) is behind filesystem (${inferredLayer})`
        });
        plan.actions.push({
          type: 'advance_status',
          from: statusState.position.layer,
          to: inferredLayer,
          description: `Advance status to ${inferredLayer} to match filesystem`
        });
      }
    } else {
      this._log('Status and filesystem are in sync');
    }

    // Check for missing folders that should exist based on current layer
    const currentNum = parseInt(inferredLayer.slice(1));
    for (const [layerId, folder] of Object.entries(SCAN_FOLDERS)) {
      if (!folder) continue;
      const layerNum = parseInt(layerId.slice(1));
      if (layerNum < currentNum && scan[layerId] && !scan[layerId].exists) {
        plan.mismatches.push({
          type: 'missing_folder',
          layer: layerId,
          folder: folder,
          description: `Expected folder ${folder} for completed layer ${layerId} is missing`
        });
        plan.actions.push({
          type: 'create_folder',
          folder: folder,
          description: `Create missing folder ${folder}`
        });
      }
    }

    // Check dependency graph for the inferred layer
    const depCheck = this.checkDependenciesMet(inferredLayer, scan);
    plan.dependencyCheck = depCheck;
    if (!depCheck.canResume) {
      plan.mismatches.push({
        type: 'missing_dependencies',
        layer: inferredLayer,
        missingDeps: depCheck.missingDeps,
        description: `Layer ${inferredLayer} is missing dependency artifacts from: ${depCheck.missingDeps.join(', ')}`
      });
    }

    plan.needsRecovery = plan.mismatches.length > 0;
    this._log(`Reconciliation complete. ${plan.mismatches.length} mismatch(es) found.`);

    return plan;
  }

  /**
   * Apply a recovery plan: advance or rewind state to match filesystem reality.
   * @param {Object} plan - Recovery plan from reconcile() (optional; will reconcile if not provided)
   * @returns {Object} Result of the recovery operation
   */
  async resume(plan = null) {
    if (!plan) {
      plan = await this.reconcile();
    }

    if (!plan.needsRecovery) {
      this._log('No recovery needed');
      return { recovered: false, message: 'State is already consistent' };
    }

    this._log('Applying recovery plan...');
    const results = [];

    for (const action of plan.actions) {
      try {
        switch (action.type) {
          case 'create_status': {
            const state = createDefaultState();
            state.position.layer = action.targetLayer;
            state.position.phase = LAYERS[action.targetLayer]?.phase || 'unknown';
            state.position.agent = LAYERS[action.targetLayer]?.agent || 'unknown';
            this.stateManager.state = state;
            this.stateManager.addHistory(`Recovery: created status at ${action.targetLayer}`);
            await this.stateManager.write();
            results.push({ action: action.type, success: true });
            this._log(`Created _status.md at ${action.targetLayer}`);
            break;
          }
          case 'rewind_status':
          case 'advance_status': {
            await this.stateManager.read();
            this.stateManager.state.position.layer = action.to;
            this.stateManager.state.position.phase = LAYERS[action.to]?.phase || 'unknown';
            this.stateManager.state.position.agent = LAYERS[action.to]?.agent || 'unknown';
            this.stateManager.state.position.iteration = 1;
            this.stateManager.addHistory(`Recovery: moved from ${action.from} to ${action.to}`);
            await this.stateManager.write();
            results.push({ action: action.type, success: true });
            this._log(`Moved state from ${action.from} to ${action.to}`);
            break;
          }
          case 'create_folder': {
            const folderPath = path.join(this.projectRoot, action.folder);
            await fs.mkdir(folderPath, { recursive: true });
            results.push({ action: action.type, folder: action.folder, success: true });
            this._log(`Created folder ${action.folder}`);
            break;
          }
          default:
            this._log(`Unknown action type: ${action.type}`);
            results.push({ action: action.type, success: false, error: 'Unknown action' });
        }
      } catch (err) {
        this._log(`Error applying action ${action.type}: ${err.message}`);
        results.push({ action: action.type, success: false, error: err.message });
      }
    }

    return {
      recovered: true,
      actions: results,
      log: [...this.log]
    };
  }

  /**
   * Reset the project to L1 with a clean state.
   * Does NOT delete filesystem artifacts, only resets _status.md.
   * @returns {Object} Result of the clean start
   */
  async cleanStart() {
    this._log('Performing clean start...');

    const state = createDefaultState();
    this.stateManager.state = state;
    this.stateManager.addHistory('Recovery: clean start to L1');
    await this.stateManager.write();

    this._log('Clean start complete. State reset to L1.');

    return {
      reset: true,
      layer: 'L1',
      message: 'State reset to L1. Filesystem artifacts preserved.',
      log: [...this.log]
    };
  }

  /**
   * Generate a human-readable summary of what was found vs expected.
   * @param {Object} plan - Recovery plan from reconcile() (optional; will reconcile if not provided)
   * @returns {string} Human-readable summary
   */
  async generateRecoverySummary(plan = null) {
    if (!plan) {
      plan = await this.reconcile();
    }

    const lines = [
      '# Recovery Summary',
      '',
      '## Status File',
      `- Exists: ${plan.statusFileExists ? 'Yes' : 'No'}`,
      `- Reported Layer: ${plan.statusLayer || 'N/A'}`,
      '',
      '## Filesystem State',
      `- Inferred Layer: ${plan.inferredLayer}`,
      ''
    ];

    lines.push('## Folder Scan');
    for (const [layerId, info] of Object.entries(plan.filesystemScan)) {
      const folder = SCAN_FOLDERS[layerId] || '(none)';
      const status = info.exists
        ? (info.hasContent ? `EXISTS (${info.files.length} files)` : 'EXISTS (empty)')
        : 'MISSING';
      lines.push(`- ${layerId} (${folder}): ${status}`);
    }

    lines.push('');

    if (plan.mismatches.length === 0) {
      lines.push('## Result');
      lines.push('No mismatches detected. State is consistent with filesystem.');
    } else {
      lines.push('## Mismatches');
      for (const mismatch of plan.mismatches) {
        lines.push(`- [${mismatch.type}] ${mismatch.description}`);
      }

      lines.push('');
      lines.push('## Recommended Actions');
      for (const action of plan.actions) {
        lines.push(`- ${action.description}`);
      }
    }

    lines.push('');
    return lines.join('\n');
  }
}

module.exports = { RecoveryManager, SCAN_FOLDERS };
