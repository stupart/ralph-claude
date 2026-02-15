const fs = require('fs');
const path = require('path');

describe('L12 Directory Injection', () => {
  describe('L12 Retrospective Template', () => {
    const templatePath = path.join(__dirname, '..', 'templates', 'agents', 'planner-L12-retrospective.md');
    const template = fs.readFileSync(templatePath, 'utf8');

    it('references 8-analysis/ as output directory', () => {
      expect(template).toContain('8-analysis/');
    });

    it('does not reference 12-retrospective/ as output path', () => {
      // The template may mention 12-retrospective in a "do NOT write to" instruction,
      // but must not use it as an actual output path heading
      expect(template).not.toMatch(/^###\s+.*12-retrospective/m);
    });

    it('contains explicit output directory instruction', () => {
      expect(template).toMatch(/write all output files to/i);
    });
  });

  describe('Runner buildFullPrompt', () => {
    const runnerPath = path.join(__dirname, '..', 'bin', 'run-layer-cake-on-self.js');
    const runnerSource = fs.readFileSync(runnerPath, 'utf8');

    it('injects PROJECT_DIR unconditionally (no L12 exclusion)', () => {
      // The Project Paths injection must not have a layerId guard
      expect(runnerSource).toContain('Project Paths');
      expect(runnerSource).toContain('PROJECT_DIR');
      // Verify no conditional exclusion of L12
      expect(runnerSource).not.toMatch(/if\s*\(\s*layerId\s*!==\s*['"]L12['"]\s*\)/);
    });
  });
});
