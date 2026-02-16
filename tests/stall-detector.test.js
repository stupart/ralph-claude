/**
 * Tests for StallDetector - watchdog for stuck orchestration
 */

const fs = require('fs');
const fsp = require('fs').promises;
const path = require('path');
const os = require('os');
const { StallDetector } = require('../lib/stall-detector');

let testDir;

beforeEach(async () => {
  testDir = await fsp.mkdtemp(path.join(os.tmpdir(), 'stall-detector-test-'));
});

afterEach(async () => {
  await fsp.rm(testDir, { recursive: true, force: true });
});

describe('StallDetector', () => {
  test('constructs with default options', () => {
    const detector = new StallDetector(testDir);
    expect(detector.thresholdMs).toBe(600000);
    expect(detector.pollIntervalMs).toBe(30000);
    expect(detector.watchFile).toBe('_status.md');
    expect(detector.isRunning()).toBe(false);
  });

  test('constructs with custom options', () => {
    const detector = new StallDetector(testDir, {
      thresholdMs: 5000,
      pollIntervalMs: 1000,
      watchFile: 'custom.md'
    });
    expect(detector.thresholdMs).toBe(5000);
    expect(detector.pollIntervalMs).toBe(1000);
    expect(detector.watchFile).toBe('custom.md');
  });

  test('start sets running state', () => {
    const detector = new StallDetector(testDir);
    detector.start();
    expect(detector.isRunning()).toBe(true);
    detector.stop();
    expect(detector.isRunning()).toBe(false);
  });

  test('start is idempotent', () => {
    const detector = new StallDetector(testDir);
    detector.start();
    detector.start(); // Should not double-start
    expect(detector.isRunning()).toBe(true);
    detector.stop();
  });

  test('getStatus when file does not exist', () => {
    const detector = new StallDetector(testDir);
    const status = detector.getStatus();
    expect(status.stalled).toBe(false);
    expect(status.elapsedMs).toBeNull();
    expect(status.lastModified).toBeNull();
  });

  test('getStatus when file exists', () => {
    fs.writeFileSync(path.join(testDir, '_status.md'), '# Status\n');
    const detector = new StallDetector(testDir);
    detector.start();

    const status = detector.getStatus();
    expect(status.stalled).toBe(false);
    expect(status.lastModified).toBeDefined();
    expect(typeof status.elapsedMs).toBe('number');

    detector.stop();
  });

  test('detects stall when file is not updated', (done) => {
    // Create the status file
    fs.writeFileSync(path.join(testDir, '_status.md'), '# Status\n');

    // Backdate the file mtime to simulate an old file
    const oldTime = new Date(Date.now() - 200);
    fs.utimesSync(path.join(testDir, '_status.md'), oldTime, oldTime);

    const stallCallback = jest.fn();

    const detector = new StallDetector(testDir, {
      thresholdMs: 100,
      pollIntervalMs: 50,
      onStall: (info) => {
        stallCallback(info);
        detector.stop();

        expect(stallCallback).toHaveBeenCalledTimes(1);
        expect(info.elapsedMs).toBeGreaterThanOrEqual(100);
        expect(info.stallCount).toBe(1);
        expect(info.file).toContain('_status.md');
        done();
      }
    });

    detector.start();
  });

  test('fires stall callback only once per stall period', (done) => {
    fs.writeFileSync(path.join(testDir, '_status.md'), '# Status\n');

    const oldTime = new Date(Date.now() - 300);
    fs.utimesSync(path.join(testDir, '_status.md'), oldTime, oldTime);

    const stallCallback = jest.fn();
    let checkCount = 0;

    const detector = new StallDetector(testDir, {
      thresholdMs: 100,
      pollIntervalMs: 40,
      onStall: (info) => {
        stallCallback(info);
      }
    });

    detector.start();

    // Wait for multiple polls to verify only one call
    setTimeout(() => {
      detector.stop();
      expect(stallCallback).toHaveBeenCalledTimes(1);
      done();
    }, 200);
  });

  test('does not fire stall when file does not exist', (done) => {
    const stallCallback = jest.fn();

    const detector = new StallDetector(testDir, {
      thresholdMs: 50,
      pollIntervalMs: 20,
      onStall: stallCallback
    });

    detector.start();

    setTimeout(() => {
      detector.stop();
      expect(stallCallback).not.toHaveBeenCalled();
      done();
    }, 150);
  });

  test('detects recovery after stall', (done) => {
    fs.writeFileSync(path.join(testDir, '_status.md'), '# Status\n');
    const oldTime = new Date(Date.now() - 300);
    fs.utimesSync(path.join(testDir, '_status.md'), oldTime, oldTime);

    const recoverCallback = jest.fn();

    const detector = new StallDetector(testDir, {
      thresholdMs: 100,
      pollIntervalMs: 40,
      onStall: () => {
        // Once stall detected, update the file to simulate recovery
        setTimeout(() => {
          fs.writeFileSync(path.join(testDir, '_status.md'), '# Updated\n');
        }, 20);
      },
      onRecover: (info) => {
        recoverCallback(info);
        detector.stop();
        expect(recoverCallback).toHaveBeenCalledTimes(1);
        expect(info.file).toContain('_status.md');
        expect(info.resumedAt).toBeDefined();
        done();
      }
    });

    detector.start();
  });

  test('stallCount increments across multiple stalls', (done) => {
    fs.writeFileSync(path.join(testDir, '_status.md'), '# Status\n');
    const oldTime = new Date(Date.now() - 300);
    fs.utimesSync(path.join(testDir, '_status.md'), oldTime, oldTime);

    let stallsSeen = 0;

    const detector = new StallDetector(testDir, {
      thresholdMs: 50,
      pollIntervalMs: 20,
      onStall: (info) => {
        stallsSeen++;
        if (stallsSeen === 1) {
          // Recover by touching the file
          fs.writeFileSync(path.join(testDir, '_status.md'), '# Updated\n');
          // Then backdate again to trigger second stall
          setTimeout(() => {
            const oldAgain = new Date(Date.now() - 300);
            fs.utimesSync(path.join(testDir, '_status.md'), oldAgain, oldAgain);
          }, 30);
        } else if (stallsSeen === 2) {
          detector.stop();
          expect(detector.stallCount).toBe(2);
          done();
        }
      },
      onRecover: () => {
        // Reset the stall flag by recovering
      }
    });

    detector.start();
  });

  test('stop clears the timer', () => {
    const detector = new StallDetector(testDir);
    detector.start();
    expect(detector._timer).not.toBeNull();
    detector.stop();
    expect(detector._timer).toBeNull();
  });
});
