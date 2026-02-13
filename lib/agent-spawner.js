/**
 * Layer Cake Agent Spawner
 *
 * Spawns Claude agents with the correct prompts, context, and tool permissions
 * based on the current layer and agent type.
 */

const fs = require('fs').promises;
const path = require('path');

/**
 * CRITICAL: All agents MUST use Opus.
 * This was a key learning from the meta-test session - Haiku was accidentally
 * used for Judge reviews and produced inferior results. Opus is required for
 * the quality of analysis, planning, and review that Layer Cake demands.
 */
const AGENT_MODEL = 'opus';

/**
 * Normalizes agent type names to canonical form.
 * The HTML blueprint uses "reviewer" while the orchestration code uses "judge".
 * This function ensures consistency regardless of which term is used as input.
 * See: V3.1 improvement #3 (naming convention enforcement)
 */
function normalizeAgentType(agentType) {
  const AGENT_ALIASES = {
    reviewer: 'judge',
    review: 'judge',
    plan: 'planner',
    build: 'builder'
  };
  return AGENT_ALIASES[agentType] || agentType;
}

/**
 * Layer to agent type mapping
 */
const LAYER_AGENTS = {
  L1: 'planner',
  L2: 'planner',
  L3: 'planner',
  L4: 'planner',
  L5: 'planner',
  L6: 'planner',
  L7: 'planner',
  L8: 'builder',
  L9: 'judge',
  L10: 'judge',
  L11: 'judge',
  L12: 'planner'
};

/**
 * Agent configurations including model requirements
 */
const AGENT_CONFIGS = {
  planner: {
    model: AGENT_MODEL,
    description: 'Planning agent for L1-L7 and L12'
  },
  builder: {
    model: AGENT_MODEL,
    description: 'Implementation agent for L8'
  },
  judge: {
    model: AGENT_MODEL,
    description: 'Adversarial review agent for plan reviews and L9-L11'
  }
};

/**
 * Tool permissions per agent type
 */
const TOOL_PERMISSIONS = {
  planner: {
    allowed: ['Read', 'Write', 'Glob', 'Grep'],
    forbidden: ['Edit', 'Bash', 'NotebookEdit', '/chrome']
  },
  builder: {
    allowed: ['Read', 'Write', 'Edit', 'Bash', 'Glob', 'Grep', 'NotebookEdit'],
    forbidden: ['/chrome']
  },
  judge: {
    allowed: ['Read', 'Glob', 'Grep'],
    limited: { Bash: 'tests_only' },
    optional: ['/chrome'], // Available but not mandatory - fallback to code review if unavailable
    forbidden: ['Write', 'Edit', 'NotebookEdit']
  }
};

/**
 * Context files to load per layer
 */
const LAYER_CONTEXT = {
  L1: {
    load: [],
    description: 'Gather inputs from brain dumps and existing documentation'
  },
  L2: {
    load: ['1-input/*'],
    description: 'Decompose inputs into patterns, quotes, and affinities'
  },
  L3: {
    load: ['1-input/*', '2-decomposition/*'],
    description: 'Synthesize decomposition into JTBD, journeys, and architecture'
  },
  L4: {
    load: ['3-synthesis/*'],
    description: 'Define epics based on synthesis'
  },
  L5: {
    load: ['3-synthesis/*', '4-epics/*'],
    description: 'Plan features for each epic'
  },
  L6: {
    load: ['5-features/{{epic}}/*'],
    description: 'Specify tasks for each feature'
  },
  L7: {
    load: ['5-features/{{epic}}/{{feature}}.md', '6-tasks/{{epic}}/{{feature}}/*'],
    description: 'Define subtasks for each task'
  },
  L8: {
    load: ['7-subtasks/{{epic}}/{{feature}}/{{task}}.md'],
    description: 'Implement subtasks'
  },
  L9: {
    load: ['5-features/{{epic}}/{{feature}}.md', '7-subtasks/{{epic}}/{{feature}}/*'],
    description: 'Review completed feature'
  },
  L10: {
    load: ['4-epics/epics.md', '5-features/{{epic}}/*'],
    description: 'Review epic integration'
  },
  L11: {
    load: ['3-synthesis/*', '4-epics/*'],
    description: 'Final review of entire project'
  },
  L12: {
    load: ['*-*/*'],
    description: 'Retrospective and learnings'
  }
};

class AgentSpawner {
  constructor(projectRoot, templatesPath = null) {
    this.projectRoot = projectRoot;
    this.templatesPath = templatesPath || path.join(projectRoot, 'templates', 'agents');
  }

  /**
   * Get the agent type for a layer
   * @param {string} layerId - Layer ID (e.g., 'L4')
   * @returns {string} Agent type ('planner', 'builder', or 'judge')
   */
  getAgentType(layerId) {
    return LAYER_AGENTS[layerId] || 'planner';
  }

  /**
   * Get tool permissions for an agent type
   * @param {string} agentType - Agent type (accepts aliases like "reviewer" -> "judge")
   * @returns {Object} Tool permissions
   */
  getToolPermissions(agentType) {
    const normalized = normalizeAgentType(agentType);
    return TOOL_PERMISSIONS[normalized] || TOOL_PERMISSIONS.planner;
  }

