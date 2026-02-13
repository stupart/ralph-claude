/**
 * Layer Cake Router
 *
 * Handles pass/fail routing based on Judge verdicts.
 * Implements cascade rules for MINOR/MAJOR/ESCALATE severities.
 */

const { LAYERS } = require('./state-machine');

/**
 * Maximum retry attempts before escalating or notifying human
 */
const MAX_RETRIES = 3;

/**
 * Verdict types
 */
const VERDICT = {
  PASS: 'PASS',
  ITERATE: 'ITERATE'
};

/**
 * Issue severity levels
 */
const SEVERITY = {
  MINOR: 'MINOR',
  MAJOR: 'MAJOR',
  ESCALATE: 'ESCALATE'
};

class Router {
  constructor(stateManager) {
    this.stateManager = stateManager;
  }

  /**
   * Route based on review result
   * @param {Object} reviewResult - Parsed review with verdict and issues
   * @returns {Object} Routing decision
   */
  async route(reviewResult) {
    const state = await this.stateManager.read();
    const currentLayer = state.position.layer;
    const iteration = state.position.iteration;

    // Parse verdict
    const verdict = this.parseVerdict(reviewResult);
    const highestSeverity = this.getHighestSeverity(reviewResult.issues || []);

    if (verdict === VERDICT.PASS) {
      return await this.routePass(currentLayer);
    }

    // Check max retries
    if (iteration > MAX_RETRIES) {
      return await this.routeMaxRetries(currentLayer, highestSeverity, iteration);
    }

    // Route based on severity
    switch (highestSeverity) {
      case SEVERITY.MINOR:
        return await this.routeMinor(currentLayer, iteration);
      case SEVERITY.MAJOR:
        return await this.routeMajor(currentLayer, iteration);
      case SEVERITY.ESCALATE:
        return await this.routeEscalate(currentLayer, iteration);
      default:
        return await this.routeMinor(currentLayer, iteration);
    }
  }

  /**
   * Parse verdict from review result
   */
  parseVerdict(reviewResult) {
    if (!reviewResult) return VERDICT.ITERATE;

    // Check explicit verdict field
    if (reviewResult.verdict) {
      const v = reviewResult.verdict.toUpperCase();
      if (v.includes('PASS')) return VERDICT.PASS;
      if (v.includes('ITERATE') || v.includes('FAIL')) return VERDICT.ITERATE;
    }

    // Check for issues - if any exist, it's ITERATE
    if (reviewResult.issues && reviewResult.issues.length > 0) {
      return VERDICT.ITERATE;
    }

    return VERDICT.PASS;
  }

  /**
   * Get highest severity from issues
   */
  getHighestSeverity(issues) {
    const severityOrder = [SEVERITY.MINOR, SEVERITY.MAJOR, SEVERITY.ESCALATE];
    let highest = SEVERITY.MINOR;

    for (const issue of issues) {
      const severity = issue.severity?.toUpperCase() || SEVERITY.MINOR;
      if (severityOrder.indexOf(severity) > severityOrder.indexOf(highest)) {
        highest = severity;
      }
    }

    return highest;
  }

  /**
   * Route on PASS verdict
   */
  async routePass(currentLayer) {
    const result = await this.stateManager.advance();

    return {
      action: 'advance',
      from: currentLayer,
      to: result.to || result.layer,
      reason: 'Review passed',
      log: `PASS at ${currentLayer}, advancing to ${result.to || 'COMPLETE'}`
    };
  }

  /**
   * Route on MINOR severity
   */
  async routeMinor(currentLayer, iteration) {
    const layerDef = LAYERS[currentLayer];
    let targetLayer = currentLayer;

    // For review layers, MINOR goes to Builder (L8). Null check: typeof null === 'object' in JS.
    if (layerDef?.onFail && typeof layerDef.onFail === 'object' && layerDef.onFail.minor) {
      targetLayer = layerDef.onFail.minor;
    } else if (typeof layerDef?.onFail === 'string') {
      targetLayer = layerDef.onFail;
    }

    // If same layer, iterate; otherwise cascade
    if (targetLayer === currentLayer) {
      const result = await this.stateManager.iterate();
      return {
        action: 'iterate',
        layer: currentLayer,
        iteration: result.iteration,
        reason: 'Minor issues to fix at current layer',
        log: `ITERATE (MINOR) at ${currentLayer}, iteration ${result.iteration}`
      };
    } else {
      const result = await this.stateManager.cascade(targetLayer);
      return {
        action: 'cascade',
        from: currentLayer,
        to: targetLayer,
        reason: 'Minor issues require code fixes',
        log: `CASCADE (MINOR) from ${currentLayer} to ${targetLayer}`
      };
    }
  }

