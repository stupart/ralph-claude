/**
 * Router Tests (jest format)
 *
 * Tests for the Layer Cake router module.
 * Converted from custom runner to jest in gen4.
 */

const { Router, VERDICT, SEVERITY, MAX_RETRIES } = require('../lib/router');
const { StateManager, LAYERS } = require('../lib/state-machine');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');

let TEST_ROOT;

beforeEach(async () => {
  TEST_ROOT = await fs.mkdtemp(path.join(os.tmpdir(), 'router-test-'));
});

afterEach(async () => {
  await fs.rm(TEST_ROOT, { recursive: true, force: true });
});

/**
 * Helper to set up state at a specific layer/iteration
 */
async function setStateAt(layer, iteration = 1) {
  const sm = new StateManager(TEST_ROOT);
  await sm.read();
  sm.state.position.layer = layer;
  sm.state.position.iteration = iteration;
  sm.state.position.phase = LAYERS[layer]?.phase || 'unknown';
  sm.state.position.agent = LAYERS[layer]?.agent || 'unknown';
  sm.state.gates = {
    L3: { status: 'approved', approvedAt: new Date().toISOString() },
    L7: { status: 'approved', approvedAt: new Date().toISOString() }
  };
  await sm.write();
  return sm;
}

describe('Verdict parsing', () => {
  test('parseVerdict returns PASS for explicit PASS', async () => {
    const sm = new StateManager(TEST_ROOT);
    const router = new Router(sm);
    expect(router.parseVerdict({ verdict: 'PASS' })).toBe(VERDICT.PASS);
  });

  test('parseVerdict returns ITERATE for FAIL', async () => {
    const sm = new StateManager(TEST_ROOT);
    const router = new Router(sm);
    expect(router.parseVerdict({ verdict: 'FAIL' })).toBe(VERDICT.ITERATE);
  });

  test('parseVerdict returns ITERATE for ITERATE', async () => {
    const sm = new StateManager(TEST_ROOT);
    const router = new Router(sm);
    expect(router.parseVerdict({ verdict: 'ITERATE' })).toBe(VERDICT.ITERATE);
  });

  test('parseVerdict returns ITERATE when issues exist', async () => {
    const sm = new StateManager(TEST_ROOT);
    const router = new Router(sm);
    expect(router.parseVerdict({ issues: [{ title: 'Bug', severity: 'MINOR' }] })).toBe(VERDICT.ITERATE);
  });

  test('parseVerdict returns PASS when no verdict and no issues', async () => {
    const sm = new StateManager(TEST_ROOT);
    const router = new Router(sm);
    expect(router.parseVerdict({})).toBe(VERDICT.PASS);
  });

  test('parseVerdict handles null input', async () => {
    const sm = new StateManager(TEST_ROOT);
    const router = new Router(sm);
    expect(router.parseVerdict(null)).toBe(VERDICT.ITERATE);
  });
});

describe('Severity detection', () => {
  test('getHighestSeverity returns MINOR for all MINOR issues', () => {
    const sm = new StateManager(TEST_ROOT);
    const router = new Router(sm);
    expect(router.getHighestSeverity([
      { severity: 'MINOR' },
      { severity: 'MINOR' }
    ])).toBe(SEVERITY.MINOR);
  });

  test('getHighestSeverity returns MAJOR when mixed', () => {
    const sm = new StateManager(TEST_ROOT);
    const router = new Router(sm);
    expect(router.getHighestSeverity([
      { severity: 'MINOR' },
      { severity: 'MAJOR' }
    ])).toBe(SEVERITY.MAJOR);
  });

  test('getHighestSeverity returns ESCALATE when present', () => {
    const sm = new StateManager(TEST_ROOT);
    const router = new Router(sm);
    expect(router.getHighestSeverity([
      { severity: 'MINOR' },
      { severity: 'ESCALATE' }
    ])).toBe(SEVERITY.ESCALATE);
  });
});

describe('MINOR routing', () => {
  test('MINOR at L9 cascades to L8 (builder)', async () => {
    const sm = await setStateAt('L9');
    const router = new Router(sm);
    const result = await router.route({
      verdict: 'ITERATE',
      issues: [{ title: 'Fix typo', severity: 'MINOR' }]
    });
    expect(result.action).toBe('cascade');
    expect(result.to).toBe('L8');
  });
});

