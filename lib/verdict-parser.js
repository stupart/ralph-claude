/**
 * VerdictParser - Extracts structured review verdicts from judge agent text
 *
 * Parses judge output to extract:
 * - Verdict: PASS or ITERATE (with multi-format support)
 * - Issues: severity-classified with title and description
 * - Graceful degradation when verdict is unparseable
 */

const fs = require('fs');
const path = require('path');

const VERDICT_PATTERNS = [
  /##\s*Verdict:\s*(PASS|ITERATE)/i,
  /\*\*Verdict\*\*:\s*(PASS|ITERATE)/i,
  /\*\*Verdict:\*\*\s*(PASS|ITERATE)/i,
  /Verdict:\s*(PASS|ITERATE)/i,
  /(?:my|the|final)\s+verdict\s+is\s+(PASS|ITERATE)/i,
  /recommendation:\s*(PASS|ITERATE)/i,
  /^(PASS|ITERATE)\s*$/m,
];

const ISSUE_PATTERN = /^[\s]*[-*]\s*\[(MAJOR|MINOR|ESCALATE)\]\s*(.+?):\s*(.+)$/gim;
const ISSUE_PATTERN_NO_COLON = /^[\s]*[-*]\s*\[(MAJOR|MINOR|ESCALATE)\]\s*(.+)$/gim;

/**
 * @typedef {Object} ReviewResult
 * @property {'PASS'|'ITERATE'} verdict
 * @property {Array<{severity: string, title: string, description: string}>} issues
 * @property {string} rawOutput
 */

class VerdictParser {
  constructor(projectDir = null) {
    this._projectDir = projectDir;
  }

  /**
   * Detect verdict from text using multi-pattern matching.
   * Uses last occurrence (judges may discuss verdicts before stating final one).
   * @param {string} text
   * @returns {string|null} 'PASS', 'ITERATE', or null
   * @private
   */
  _detectVerdict(text) {
    if (!text) return null;

    let lastMatch = null;
    let lastIndex = -1;

    for (const basePattern of VERDICT_PATTERNS) {
      const pattern = new RegExp(basePattern.source, 'gi');
      let match;
      while ((match = pattern.exec(text)) !== null) {
        if (match.index > lastIndex) {
          lastIndex = match.index;
          lastMatch = match[1].toUpperCase();
        }
      }
    }

    return lastMatch;
  }

  /**
   * Extract severity-classified issues from text.
   * Supports both colon-separated (title: description) and plain (title only) formats.
   * @param {string} text
   * @returns {Array<{severity: string, title: string, description: string}>}
   * @private
   */
  _extractIssues(text) {
    if (!text) return [];

    const issues = [];
    const seen = new Set();

    // Try standard pattern first (with colon separator)
    let match;
    const standardPattern = new RegExp(ISSUE_PATTERN.source, 'gim');
    while ((match = standardPattern.exec(text)) !== null) {
      seen.add(match.index);
      issues.push({
        severity: match[1].toUpperCase(),
        title: match[2].trim(),
        description: match[3].trim()
      });
    }

    // Try no-colon pattern for entries not already matched
    const fallbackPattern = new RegExp(ISSUE_PATTERN_NO_COLON.source, 'gim');
    while ((match = fallbackPattern.exec(text)) !== null) {
      if (!seen.has(match.index)) {
        issues.push({
          severity: match[1].toUpperCase(),
          title: match[2].trim(),
          description: ''
        });
      }
    }

    return issues;
  }

  /**
   * Parse judge output into a structured ReviewResult.
   * Never throws — defaults to ITERATE with an Unparseable verdict issue on failure.
   * @param {*} output - Raw judge output (coerced to string)
   * @returns {ReviewResult}
   */
  parse(output, context = {}) {
    const text = String(output ?? '');

    const verdict = this._detectVerdict(text);
    const issues = this._extractIssues(text);

    // Log unparseable verdict when projectDir is set
    if (verdict === null && this._projectDir) {
      try {
        const entry = JSON.stringify({
          timestamp: new Date().toISOString(),
          layer: context.layer || null,
          epic: context.epic || null,
          rawOutput: text.substring(0, 2000)
        });
        fs.appendFileSync(
          path.join(this._projectDir, '_unparseable_verdicts.jsonl'),
          entry + '\n'
        );
      } catch (e) {
        // Fire-and-forget: silently ignore filesystem errors
      }
    }

    // Check for high-severity markers in extracted issues
    const hasHighSeverity = issues.some(i => i.severity === 'MAJOR' || i.severity === 'ESCALATE');

    // PASS contradicted by high-severity issues → override to ITERATE
    if (verdict === 'PASS' && hasHighSeverity) {
      console.warn('VerdictParser: PASS verdict overridden to ITERATE due to MAJOR/ESCALATE issues');
      issues.push({
        severity: 'MINOR',
        title: 'Verdict overridden',
        description: 'PASS verdict contradicted by MAJOR/ESCALATE issues'
      });
      return { verdict: 'ITERATE', issues, rawOutput: text };
    }

    if (verdict === null) {
      // If there are MAJOR/ESCALATE issues, default to ITERATE (safety)
      // If there are only MINOR issues or no issues, default to PASS (benefit of the doubt)
      if (hasHighSeverity) {
        console.warn('VerdictParser: No verdict detected + high-severity issues → ITERATE');
        issues.unshift({
          severity: 'MINOR',
          title: 'Unparseable verdict',
          description: 'No verdict pattern found in judge output. Defaulting to ITERATE due to MAJOR/ESCALATE issues.'
        });
        return { verdict: 'ITERATE', issues, rawOutput: text };
      } else {
        console.warn('VerdictParser: No verdict detected, no high-severity issues → PASS');
        issues.unshift({
          severity: 'MINOR',
          title: 'Unparseable verdict',
          description: 'No verdict pattern found in judge output. Defaulting to PASS (no MAJOR/ESCALATE issues found).'
        });
        return { verdict: 'PASS', issues, rawOutput: text };
      }
    }

    return { verdict, issues, rawOutput: text };
  }
}

module.exports = { VerdictParser, VERDICT_PATTERNS, ISSUE_PATTERN, ISSUE_PATTERN_NO_COLON };
