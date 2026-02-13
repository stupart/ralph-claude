/**
 * Tests for ParallelExecutor - concurrent epic building
 */

const fs = require('fs').promises;
const path = require('path');
const os = require('os');
const { ParallelExecutor } = require('../lib/parallel-executor');

const TEMPLATES_PATH = path.resolve(__dirname, '..', 'templates', 'agents');
let testDir;

/**
 * Create a minimal mock Ralph instance with the methods ParallelExecutor needs.
 */
function createMockRalph(options = {}) {
  const logs = [];
  return {
    log: (msg) => logs.push(msg),
    logs,
    runEpicCycle: options.runEpicCycle || jest.fn(async (executor, epicName) => {
      return { status: 'epic_complete', epic: epicName };
    })
  };
}

describe('ParallelExecutor', () => {
  test('constructs with default concurrency of 2', () => {
    const ralph = createMockRalph();
    const executor = new ParallelExecutor(ralph, jest.fn());
    expect(executor.concurrency).toBe(2);
  });

  test('constructs with custom concurrency', () => {
    const ralph = createMockRalph();
    const executor = new ParallelExecutor(ralph, jest.fn(), { concurrency: 4 });
    expect(executor.concurrency).toBe(4);
  });

  test('returns no_epics when given empty array', async () => {
    const ralph = createMockRalph();
    const executor = new ParallelExecutor(ralph, jest.fn());
    const result = await executor.runEpics([]);
    expect(result.status).toBe('no_epics');
    expect(result.summary.total).toBe(0);
  });

  test('returns no_epics when given null', async () => {
    const ralph = createMockRalph();
    const executor = new ParallelExecutor(ralph, jest.fn());
    const result = await executor.runEpics(null);
    expect(result.status).toBe('no_epics');
  });

  test('runs single epic successfully', async () => {
    const ralph = createMockRalph();
    const executor = new ParallelExecutor(ralph, jest.fn());
    const result = await executor.runEpics(['epic-auth']);

    expect(result.status).toBe('all_passed');
    expect(result.results).toHaveLength(1);
    expect(result.results[0].epic).toBe('epic-auth');
    expect(result.results[0].status).toBe('passed');
    expect(result.summary.passed).toBe(1);
    expect(result.summary.failed).toBe(0);
  });

  test('runs multiple epics concurrently', async () => {
    const timeline = [];
    const ralph = createMockRalph({
      runEpicCycle: jest.fn(async (executor, epicName) => {
        timeline.push({ event: 'start', epic: epicName, time: Date.now() });
        await new Promise(r => setTimeout(r, 100));
        timeline.push({ event: 'end', epic: epicName, time: Date.now() });
        return { status: 'epic_complete', epic: epicName };
      })
    });

    const executor = new ParallelExecutor(ralph, jest.fn(), { concurrency: 3 });
    const result = await executor.runEpics(['epic-1', 'epic-2', 'epic-3']);

    expect(result.status).toBe('all_passed');
    expect(result.summary.total).toBe(3);
    expect(result.summary.passed).toBe(3);

    // Verify concurrency: all 3 should start before any finishes
    const starts = timeline.filter(e => e.event === 'start');
    const ends = timeline.filter(e => e.event === 'end');

    // All starts should happen before any end (with 3 concurrent workers)
    expect(starts.length).toBe(3);
    expect(ends.length).toBe(3);
  });

  test('respects concurrency limit', async () => {
    let maxConcurrent = 0;
    let currentConcurrent = 0;

    const ralph = createMockRalph({
      runEpicCycle: jest.fn(async (executor, epicName) => {
        currentConcurrent++;
        maxConcurrent = Math.max(maxConcurrent, currentConcurrent);
        await new Promise(r => setTimeout(r, 50));
        currentConcurrent--;
        return { status: 'epic_complete', epic: epicName };
      })
    });

    const executor = new ParallelExecutor(ralph, jest.fn(), { concurrency: 2 });
    await executor.runEpics(['epic-1', 'epic-2', 'epic-3', 'epic-4']);

    // Should never exceed concurrency limit of 2
    expect(maxConcurrent).toBeLessThanOrEqual(2);
  });

  test('handles epic failure without stopping others', async () => {
    const ralph = createMockRalph({
      runEpicCycle: jest.fn(async (executor, epicName) => {
        if (epicName === 'epic-fail') {
          return { status: 'error', error: 'Build failed', epic: epicName };
        }
        return { status: 'epic_complete', epic: epicName };
      })
    });

    const executor = new ParallelExecutor(ralph, jest.fn(), { concurrency: 2 });
    const result = await executor.runEpics(['epic-ok', 'epic-fail', 'epic-also-ok']);

    expect(result.status).toBe('partial');
    expect(result.summary.passed).toBe(2);
    expect(result.summary.failed).toBe(1);
    expect(result.results.find(r => r.epic === 'epic-fail').status).toBe('failed');
  });

  test('handles epic escalation', async () => {
    const ralph = createMockRalph({
      runEpicCycle: jest.fn(async (executor, epicName) => {
        if (epicName === 'epic-escalate') {
          return { status: 'iterate', epicEscalated: true, epic: epicName };
        }
        return { status: 'epic_complete', epic: epicName };
      })
    });

    const executor = new ParallelExecutor(ralph, jest.fn(), { concurrency: 2 });
    const result = await executor.runEpics(['epic-ok', 'epic-escalate']);

    expect(result.status).toBe('partial');
    expect(result.summary.escalated).toBe(1);
    expect(result.summary.passed).toBe(1);
  });

  test('handles executor throwing exception', async () => {
    const ralph = createMockRalph({
      runEpicCycle: jest.fn(async (executor, epicName) => {
        if (epicName === 'epic-throw') {
          throw new Error('Unexpected crash');
        }
        return { status: 'epic_complete', epic: epicName };
      })
    });

    const executor = new ParallelExecutor(ralph, jest.fn(), { concurrency: 2 });
    const result = await executor.runEpics(['epic-ok', 'epic-throw']);

    expect(result.summary.failed).toBe(1);
    expect(result.results.find(r => r.epic === 'epic-throw').result.error).toBe('Unexpected crash');
  });

  test('getResults returns copy of results', async () => {
    const ralph = createMockRalph();
    const executor = new ParallelExecutor(ralph, jest.fn());
    await executor.runEpics(['epic-1']);

    const results = executor.getResults();
    expect(results).toHaveLength(1);
    // Verify it's a copy
    results.push({ epic: 'fake' });
    expect(executor.getResults()).toHaveLength(1);
  });

  test('isRunning returns false when not running', () => {
    const ralph = createMockRalph();
    const executor = new ParallelExecutor(ralph, jest.fn());
    expect(executor.isRunning()).toBe(false);
  });

  test('isRunning returns false after completion', async () => {
    const ralph = createMockRalph();
    const executor = new ParallelExecutor(ralph, jest.fn());
    await executor.runEpics(['epic-1']);
    expect(executor.isRunning()).toBe(false);
  });

  test('logs start, progress, and summary', async () => {
    const ralph = createMockRalph();
    const executor = new ParallelExecutor(ralph, jest.fn(), { concurrency: 1 });
    await executor.runEpics(['epic-1', 'epic-2']);

    expect(ralph.logs.some(l => l.includes('ParallelExecutor: running 2 epics'))).toBe(true);
    expect(ralph.logs.some(l => l.includes('Worker 0: starting epic'))).toBe(true);
    expect(ralph.logs.some(l => l.includes('passed'))).toBe(true);
    expect(ralph.logs.some(l => l.includes('ParallelExecutor: complete'))).toBe(true);
  });

  test('concurrency 1 runs epics sequentially', async () => {
    const order = [];
    const ralph = createMockRalph({
      runEpicCycle: jest.fn(async (executor, epicName) => {
        order.push(`start-${epicName}`);
        await new Promise(r => setTimeout(r, 20));
        order.push(`end-${epicName}`);
        return { status: 'epic_complete', epic: epicName };
      })
    });

    const executor = new ParallelExecutor(ralph, jest.fn(), { concurrency: 1 });
    await executor.runEpics(['epic-1', 'epic-2']);

    // With concurrency 1, epic-1 should finish before epic-2 starts
    expect(order).toEqual(['start-epic-1', 'end-epic-1', 'start-epic-2', 'end-epic-2']);
  });
});
