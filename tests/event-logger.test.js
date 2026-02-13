/**
 * Tests for EventLogger - structured JSONL event log
 */

const fs = require('fs');
const fsp = require('fs').promises;
const path = require('path');
const os = require('os');
const { EventLogger, EVENT_TYPES } = require('../lib/event-logger');

let testDir;

beforeEach(async () => {
  testDir = await fsp.mkdtemp(path.join(os.tmpdir(), 'event-logger-test-'));
});

afterEach(async () => {
  await fsp.rm(testDir, { recursive: true, force: true });
});

describe('EventLogger', () => {
  test('writes JSONL events to _events.jsonl', () => {
    const logger = new EventLogger(testDir);
    logger.log({ type: EVENT_TYPES.LAYER_START, layer: 'L1', message: 'Starting L1' });

    const content = fs.readFileSync(path.join(testDir, '_events.jsonl'), 'utf8');
    const lines = content.trim().split('\n');
    expect(lines).toHaveLength(1);

    const event = JSON.parse(lines[0]);
    expect(event.type).toBe('layer_start');
    expect(event.layer).toBe('L1');
    expect(event.message).toBe('Starting L1');
    expect(event.timestamp).toBeDefined();
  });

  test('appends multiple events as separate lines', () => {
    const logger = new EventLogger(testDir);
    logger.log({ type: EVENT_TYPES.LAYER_START, layer: 'L1', message: 'Start' });
    logger.log({ type: EVENT_TYPES.LAYER_END, layer: 'L1', message: 'End' });
    logger.log({ type: EVENT_TYPES.VERDICT, layer: 'L9', verdict: 'PASS', message: 'Passed' });

    const events = logger.readAll();
    expect(events).toHaveLength(3);
    expect(events[0].type).toBe('layer_start');
    expect(events[1].type).toBe('layer_end');
    expect(events[2].type).toBe('verdict');
    expect(events[2].verdict).toBe('PASS');
  });

  test('buffers events in memory', () => {
    const logger = new EventLogger(testDir);
    logger.log({ type: EVENT_TYPES.LAYER_START, layer: 'L1', message: 'Start' });
    logger.log({ type: EVENT_TYPES.ERROR, layer: 'L1', message: 'Boom' });

    expect(logger.buffer).toHaveLength(2);
    expect(logger.buffer[0].type).toBe('layer_start');
    expect(logger.buffer[1].type).toBe('error');
  });

  test('does nothing when disabled', () => {
    const logger = new EventLogger(testDir, { enabled: false });
    logger.log({ type: EVENT_TYPES.LAYER_START, layer: 'L1', message: 'Start' });

    expect(logger.buffer).toHaveLength(0);
    expect(fs.existsSync(path.join(testDir, '_events.jsonl'))).toBe(false);
  });

  test('layerStart convenience method', () => {
    const logger = new EventLogger(testDir);
    logger.layerStart('L4', 'Epic Definition', 'my-epic');

    const events = logger.readAll();
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('layer_start');
    expect(events[0].layer).toBe('L4');
    expect(events[0].epic).toBe('my-epic');
    expect(events[0].message).toContain('L4');
    expect(events[0].message).toContain('Epic Definition');
  });

  test('layerEnd convenience method', () => {
    const logger = new EventLogger(testDir);
    logger.layerEnd('L2', 'L3');

    const events = logger.readAll();
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('layer_end');
    expect(events[0].layer).toBe('L2');
    expect(events[0].message).toContain('L3');
  });

  test('verdict convenience method with issues', () => {
    const logger = new EventLogger(testDir);
    const issues = [{ title: 'Missing test', severity: 'MINOR' }];
    logger.verdict('L9', 'ITERATE', issues, 'auth-epic');

    const events = logger.readAll();
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('verdict');
    expect(events[0].layer).toBe('L9');
    expect(events[0].verdict).toBe('ITERATE');
    expect(events[0].epic).toBe('auth-epic');
    expect(events[0].meta.issueCount).toBe(1);
    expect(events[0].meta.issues[0].title).toBe('Missing test');
  });

  test('verdict convenience method without issues', () => {
    const logger = new EventLogger(testDir);
    logger.verdict('L9', 'PASS', []);

    const events = logger.readAll();
    expect(events[0].meta).toBeUndefined();
  });

  test('error convenience method', () => {
    const logger = new EventLogger(testDir);
    logger.error('L8', 'Agent timed out after 300000ms', 'build-epic');

    const events = logger.readAll();
    expect(events[0].type).toBe('error');
    expect(events[0].layer).toBe('L8');
    expect(events[0].epic).toBe('build-epic');
    expect(events[0].message).toContain('timed out');
  });

  test('gateApproval convenience method', () => {
    const logger = new EventLogger(testDir);
    logger.gateApproval('L3');

    const events = logger.readAll();
    expect(events[0].type).toBe('gate_approval');
    expect(events[0].layer).toBe('L3');
  });

  test('gateWaiting convenience method', () => {
    const logger = new EventLogger(testDir);
    logger.gateWaiting('L7');

    const events = logger.readAll();
    expect(events[0].type).toBe('gate_waiting');
    expect(events[0].layer).toBe('L7');
  });

  test('getCounts returns event type counts', () => {
    const logger = new EventLogger(testDir);
    logger.layerStart('L1', 'Input');
    logger.layerEnd('L1', 'L2');
    logger.layerStart('L2', 'Decompose');
    logger.error('L2', 'Something went wrong');

    const counts = logger.getCounts();
    expect(counts.layer_start).toBe(2);
    expect(counts.layer_end).toBe(1);
    expect(counts.error).toBe(1);
  });

  test('clear empties the log file and buffer', () => {
    const logger = new EventLogger(testDir);
    logger.layerStart('L1', 'Input');
    logger.layerEnd('L1', 'L2');

    expect(logger.buffer).toHaveLength(2);
    expect(logger.readAll()).toHaveLength(2);

    logger.clear();

    expect(logger.buffer).toHaveLength(0);
    expect(logger.readAll()).toHaveLength(0);
  });

  test('readAll returns empty array for missing file', () => {
    const logger = new EventLogger(testDir);
    const events = logger.readAll();
    expect(events).toEqual([]);
  });

  test('custom filename option', () => {
    const logger = new EventLogger(testDir, { filename: 'custom-events.jsonl' });
    logger.log({ type: 'test', message: 'hello' });

    expect(fs.existsSync(path.join(testDir, 'custom-events.jsonl'))).toBe(true);
    expect(fs.existsSync(path.join(testDir, '_events.jsonl'))).toBe(false);
  });

  test('null fields default correctly', () => {
    const logger = new EventLogger(testDir);
    logger.log({ type: 'test' });

    const events = logger.readAll();
    expect(events[0].layer).toBeNull();
    expect(events[0].epic).toBeNull();
    expect(events[0].verdict).toBeNull();
    expect(events[0].message).toBe('');
  });
});

describe('EVENT_TYPES constants', () => {
  test('all expected event types are defined', () => {
    expect(EVENT_TYPES.LAYER_START).toBe('layer_start');
    expect(EVENT_TYPES.LAYER_END).toBe('layer_end');
    expect(EVENT_TYPES.VERDICT).toBe('verdict');
    expect(EVENT_TYPES.ERROR).toBe('error');
    expect(EVENT_TYPES.GATE_APPROVAL).toBe('gate_approval');
    expect(EVENT_TYPES.GATE_WAITING).toBe('gate_waiting');
    expect(EVENT_TYPES.STALL_DETECTED).toBe('stall_detected');
    expect(EVENT_TYPES.COST_UPDATE).toBe('cost_update');
  });
});
