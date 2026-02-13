/**
 * Ralph - Layer Cake Orchestrator
 *
 * The main orchestration layer that coordinates agents through the Layer Cake methodology.
 * Ralph spawns agents, manages state, validates outputs, and routes results.
 */

const path = require('path');
const { StateManager, LAYERS } = require('./state-machine');
const { Validator } = require('./validator');
const { Router, VERDICT, SEVERITY } = require('./router');
const { AgentSpawner } = require('./agent-spawner');
const { EventLogger } = require('./event-logger');
const { StallDetector } = require('./stall-detector');
const { Notifier } = require('./notifier');
const { Webhook } = require('./webhook');

/**
 * Tracks token usage and estimated cost per layer.
 * Agent executors can include `tokenUsage` in their returned artifacts:
 *   { inputTokens: number, outputTokens: number }
 */
class CostTracker {
  constructor() {
    /** Per-layer token accumulators: { [layerId]: { inputTokens, outputTokens, calls } } */
    this.layers = {};
    this.totalInputTokens = 0;
    this.totalOutputTokens = 0;
    this.totalCalls = 0;
  }

  /**
   * Record token usage for a layer.
   * @param {string} layerId - e.g. 'L1', 'L8'
   * @param {number} inputTokens - prompt/input tokens consumed
   * @param {number} outputTokens - completion/output tokens consumed
   */
  record(layerId, inputTokens = 0, outputTokens = 0) {
    if (!this.layers[layerId]) {
      this.layers[layerId] = { inputTokens: 0, outputTokens: 0, calls: 0 };
    }
    this.layers[layerId].inputTokens += inputTokens;
    this.layers[layerId].outputTokens += outputTokens;
    this.layers[layerId].calls += 1;
    this.totalInputTokens += inputTokens;
    this.totalOutputTokens += outputTokens;
    this.totalCalls += 1;
  }

  /**
   * Get a summary of all token usage.
   * @returns {{ layers: Object, totals: { inputTokens: number, outputTokens: number, calls: number } }}
   */
  getSummary() {
    return {
      layers: { ...this.layers },
      totals: {
        inputTokens: this.totalInputTokens,
        outputTokens: this.totalOutputTokens,
        calls: this.totalCalls
      }
    };
  }

  /**
   * Reset all tracking data.
   */
  reset() {
    this.layers = {};
    this.totalInputTokens = 0;
    this.totalOutputTokens = 0;
    this.totalCalls = 0;
  }
}

class Ralph {
  constructor(projectRoot, options = {}) {
    this.projectRoot = projectRoot;
    this.options = {
      tier: 'small',
      autoApproveGates: false,
      verbose: true,
      /** Timeout in milliseconds for agent execution. 0 means no timeout. Default: 300000 (5 min) */
      agentTimeout: 300000,
      /** Max retries on agent crash/timeout before failing. Default: 3. Uses exponential backoff (1s, 2s, 4s). */
      maxRetries: 3,
      /** When true, runLayerCycle returns the spawn config without executing the agent. */
      dryRun: false,
      ...options
    };

    // Initialize components
    this.state = new StateManager(projectRoot);
    this.validator = new Validator(projectRoot, this.options.tier);
    this.router = new Router(this.state);
    this.spawner = new AgentSpawner(projectRoot);
    this.costs = new CostTracker();
    this.eventLogger = new EventLogger(projectRoot, {
      enabled: options.eventLog !== false
    });

    // Terminal notifications (macOS via terminal-notifier)
    this.notifier = new Notifier({
      enabled: options.notifications !== false
    });

    // Webhook for external integrations (Slack, Discord, etc.)
    this.webhook = new Webhook(options.webhookUrl || null);

    // Stall detector - monitors _status.md for activity
    this.stallDetector = new StallDetector(projectRoot, {
      thresholdMs: options.stallThresholdMs || 600000, // 10 min default
      pollIntervalMs: options.stallPollMs || 30000, // 30 sec default
      onStall: (info) => {
        this.log(`STALL DETECTED: No status update for ${Math.round(info.elapsedMs / 1000)}s`);
        this.eventLogger.log({
          type: 'stall_detected',
          message: `No status update for ${Math.round(info.elapsedMs / 1000)}s`,
          meta: info
        });
        this.emit('onError', { type: 'stall', ...info });
        this.notifier.stallDetected(info.elapsedMs / 1000);
      }
    });

    // Event handlers
    this.handlers = {
      onLayerStart: [],
      onLayerComplete: [],
      onAgentSpawn: [],
      onValidationResult: [],
      onRoutingDecision: [],
      onHumanGateRequired: [],
      onCostUpdate: [],
      onError: []
    };
  }

