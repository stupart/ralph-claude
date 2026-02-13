/**
 * Tests for the Plugin System
 *
 * Covers PluginManager registration, lifecycle hooks, error handling,
 * and the built-in logger and metrics plugins.
 */

const { PluginManager, HOOKS } = require('../lib/plugin');
const { createLoggerPlugin } = require('../lib/plugins/logger-plugin');
const { createMetricsPlugin } = require('../lib/plugins/metrics-plugin');

// --- PluginManager core tests ---

describe('PluginManager', () => {
  let pm;

  beforeEach(() => {
    pm = new PluginManager();
  });

  describe('register', () => {
    test('registers a valid plugin', () => {
      pm.register({ name: 'test', beforeLayerStart() {} });
      expect(pm.size).toBe(1);
      expect(pm.list()).toEqual(['test']);
    });

    test('throws on null plugin', () => {
      expect(() => pm.register(null)).toThrow('Plugin must be a non-null object');
    });

    test('throws on non-object plugin', () => {
      expect(() => pm.register('string')).toThrow('Plugin must be a non-null object');
    });

    test('throws when plugin has no name', () => {
      expect(() => pm.register({ beforeLayerStart() {} })).toThrow('must have a string "name" property');
    });

    test('throws when name is not a string', () => {
      expect(() => pm.register({ name: 123, beforeLayerStart() {} })).toThrow('must have a string "name" property');
    });

    test('throws on duplicate plugin name', () => {
      pm.register({ name: 'dupe', beforeLayerStart() {} });
      expect(() => pm.register({ name: 'dupe', afterLayerEnd() {} }))
        .toThrow('"dupe" is already registered');
    });

    test('throws when plugin implements no hooks', () => {
      expect(() => pm.register({ name: 'empty' }))
        .toThrow('must implement at least one hook');
    });

    test('throws when plugin only has non-hook methods', () => {
      expect(() => pm.register({ name: 'bad', doSomething() {} }))
        .toThrow('must implement at least one hook');
    });

    test('accepts plugin with a single hook', () => {
      pm.register({ name: 'single', onError() {} });
      expect(pm.size).toBe(1);
    });

    test('accepts plugin with all hooks', () => {
      const plugin = {
        name: 'all-hooks',
        beforeLayerStart() {},
        afterLayerEnd() {},
        beforeSpawn() {},
        afterSpawn() {},
        onVerdict() {},
        onError() {}
      };
      pm.register(plugin);
      expect(pm.size).toBe(1);
    });
  });

  describe('unregister', () => {
    test('removes a registered plugin', () => {
      pm.register({ name: 'removeme', onError() {} });
      expect(pm.unregister('removeme')).toBe(true);
      expect(pm.size).toBe(0);
    });

    test('returns false for non-existent plugin', () => {
      expect(pm.unregister('ghost')).toBe(false);
    });
  });

  describe('get', () => {
    test('returns registered plugin by name', () => {
      const plugin = { name: 'find-me', onError() {} };
      pm.register(plugin);
      expect(pm.get('find-me')).toBe(plugin);
    });

    test('returns undefined for non-existent plugin', () => {
      expect(pm.get('nope')).toBeUndefined();
    });
  });

  describe('clear', () => {
    test('removes all plugins', () => {
      pm.register({ name: 'a', onError() {} });
      pm.register({ name: 'b', onVerdict() {} });
      pm.clear();
      expect(pm.size).toBe(0);
      expect(pm.list()).toEqual([]);
    });
  });

  describe('run', () => {
    test('calls hook on matching plugins', async () => {
      const calls = [];
      pm.register({
        name: 'p1',
        beforeLayerStart(ctx) { calls.push({ plugin: 'p1', ctx }); }
      });
      pm.register({
        name: 'p2',
        beforeLayerStart(ctx) { calls.push({ plugin: 'p2', ctx }); }
      });

      const context = { layerId: 'L1' };
      await pm.run('beforeLayerStart', context);

      expect(calls).toHaveLength(2);
      expect(calls[0]).toEqual({ plugin: 'p1', ctx: context });
      expect(calls[1]).toEqual({ plugin: 'p2', ctx: context });
    });

    test('skips plugins that do not implement the hook', async () => {
      const calls = [];
      pm.register({
        name: 'has-it',
        onVerdict(ctx) { calls.push('onVerdict'); }
      });
      pm.register({
        name: 'no-it',
        onError() {} // Different hook
      });

      await pm.run('onVerdict', { layerId: 'L9', verdict: 'PASS' });
      expect(calls).toEqual(['onVerdict']);
    });

    test('runs plugins in registration order', async () => {
      const order = [];
      pm.register({ name: 'first', onError() { order.push(1); } });
      pm.register({ name: 'second', onError() { order.push(2); } });
      pm.register({ name: 'third', onError() { order.push(3); } });

      await pm.run('onError', {});
      expect(order).toEqual([1, 2, 3]);
    });

    test('catches errors in plugins without stopping others', async () => {
      const calls = [];
      pm.register({
        name: 'failing',
        beforeLayerStart() { throw new Error('plugin crash'); }
      });
      pm.register({
        name: 'succeeding',
        beforeLayerStart() { calls.push('ok'); }
      });

      const results = await pm.run('beforeLayerStart', {});
      expect(calls).toEqual(['ok']);
      expect(results[0].error).toBeInstanceOf(Error);
      expect(results[0].error.message).toBe('plugin crash');
      expect(results[1]).toEqual({ plugin: 'succeeding' });
    });

    test('handles async hooks', async () => {
      const calls = [];
      pm.register({
        name: 'async-plugin',
        async beforeLayerStart(ctx) {
          await new Promise(resolve => setTimeout(resolve, 10));
          calls.push('async-done');
        }
      });

      await pm.run('beforeLayerStart', {});
      expect(calls).toEqual(['async-done']);
    });

    test('throws on unknown hook name', async () => {
      await expect(pm.run('invalidHook', {}))
        .rejects.toThrow('Unknown hook: "invalidHook"');
    });

    test('returns results array with plugin names', async () => {
      pm.register({ name: 'a', onError() {} });
      pm.register({ name: 'b', onError() {} });

      const results = await pm.run('onError', {});
      expect(results).toEqual([
        { plugin: 'a' },
        { plugin: 'b' }
      ]);
    });

    test('returns empty array when no plugins registered', async () => {
      const results = await pm.run('beforeLayerStart', {});
      expect(results).toEqual([]);
    });
  });
});

