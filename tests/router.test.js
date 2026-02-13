/**
 * Router Tests
 *
 * Tests for the Layer Cake router module.
 * Run with: node tests/router.test.js
 */

const { Router, VERDICT, SEVERITY, MAX_RETRIES } = require('../lib/router');
const { StateManager, LAYERS } = require('../lib/state-machine');
const fs = require('fs').promises;
const path = require('path');

const TEST_ROOT = path.join(__dirname, '.test-router-project');
const TEST_STATUS = path.join(TEST_ROOT, '_status.md');

// Simple test framework
let passed = 0;
let failed = 0;

function test(name, fn) {
  return async () => {
    try {
      await fn();
      console.log(`  ✓ ${name}`);
      passed++;
    } catch (err) {
      console.log(`  ✗ ${name}`);
      console.log(`    Error: ${err.message}`);
      failed++;
    }
  };
}

function assert(condition, message) {
  if (!condition) throw new Error(message || 'Assertion failed');
}

async function setup() {
  await fs.mkdir(TEST_ROOT, { recursive: true });
}

async function resetState() {
  try {
    await fs.unlink(TEST_STATUS);
  } catch {}
}

async function cleanup() {
  try {
    await fs.rm(TEST_ROOT, { recursive: true, force: true });
  } catch {}
}

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
  // Approve gates so advance works
  sm.state.gates = {
    L3: { status: 'approved', approvedAt: new Date().toISOString() },
    L7: { status: 'approved', approvedAt: new Date().toISOString() }
  };
  await sm.write();
  return sm;
}

// ============= Tests =============