  /**
   * Route on MAJOR severity
   */
  async routeMajor(currentLayer, iteration) {
    const layerDef = LAYERS[currentLayer];
    let targetLayer;

    // Get target from layer definition (null check: typeof null === 'object' in JS)
    if (layerDef?.onFail && typeof layerDef.onFail === 'object' && layerDef.onFail.major) {
      targetLayer = layerDef.onFail.major;
    } else if (typeof layerDef?.onFail === 'string') {
      targetLayer = layerDef.onFail;
    } else {
      // Default: go back one layer
      const layerNum = parseInt(currentLayer.slice(1));
      targetLayer = `L${Math.max(1, layerNum - 1)}`;
    }

    const result = await this.stateManager.cascade(targetLayer);

    return {
      action: 'cascade',
      from: currentLayer,
      to: targetLayer,
      reason: 'Major issues require specification revision',
      log: `CASCADE (MAJOR) from ${currentLayer} to ${targetLayer}`
    };
  }

  /**
   * Route on ESCALATE severity
   */
  async routeEscalate(currentLayer, iteration) {
    const layerDef = LAYERS[currentLayer];
    let targetLayer;

    // Get escalation target from layer definition (null check: typeof null === 'object' in JS)
    if (layerDef?.onFail && typeof layerDef.onFail === 'object' && layerDef.onFail.escalate) {
      targetLayer = layerDef.onFail.escalate;
    } else {
      // Default: go back two layers
      const layerNum = parseInt(currentLayer.slice(1));
      targetLayer = `L${Math.max(1, layerNum - 2)}`;
    }

    const result = await this.stateManager.cascade(targetLayer);

    return {
      action: 'cascade',
      from: currentLayer,
      to: targetLayer,
      reason: 'Escalated issues require fundamental rethinking',
      log: `CASCADE (ESCALATE) from ${currentLayer} to ${targetLayer}`
    };
  }

  /**
   * Handle max retries exceeded
   */
  async routeMaxRetries(currentLayer, severity, iteration) {
    // Escalate severity level
    let escalatedSeverity;
    let nextAction;

    switch (severity) {
      case SEVERITY.MINOR:
        escalatedSeverity = SEVERITY.MAJOR;
        nextAction = await this.routeMajor(currentLayer, iteration);
        break;
      case SEVERITY.MAJOR:
        escalatedSeverity = SEVERITY.ESCALATE;
        nextAction = await this.routeEscalate(currentLayer, iteration);
        break;
      case SEVERITY.ESCALATE:
        // Already at highest severity, notify human
        return {
          action: 'human_required',
          layer: currentLayer,
          iteration: iteration,
          reason: `Max retries (${MAX_RETRIES}) exceeded at ESCALATE severity`,
          log: `HUMAN REQUIRED: Max retries at ${currentLayer} with ESCALATE severity`,
          notification: {
            title: 'Layer Cake: Human Decision Required',
            message: `Layer ${currentLayer} has exceeded ${MAX_RETRIES} iterations with ESCALATE severity. Manual intervention needed.`,
            options: ['Force advance', 'Continue iterating', 'Abort project']
          }
        };
    }

    return {
      ...nextAction,
      escalated: true,
      previousSeverity: severity,
      newSeverity: escalatedSeverity,
      log: `${nextAction.log} (escalated from ${severity} after ${iteration} retries)`
    };
  }

  /**
   * Parse review file content into structured result
   */
  parseReviewFile(content) {
    const result = {
      verdict: null,
      issues: [],
      summary: ''
    };

    // Extract verdict
    const verdictMatch = content.match(/##\s*Verdict:\s*(PASS|ITERATE|FAIL)/i);
    if (verdictMatch) {
      result.verdict = verdictMatch[1].toUpperCase();
      if (result.verdict === 'FAIL') result.verdict = 'ITERATE'; // Normalize
    }

    // Extract summary
    const summaryMatch = content.match(/##\s*Summary\s*\n([\s\S]*?)(?=\n##|$)/i);
    if (summaryMatch) {
      result.summary = summaryMatch[1].trim();
    }

    // Extract issues
    const issuePattern = /###\s*(Issue\s*\d*:?)?\s*(.+?)\n.*?Severity:\s*(MINOR|MAJOR|ESCALATE)/gi;
    let match;
    while ((match = issuePattern.exec(content)) !== null) {
      result.issues.push({
        title: match[2].trim(),
        severity: match[3].toUpperCase()
      });
    }

    return result;
  }

  /**
   * Generate routing log entry
   */
  createLogEntry(decision) {
    return {
      timestamp: new Date().toISOString(),
      action: decision.action,
      from: decision.from,
      to: decision.to,
      reason: decision.reason
    };
  }
}

module.exports = { Router, VERDICT, SEVERITY, MAX_RETRIES };
