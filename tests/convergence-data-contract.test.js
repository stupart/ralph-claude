const { GenerationTracker } = require('../lib/generation-tracker');
const { ConvergenceDetector } = require('../lib/convergence-detector');
const fs = require('fs');
const path = require('path');
const os = require('os');

describe('Convergence Data Contract', () => {
  describe('GenerationTracker field extraction', () => {
    it('parseEvents returns testCount field from layer_end meta.testCount', async () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gen-tracker-'));
      const eventsPath = path.join(tmpDir, '_events.jsonl');
      fs.writeFileSync(eventsPath, JSON.stringify({ type: 'layer_end', layer: 'L8', meta: { testCount: 42 } }) + '\n');
      const tracker = new GenerationTracker(tmpDir);
      const result = await tracker.parseEvents(eventsPath);
      expect(result.testCount).toBe(42);
      fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    it('parseEvents returns testCount from test_results event', async () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gen-tracker-'));
      const eventsPath = path.join(tmpDir, '_events.jsonl');
      fs.writeFileSync(eventsPath, JSON.stringify({ type: 'test_results', count: 100 }) + '\n');
      const tracker = new GenerationTracker(tmpDir);
      const result = await tracker.parseEvents(eventsPath);
      expect(result.testCount).toBe(100);
      fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    it('parseEvents returns null testCount when no test events', async () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gen-tracker-'));
      const eventsPath = path.join(tmpDir, '_events.jsonl');
      fs.writeFileSync(eventsPath, JSON.stringify({ type: 'layer_end', layer: 'L8' }) + '\n');
      const tracker = new GenerationTracker(tmpDir);
      const result = await tracker.parseEvents(eventsPath);
      expect(result.testCount).toBeNull();
      fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    it('parseEvents returns totalTimeoutDuration from timeout error with duration', async () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gen-tracker-'));
      const eventsPath = path.join(tmpDir, '_events.jsonl');
      fs.writeFileSync(eventsPath, JSON.stringify({ type: 'error', message: 'timeout', duration: 30000 }) + '\n');
      const tracker = new GenerationTracker(tmpDir);
      const result = await tracker.parseEvents(eventsPath);
      expect(result.totalTimeoutDuration).toBe(30000);
      fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    it('parseEvents returns totalTimeoutDuration 0 when no timeout events', async () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gen-tracker-'));
      const eventsPath = path.join(tmpDir, '_events.jsonl');
      fs.writeFileSync(eventsPath, JSON.stringify({ type: 'layer_end', layer: 'L8' }) + '\n');
      const tracker = new GenerationTracker(tmpDir);
      const result = await tracker.parseEvents(eventsPath);
      expect(result.totalTimeoutDuration).toBe(0);
      fs.rmSync(tmpDir, { recursive: true, force: true });
    });
  });

  describe('ConvergenceDetector metric completeness', () => {
    it('testsAdded and executionWaste are not incomplete when source data exists', () => {
      const detector = new ConvergenceDetector();
      const history = {
        generations: [
          { generation: 3, epics: { planned: 4, built: 2, deferred: 2 }, executionTime: 1000, testCount: 500, timeoutWastePercentage: 10 },
          { generation: 4, epics: { planned: 4, built: 3, deferred: 1 }, executionTime: 900, testCount: 600, timeoutWastePercentage: 5 },
        ],
        deferralCounts: {}
      };
      const result = detector.analyze(history);
      expect(result.metrics.testsAdded.incomplete).toBe(false);
      expect(result.metrics.executionWaste.incomplete).toBe(false);
    });

    it('handles null testCount and timeoutWastePercentage gracefully', () => {
      const detector = new ConvergenceDetector();
      const history = {
        generations: [
          { generation: 3, epics: { planned: 4, built: 2, deferred: 2 }, executionTime: 1000, testCount: null, timeoutWastePercentage: null },
          { generation: 4, epics: { planned: 4, built: 3, deferred: 1 }, executionTime: 900, testCount: null, timeoutWastePercentage: null },
        ],
        deferralCounts: {}
      };
      expect(() => detector.analyze(history)).not.toThrow();
      const result = detector.analyze(history);
      expect(result.metrics.testsAdded.incomplete).toBe(true);
      expect(result.metrics.executionWaste.incomplete).toBe(true);
    });
  });
});
