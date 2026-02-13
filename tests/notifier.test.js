/**
 * Tests for Notifier - macOS push notifications via terminal-notifier
 *
 * These tests mock execFile to avoid actually sending notifications during test runs.
 */

const { Notifier } = require('../lib/notifier');

// Mock child_process.execFile
jest.mock('child_process', () => ({
  execFile: jest.fn((bin, args, callback) => {
    // Simulate successful notification
    callback(null);
  })
}));

const { execFile } = require('child_process');

beforeEach(() => {
  execFile.mockClear();
});

describe('Notifier', () => {
  test('constructs with default options', () => {
    const notifier = new Notifier();
    expect(notifier.enabled).toBe(true);
    expect(notifier.binPath).toBe('terminal-notifier');
    expect(notifier.sound).toBe('default');
    expect(notifier.group).toBe('ralph-layer-cake');
    expect(notifier.history).toEqual([]);
  });

  test('constructs with custom options', () => {
    const notifier = new Notifier({
      enabled: false,
      binPath: '/custom/path',
      sound: 'Ping',
      group: 'custom-group'
    });
    expect(notifier.enabled).toBe(false);
    expect(notifier.binPath).toBe('/custom/path');
    expect(notifier.sound).toBe('Ping');
    expect(notifier.group).toBe('custom-group');
  });

  test('send calls execFile with correct args', async () => {
    const notifier = new Notifier();
    const result = await notifier.send({
      title: 'Test Title',
      message: 'Test message'
    });

    expect(result).toBe(true);
    expect(execFile).toHaveBeenCalledTimes(1);

    const [bin, args] = execFile.mock.calls[0];
    expect(bin).toBe('terminal-notifier');
    expect(args).toContain('-title');
    expect(args).toContain('Test Title');
    expect(args).toContain('-message');
    expect(args).toContain('Test message');
    expect(args).toContain('-group');
    expect(args).toContain('ralph-layer-cake');
    expect(args).toContain('-sound');
    expect(args).toContain('default');
  });

  test('send includes subtitle when provided', async () => {
    const notifier = new Notifier();
    await notifier.send({
      title: 'Title',
      message: 'Body',
      subtitle: 'Sub'
    });

    const [, args] = execFile.mock.calls[0];
    expect(args).toContain('-subtitle');
    expect(args).toContain('Sub');
  });

  test('send does nothing when disabled', async () => {
    const notifier = new Notifier({ enabled: false });
    const result = await notifier.send({
      title: 'Title',
      message: 'Body'
    });

    expect(result).toBe(false);
    expect(execFile).not.toHaveBeenCalled();
  });

  test('send returns false with missing title or message', async () => {
    const notifier = new Notifier();
    expect(await notifier.send({ title: 'T' })).toBe(false);
    expect(await notifier.send({ message: 'M' })).toBe(false);
    expect(await notifier.send({})).toBe(false);
    expect(execFile).not.toHaveBeenCalled();
  });

  test('send records history', async () => {
    const notifier = new Notifier();
    await notifier.send({ title: 'T1', message: 'M1' });
    await notifier.send({ title: 'T2', message: 'M2', subtitle: 'S2' });

    expect(notifier.history).toHaveLength(2);
    expect(notifier.history[0].title).toBe('T1');
    expect(notifier.history[0].subtitle).toBeNull();
    expect(notifier.history[1].title).toBe('T2');
    expect(notifier.history[1].subtitle).toBe('S2');
  });

  test('send handles execFile errors gracefully', async () => {
    execFile.mockImplementation((bin, args, cb) => cb(new Error('binary not found')));

    const notifier = new Notifier();
    const result = await notifier.send({ title: 'T', message: 'M' });

    expect(result).toBe(false);
    // Should not throw
  });

  test('layerTransition sends correct notification', async () => {
    const notifier = new Notifier();
    await notifier.layerTransition('L3', 'L4');

    const [, args] = execFile.mock.calls[0];
    expect(args).toContain('Layer Cake');
    expect(args.some(a => a.includes('L3') && a.includes('L4'))).toBe(true);
  });

  test('reviewVerdict sends correct notification for PASS', async () => {
    const notifier = new Notifier();
    await notifier.reviewVerdict('L9', 'PASS', 0);

    const [, args] = execFile.mock.calls[0];
    expect(args.some(a => a.includes('PASS'))).toBe(true);
    expect(args.some(a => a.includes('L9'))).toBe(true);
  });

  test('reviewVerdict sends correct notification for ITERATE with issues', async () => {
    const notifier = new Notifier();
    await notifier.reviewVerdict('L10', 'ITERATE', 3);

    const [, args] = execFile.mock.calls[0];
    expect(args.some(a => a.includes('ITERATE'))).toBe(true);
    expect(args.some(a => a.includes('3 issues'))).toBe(true);
  });

  test('reviewVerdict handles singular issue count', async () => {
    const notifier = new Notifier();
    await notifier.reviewVerdict('L9', 'ITERATE', 1);

    const [, args] = execFile.mock.calls[0];
    expect(args.some(a => a.includes('1 issue') && !a.includes('1 issues'))).toBe(true);
  });

  test('stallDetected sends correct notification with distinct sound', async () => {
    const notifier = new Notifier();
    await notifier.stallDetected(600);

    const [, args] = execFile.mock.calls[0];
    expect(args.some(a => a.includes('STALL'))).toBe(true);
    expect(args.some(a => a.includes('600'))).toBe(true);
    expect(args).toContain('Basso');
  });

  test('error sends correct notification', async () => {
    const notifier = new Notifier();
    await notifier.error('L8', 'Agent timed out');

    const [, args] = execFile.mock.calls[0];
    expect(args.some(a => a.includes('ERROR'))).toBe(true);
    expect(args.some(a => a.includes('L8'))).toBe(true);
    expect(args.some(a => a.includes('timed out'))).toBe(true);
  });

  test('projectComplete sends correct notification', async () => {
    const notifier = new Notifier();
    await notifier.projectComplete();

    const [, args] = execFile.mock.calls[0];
    expect(args.some(a => a.includes('COMPLETE'))).toBe(true);
    expect(args).toContain('Glass');
  });

  test('sound can be disabled with null', async () => {
    const notifier = new Notifier({ sound: null });
    await notifier.send({ title: 'T', message: 'M' });

    const [, args] = execFile.mock.calls[0];
    expect(args).not.toContain('-sound');
  });
});