  /**
   * Register an event handler
   */
  on(event, handler) {
    if (this.handlers[event]) {
      this.handlers[event].push(handler);
    }
    return this;
  }

  /**
   * Emit an event to all handlers
   */
  emit(event, data) {
    const handlers = this.handlers[event] || [];
    for (const handler of handlers) {
      try {
        handler(data);
      } catch (err) {
        console.error(`Error in ${event} handler:`, err);
      }
    }
  }

  /**
   * Log a message if verbose mode is on
   */
  log(message, data = null) {
    if (this.options.verbose) {
      const timestamp = new Date().toISOString().slice(11, 19);
      console.log(`[${timestamp}] ${message}`);
      if (data) console.log(data);
    }
  }

  /**
   * Initialize a new project or resume an existing one.
   * Runs recovery reconciliation on startup to detect state/filesystem mismatches (tech debt #7).
   */
  async initialize() {
    this.log('Initializing Ralph...');

    // Run recovery check to reconcile state with filesystem
    const { RecoveryManager } = require('./recovery');
    const recovery = new RecoveryManager(this.projectRoot);
    const plan = await recovery.reconcile();
    if (plan.needsRecovery) {
      this.log('State/filesystem mismatch detected, recovering...');
      const recoveryResult = await recovery.resume(plan);
      this.log(`Recovery complete: ${recoveryResult.actions.length} actions applied`);
    }

    // Read current state (may have been updated by recovery)
    const state = await this.state.read();
    this.log(`Current position: ${state.position.layer}`);

    // Check for complete state (tech debt #12)
    if (state.position.layer === 'COMPLETE') {
      return { status: 'complete', message: 'Project is already complete' };
    }

    // Ensure folder structure exists
    await this.ensureProjectStructure();

    return {
      status: 'ready',
      position: state.position,
      progress: this.state.getProgress()
    };
  }

  /**
   * Ensure basic project folder structure exists
   */
  async ensureProjectStructure() {
    const folders = [
      '1-input',
      '2-decomposition',
      '3-synthesis',
      '4-epics',
      '5-features',
      '6-tasks',
      '7-subtasks',
      '8-analysis'
    ];

    const fs = require('fs').promises;
    for (const folder of folders) {
      const folderPath = path.join(this.projectRoot, folder);
      try {
        await fs.mkdir(folderPath, { recursive: true });
      } catch {
        // Folder exists or can't be created
      }
    }
  }

  /**
   * Run the next layer
   */
  async runNextLayer() {
    const currentState = await this.state.read();
    const layerId = currentState.position.layer;
    if (layerId === 'COMPLETE') {
      return { status: 'complete', message: 'Project is already complete' };
    }

    const layer = LAYERS[layerId];

    if (!layer) {
      throw new Error(`Unknown layer: ${layerId}`);
    }

    this.log(`Starting layer ${layerId}: ${layer.name}`);
    this.emit('onLayerStart', { layerId, layer, position: currentState.position });
    this.eventLogger.layerStart(layerId, layer.name, currentState.position.epic);
    this.webhook.layerStart(layerId, layer.name, currentState.position.epic);

    // Check for human gate
    if (layer.humanGate) {
      const gateStatus = currentState.gates?.[layerId]?.status;
      if (gateStatus !== 'approved' && !this.options.autoApproveGates) {
        this.log(`Human gate at ${layerId} - waiting for approval`);
        this.emit('onHumanGateRequired', { layerId, layer });
        this.eventLogger.gateWaiting(layerId);
        return {
          status: 'waiting_human',
          layerId,
          message: `Layer ${layerId} requires human approval before proceeding`
        };
      }
    }

    // Create spawn configuration
    const spawnConfig = await this.spawner.createSpawnConfig(
      layerId,
      currentState.position
    );

    this.log(`Spawning ${spawnConfig.agentType} agent for ${layerId}`);
    this.emit('onAgentSpawn', spawnConfig);

    // Return the spawn configuration for external execution
    // In a full implementation, this would actually spawn the agent
    return {
      status: 'spawn',
      layerId,
      spawnConfig,
      message: `Ready to spawn ${spawnConfig.agentType} for ${layerId}`
    };
  }

