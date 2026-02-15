/**
 * VerdictParser Tests
 *
 * Tests for verdict detection, issue extraction, full parse,
 * graceful degradation, and realistic judge output samples.
 */

const { VerdictParser, VERDICT_PATTERNS } = require('../lib/verdict-parser');

const SAMPLE_PASS_HEADING = '## Verdict: PASS\n\nAll issues addressed.';
const SAMPLE_ITERATE_BOLD = '**Verdict**: ITERATE\n\n- [MAJOR] Missing tests: No unit tests';
const SAMPLE_ITERATE_BOLD_COLON = '**Verdict:** ITERATE\n\n- [MINOR] Style: Inconsistent naming';
const SAMPLE_PASS_PLAIN = 'Verdict: PASS';
const SAMPLE_MULTI_VERDICT = 'Initially considered ITERATE but after review...\nVerdict: ITERATE\n\nActually, on second thought:\n## Verdict: PASS';
const SAMPLE_MULTI_ISSUES = '- [MAJOR] Bug: Memory leak in handler\n- [MINOR] Style: Inconsistent naming\n* [ESCALATE] Critical: Data loss on crash';

describe('VerdictParser', () => {
  let parser;

  beforeEach(() => {
    parser = new VerdictParser();
  });

  describe('Verdict Detection', () => {
    it('detects heading format: ## Verdict: PASS', () => {
      const result = parser.parse(SAMPLE_PASS_HEADING);
      expect(result.verdict).toBe('PASS');
    });

    it('detects heading format: ## Verdict: ITERATE', () => {
      const result = parser.parse('## Verdict: ITERATE\n\nNeed more work.');
      expect(result.verdict).toBe('ITERATE');
    });

    it('detects bold format: **Verdict**: PASS', () => {
      const result = parser.parse('**Verdict**: PASS\n\nLooks good.');
      expect(result.verdict).toBe('PASS');
    });

    it('detects bold format: **Verdict**: ITERATE', () => {
      const result = parser.parse(SAMPLE_ITERATE_BOLD);
      expect(result.verdict).toBe('ITERATE');
    });

    it('detects bold-with-colon: **Verdict:** ITERATE', () => {
      const result = parser.parse(SAMPLE_ITERATE_BOLD_COLON);
      expect(result.verdict).toBe('ITERATE');
    });

    it('detects bold-with-colon: **Verdict:** PASS', () => {
      const result = parser.parse('**Verdict:** PASS');
      expect(result.verdict).toBe('PASS');
    });

    it('detects plain format: Verdict: PASS', () => {
      const result = parser.parse(SAMPLE_PASS_PLAIN);
      expect(result.verdict).toBe('PASS');
    });

    it('detects plain format: Verdict: ITERATE', () => {
      const result = parser.parse('Verdict: ITERATE');
      expect(result.verdict).toBe('ITERATE');
    });

    it('is case-insensitive: verdict: pass → PASS', () => {
      const result = parser.parse('verdict: pass');
      expect(result.verdict).toBe('PASS');
    });

    it('is case-insensitive: VERDICT: iterate → ITERATE', () => {
      const result = parser.parse('VERDICT: iterate');
      expect(result.verdict).toBe('ITERATE');
    });

    it('uses last occurrence when multiple verdicts present', () => {
      const result = parser.parse(SAMPLE_MULTI_VERDICT);
      expect(result.verdict).toBe('PASS');
    });

    it('VERDICT_PATTERNS has 4 patterns', () => {
      expect(VERDICT_PATTERNS).toHaveLength(4);
    });
  });

  describe('Issue Extraction', () => {
    it('extracts single issue with severity, title, description', () => {
      const result = parser.parse('## Verdict: ITERATE\n\n- [MAJOR] Missing tests: No unit tests written');
      expect(result.issues).toHaveLength(1);
      expect(result.issues[0].severity).toBe('MAJOR');
      expect(result.issues[0].title).toBe('Missing tests');
      expect(result.issues[0].description).toBe('No unit tests written');
    });

    it('extracts multiple issues with mixed severities', () => {
      const result = parser.parse('## Verdict: ITERATE\n\n' + SAMPLE_MULTI_ISSUES);
      expect(result.issues).toHaveLength(3);
      expect(result.issues[0].severity).toBe('MAJOR');
      expect(result.issues[1].severity).toBe('MINOR');
      expect(result.issues[2].severity).toBe('ESCALATE');
    });

    it('handles * list markers', () => {
      const result = parser.parse('## Verdict: ITERATE\n\n* [MINOR] Naming: Use camelCase');
      expect(result.issues).toHaveLength(1);
      expect(result.issues[0].title).toBe('Naming');
      expect(result.issues[0].description).toBe('Use camelCase');
    });

    it('case-insensitive severity: [major] → MAJOR', () => {
      const result = parser.parse('## Verdict: ITERATE\n\n- [major] Bug: Memory leak');
      expect(result.issues).toHaveLength(1);
      expect(result.issues[0].severity).toBe('MAJOR');
    });

    it('handles malformed issues (no colon separator)', () => {
      const result = parser.parse('## Verdict: ITERATE\n\n- [MAJOR] Title without colon');
      expect(result.issues).toHaveLength(1);
      expect(result.issues[0].severity).toBe('MAJOR');
      expect(result.issues[0].title).toBe('Title without colon');
      expect(result.issues[0].description).toBe('');
    });

    it('returns empty array for text with no issues', () => {
      const result = parser.parse('## Verdict: PASS\n\nAll good, no issues.');
      expect(result.issues).toEqual([]);
    });

    it('handles ESCALATE severity', () => {
      const result = parser.parse('## Verdict: ITERATE\n\n- [ESCALATE] Architecture: Needs redesign');
      expect(result.issues).toHaveLength(1);
      expect(result.issues[0].severity).toBe('ESCALATE');
    });
  });

  describe('Full Parse', () => {
    it('PASS with no issues → { verdict: PASS, issues: [] }', () => {
      const result = parser.parse('## Verdict: PASS\n\nAll issues addressed.');
      expect(result.verdict).toBe('PASS');
      expect(result.issues).toEqual([]);
    });

    it('ITERATE with issues → structured issues array', () => {
      const result = parser.parse('## Verdict: ITERATE\n\n- [MAJOR] Bug: Memory leak\n- [MINOR] Style: Naming');
      expect(result.verdict).toBe('ITERATE');
      expect(result.issues).toHaveLength(2);
    });

    it('PASS with MAJOR issues → verdict overridden to ITERATE', () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
      const result = parser.parse('## Verdict: PASS\n- [MAJOR] Issue: desc');
      expect(result.verdict).toBe('ITERATE');
      expect(result.issues).toHaveLength(2);
      expect(result.issues[0].severity).toBe('MAJOR');
      expect(result.issues[1].title).toBe('Verdict overridden');
      warnSpy.mockRestore();
    });

    it('rawOutput contains original input string', () => {
      const input = '## Verdict: PASS\n\nGood work!';
      const result = parser.parse(input);
      expect(result.rawOutput).toBe(input);
    });

    it('rawOutput contains coerced string for non-string input', () => {
      const result = parser.parse(42);
      expect(result.rawOutput).toBe('42');
    });
  });

  describe('Degradation', () => {
    it('empty string → ITERATE with Unparseable verdict issue', () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
      const result = parser.parse('');
      expect(result.verdict).toBe('ITERATE');
      expect(result.issues).toHaveLength(1);
      expect(result.issues[0].title).toBe('Unparseable verdict');
      expect(result.issues[0].severity).toBe('MINOR');
      expect(result.issues[0].description).toContain('No verdict pattern found');
      warnSpy.mockRestore();
    });

    it('null input → ITERATE with Unparseable verdict (no throw)', () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
      const result = parser.parse(null);
      expect(result.verdict).toBe('ITERATE');
      expect(result.issues[0].title).toBe('Unparseable verdict');
      expect(result.rawOutput).toBe('');
      warnSpy.mockRestore();
    });

    it('undefined input → ITERATE with Unparseable verdict (no throw)', () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
      const result = parser.parse(undefined);
      expect(result.verdict).toBe('ITERATE');
      expect(result.issues[0].title).toBe('Unparseable verdict');
      warnSpy.mockRestore();
    });

    it('no-verdict text → ITERATE, warns via console.warn', () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
      parser.parse('This text has no verdict marker at all.');
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('No verdict detected'));
      warnSpy.mockRestore();
    });

    it('console.warn NOT called when verdict is detected', () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
      parser.parse('## Verdict: PASS');
      expect(warnSpy).not.toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it('numeric input does not throw', () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
      expect(() => parser.parse(42)).not.toThrow();
      warnSpy.mockRestore();
    });
  });

  describe('Realistic Samples', () => {
    it('multi-paragraph review with embedded verdict and issues', () => {
      const sample = `# Feature Review: User Authentication

This implementation covers the basic authentication flow. The code structure
follows existing patterns in the codebase.

## Issues Found

- [MINOR] Missing docs: The login endpoint lacks API documentation
- [MAJOR] Security concern: Password is not hashed before storage

## Summary

The feature is functionally complete but has a critical security issue
that must be addressed before shipping.

## Verdict: ITERATE

Please fix the password hashing issue before resubmitting.`;

      const result = parser.parse(sample);
      expect(result.verdict).toBe('ITERATE');
      expect(result.issues).toHaveLength(2);
      expect(result.issues[0].severity).toBe('MINOR');
      expect(result.issues[0].title).toBe('Missing docs');
      expect(result.issues[1].severity).toBe('MAJOR');
      expect(result.issues[1].title).toBe('Security concern');
      expect(result.rawOutput).toBe(sample);
    });

    it('pass review with no issues', () => {
      const sample = `# Epic Review: E1 Execution Layer

All features are implemented correctly. The execution layer handles
subprocess management, verdict parsing, and context resolution as specified.

Tests pass. Code quality is good. Architecture follows the plan.

## Verdict: PASS

Ship it!`;

      const result = parser.parse(sample);
      expect(result.verdict).toBe('PASS');
      expect(result.issues).toEqual([]);
    });

    it('review with discussion of ITERATE before final PASS verdict', () => {
      const sample = `# Review Notes

Initially I thought this might need ITERATE because the error handling
seemed incomplete. However, after closer inspection:

- The edge cases are covered by the fallback handler
- Tests verify the error paths

Verdict: PASS`;

      const result = parser.parse(sample);
      expect(result.verdict).toBe('PASS');
    });
  });

  describe('Severity Marker Scanning', () => {
    it('no verdict + MAJOR issues → ITERATE with MAJOR issues preserved', () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
      const result = parser.parse('Some review text\n- [MAJOR] Bug: Memory leak found');
      expect(result.verdict).toBe('ITERATE');
      expect(result.issues.some(i => i.severity === 'MAJOR' && i.title === 'Bug')).toBe(true);
      warnSpy.mockRestore();
    });

    it('no verdict + ESCALATE issues → ITERATE with ESCALATE issues preserved', () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
      const result = parser.parse('Review notes\n- [ESCALATE] Architecture: Needs redesign');
      expect(result.verdict).toBe('ITERATE');
      expect(result.issues.some(i => i.severity === 'ESCALATE')).toBe(true);
      warnSpy.mockRestore();
    });

    it('PASS + MAJOR issues → ITERATE with "Verdict overridden" synthetic issue', () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
      const result = parser.parse('## Verdict: PASS\n- [MAJOR] Security: SQL injection');
      expect(result.verdict).toBe('ITERATE');
      expect(result.issues.find(i => i.title === 'Verdict overridden')).toBeDefined();
      warnSpy.mockRestore();
    });

    it('PASS + ESCALATE issues → ITERATE with "Verdict overridden" synthetic issue', () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
      const result = parser.parse('## Verdict: PASS\n- [ESCALATE] Critical: Data loss');
      expect(result.verdict).toBe('ITERATE');
      expect(result.issues.find(i => i.title === 'Verdict overridden')).toBeDefined();
      warnSpy.mockRestore();
    });

    it('PASS + only MINOR issues → PASS (no override)', () => {
      const result = parser.parse('## Verdict: PASS\n- [MINOR] Style: Use camelCase');
      expect(result.verdict).toBe('PASS');
      expect(result.issues.find(i => i.title === 'Verdict overridden')).toBeUndefined();
    });

    it('ITERATE + MAJOR issues → ITERATE (no override needed, no synthetic issue)', () => {
      const result = parser.parse('## Verdict: ITERATE\n- [MAJOR] Bug: Memory leak');
      expect(result.verdict).toBe('ITERATE');
      expect(result.issues.find(i => i.title === 'Verdict overridden')).toBeUndefined();
    });

    it('mixed MINOR + MAJOR with PASS → ITERATE (any high-severity triggers override)', () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
      const result = parser.parse('## Verdict: PASS\n- [MINOR] Style: Naming\n- [MAJOR] Bug: Null pointer');
      expect(result.verdict).toBe('ITERATE');
      warnSpy.mockRestore();
    });

    it('empty output → ITERATE with "Unparseable verdict" (existing behavior preserved)', () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
      const result = parser.parse('');
      expect(result.verdict).toBe('ITERATE');
      expect(result.issues[0].title).toBe('Unparseable verdict');
      warnSpy.mockRestore();
    });
  });
});
