const { AgentSpawner } = require('../../lib/agent-spawner');

describe('buildStructuredIterationContext()', () => {
  let spawner;

  beforeEach(() => {
    spawner = new AgentSpawner('/tmp/test');
  });

  it('formats 3 issues with mixed severities correctly', () => {
    const issues = [
      { severity: 'MINOR', title: 'Missing test', description: 'No unit test for validate()' },
      { severity: 'MAJOR', title: 'Broken API', description: 'POST /users returns 500' },
      { severity: 'MINOR', title: 'Typo in error message', description: 'Says "erorr" instead of "error"' }
    ];
    const result = spawner.buildStructuredIterationContext(issues, 2, 3);

    expect(result).toContain('## Prior Iteration Issues (Verify Fixed)');
    expect(result).toContain('1. [MINOR] Missing test: No unit test for validate()');
    expect(result).toContain('2. [MAJOR] Broken API: POST /users returns 500');
    expect(result).toContain('3. [MINOR] Typo in error message');
  });

  it('returns empty string for empty array', () => {
    expect(spawner.buildStructuredIterationContext([], 1, 3)).toBe('');
  });

  it('returns empty string for null input', () => {
    expect(spawner.buildStructuredIterationContext(null, 1, 3)).toBe('');
  });

  it('preserves file references in descriptions', () => {
    const issues = [
      { severity: 'MINOR', title: 'Missing validation', description: 'Missing validation in lib/ralph.js:142' }
    ];
    const result = spawner.buildStructuredIterationContext(issues, 1, 3);
    expect(result).toContain('lib/ralph.js:142');
  });

  it('handles issues with no description (no trailing colon)', () => {
    const issues = [
      { severity: 'MAJOR', title: 'Build fails', description: '' }
    ];
    const result = spawner.buildStructuredIterationContext(issues, 1, 3);
    expect(result).toContain('1. [MAJOR] Build fails');
    expect(result).not.toContain('1. [MAJOR] Build fails:');
  });

  it('includes all 10 issues without truncation', () => {
    const issues = Array.from({ length: 10 }, (_, i) => ({
      severity: ['MINOR', 'MAJOR', 'MINOR'][i % 3],
      title: `Issue ${i + 1}`,
      description: `Description for issue ${i + 1}`
    }));
    const result = spawner.buildStructuredIterationContext(issues, 2, 3);

    for (let i = 1; i <= 10; i++) {
      expect(result).toContain(`${i}. [`);
    }
    expect(result).toContain('10. [');
  });
});
