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

class Ralph {
  constructor(projectRoot, options = {}) {
    this.projectRoot = projectRoot;
    this.options = {
      tier: 'small',
      autoApproveGates: false,
      verbose: true,
      /** Timeout in milliseconds for agent execution. 0 means no timeout. Default: 300000 (5 min) */
      agentTimeout: 300000,
      ...options
    };

    // Initialize components
    this.state = new StateManager(projectRoot);
    this.validator = new Validator(projectRoot, this.options.tier);
    this.router = new Router(this.state);
    this.spawner = new AgentSpawner(projectRoot);

    // Event handlers
    this.handlers = {
      onLayerStart: [],
      onLayerComplete: [],
      onAgentSpawn: [],
      onValidationResult: [],
      onRoutingDecision: [],
      onHumanGateRequired: [],
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
   * Initialize a new project or resume an existing one
   */
  async initialize() {
    this.log('Initializing Ralph...');

    // Read current state
    const state = await this.state.read();
    this.log(`Current position: ${state.position.layer}`);

    // Check for incomplete state
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
      '7-subtasks'
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
    const layer = LAYERS[layerId];

    if (!layer) {
      throw new Error(`Unknown layer: ${layerId}`);
    }

    this.log(`Starting layer ${layerId}: ${layer.name}`);
    this.emit('onLayerStart', { layerId, layer, position: currentState.position });

    // Check for human gate
    if (layer.humanGate) {
      const gateStatus = currentState.gates?.[layerId]?.status;
      if (gateStatus !== 'approved' && !this.options.autoApproveGates) {
        this.log(`Human gate at ${layerId} - waiting for approval`);
        this.emit('onHumanGateRequired', { layerId, layer });
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
      return await this.handleReviewResult(layerId, artifacts.reviewResult);
    }

    // Otherwise, advance to next layer
    const routingDecision = await this.state.advance();
    this.emit('onRoutingDecision', routingDecision);
    this.emit('onLayerComplete', { layerId, next: routingDecision.to });

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
      layer: LAYERS[state.position.layer]
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

    // 2. Execute the agent (external execution) with configurable timeout
    let artifacts;
    const timeout = this.options.agentTimeout;

    if (timeout && timeout > 0) {
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error(
            `Agent execution timed out after ${timeout}ms at layer ${spawnResult.layerId}`
          ));
        }, timeout);
      });

      try {
        artifacts = await Promise.race([
          agentExecutor(spawnResult.spawnConfig),
          timeoutPromise
        ]);
      } catch (err) {
        this.log(`Agent execution error: ${err.message}`);
        this.emit('onError', {
          type: 'agent_timeout',
          layerId: spawnResult.layerId,
          error: err.message
        });
        return {
          status: 'error',
          layerId: spawnResult.layerId,
          error: err.message,
          message: `Agent execution failed: ${err.message}`
        };
      }
    } else {
      artifacts = await agentExecutor(spawnResult.spawnConfig);
    }

    // 3. Handle completion
    return await this.onLayerComplete(spawnResult.layerId, artifacts);
  }

  /**
   * Run the full project through all layers
   * @param {Function} agentExecutor - Function that executes an agent and returns artifacts
   */
  async runProject(agentExecutor) {
    let result;

    do {
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
      return { status: 'complete', message: 'Project completed successfully' };
    }

    return result;
  }
}

module.exports = { Ralph };