  /**
   * Handle layer completion
   * @param {string} layerId - Completed layer
   * @param {Object} artifacts - Artifacts produced by the agent
   */
  async onLayerComplete(layerId, artifacts = {}) {
    this.log(`Layer ${layerId} complete, validating outputs...`);

    // Validate outputs
    const validationResult = await this.validator.validateLayer(layerId);
    this.emit('onValidationResult', { layerId, result: validationResult });

    if (!validationResult.passed) {
      this.log(`Validation failed for ${layerId}:`, validationResult.errors);
      return {
        status: 'validation_failed',
        layerId,
        errors: validationResult.errors,
        message: 'Layer outputs did not pass validation'
      };
    }

    this.log(`Validation passed for ${layerId}`);

    // If this is a review layer (L3-L7 plan review, L9-L11 build review), route the result
    const isReviewLayer = ['L3', 'L4', 'L5', 'L6', 'L7', 'L9', 'L10', 'L11'].includes(layerId);

    if (isReviewLayer && artifacts.reviewResult) {
      const verdict = artifacts.reviewResult.verdict || 'unknown';
      const issues = artifacts.reviewResult.issues || [];
      this.eventLogger.verdict(layerId, verdict, issues);
      this.notifier.reviewVerdict(layerId, verdict, issues.length);
      this.webhook.verdict(layerId, verdict, issues);
      return await this.handleReviewResult(layerId, artifacts.reviewResult);
    }

    // Otherwise, advance to next layer
    const routingDecision = await this.state.advance();
    this.emit('onRoutingDecision', routingDecision);
    this.emit('onLayerComplete', { layerId, next: routingDecision.to });
    this.eventLogger.layerEnd(layerId, routingDecision.to);
    this.notifier.layerTransition(layerId, routingDecision.to);
    this.webhook.layerEnd(layerId, routingDecision.to);

    return {
      status: 'advanced',
      from: layerId,
      to: routingDecision.to,
      message: `Advanced from ${layerId} to ${routingDecision.to}`
    };
  }

  /**
   * Handle review result from Judge
   * @param {string} layerId - Layer that was reviewed
   * @param {Object} reviewResult - Review result with verdict and issues
   */
  async handleReviewResult(layerId, reviewResult) {
    this.log(`Processing review result for ${layerId}:`, reviewResult.verdict);

    const routingDecision = await this.router.route(reviewResult);
    this.emit('onRoutingDecision', routingDecision);

    if (routingDecision.action === 'human_required') {
      this.log('Human intervention required');
      this.emit('onHumanGateRequired', routingDecision);
      return {
        status: 'human_required',
        ...routingDecision
      };
    }

    return {
      status: routingDecision.action,
      ...routingDecision
    };
  }

  /**
   * Approve a human gate
   * @param {string} layerId - Gate layer (L3 or L7)
   */
  async approveGate(layerId) {
    this.log(`Approving human gate at ${layerId}`);
    this.eventLogger.gateApproval(layerId);
    const result = await this.state.approveGate(layerId);
    return result;
  }

  /**
   * Get current project status
   */
  async getStatus() {
    const state = await this.state.read();
    return {
      position: state.position,
      progress: this.state.getProgress(),
      gates: state.gates,
      layer: LAYERS[state.position.layer],
      costs: this.costs.getSummary()
    };
  }

