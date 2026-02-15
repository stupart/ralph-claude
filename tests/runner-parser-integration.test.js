const fs = require('fs');
const path = require('path');

describe('Runner Parser Integration', () => {
  const runnerPath = path.join(__dirname, '..', 'bin', 'run-layer-cake-on-self.js');
  const source = fs.readFileSync(runnerPath, 'utf8');

  describe('Inline Parser Removal', () => {
    it('does not contain function parseVerdict', () => {
      expect(source).not.toContain('function parseVerdict');
    });

    it('does not contain function parseIssues', () => {
      expect(source).not.toContain('function parseIssues');
    });

    it('does not contain fail-open fallback', () => {
      expect(source).not.toMatch(/verdict:\s*['"]PASS['"]\s*,\s*issues:\s*\[\s*\]/);
    });
  });

  describe('Library Import', () => {
    it('imports VerdictParser from lib/verdict-parser', () => {
      expect(source).toContain("require('../lib/verdict-parser')");
    });

    it('uses verdictParser.parse() for judge output', () => {
      expect(source).toContain('verdictParser.parse(');
    });
  });
});
