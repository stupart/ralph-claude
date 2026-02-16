/**
 * Tests for StallDetector - watchdog for stuck orchestration
 */

const fs = require('fs');
const fsp = require('fs').promises;
const path = require('path');
const os = require('os');
const { StallDetector, DEFAULT_LAYER_THRESHOLDS } = require('../lib/stall-detector');

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
        expect(info.tier).toBe('warning');
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

describe('DEFAULT_LAYER_THRESHOLDS', () => {
  test('contains all 12 layer IDs', () => {
    const layers = Object.keys(DEFAULT_LAYER_THRESHOLDS);
    expect(layers).toHaveLength(12);
    for (let i = 1; i <= 12; i++) {
      expect(DEFAULT_LAYER_THRESHOLDS).toHaveProperty(`L${i}`);
    }
  });

  test('values match architecture spec', () => {
    // L1-L6: 300s (5 min)
    for (let i = 1; i <= 6; i++) {
      expect(DEFAULT_LAYER_THRESHOLDS[`L${i}`]).toBe(300000);
    }
    // L7: 900s (15 min)
    expect(DEFAULT_LAYER_THRESHOLDS.L7).toBe(900000);
    // L8: 1800s (30 min)
    expect(DEFAULT_LAYER_THRESHOLDS.L8).toBe(1800000);
    // L9-L11: 600s (10 min)
    for (let i = 9; i <= 11; i++) {
      expect(DEFAULT_LAYER_THRESHOLDS[`L${i}`]).toBe(600000);
    }
    // L12: 600s (10 min)
    expect(DEFAULT_LAYER_THRESHOLDS.L12).toBe(600000);
  });

  test('values are in milliseconds', () => {
    for (const val of Object.values(DEFAULT_LAYER_THRESHOLDS)) {
      expect(val).toBeGreaterThanOrEqual(300000);
    }
  });
});

describe('Per-layer thresholds (setLayer)', () => {
  test('setLayer with default layerThresholds sets L8 threshold to 1800000ms', () => {
    const detector = new StallDetector(testDir, {
      layerThresholds: DEFAULT_LAYER_THRESHOLDS
    });
    detector.setLayer('L8');
    expect(detector._activeThreshold).toBe(1800000);
  });

  test('setLayer with default layerThresholds sets L3 threshold to 300000ms', () => {
    const detector = new StallDetector(testDir, {
      layerThresholds: DEFAULT_LAYER_THRESHOLDS
    });
    detector.setLayer('L3');
    expect(detector._activeThreshold).toBe(300000);
  });

  test('setLayer without layerThresholds falls back to thresholdMs', () => {
    const detector = new StallDetector(testDir, {
      thresholdMs: 600000
    });
    detector.setLayer('L8');
    expect(detector._activeThreshold).toBe(600000);
  });

  test('setLayer with unknown layer falls back to thresholdMs', () => {
    const detector = new StallDetector(testDir, {
      thresholdMs: 600000,
      layerThresholds: DEFAULT_LAYER_THRESHOLDS
    });
    detector.setLayer('L99');
    expect(detector._activeThreshold).toBe(600000);
  });

  test('setLayer(null) falls back to thresholdMs without throwing', () => {
    const detector = new StallDetector(testDir, {
      thresholdMs: 600000,
      layerThresholds: DEFAULT_LAYER_THRESHOLDS
    });
    expect(() => detector.setLayer(null)).not.toThrow();
    expect(detector._activeThreshold).toBe(600000);
  });

  test('setLayer(undefined) falls back to thresholdMs without throwing', () => {
    const detector = new StallDetector(testDir, {
      thresholdMs: 600000,
      layerThresholds: DEFAULT_LAYER_THRESHOLDS
    });
    expect(() => detector.setLayer(undefined)).not.toThrow();
    expect(detector._activeThreshold).toBe(600000);
  });

  test('setLayer clears pending stall state', () => {
    const detector = new StallDetector(testDir, {
      layerThresholds: DEFAULT_LAYER_THRESHOLDS
    });
    // Simulate stall state
    detector._stalled = true;
    detector._warningFired = true;
    detector._criticalFired = true;

    detector.setLayer('L8');
    expect(detector._stalled).toBe(false);
    expect(detector._warningFired).toBe(false);
    expect(detector._criticalFired).toBe(false);
  });

  test('setLayer resets lastMtime when running', () => {
    fs.writeFileSync(path.join(testDir, '_status.md'), '# Status\n');
    const detector = new StallDetector(testDir, {
      layerThresholds: DEFAULT_LAYER_THRESHOLDS
    });
    detector.start();
    const oldMtime = detector._lastMtime;

    detector.setLayer('L8');
    // lastMtime should be reset to Date.now() (integer ms), which is >= the file mtime
    expect(detector._lastMtime).toBeGreaterThanOrEqual(Math.floor(oldMtime));

    detector.stop();
  });

  test('setLayer while stopped stores the layer for later', () => {
    const detector = new StallDetector(testDir, {
      layerThresholds: DEFAULT_LAYER_THRESHOLDS
    });
    detector.setLayer('L8');
    expect(detector._currentLayer).toBe('L8');
    expect(detector._activeThreshold).toBe(1800000);
  });

  test('multiple rapid setLayer calls use the most recent', () => {
    const detector = new StallDetector(testDir, {
      layerThresholds: DEFAULT_LAYER_THRESHOLDS
    });
    detector.setLayer('L3');
    detector.setLayer('L7');
    detector.setLayer('L8');
    expect(detector._activeThreshold).toBe(1800000);
    expect(detector._currentLayer).toBe('L8');
  });
});