  /**
   * Load prompt template for agent/layer
   * @param {string} agentType - Agent type
   * @param {string} layerId - Layer ID (optional, for layer-specific prompts)
   * @returns {string} Prompt template
   */
  async loadPromptTemplate(agentType, layerId = null) {
    // Try layer-specific prompt first
    if (layerId) {
      const layerPromptPath = path.join(this.templatesPath, `${agentType}-${layerId}.md`);
      try {
        return await fs.readFile(layerPromptPath, 'utf8');
      } catch {
        // Fall through to base prompt
      }

      // Try judge layer-specific prompts
      if (agentType === 'judge') {
        const judgeLayerPath = path.join(this.templatesPath, `judge-${layerId.toLowerCase()}-*.md`);
        // Check for judge-L3-synthesis.md, judge-L9-feature-review.md, etc.
        const variations = [
          `judge-${layerId}-synthesis.md`,
          `judge-${layerId}-epics.md`,
          `judge-${layerId}-feature-review.md`,
          `judge-${layerId.toLowerCase()}-${layerId.toLowerCase()}-reviews.md`
        ];
        for (const variation of variations) {
          try {
            const content = await fs.readFile(path.join(this.templatesPath, variation), 'utf8');
            return content;
          } catch {
            continue;
          }
        }
      }
    }

    // Load base prompt - try both naming conventions to avoid unnecessary file read errors
    const basePath = path.join(this.templatesPath, `${agentType}-base.md`);
    const altPath = path.join(this.templatesPath, `${agentType}.md`);

    // Check which file exists first to avoid noisy ENOENT fallbacks
    for (const tryPath of [basePath, altPath]) {
      try {
        return await fs.readFile(tryPath, 'utf8');
      } catch {
        continue;
      }
    }
    throw new Error(`No prompt template found for ${agentType} (tried ${agentType}-base.md and ${agentType}.md)`);
  }

  /**
   * Assemble context package for agent
   * @param {string} layerId - Current layer
   * @param {Object} position - Current position (epic, feature, task)
   * @returns {Object} Context package with files and metadata
   */
  async assembleContext(layerId, position = {}) {
    const layerContext = LAYER_CONTEXT[layerId];
    const context = {
      layer: layerId,
      description: layerContext?.description || '',
      files: [],
      position: position
    };

    if (!layerContext?.load) return context;

    for (const pattern of layerContext.load) {
      // Replace placeholders with actual values
      let resolvedPattern = pattern
        .replace('{{epic}}', position.epic || '*')
        .replace('{{feature}}', position.feature || '*')
        .replace('{{task}}', position.task || '*');

      // Find matching files
      const files = await this.findFiles(resolvedPattern);
      context.files.push(...files);
    }

    return context;
  }

  /**
   * Find files matching a glob-like pattern
   * @param {string} pattern - Pattern to match
   * @returns {string[]} Matching file paths
   */
  async findFiles(pattern) {
    const files = [];
    const parts = pattern.split('/');
    await this.findFilesRecursive(this.projectRoot, parts, 0, files);
    return files;
  }

  async findFilesRecursive(basePath, parts, index, files) {
    if (index >= parts.length) return;

    const part = parts[index];
    const isLast = index === parts.length - 1;

    try {
      const entries = await fs.readdir(basePath, { withFileTypes: true });

      for (const entry of entries) {
        if (entry.name.startsWith('.')) continue;

        const matches = this.matchesPattern(entry.name, part);
        if (!matches) continue;

        const fullPath = path.join(basePath, entry.name);

        if (isLast) {
          if (entry.isFile() || (entry.isDirectory() && part.endsWith('/*'))) {
            files.push(fullPath);
          }
        } else if (entry.isDirectory()) {
          await this.findFilesRecursive(fullPath, parts, index + 1, files);
        }
      }
    } catch {
      // Directory doesn't exist or can't be read
    }
  }

  /**
   * Check if name matches pattern (supports * wildcard)
   */
  matchesPattern(name, pattern) {
    if (pattern === '*') return true;
    if (!pattern.includes('*')) return name === pattern;

    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    return regex.test(name);
  }