const tests = [
  // --- Verdict parsing ---
  test('parseVerdict returns PASS for explicit PASS', async () => {
    const sm = new StateManager(TEST_ROOT);
    const router = new Router(sm);

    const verdict = router.parseVerdict({ verdict: 'PASS' });
    assert(verdict === VERDICT.PASS, 'Should return PASS');
  }),

  test('parseVerdict returns ITERATE for FAIL', async () => {
    const sm = new StateManager(TEST_ROOT);
    const router = new Router(sm);

    const verdict = router.parseVerdict({ verdict: 'FAIL' });
    assert(verdict === VERDICT.ITERATE, 'FAIL should normalize to ITERATE');
  }),

  test('parseVerdict returns ITERATE for ITERATE', async () => {
    const sm = new StateManager(TEST_ROOT);
    const router = new Router(sm);

    const verdict = router.parseVerdict({ verdict: 'ITERATE' });
    assert(verdict === VERDICT.ITERATE, 'Should return ITERATE');
  }),

  test('parseVerdict returns ITERATE when issues exist', async () => {
    const sm = new StateManager(TEST_ROOT);
    const router = new Router(sm);

    const verdict = router.parseVerdict({ issues: [{ title: 'Bug', severity: 'MINOR' }] });
    assert(verdict === VERDICT.ITERATE, 'Should return ITERATE when issues exist');
  }),

  test('parseVerdict returns PASS when no verdict and no issues', async () => {
    const sm = new StateManager(TEST_ROOT);
    const router = new Router(sm);

    const verdict = router.parseVerdict({});
    assert(verdict === VERDICT.PASS, 'Should return PASS when clean');
  }),

  test('parseVerdict handles null input', async () => {
    const sm = new StateManager(TEST_ROOT);
    const router = new Router(sm);

    const verdict = router.parseVerdict(null);
    assert(verdict === VERDICT.ITERATE, 'null should return ITERATE');
  }),

  // --- Severity detection ---
  test('getHighestSeverity returns MINOR for all MINOR issues', async () => {
    const sm = new StateManager(TEST_ROOT);
    const router = new Router(sm);

    const result = router.getHighestSeverity([
      { severity: 'MINOR' },
      { severity: 'MINOR' }
    ]);
    assert(result === SEVERITY.MINOR, 'Should be MINOR');
  }),

  test('getHighestSeverity returns MAJOR when mixed', async () => {
    const sm = new StateManager(TEST_ROOT);
    const router = new Router(sm);

    const result = router.getHighestSeverity([
      { severity: 'MINOR' },
      { severity: 'MAJOR' }
    ]);
    assert(result === SEVERITY.MAJOR, 'Should be MAJOR');
  }),

  test('getHighestSeverity returns ESCALATE when present', async () => {
    const sm = new StateManager(TEST_ROOT);
    const router = new Router(sm);

    const result = router.getHighestSeverity([
      { severity: 'MINOR' },
      { severity: 'ESCALATE' }
    ]);
    assert(result === SEVERITY.ESCALATE, 'Should be ESCALATE');
  }),

  // --- MINOR routing ---
  test('MINOR at L9 cascades to L8 (builder)', async () => {
    const sm = await setStateAt('L9');
    const router = new Router(sm);

    const result = await router.route({
      verdict: 'ITERATE',
      issues: [{ title: 'Fix typo', severity: 'MINOR' }]
    });

    assert(result.action === 'cascade', 'Should cascade');
    assert(result.to === 'L8', 'MINOR at L9 should go to L8');
  }),

  // --- MAJOR routing ---
  test('MAJOR at L9 cascades to L7', async () => {
    const sm = await setStateAt('L9');
    const router = new Router(sm);

    const result = await router.route({
      verdict: 'ITERATE',
      issues: [{ title: 'Missing feature', severity: 'MAJOR' }]
    });

    assert(result.action === 'cascade', 'Should cascade');
    assert(result.to === 'L7', 'MAJOR at L9 should go to L7');
  }),

  // --- ESCALATE routing ---
  test('ESCALATE at L9 cascades to L6', async () => {
    const sm = await setStateAt('L9');
    const router = new Router(sm);

    const result = await router.route({
      verdict: 'ITERATE',
      issues: [{ title: 'Wrong approach', severity: 'ESCALATE' }]
    });

    assert(result.action === 'cascade', 'Should cascade');
    assert(result.to === 'L6', 'ESCALATE at L9 should go to L6');
  }),

  // --- PASS routing ---
  test('PASS at L9 advances to L10', async () => {
    const sm = await setStateAt('L9');
    const router = new Router(sm);

    const result = await router.route({
      verdict: 'PASS',
      issues: []
    });

    assert(result.action === 'advance', 'Should advance');
    assert(result.to === 'L10', 'PASS at L9 should advance to L10');
  }),

  // --- Max retries escalation ---
  test('MINOR escalates to MAJOR after MAX_RETRIES', async () => {
    const sm = await setStateAt('L9', MAX_RETRIES + 1);
    const router = new Router(sm);

    const result = await router.route({
      verdict: 'ITERATE',
      issues: [{ title: 'Recurring issue', severity: 'MINOR' }]
    });

    assert(result.escalated === true, 'Should be escalated');
    assert(result.previousSeverity === SEVERITY.MINOR, 'Previous should be MINOR');
    assert(result.newSeverity === SEVERITY.MAJOR, 'New should be MAJOR');
  }),

  test('MAJOR escalates to ESCALATE after MAX_RETRIES', async () => {
    const sm = await setStateAt('L9', MAX_RETRIES + 1);
    const router = new Router(sm);

    const result = await router.route({
      verdict: 'ITERATE',
      issues: [{ title: 'Persistent issue', severity: 'MAJOR' }]
    });

    assert(result.escalated === true, 'Should be escalated');
    assert(result.newSeverity === SEVERITY.ESCALATE, 'New should be ESCALATE');
  }),

  test('ESCALATE at max retries requires human', async () => {
    const sm = await setStateAt('L9', MAX_RETRIES + 1);
    const router = new Router(sm);

    const result = await router.route({
      verdict: 'ITERATE',
      issues: [{ title: 'Fundamental problem', severity: 'ESCALATE' }]
    });

    assert(result.action === 'human_required', 'Should require human');
  }),

  test('iteration at MAX_RETRIES does NOT escalate (off-by-one fix)', async () => {
    const sm = await setStateAt('L9', MAX_RETRIES);
    const router = new Router(sm);

    const result = await router.route({
      verdict: 'ITERATE',
      issues: [{ title: 'Issue', severity: 'MINOR' }]
    });

    assert(result.escalated === undefined || result.escalated === false,
      'Should NOT escalate when iteration equals MAX_RETRIES');
  }),

  // --- parseReviewFile ---
  test('parseReviewFile extracts verdict and issues', async () => {
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
    assert(result.verdict === 'ITERATE', 'Should extract ITERATE verdict');
    assert(result.issues.length === 2, 'Should find 2 issues');
    assert(result.issues[0].severity === 'MINOR', 'First issue should be MINOR');
    assert(result.issues[1].severity === 'MAJOR', 'Second issue should be MAJOR');
  }),

  test('parseReviewFile normalizes FAIL to ITERATE', async () => {
    const sm = new StateManager(TEST_ROOT);
    const router = new Router(sm);

    const content = '## Verdict: FAIL\n\n## Summary\nFailed.';
    const result = router.parseReviewFile(content);
    assert(result.verdict === 'ITERATE', 'FAIL should be normalized to ITERATE');
  })
];

// ============= Run Tests =============

async function runTests() {
  console.log('\nRouter Tests');
  console.log('=============\n');

  await setup();

  for (const testFn of tests) {
    await resetState();
    await testFn();
  }

  await cleanup();

  console.log(`\nResults: ${passed} passed, ${failed} failed\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Test runner error:', err);
  process.exit(1);
});