describe('Two-tier stall response', () => {
  test('warning fires at 1x threshold with tier field', (done) => {
    fs.writeFileSync(path.join(testDir, '_status.md'), '# Status\n');
    const oldTime = new Date(Date.now() - 200);
    fs.utimesSync(path.join(testDir, '_status.md'), oldTime, oldTime);

    const detector = new StallDetector(testDir, {
      thresholdMs: 100,
      pollIntervalMs: 30,
      onStall: (info) => {
        detector.stop();
        expect(info.tier).toBe('warning');
        expect(info.elapsedMs).toBeGreaterThanOrEqual(100);
        done();
      }
    });

    detector.start();
  });

  test('critical fires at 2x threshold with tier field', (done) => {
    fs.writeFileSync(path.join(testDir, '_status.md'), '# Status\n');
    const oldTime = new Date(Date.now() - 400);
    fs.utimesSync(path.join(testDir, '_status.md'), oldTime, oldTime);

    const criticalCallback = jest.fn();

    const detector = new StallDetector(testDir, {
      thresholdMs: 100,
      pollIntervalMs: 30,
      onStall: () => {
        // warning fires first
      },
      onCritical: (info) => {
        criticalCallback(info);
        detector.stop();
        expect(info.tier).toBe('critical');
        expect(info.elapsedMs).toBeGreaterThanOrEqual(200);
        done();
      }
    });

    detector.start();
  });

  test('warning fires before critical when both thresholds crossed in same poll', (done) => {
    fs.writeFileSync(path.join(testDir, '_status.md'), '# Status\n');
    // Backdate enough for both thresholds
    const oldTime = new Date(Date.now() - 500);
    fs.utimesSync(path.join(testDir, '_status.md'), oldTime, oldTime);

    const callOrder = [];

    const detector = new StallDetector(testDir, {
      thresholdMs: 100,
      pollIntervalMs: 30,
      onStall: () => {
        callOrder.push('warning');
      },
      onCritical: () => {
        callOrder.push('critical');
        detector.stop();
        expect(callOrder).toEqual(['warning', 'critical']);
        done();
      }
    });

    detector.start();
  });

  test('critical fires exactly once per stall episode', (done) => {
    fs.writeFileSync(path.join(testDir, '_status.md'), '# Status\n');
    const oldTime = new Date(Date.now() - 500);
    fs.utimesSync(path.join(testDir, '_status.md'), oldTime, oldTime);

    const criticalCallback = jest.fn();

    const detector = new StallDetector(testDir, {
      thresholdMs: 100,
      pollIntervalMs: 30,
      onStall: () => {},
      onCritical: (info) => {
        criticalCallback(info);
      }
    });

    detector.start();

    setTimeout(() => {
      detector.stop();
      expect(criticalCallback).toHaveBeenCalledTimes(1);
      done();
    }, 200);
  });

  test('recovery clears both warning and critical states', (done) => {
    fs.writeFileSync(path.join(testDir, '_status.md'), '# Status\n');
    const oldTime = new Date(Date.now() - 500);
    fs.utimesSync(path.join(testDir, '_status.md'), oldTime, oldTime);

    let warningCount = 0;

    const detector = new StallDetector(testDir, {
      thresholdMs: 50,
      pollIntervalMs: 20,
      onStall: (info) => {
        warningCount++;
        if (warningCount === 1) {
          // Recover by writing to the file
          setTimeout(() => {
            fs.writeFileSync(path.join(testDir, '_status.md'), '# Updated\n');
            // Then backdate again to trigger new stall episode
            setTimeout(() => {
              const oldAgain = new Date(Date.now() - 500);
              fs.utimesSync(path.join(testDir, '_status.md'), oldAgain, oldAgain);
            }, 30);
          }, 20);
        } else if (warningCount === 2) {
          detector.stop();
          // Second warning means the flags were properly cleared by recovery
          expect(warningCount).toBe(2);
          done();
        }
      },
      onCritical: () => {},
      onRecover: () => {}
    });

    detector.start();
  });

  test('missing onCritical callback does not cause errors', (done) => {
    fs.writeFileSync(path.join(testDir, '_status.md'), '# Status\n');
    const oldTime = new Date(Date.now() - 500);
    fs.utimesSync(path.join(testDir, '_status.md'), oldTime, oldTime);

    const detector = new StallDetector(testDir, {
      thresholdMs: 100,
      pollIntervalMs: 30,
      onStall: () => {}
      // no onCritical
    });

    detector.start();

    setTimeout(() => {
      detector.stop();
      // Should not throw — _criticalFired should still be set
      expect(detector._criticalFired).toBe(true);
      done();
    }, 200);
  });

  test('stall info includes all required fields', (done) => {
    fs.writeFileSync(path.join(testDir, '_status.md'), '# Status\n');
    const oldTime = new Date(Date.now() - 200);
    fs.utimesSync(path.join(testDir, '_status.md'), oldTime, oldTime);

    const detector = new StallDetector(testDir, {
      thresholdMs: 100,
      pollIntervalMs: 30,
      onStall: (info) => {
        detector.stop();
        expect(info).toHaveProperty('file');
        expect(info).toHaveProperty('lastModified');
        expect(info).toHaveProperty('stalledAt');
        expect(info).toHaveProperty('elapsedMs');
        expect(info).toHaveProperty('thresholdMs');
        expect(info).toHaveProperty('stallCount');
        expect(info).toHaveProperty('tier');
        done();
      }
    });

    detector.start();
  });
});