  /**
   * Run a full layer cycle (spawn, execute, validate, route)
   * This is a high-level orchestration method.
   *
   * @param {AgentExecutor} agentExecutor - Function that executes an agent and returns artifacts.
   * @returns {Promise<Object>} Result of the layer cycle.
   */
  /**
   * @typedef {Function} AgentExecutor
   * @description A function that receives a spawn configuration and executes an agent.
   *   It must return (or resolve to) an artifacts object containing the agent's outputs.
   *   If the layer is a review layer, the artifacts object should include a `reviewResult`
   *   property with `verdict` ('PASS'|'ITERATE') and `issues` (array of {title, severity}).
   * @param {Object} spawnConfig - The spawn configuration from AgentSpawner.createSpawnConfig().
   * @param {string} spawnConfig.agentType - The agent type ('planner', 'builder', or 'judge').
   * @param {string} spawnConfig.model - The model to use.
   * @param {string} spawnConfig.layerId - The layer being executed.
   * @param {string} spawnConfig.prompt - The assembled prompt.
   * @param {Object} spawnConfig.permissions - Tool permissions for the agent.
   * @param {Object} spawnConfig.context - Context files and metadata.
   * @returns {Promise<Object>} Artifacts produced by the agent execution.
   */
  async runLayerCycle(agentExecutor) {
    // 1. Run next layer
    const spawnResult = await this.runNextLayer();

    if (spawnResult.status !== 'spawn') {
      return spawnResult; // Waiting for human, complete, etc.
    }

    // Dry-run mode: return spawn config without executing
    if (this.options.dryRun) {
      this.log(`[DRY RUN] Would spawn ${spawnResult.spawnConfig.agentType} for ${spawnResult.layerId}`);
      return {
        status: 'dry_run',
        layerId: spawnResult.layerId,
        spawnConfig: spawnResult.spawnConfig,
        message: `Dry run: would spawn ${spawnResult.spawnConfig.agentType} agent for ${spawnResult.layerId}`
      };
    }

    // 2. Execute the agent with retry on crash/timeout.
    //    Retries use exponential backoff (1s, 2s, 4s) up to maxRetries times.
    //    Only actual errors (crashes, timeouts) are retried — ITERATE verdicts
    //    are handled by the routing system, not retries.
    const maxRetries = this.options.maxRetries !== undefined ? this.options.maxRetries : 3;
    let artifacts;
    let lastError;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      if (attempt > 0) {
        const backoffMs = 1000 * Math.pow(2, attempt - 1); // 1s, 2s, 4s
        this.log(`Retry ${attempt}/${maxRetries} for ${spawnResult.layerId} after ${backoffMs}ms backoff`);
        this.eventLogger.log({
          type: 'agent_retry',
          message: `Retry ${attempt}/${maxRetries} after ${backoffMs}ms`,
          meta: { layerId: spawnResult.layerId, attempt, backoffMs, error: lastError?.message }
        });
        await new Promise(resolve => setTimeout(resolve, backoffMs));
      }

      try {
        artifacts = await this._executeAgent(agentExecutor, spawnResult);
        lastError = null;
        break; // Success — exit retry loop
      } catch (err) {
        lastError = err;
        this.log(`Agent execution error (attempt ${attempt + 1}/${maxRetries + 1}): ${err.message}`);

        if (attempt === maxRetries) {
          // All retries exhausted
          this.emit('onError', {
            type: 'agent_error',
            layerId: spawnResult.layerId,
            error: err.message,
            attempts: attempt + 1
          });
          this.eventLogger.error(spawnResult.layerId, `Failed after ${attempt + 1} attempts: ${err.message}`);
          this.notifier.error(spawnResult.layerId, err.message);
          this.webhook.error(spawnResult.layerId, err.message);
          return {
            status: 'error',
            layerId: spawnResult.layerId,
            error: err.message,
            attempts: attempt + 1,
            message: `Agent execution failed after ${attempt + 1} attempts: ${err.message}`
          };
        }
      }
    }

    // 3. Record token usage if provided by the agent executor
    if (artifacts && artifacts.tokenUsage) {
      const { inputTokens = 0, outputTokens = 0 } = artifacts.tokenUsage;
      this.costs.record(spawnResult.layerId, inputTokens, outputTokens);
      this.emit('onCostUpdate', {
        layerId: spawnResult.layerId,
        inputTokens,
        outputTokens,
        totals: this.costs.getSummary().totals
      });
    }

