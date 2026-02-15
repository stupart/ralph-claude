const fs = require('fs');
const path = require('path');

const TEMPLATES_DIR = path.join(__dirname, '../../templates/agents');
const EXCLUSION_TEXT = 'Documents in `3-synthesis/` are pre-build planning artifacts. Staleness relative to the as-built code is expected and should NOT be flagged as an issue.';

describe('Stale Doc Exclusion', () => {
  describe('Template annotations', () => {
    it('L9 judge template contains exclusion text', () => {
      const content = fs.readFileSync(
        path.join(TEMPLATES_DIR, 'judge-L9-feature-review.md'), 'utf8'
      );
      expect(content).toContain('## Review Scope Notes');
      expect(content).toContain(EXCLUSION_TEXT);
    });

    it('L10/L11 judge template contains exclusion text', () => {
      const content = fs.readFileSync(
        path.join(TEMPLATES_DIR, 'judge-L10-L11-reviews.md'), 'utf8'
      );
      expect(content).toContain('## Review Scope Notes');
      expect(content).toContain(EXCLUSION_TEXT);
    });
  });

  describe('buildFullPrompt() exclusion', () => {
    const RUNNER_PATH = path.join(__dirname, '../../bin/run-layer-cake-on-self.js');

    it('judge spawn config produces prompt with exclusion note', () => {
      const source = fs.readFileSync(RUNNER_PATH, 'utf8');
      // Verify the exclusion text appears in the source
      expect(source).toContain('Review Scope Notes');
      expect(source).toContain('3-synthesis/');
    });

    it('builder spawn config does NOT contain exclusion note', () => {
      const source = fs.readFileSync(RUNNER_PATH, 'utf8');
      // The exclusion text must be inside the judge block, not the builder block
      // Extract the builder block
      const builderMatch = source.match(/if \(spawnConfig\.agentType === 'builder'\) \{[^}]+\}/s);
      expect(builderMatch).not.toBeNull();
      expect(builderMatch[0]).not.toContain('3-synthesis');
    });

    it('exclusion note is inside the judge agentType block only', () => {
      const source = fs.readFileSync(RUNNER_PATH, 'utf8');
      // Find the judge block and verify it contains the exclusion
      const judgeMatch = source.match(/if \(spawnConfig\.agentType === 'judge'\) \{[\s\S]*?^\s{2}\}/m);
      expect(judgeMatch).not.toBeNull();
      expect(judgeMatch[0]).toContain('Review Scope Notes');
      expect(judgeMatch[0]).toContain('3-synthesis/');
    });
  });
});