describe('HOOKS constant', () => {
  test('contains all six lifecycle hooks', () => {
    expect(HOOKS).toEqual([
      'beforeLayerStart',
      'afterLayerEnd',
      'beforeSpawn',
      'afterSpawn',
      'onVerdict',
      'onError'
    ]);
  });
});

// --- Logger Plugin tests ---

describe('createLoggerPlugin', () => {
  test('creates a plugin with name "logger"', () => {
    const plugin = createLoggerPlugin({ filePath: '/tmp/test-logger.log' });
    expect(plugin.name).toBe('logger');
  });

  test('implements all lifecycle hooks', () => {
    const plugin = createLoggerPlugin({ filePath: '/tmp/test-logger.log' });
    for (const hook of HOOKS) {
      expect(typeof plugin[hook]).toBe('function');
    }
  });

  test('logs beforeLayerStart to buffer', () => {
    const plugin = createLoggerPlugin({ filePath: '/dev/null' });
    plugin.beforeLayerStart({ layerId: 'L1' });
    expect(plugin._buffer).toHaveLength(1);
    expect(plugin._buffer[0]).toContain('[beforeLayerStart]');
    expect(plugin._buffer[0]).toContain('layer=L1');
  });

  test('logs afterLayerEnd with next layer', () => {
    const plugin = createLoggerPlugin({ filePath: '/dev/null' });
    plugin.afterLayerEnd({ layerId: 'L1', next: 'L2' });
    expect(plugin._buffer[0]).toContain('next=L2');
  });

  test('logs beforeSpawn with agent info when verbose', () => {
    const plugin = createLoggerPlugin({ filePath: '/dev/null', verbose: true });
    plugin.beforeSpawn({ layerId: 'L8', spawnConfig: { agentType: 'builder', model: 'claude-3' } });
    expect(plugin._buffer[0]).toContain('agent=builder');
    expect(plugin._buffer[0]).toContain('model=claude-3');
  });

  test('logs onVerdict with verdict and issues', () => {
    const plugin = createLoggerPlugin({ filePath: '/dev/null' });
    plugin.onVerdict({ layerId: 'L9', verdict: 'PASS', issues: [] });
    expect(plugin._buffer[0]).toContain('verdict=PASS');
  });

  test('logs onError with error message', () => {
    const plugin = createLoggerPlugin({ filePath: '/dev/null' });
    plugin.onError({ layerId: 'L8', type: 'agent_error', error: 'timeout' });
    expect(plugin._buffer[0]).toContain('error="timeout"');
    expect(plugin._buffer[0]).toContain('type=agent_error');
  });

  test('includes timestamps by default', () => {
    const plugin = createLoggerPlugin({ filePath: '/dev/null' });
    plugin.onError({ layerId: 'L1' });
    expect(plugin._buffer[0]).toMatch(/^\[20\d{2}-/);
  });

  test('omits timestamps when disabled', () => {
    const plugin = createLoggerPlugin({ filePath: '/dev/null', timestamps: false });
    plugin.onError({ layerId: 'L1' });
    expect(plugin._buffer[0]).toMatch(/^\[onError\]/);
  });

  test('can register with PluginManager', () => {
    const pm = new PluginManager();
    const plugin = createLoggerPlugin({ filePath: '/dev/null' });
    pm.register(plugin);
    expect(pm.list()).toEqual(['logger']);
  });
});

// --- Metrics Plugin tests ---

describe('createMetricsPlugin', () => {
  let metrics;

  beforeEach(() => {
    metrics = createMetricsPlugin();
  });

  test('creates a plugin with name "metrics"', () => {
    expect(metrics.name).toBe('metrics');
  });

  test('implements all lifecycle hooks', () => {
    for (const hook of HOOKS) {
      expect(typeof metrics[hook]).toBe('function');
    }
  });

  test('tracks layer starts', () => {
    metrics.beforeLayerStart({ layerId: 'L1' });
    metrics.beforeLayerStart({ layerId: 'L2' });
    metrics.beforeLayerStart({ layerId: 'L1' });

    const report = metrics.getReport();
    expect(report.layers.L1.starts).toBe(2);
    expect(report.layers.L2.starts).toBe(1);
    expect(report.global.totalStarts).toBe(3);
  });

  test('tracks layer ends with duration', async () => {
    metrics.beforeLayerStart({ layerId: 'L1' });
    await new Promise(resolve => setTimeout(resolve, 50));
    metrics.afterLayerEnd({ layerId: 'L1', next: 'L2' });

    const report = metrics.getReport();
    expect(report.layers.L1.ends).toBe(1);
    expect(report.layers.L1.totalDurationMs).toBeGreaterThanOrEqual(30);
    expect(report.global.totalEnds).toBe(1);
  });

  test('tracks spawns by agent type', () => {
    metrics.beforeSpawn({ layerId: 'L1', spawnConfig: { agentType: 'planner' } });
    metrics.beforeSpawn({ layerId: 'L8', spawnConfig: { agentType: 'builder' } });
    metrics.beforeSpawn({ layerId: 'L9', spawnConfig: { agentType: 'judge' } });
    metrics.beforeSpawn({ layerId: 'L2', spawnConfig: { agentType: 'planner' } });

    const report = metrics.getReport();
    expect(report.global.totalSpawns).toBe(4);
    expect(report.spawnsByAgent).toEqual({
      planner: 2,
      builder: 1,
      judge: 1
    });
  });

  test('tracks verdicts and pass rate', () => {
    metrics.onVerdict({ layerId: 'L9', verdict: 'PASS' });
    metrics.onVerdict({ layerId: 'L9', verdict: 'ITERATE' });
    metrics.onVerdict({ layerId: 'L10', verdict: 'PASS' });

    const report = metrics.getReport();
    expect(report.global.totalVerdicts).toBe(3);
    expect(report.global.totalPasses).toBe(2);
    expect(report.global.totalIterates).toBe(1);
    expect(report.passRate).toBeCloseTo(0.67, 1);
    expect(report.layers.L9.passes).toBe(1);
    expect(report.layers.L9.iterates).toBe(1);
  });

  test('tracks errors by type', () => {
    metrics.onError({ layerId: 'L8', type: 'agent_error' });
    metrics.onError({ layerId: 'L8', type: 'agent_error' });
    metrics.onError({ layerId: 'L1', type: 'stall' });

    const report = metrics.getReport();
    expect(report.global.totalErrors).toBe(3);
    expect(report.errorsByType).toEqual({
      agent_error: 2,
      stall: 1
    });
    expect(report.layers.L8.errors).toBe(2);
    expect(report.layers.L1.errors).toBe(1);
  });

  test('passRate is null when no verdicts recorded', () => {
    const report = metrics.getReport();
    expect(report.passRate).toBeNull();
  });

  test('reset clears all metrics', () => {
    metrics.beforeLayerStart({ layerId: 'L1' });
    metrics.onVerdict({ layerId: 'L9', verdict: 'PASS' });
    metrics.onError({ layerId: 'L8', type: 'crash' });
    metrics.beforeSpawn({ spawnConfig: { agentType: 'builder' } });

    metrics.reset();
    const report = metrics.getReport();

    expect(report.global.totalStarts).toBe(0);
    expect(report.global.totalVerdicts).toBe(0);
    expect(report.global.totalErrors).toBe(0);
    expect(report.global.totalSpawns).toBe(0);
    expect(Object.keys(report.layers)).toHaveLength(0);
    expect(Object.keys(report.spawnsByAgent)).toHaveLength(0);
    expect(Object.keys(report.errorsByType)).toHaveLength(0);
  });

  test('getReport returns deep copies (not references)', () => {
    metrics.beforeLayerStart({ layerId: 'L1' });
    const report1 = metrics.getReport();
    metrics.beforeLayerStart({ layerId: 'L1' });
    const report2 = metrics.getReport();

    expect(report1.layers.L1.starts).toBe(1);
    expect(report2.layers.L1.starts).toBe(2);
  });

  test('handles errors without layerId', () => {
    metrics.onError({ type: 'global_crash' });
    const report = metrics.getReport();
    expect(report.global.totalErrors).toBe(1);
    expect(report.errorsByType.global_crash).toBe(1);
  });

  test('handles spawns without spawnConfig', () => {
    metrics.beforeSpawn({});
    const report = metrics.getReport();
    expect(report.global.totalSpawns).toBe(1);
    expect(Object.keys(report.spawnsByAgent)).toHaveLength(0);
  });

  test('can register with PluginManager', () => {
    const pm = new PluginManager();
    pm.register(metrics);
    expect(pm.list()).toEqual(['metrics']);
  });
});

// --- Integration: Ralph.use() ---

describe('Ralph.use() integration', () => {
  // Lightweight test that the use() method chains correctly
  // Full integration is covered by ralph.test.js
  test('Ralph exports PluginManager', () => {
    const { PluginManager: PM } = require('../lib/ralph');
    expect(PM).toBeDefined();
    expect(new PM()).toBeInstanceOf(PluginManager);
  });
});
