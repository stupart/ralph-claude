const readline = require('readline');
const fs = require('fs').promises;
const path = require('path');

/**
 * Format a gate summary for human display.
 * @param {Object} summary - Summary object from gate-summarizer
 * @param {string} gateType - 'L3' or 'L7'
 * @returns {string} Formatted text for display
 */
function formatSummary(summary, gateType) {
  const lines = [];

  if (gateType === 'L3') {
    lines.push('=== L3 Synthesis Gate ===');
    lines.push(`JTBD Count: ${summary.jtbdCount}`);
    lines.push(`Journeys (${summary.journeys.length}):`);
    for (const journey of summary.journeys) {
      lines.push(`  - ${journey}`);
    }
    lines.push(`Architecture Components: ${summary.componentCount}`);
    lines.push(`Architecture Decisions: ${summary.decisionCount}`);
  } else if (gateType === 'L7') {
    lines.push('=== L7 Plan Gate ===');
    lines.push(`Epics: ${summary.epics}`);
    lines.push(`Features: ${summary.features}`);
    lines.push(`Tasks: ${summary.tasks}`);
    lines.push(`Subtasks: ${summary.subtasks}`);
    lines.push(`JTBD Coverage: ${summary.jtbdCoverage.join(', ') || 'none'}`);
  }

  lines.push('');
  return lines.join('\n');
}

/**
 * Prompt user for gate approval.
 * @param {Object} summary - Summary object from gate-summarizer
 * @param {string} gateType - 'L3' or 'L7'
 * @param {Object} [options] - Options: { input, output, autoApprove }
 * @returns {Promise<{approved: boolean, feedback?: string}>}
 */
async function promptGate(summary, gateType, options = {}) {
  const input = options.input || process.stdin;
  const output = options.output || process.stdout;

  // Auto-approve check (takes precedence over non-TTY)
  if (options.autoApprove) {
    return { approved: true };
  }

  // Non-TTY detection (piped stdin, CI environment)
  // Only check when using real process.stdin, not DI streams
  if (input === process.stdin && !process.stdin.isTTY) {
    const warning = `[WARN] Non-TTY stdin detected at ${gateType} gate - auto-approving\n`;
    process.stderr.write(warning);
    return { approved: true };
  }

  const rl = readline.createInterface({ input, output });

  return new Promise((resolve, reject) => {
    const formattedSummary = formatSummary(summary, gateType);
    output.write(formattedSummary);

    let resolved = false;

    const askQuestion = () => {
      rl.question('[approve/reject/feedback] > ', (answer) => {
        const trimmed = answer.trim();

        if (trimmed === '') {
          askQuestion();
          return;
        }

        const normalized = trimmed.toLowerCase();

        if (normalized === 'approve') {
          resolved = true;
          rl.close();
          resolve({ approved: true });
        } else if (normalized === 'reject') {
          resolved = true;
          rl.close();
          resolve({ approved: false, feedback: null });
        } else {
          // Any other text is feedback
          resolved = true;
          rl.close();
          resolve({ approved: false, feedback: trimmed });
        }
      });
    };

    askQuestion();

    rl.on('close', () => {
      if (!resolved) {
        reject(new Error('Gate prompt closed without input (user interrupt)'));
      }
    });
  });
}

/**
 * Store gate rejection feedback to filesystem.
 * @param {string} projectRoot - Absolute path to project root
 * @param {string} layerId - Layer ID (e.g., 'L3')
 * @param {string} feedback - User feedback text (verbatim)
 * @returns {Promise<void>}
 */
async function storeFeedback(projectRoot, layerId, feedback) {
  const feedbackPath = path.join(projectRoot, '_gate-feedback.md');

  const content = [
    '# Gate Feedback',
    '',
    `## Layer: ${layerId}`,
    '',
    feedback,
    '',
    `_Stored at: ${new Date().toISOString()}_`
  ].join('\n');

  await fs.writeFile(feedbackPath, content, 'utf-8');
}

/**
 * Read stored feedback for a layer.
 * @param {string} projectRoot - Absolute path to project root
 * @param {string} layerId - Layer ID (e.g., 'L3')
 * @returns {Promise<string|null>} Feedback text or null if none stored
 */
async function readFeedback(projectRoot, layerId) {
  const feedbackPath = path.join(projectRoot, '_gate-feedback.md');

  try {
    const content = await fs.readFile(feedbackPath, 'utf-8');

    // Extract layer ID from content
    const layerMatch = content.match(/^##\s+Layer:\s+(.+)$/m);
    if (!layerMatch || layerMatch[1] !== layerId) {
      return null; // Feedback is for a different layer
    }

    // Extract feedback text (everything between layer header and timestamp)
    const feedbackMatch = content.match(/^##\s+Layer:.*\n\n([\s\S]*?)\n\n_Stored at:/m);
    if (!feedbackMatch) return null;

    return feedbackMatch[1].trim();
  } catch (e) {
    if (e.code === 'ENOENT') return null;
    throw e;
  }
}

/**
 * Clear stored feedback for a layer.
 * @param {string} projectRoot - Absolute path to project root
 * @param {string} layerId - Layer ID (e.g., 'L3')
 * @returns {Promise<void>}
 */
async function clearFeedback(projectRoot, layerId) {
  const feedbackPath = path.join(projectRoot, '_gate-feedback.md');

  try {
    // Read current content to check layer
    const content = await fs.readFile(feedbackPath, 'utf-8');
    const layerMatch = content.match(/^##\s+Layer:\s+(.+)$/m);

    // Only delete if this is the matching layer's feedback
    if (layerMatch && layerMatch[1] === layerId) {
      await fs.unlink(feedbackPath);
    }
  } catch (e) {
    if (e.code === 'ENOENT') return; // Already cleared
    throw e;
  }
}

module.exports = { formatSummary, promptGate, storeFeedback, readFeedback, clearFeedback };