  /**
   * Create spawn configuration for a layer
   * @param {string} layerId - Layer to spawn for
   * @param {Object} position - Current position in hierarchy
   * @param {Object} handoff - Handoff context from previous agent
   * @returns {Object} Spawn configuration
   */
  async createSpawnConfig(layerId, position = {}, handoff = null) {
    const agentType = this.getAgentType(layerId);
    const permissions = this.getToolPermissions(agentType);
    const prompt = await this.loadPromptTemplate(agentType, layerId);
    const context = await this.assembleContext(layerId, position);

    // Build layer instructions for prompt
    const layerInstructions = this.buildLayerInstructions(layerId, position);

    // Replace placeholder in prompt
    const finalPrompt = prompt.replace('{{LAYER_INSTRUCTIONS}}', layerInstructions);

    const agentConfig = AGENT_CONFIGS[agentType] || { model: AGENT_MODEL };

    return {
      agentType,
      model: agentConfig.model,
      layerId,
      prompt: finalPrompt,
      permissions,
      context,
      handoff,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Build layer-specific instructions
   */
  buildLayerInstructions(layerId, position) {
    const layerContext = LAYER_CONTEXT[layerId];
    const lines = [
      `## Layer ${layerId} Instructions`,
      '',
      `**Goal:** ${layerContext?.description || 'Complete this layer'}`,
      ''
    ];

    // Add position context
    if (position.epic) lines.push(`**Current Epic:** ${position.epic}`);
    if (position.feature) lines.push(`**Current Feature:** ${position.feature}`);
    if (position.task) lines.push(`**Current Task:** ${position.task}`);

    // Add layer-specific instructions
    switch (layerId) {
      case 'L1':
        lines.push('', '1. Read all files in /1-input/', '2. Identify key themes and requirements', '3. Note any gaps or questions');
        break;
      case 'L2':
        lines.push('', '1. Extract quotes from input documents', '2. Identify patterns across inputs', '3. Create affinity groups', '4. Document tensions/contradictions');
        break;
      case 'L3':
        lines.push('', '1. Create Jobs to Be Done (minimum 3)', '2. Map user journeys (minimum 2)', '3. Document architecture decisions', '4. Note constraints');
        break;
      case 'L4':
        lines.push('', '1. Define epics based on JTBD (minimum 3)', '2. Ensure full JTBD coverage', '3. Document dependencies between epics');
        break;
      case 'L5':
        lines.push('', '1. Define features for current epic (minimum 3)', '2. Each feature needs requirements and acceptance criteria', '3. Plan tasks for each feature');
        break;
      case 'L6':
        lines.push('', '1. Define tasks for current feature (minimum 3)', '2. Each task should be 15-30 min of work', '3. Specify files to modify and verification criteria');
        break;
      case 'L7':
        lines.push('', '1. Define subtasks for each task (minimum 2)', '2. Each subtask must be atomic and verifiable', '3. Include code patterns and file paths');
        break;
      case 'L8':
        lines.push('', '1. Implement each subtask exactly as specified', '2. Test after each change', '3. Commit at subtask boundaries');
        break;
      case 'L9':
        lines.push('', '1. Review the implemented feature via code review and tests', '2. If /chrome is available, do a visual UX walkthrough. Otherwise verify via tests and code inspection.', '3. Verify all acceptance criteria', '4. Issue PASS or ITERATE with severity');
        break;
      case 'L10':
        lines.push('', '1. Review epic integration via code review', '2. Test cross-feature interactions', '3. If /chrome is available, test UX integration. Otherwise verify via code.', '4. Verify epic goal is met', '5. Issue PASS or ITERATE with severity');
        break;
      case 'L11':
        lines.push('', '1. Final review of entire project', '2. Walk through all user journeys via tests and code review', '3. If /chrome is available, visual walkthrough. Otherwise verify via code/tests.', '4. Verify ship-worthiness', '5. Issue PASS or ITERATE with severity');
        break;
      case 'L12':
        lines.push('', '1. Document what was learned', '2. Identify methodology improvements', '3. Note what worked and what didn\'t', '4. Archive project artifacts');
        break;
    }

    return lines.join('\n');
  }

  /**
   * Validate tool usage for an agent
   * @param {string} agentType - Agent type
   * @param {string} tool - Tool being used
   * @param {Object} args - Tool arguments
   * @returns {Object} Validation result
   */
  validateToolUsage(agentType, tool, args = {}) {
    const normalized = normalizeAgentType(agentType);
    const permissions = TOOL_PERMISSIONS[normalized];
    if (!permissions) {
      return { allowed: false, error: `Unknown agent type: ${agentType}` };
    }

    if (permissions.forbidden.includes(tool)) {
      return {
        allowed: false,
        error: `${agentType} cannot use ${tool}`,
        reason: `This tool is forbidden for ${agentType} agents`
      };
    }

    if (permissions.limited && permissions.limited[tool]) {
      // Check limited usage (e.g., Bash for tests only)
      const limitation = permissions.limited[tool];
      if (limitation === 'tests_only') {
        const cmd = args.command || '';
        const isTest = /npm test|pytest|jest|vitest|go test|cargo test|make test/i.test(cmd);
        if (!isTest) {
          return {
            allowed: false,
            error: `${agentType} can only use ${tool} for running tests`,
            reason: `Command "${cmd}" does not appear to be a test command`
          };
        }
      }
    }

    if (!permissions.allowed.includes(tool) && !permissions.limited?.[tool]) {
      return {
        allowed: false,
        error: `${tool} is not in allowed list for ${agentType}`
      };
    }

    return { allowed: true };
  }
}

module.exports = { AgentSpawner, AGENT_MODEL, AGENT_CONFIGS, LAYER_AGENTS, TOOL_PERMISSIONS, LAYER_CONTEXT, normalizeAgentType };