    // 4. Handle completion
    return await this.onLayerComplete(spawnResult.layerId, artifacts);
  }

  /**
   * Execute a single agent attempt with timeout and subprocess kill enforcement.
   * Extracted from runLayerCycle to support retry logic.
   *
   * @param {Function} agentExecutor - Agent executor function
   * @param {Object} spawnResult - Result from runNextLayer()
   * @returns {Promise<Object>} Artifacts from the agent
   * @throws {Error} On timeout or agent crash
   * @private
   */
  async _executeAgent(agentExecutor, spawnResult) {
    const timeout = this.options.agentTimeout;

    if (timeout && timeout > 0) {
      const abortController = new AbortController();
      /** @type {import('child_process').ChildProcess|null} */
      let childProcess = null;

      // Allow executor to register its subprocess for kill enforcement
      spawnResult.spawnConfig.abortSignal = abortController.signal;
      spawnResult.spawnConfig.registerProcess = (proc) => { childProcess = proc; };

      let timeoutId;
      const timeoutPromise = new Promise((_, reject) => {
        timeoutId = setTimeout(() => {
          // Kill the subprocess if one was registered
          if (childProcess && !childProcess.killed) {
            try {
              // Try SIGTERM first, then SIGKILL after 5 seconds
              childProcess.kill('SIGTERM');
              setTimeout(() => {
                if (childProcess && !childProcess.killed) {
                  childProcess.kill('SIGKILL');
                }
              }, 5000);
            } catch {
              // Process may have already exited
            }
          }
          abortController.abort();
          reject(new Error(
            `Agent execution timed out after ${timeout}ms at layer ${spawnResult.layerId}`
          ));
        }, timeout);
      });

      try {
        const artifacts = await Promise.race([
          agentExecutor(spawnResult.spawnConfig),
          timeoutPromise
        ]);
        clearTimeout(timeoutId);
        return artifacts;
      } catch (err) {
        clearTimeout(timeoutId);
        throw err; // Let retry loop handle it
      }
    } else {
      return await agentExecutor(spawnResult.spawnConfig);
    }
  }

  /**
   * Run L8 build scoped to a single epic, then L9 review for that epic.
   * Prevents the Builder from trying all epics in one pass (V3.1 improvement).
   * @param {Function} agentExecutor - Agent executor function
   * @param {string} epicName - Epic to build
   */
  async runEpicCycle(agentExecutor, epicName) {
    this.log(`Starting epic cycle for: ${epicName}`);

    // Set position to this epic
    const state = await this.state.read();
    state.position.epic = epicName;
    state.position.layer = 'L8';
    await this.state.write();

    // Run L8 build for this epic
    let buildResult = await this.runLayerCycle(agentExecutor);
    if (buildResult.status === 'error') return buildResult;

    // Run L9 review for this epic
    state.position.layer = 'L9';
    await this.state.write();

    let reviewResult = await this.runLayerCycle(agentExecutor);

    // Handle ITERATE loops for this epic (max 3 retries)
    let iterations = 0;
    while (reviewResult.action === 'cascade' || reviewResult.action === 'iterate') {
      iterations++;
      if (iterations > 3) {
        this.log(`Epic ${epicName} exceeded max iterations, escalating`);
        return { ...reviewResult, epicEscalated: true };
      }
      this.log(`Epic ${epicName} iteration ${iterations + 1}`);
      const cycleResult = await this.runLayerCycle(agentExecutor);
      if (cycleResult.status === 'error' || cycleResult.status === 'human_required') {
        return cycleResult;
      }
      reviewResult = await this.runLayerCycle(agentExecutor);
    }

    this.log(`Epic ${epicName} passed review`);
    return { status: 'epic_complete', epic: epicName };
  }

  /**
   * Get list of epics from L4 artifacts
   */
  async getEpicList() {
    const fs = require('fs').promises;
    const epicDirs = [];
    const featuresPath = path.join(this.projectRoot, '5-features');
    try {
      const entries = await fs.readdir(featuresPath, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory() && !entry.name.startsWith('.')) {
          epicDirs.push(entry.name);
        }
      }
    } catch {
      // No features dir yet
    }
    return epicDirs;
  }

  /**
   * Run the full project through all layers.
   * At L8, iterates one epic at a time with L9 review per epic (V3.1 improvement).
   * @param {Function} agentExecutor - Function that executes an agent and returns artifacts
   */
  async runProject(agentExecutor) {
    let result;

    // Start stall detector for the duration of the project run
    this.stallDetector.start();

    try {
    do {
      const state = await this.state.read();

      // Per-epic build cycle at L8
      if (state.position.layer === 'L8') {
        const epics = await this.getEpicList();
        this.log(`Running per-epic build cycle for ${epics.length} epics`);

        for (const epic of epics) {
          const epicResult = await this.runEpicCycle(agentExecutor, epic);
          if (epicResult.status === 'error' || epicResult.status === 'human_required') {
            return epicResult;
          }
          if (epicResult.epicEscalated) {
            this.log(`Epic ${epic} escalated, halting`);
            return epicResult;
          }
        }

        // All epics passed L9, advance to L10
        this.log('All epics passed L9, advancing to L10');
        await this.state.read();
        this.state.state.position.layer = 'L10';
        this.state.state.position.epic = null;
        await this.state.write();
        continue;
      }

      result = await this.runLayerCycle(agentExecutor);

      if (result.status === 'waiting_human') {
        this.log('Pausing for human approval...');
        return result;
      }

      if (result.status === 'human_required') {
        this.log('Human intervention required');
        return result;
      }

      if (result.status === 'validation_failed') {
        this.log('Validation failed, manual intervention needed');
        return result;
      }

    } while (result.to && result.to !== 'COMPLETE');

    if (result.to === 'COMPLETE') {
      this.log('Project complete!');
      this.notifier.projectComplete();
      this.webhook.complete();
      return { status: 'complete', message: 'Project completed successfully' };
    }

    return result;
    } finally {
      this.stallDetector.stop();
    }
  }
}

module.exports = { Ralph, CostTracker };