describe('killOnCritical and setAbortController', () => {
  test('killOnCritical defaults to false', () => {
    const detector = new StallDetector(testDir);
    expect(detector._killOnCritical).toBe(false);
  });

  test('killOnCritical can be set to true', () => {
    const detector = new StallDetector(testDir, { killOnCritical: true });
    expect(detector._killOnCritical).toBe(true);
  });

  test('setAbortController stores the controller', () => {
    const detector = new StallDetector(testDir);
    const controller = new AbortController();
    detector.setAbortController(controller);
    expect(detector._abortController).toBe(controller);
  });

  test('setAbortController(null) clears the controller', () => {
    const detector = new StallDetector(testDir);
    const controller = new AbortController();
    detector.setAbortController(controller);
    detector.setAbortController(null);
    expect(detector._abortController).toBeNull();
  });

  test('killOnCritical true + critical tier aborts the controller', (done) => {
    fs.writeFileSync(path.join(testDir, '_status.md'), '# Status\n');
    const oldTime = new Date(Date.now() - 500);
    fs.utimesSync(path.join(testDir, '_status.md'), oldTime, oldTime);

    const controller = new AbortController();

    const detector = new StallDetector(testDir, {
      thresholdMs: 100,
      pollIntervalMs: 30,
      killOnCritical: true,
      onStall: () => {},
      onCritical: () => {}
    });

    detector.setAbortController(controller);
    detector.start();

    // Wait for the critical tier to fire and the kill to happen
    setTimeout(() => {
      detector.stop();
      expect(controller.signal.aborted).toBe(true);
      done();
    }, 200);
  });

  test('killOnCritical false + critical tier does not abort', (done) => {
    fs.writeFileSync(path.join(testDir, '_status.md'), '# Status\n');
    const oldTime = new Date(Date.now() - 500);
    fs.utimesSync(path.join(testDir, '_status.md'), oldTime, oldTime);

    const controller = new AbortController();
    const abortSpy = jest.spyOn(controller, 'abort');

    const detector = new StallDetector(testDir, {
      thresholdMs: 100,
      pollIntervalMs: 30,
      killOnCritical: false,
      onStall: () => {},
      onCritical: () => {
        detector.stop();
        expect(abortSpy).not.toHaveBeenCalled();
        done();
      }
    });

    detector.setAbortController(controller);
    detector.start();
  });

  test('killOnCritical with no AbortController logs warning but does not throw', (done) => {
    fs.writeFileSync(path.join(testDir, '_status.md'), '# Status\n');
    const oldTime = new Date(Date.now() - 500);
    fs.utimesSync(path.join(testDir, '_status.md'), oldTime, oldTime);

    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    const detector = new StallDetector(testDir, {
      thresholdMs: 100,
      pollIntervalMs: 30,
      killOnCritical: true,
      onStall: () => {},
      onCritical: () => {}
    });

    // Do NOT set an AbortController
    detector.start();

    // Wait for the critical tier to fire and the kill attempt
    setTimeout(() => {
      detector.stop();
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('killOnCritical enabled but no AbortController set')
      );
      warnSpy.mockRestore();
      done();
    }, 200);
  });

  test('setLayer clears critical state preventing stale kills', () => {
    const detector = new StallDetector(testDir, {
      killOnCritical: true,
      layerThresholds: DEFAULT_LAYER_THRESHOLDS
    });

    // Simulate being in critical state
    detector._criticalFired = true;
    detector._warningFired = true;
    detector._stalled = true;

    // Layer transition should clear everything
    detector.setLayer('L9');
    expect(detector._criticalFired).toBe(false);
    expect(detector._warningFired).toBe(false);
    expect(detector._stalled).toBe(false);
  });
});