describe('MAJOR routing', () => {
  test('MAJOR at L9 cascades to L7', async () => {
    const sm = await setStateAt('L9');
    const router = new Router(sm);
    const result = await router.route({
      verdict: 'ITERATE',
      issues: [{ title: 'Missing feature', severity: 'MAJOR' }]
    });
    expect(result.action).toBe('cascade');
    expect(result.to).toBe('L7');
  });
});

describe('ESCALATE routing', () => {
  test('ESCALATE at L9 cascades to L6', async () => {
    const sm = await setStateAt('L9');
    const router = new Router(sm);
    const result = await router.route({
      verdict: 'ITERATE',
      issues: [{ title: 'Wrong approach', severity: 'ESCALATE' }]
    });
    expect(result.action).toBe('cascade');
    expect(result.to).toBe('L6');
  });
});

describe('PASS routing', () => {
  test('PASS at L9 advances to L10', async () => {
    const sm = await setStateAt('L9');
    const router = new Router(sm);
    const result = await router.route({
      verdict: 'PASS',
      issues: []
    });
    expect(result.action).toBe('advance');
    expect(result.to).toBe('L10');
  });
});

describe('Max retries escalation', () => {
  test('MINOR escalates to MAJOR after MAX_RETRIES', async () => {
    const sm = await setStateAt('L9', MAX_RETRIES + 1);
    const router = new Router(sm);
    const result = await router.route({
      verdict: 'ITERATE',
      issues: [{ title: 'Recurring issue', severity: 'MINOR' }]
    });
    expect(result.escalated).toBe(true);
    expect(result.previousSeverity).toBe(SEVERITY.MINOR);
    expect(result.newSeverity).toBe(SEVERITY.MAJOR);
  });

  test('MAJOR escalates to ESCALATE after MAX_RETRIES', async () => {
    const sm = await setStateAt('L9', MAX_RETRIES + 1);
    const router = new Router(sm);
    const result = await router.route({
      verdict: 'ITERATE',
      issues: [{ title: 'Persistent issue', severity: 'MAJOR' }]
    });
    expect(result.escalated).toBe(true);
    expect(result.newSeverity).toBe(SEVERITY.ESCALATE);
  });

  test('ESCALATE at max retries requires human', async () => {
    const sm = await setStateAt('L9', MAX_RETRIES + 1);
    const router = new Router(sm);
    const result = await router.route({
      verdict: 'ITERATE',
      issues: [{ title: 'Fundamental problem', severity: 'ESCALATE' }]
    });
    expect(result.action).toBe('human_required');
  });

  test('iteration at MAX_RETRIES does NOT escalate (off-by-one check)', async () => {
    const sm = await setStateAt('L9', MAX_RETRIES);
    const router = new Router(sm);
    const result = await router.route({
      verdict: 'ITERATE',
      issues: [{ title: 'Issue', severity: 'MINOR' }]
    });
    expect(result.escalated === undefined || result.escalated === false).toBe(true);
  });
});

describe('parseReviewFile', () => {
  test('extracts verdict and issues', () => {
    const sm = new StateManager(TEST_ROOT);
    const router = new Router(sm);
    const content = `## Verdict: ITERATE

## Summary
There are issues to fix.

### Issue 1: Missing tests
Severity: MINOR

### Issue 2: Wrong architecture
Severity: MAJOR
`;
    const result = router.parseReviewFile(content);
    expect(result.verdict).toBe('ITERATE');
    expect(result.issues).toHaveLength(2);
    expect(result.issues[0].severity).toBe('MINOR');
    expect(result.issues[1].severity).toBe('MAJOR');
  });

  test('normalizes FAIL to ITERATE', () => {
    const sm = new StateManager(TEST_ROOT);
    const router = new Router(sm);
    const content = '## Verdict: FAIL\n\n## Summary\nFailed.';
    const result = router.parseReviewFile(content);
    expect(result.verdict).toBe('ITERATE');
  });
});
