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

  it('returns iteration counter only for empty array with iterationNumber', () => {
    const result = spawner.buildStructuredIterationContext([], 1, 3);
    expect(result).toContain('## Review Iteration');
    expect(result).not.toContain('## Prior Iteration Issues');
  });

  it('returns iteration counter only for null input with iterationNumber', () => {
    const result = spawner.buildStructuredIterationContext(null, 1, 3);
    expect(result).toContain('## Review Iteration');
    expect(result).not.toContain('## Prior Iteration Issues');
  });

  it('returns empty string for empty issues and no iterationNumber', () => {
    expect(spawner.buildStructuredIterationContext([], null, 3)).toBe('');
    expect(spawner.buildStructuredIterationContext(null, null, 3)).toBe('');
    expect(spawner.buildStructuredIterationContext([], undefined, 3)).toBe('');
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

  it('structured output is ≤20% the size of equivalent raw review text', () => {
    const issues = [
      { severity: 'MAJOR', title: 'Missing error handling in executor', description: 'The execute() method at lib/claude-executor.js:121 does not handle the case where the binary path is null after _checkBinary() returns true but the binary is subsequently deleted.' },
      { severity: 'MINOR', title: 'Test coverage gap', description: 'No test covers the scenario where _activeProcesses contains a process that exits during shutdown() iteration in lib/claude-executor.js:175.' },
      { severity: 'MINOR', title: 'Inconsistent error messages', description: 'Error messages in lib/ralph.js use different formats: some use template literals, others use string concatenation. See lines 245, 312, 498.' },
      { severity: 'MAJOR', title: 'Race condition in state persistence', description: 'StateManager.write() at lib/state-machine.js:89 does not lock the file. Concurrent writes from signal handler and normal pipeline could corrupt _status.md.' },
      { severity: 'MINOR', title: 'JSDoc missing on public method', description: 'The buildLayerInstructions() method at lib/agent-spawner.js:557 has no JSDoc comment despite being part of the public API.' }
    ];

    const structuredOutput = spawner.buildStructuredIterationContext(issues, 2, 3);

    // Simulate raw review output: typical judge produces 3000-5000 chars of analysis
    // across iterations, raw text accumulates with repeated context
    const rawReview = `## Feature Review: Executor Shutdown

### Code Review

I examined the implementation of the executor shutdown feature across multiple files
including lib/claude-executor.js, lib/ralph.js, lib/state-machine.js, and the associated
test files in tests/integration/. This review covers the complete feature scope as
defined in the epic specification.

**Completeness Analysis:**
The implementation covers the basic SIGTERM sending and SIGKILL escalation pattern.
However, several issues were identified during the review that need to be addressed
before this feature can be considered complete. The shutdown() method at line 175 of
lib/claude-executor.js iterates over the _activeProcesses Set and sends SIGTERM to
each process. After a configurable timeout (default 5000ms), any remaining processes
receive SIGKILL. This follows the expected graceful shutdown pattern.

**Error Handling Assessment:**
The error handling in the execute() method needs significant improvement. Currently,
when the binary path becomes null after the _checkBinary() method returns true but
the binary is subsequently deleted from the filesystem, the system fails silently
without logging any error or throwing an exception. This is a significant gap that
could lead to hard-to-debug issues in production environments. The specific code path
is at lib/claude-executor.js:121 where the binary path is used without a null check
after the async gap between _checkBinary() and the actual spawn call.

Additionally, I reviewed the test coverage and found significant gaps in the shutdown
path testing. The _activeProcesses Set is iterated during shutdown, but no test
verifies behavior when a process exits during that iteration. This is a realistic
scenario in production where processes may exit between the time we check them and
the time we send signals. The Set iteration should handle this gracefully but we need
tests to verify this behavior.

**Code Quality Assessment:**
Error message formatting is inconsistent across the codebase. In lib/ralph.js, some
error messages use template literals (lines 245, 312) while others use string
concatenation (line 498). This inconsistency makes the codebase harder to maintain
and search through. A consistent approach should be adopted across all error messages.

Furthermore, the error messages themselves vary in informativeness. Some include the
full context (file path, line number, variable state) while others just say "Error
occurred" without any debugging context. This should be standardized.

**State Management Concerns:**
The StateManager's write() method at lib/state-machine.js:89 does not implement any
form of file locking. In the signal handler scenario where the process receives SIGINT
or SIGTERM, the interrupt handler writes to _status.md to preserve state. However, if
the normal pipeline is also in the middle of a write operation, these concurrent writes
could interleave and corrupt the _status.md file. This is a significant concern for the
reliability of the automatic resume feature that depends on _status.md being valid JSON
or markdown at all times.

The recommended approach would be to use advisory file locking or an atomic write
pattern (write to temp file, then rename). The rename operation is atomic on most
filesystems and would prevent corruption.

**Documentation Assessment:**
Several public methods lack JSDoc documentation, making it harder for other developers
to understand the API surface. Specifically:
- buildLayerInstructions() at lib/agent-spawner.js:557 - no JSDoc
- assembleContext() at lib/agent-spawner.js:392 - minimal JSDoc
- getToolPermissions() at lib/agent-spawner.js:340 - no return type documented

### Test Results
All existing tests pass (1074 of 1074). However, new tests are needed for the gaps
identified above. The test suite runs in approximately 32 seconds.

### Acceptance Criteria Verification
| Criterion | Met? | Evidence |
|-----------|------|----------|
| SIGTERM sent to active processes | Yes | Code review of shutdown() confirmed |
| SIGKILL after 5s timeout | Yes | Timer logic at line 182 is correct |
| Promise resolves after all exit | Partial | Race condition possible during iteration |
| Empty set resolves immediately | Yes | Guard clause at line 176 handles this |
| State preserved on interrupt | Partial | No file locking means possible corruption |

### Issues Found
- [MAJOR] Missing error handling in executor: The execute() method at lib/claude-executor.js:121
  does not handle the case where the binary path is null after _checkBinary() returns true but
  the binary is subsequently deleted. This can cause unhandled exceptions.
- [MINOR] Test coverage gap: No test covers the scenario where _activeProcesses contains a
  process that exits during shutdown() iteration in lib/claude-executor.js:175. This is a
  realistic production scenario that should be verified.
- [MINOR] Inconsistent error messages: Error messages in lib/ralph.js use different formats.
  Lines 245 and 312 use template literals while line 498 uses string concatenation.
- [MAJOR] Race condition in state persistence: StateManager.write() at lib/state-machine.js:89
  does not implement file locking. Concurrent writes from signal handler and normal pipeline
  could corrupt _status.md, breaking the automatic resume feature.
- [MINOR] JSDoc missing on public method: The buildLayerInstructions() method at
  lib/agent-spawner.js:557 has no JSDoc comment despite being part of the public API surface.

## Verdict: ITERATE`;

    // Verify structured output is ≤20% of raw review size
    expect(structuredOutput.length).toBeLessThanOrEqual(rawReview.length * 0.2);
  });
});
