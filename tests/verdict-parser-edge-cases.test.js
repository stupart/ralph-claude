const { VerdictParser, VERDICT_PATTERNS } = require('../lib/verdict-parser');

// Edge case fixtures
const FIXTURE_NO_VERDICT = `# Review Notes
The code has several issues that need addressing.
- [MAJOR] Security: Input not sanitized
- [MINOR] Style: Inconsistent indentation`;

const FIXTURE_MALFORMED_VERDICT = `## Verdict: MAYBE
Not sure about this one.`;

const FIXTURE_MULTI_VERDICT_ITERATE_THEN_PASS = `Discussion: this might be an ITERATE situation.
Verdict: ITERATE
But actually, everything checks out.
## Verdict: PASS`;

const FIXTURE_MULTI_VERDICT_PASS_THEN_ITERATE = `Initial thought: Verdict: PASS
Wait, found more issues.
## Verdict: ITERATE
- [MAJOR] Bug: Race condition`;

const FIXTURE_EMPTY = '';

const FIXTURE_WHITESPACE_ONLY = '   \n\n\t  ';

const FIXTURE_FORMAT_HEADING = '## Verdict: PASS\nAll good.';
const FIXTURE_FORMAT_BOLD = '**Verdict**: PASS\nAll good.';
const FIXTURE_FORMAT_BOLD_COLON = '**Verdict:** PASS\nAll good.';
const FIXTURE_FORMAT_PLAIN = 'Verdict: PASS\nAll good.';

const FIXTURE_VERDICT_IN_PROSE = 'The verdict is PASS but this is not a structured format.';

const FIXTURE_PASS_WITH_MAJOR_ISSUES = `## Verdict: PASS
- [MAJOR] Security: SQL injection vulnerability
- [MINOR] Docs: Missing API documentation`;

describe('VerdictParser Edge Cases', () => {
  let parser;
  beforeEach(() => { parser = new VerdictParser(); });

  describe('Empty and Invalid Input', () => {
    it('empty string → ITERATE with Unparseable verdict', () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
      const result = parser.parse(FIXTURE_EMPTY);
      expect(result.verdict).toBe('ITERATE');
      expect(result.issues[0].title).toBe('Unparseable verdict');
      warnSpy.mockRestore();
    });

    it('whitespace-only → ITERATE', () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
      const result = parser.parse(FIXTURE_WHITESPACE_ONLY);
      expect(result.verdict).toBe('ITERATE');
      warnSpy.mockRestore();
    });

    it('numeric input → ITERATE (no throw)', () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
      expect(() => parser.parse(12345)).not.toThrow();
      expect(parser.parse(12345).verdict).toBe('ITERATE');
      warnSpy.mockRestore();
    });
  });

  describe('Missing Verdict Line', () => {
    it('no verdict with MAJOR issues → ITERATE with issues preserved', () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
      const result = parser.parse(FIXTURE_NO_VERDICT);
      expect(result.verdict).toBe('ITERATE');
      expect(result.issues.some(i => i.severity === 'MAJOR')).toBe(true);
      warnSpy.mockRestore();
    });

    it('no verdict with no issues → ITERATE with Unparseable verdict', () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
      const result = parser.parse('Just some text with no markers.');
      expect(result.verdict).toBe('ITERATE');
      expect(result.issues[0].title).toBe('Unparseable verdict');
      warnSpy.mockRestore();
    });
  });

  describe('Malformed Verdict', () => {
    it('invalid verdict value (MAYBE) → ITERATE', () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
      const result = parser.parse(FIXTURE_MALFORMED_VERDICT);
      expect(result.verdict).toBe('ITERATE');
      warnSpy.mockRestore();
    });

    it('verdict in prose without structured format → ITERATE', () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
      const result = parser.parse(FIXTURE_VERDICT_IN_PROSE);
      expect(result.verdict).toBe('ITERATE');
      warnSpy.mockRestore();
    });
  });

  describe('Multiple Verdict Lines', () => {
    it('ITERATE then PASS → last wins (PASS)', () => {
      const result = parser.parse(FIXTURE_MULTI_VERDICT_ITERATE_THEN_PASS);
      expect(result.verdict).toBe('PASS');
    });

    it('PASS then ITERATE → last wins (ITERATE)', () => {
      const result = parser.parse(FIXTURE_MULTI_VERDICT_PASS_THEN_ITERATE);
      expect(result.verdict).toBe('ITERATE');
    });
  });

  describe('All Format Patterns', () => {
    it('heading format: ## Verdict: PASS', () => {
      expect(parser.parse(FIXTURE_FORMAT_HEADING).verdict).toBe('PASS');
    });
    it('bold format: **Verdict**: PASS', () => {
      expect(parser.parse(FIXTURE_FORMAT_BOLD).verdict).toBe('PASS');
    });
    it('bold-colon format: **Verdict:** PASS', () => {
      expect(parser.parse(FIXTURE_FORMAT_BOLD_COLON).verdict).toBe('PASS');
    });
    it('plain format: Verdict: PASS', () => {
      expect(parser.parse(FIXTURE_FORMAT_PLAIN).verdict).toBe('PASS');
    });
  });

  describe('PASS Contradicted by Severity', () => {
    it('PASS + MAJOR → ITERATE (override)', () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
      const result = parser.parse(FIXTURE_PASS_WITH_MAJOR_ISSUES);
      expect(result.verdict).toBe('ITERATE');
      warnSpy.mockRestore();
    });
    it('PASS + ESCALATE → ITERATE (override)', () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
      const result = parser.parse('## Verdict: PASS\n- [ESCALATE] Critical: Data loss');
      expect(result.verdict).toBe('ITERATE');
      warnSpy.mockRestore();
    });
    it('PASS + only MINOR → PASS (no override)', () => {
      const result = parser.parse('## Verdict: PASS\n- [MINOR] Style: Naming');
      expect(result.verdict).toBe('PASS');
    });
  });

  describe('Runner Integration - Source Analysis', () => {
    const fs = require('fs');
    const runnerSource = fs.readFileSync(
      require('path').join(__dirname, '..', 'bin', 'run-layer-cake-on-self.js'), 'utf8'
    );

    it('no inline parseVerdict function definition', () => {
      expect(runnerSource).not.toContain('function parseVerdict');
    });

    it('no inline parseIssues function definition', () => {
      expect(runnerSource).not.toContain('function parseIssues');
    });

    it('VerdictParser import from library exists', () => {
      expect(runnerSource).toContain("require('../lib/verdict-parser')");
    });

    it('fail-open fallback not present', () => {
      expect(runnerSource).not.toMatch(/verdict:\s*['"]PASS['"]\s*,\s*issues:\s*\[\s*\]/);
    });
  });
});
