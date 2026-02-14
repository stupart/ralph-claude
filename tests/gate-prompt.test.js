const { promptGate, formatSummary, storeFeedback, readFeedback, clearFeedback } = require('../lib/gate-prompt');
const { Readable, Writable } = require('stream');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');

describe('gate-prompt', () => {
  describe('formatSummary()', () => {
    test('formats L3 summary correctly', () => {
      const summary = {
        jtbdCount: 4,
        journeys: ['Developer Onboarding', 'Self-Improvement'],
        componentCount: 10,
        decisionCount: 3
      };

      const formatted = formatSummary(summary, 'L3');

      expect(formatted).toContain('=== L3 Synthesis Gate ===');
      expect(formatted).toContain('JTBD Count: 4');
      expect(formatted).toContain('Developer Onboarding');
      expect(formatted).toContain('Self-Improvement');
      expect(formatted).toContain('Architecture Components: 10');
      expect(formatted).toContain('Architecture Decisions: 3');
    });

    test('formats L7 summary correctly', () => {
      const summary = {
        epics: 3,
        features: 9,
        tasks: 27,
        subtasks: 54,
        jtbdCoverage: [1, 2, 3]
      };

      const formatted = formatSummary(summary, 'L7');

      expect(formatted).toContain('=== L7 Plan Gate ===');
      expect(formatted).toContain('Epics: 3');
      expect(formatted).toContain('Features: 9');
      expect(formatted).toContain('Tasks: 27');
      expect(formatted).toContain('Subtasks: 54');
      expect(formatted).toContain('JTBD Coverage: 1, 2, 3');
    });

    test('handles empty journeys array', () => {
      const summary = {
        jtbdCount: 0,
        journeys: [],
        componentCount: 0,
        decisionCount: 0
      };

      const formatted = formatSummary(summary, 'L3');

      expect(formatted).toContain('Journeys (0):');
    });

    test('handles empty JTBD coverage', () => {
      const summary = {
        epics: 0,
        features: 0,
        tasks: 0,
        subtasks: 0,
        jtbdCoverage: []
      };

      const formatted = formatSummary(summary, 'L7');

      expect(formatted).toContain('JTBD Coverage: none');
    });
  });

  describe('promptGate()', () => {
    function createMockStreams(inputs) {
      const input = new Readable({
        read() {}
      });
      input.isTTY = true; // Simulate TTY

      const outputBuffer = [];
      const output = new Writable({
        write(chunk, encoding, callback) {
          outputBuffer.push(chunk.toString());
          callback();
        }
      });

      // Simulate user input
      setImmediate(() => {
        for (const line of inputs) {
          input.push(line + '\n');
        }
        input.push(null); // End stream
      });

      return { input, output, outputBuffer };
    }

    const l3Summary = { jtbdCount: 3, journeys: [], componentCount: 5, decisionCount: 2 };

    test('approve input returns approved=true', async () => {
      const { input, output } = createMockStreams(['approve']);

      const result = await promptGate(l3Summary, 'L3', { input, output });

      expect(result).toEqual({ approved: true });
    });

    test('APPROVE (uppercase) is case-insensitive', async () => {
      const { input, output } = createMockStreams(['APPROVE']);

      const result = await promptGate(l3Summary, 'L3', { input, output });

      expect(result).toEqual({ approved: true });
    });

    test('reject input returns approved=false with null feedback', async () => {
      const { input, output } = createMockStreams(['reject']);

      const result = await promptGate(l3Summary, 'L3', { input, output });

      expect(result).toEqual({ approved: false, feedback: null });
    });

    test('REJECT (uppercase) is case-insensitive', async () => {
      const { input, output } = createMockStreams(['REJECT']);

      const result = await promptGate(l3Summary, 'L3', { input, output });

      expect(result).toEqual({ approved: false, feedback: null });
    });

    test('free-text input returns approved=false with feedback', async () => {
      const { input, output } = createMockStreams(['Focus more on testing']);

      const result = await promptGate(l3Summary, 'L3', { input, output });

      expect(result).toEqual({
        approved: false,
        feedback: 'Focus more on testing'
      });
    });

    test('free-text preserves original case in feedback', async () => {
      const { input, output } = createMockStreams(['Add MORE Tests Please']);

      const result = await promptGate(l3Summary, 'L3', { input, output });

      expect(result.feedback).toBe('Add MORE Tests Please');
    });

    test('empty input re-prompts then accepts valid input', async () => {
      const { input, output } = createMockStreams(['', 'approve']);

      const result = await promptGate(l3Summary, 'L3', { input, output });

      expect(result).toEqual({ approved: true });
    });

    test('displays formatted summary before prompt', async () => {
      const { input, output, outputBuffer } = createMockStreams(['approve']);
      const summary = {
        jtbdCount: 4,
        journeys: ['Developer Onboarding'],
        componentCount: 10,
        decisionCount: 3
      };

      await promptGate(summary, 'L3', { input, output });

      const fullOutput = outputBuffer.join('');
      expect(fullOutput).toContain('=== L3 Synthesis Gate ===');
      expect(fullOutput).toContain('JTBD Count: 4');
      expect(fullOutput).toContain('Developer Onboarding');
      expect(fullOutput).toContain('[approve/reject/feedback] >');
    });

    test('autoApprove option returns approved immediately', async () => {
      const result = await promptGate(l3Summary, 'L3', { autoApprove: true });

      expect(result).toEqual({ approved: true });
    });

    test('DI streams work normally without isTTY', async () => {
      const { input, output } = createMockStreams(['approve']);
      delete input.isTTY; // Non-TTY mock stream

      const result = await promptGate(l3Summary, 'L3', { input, output });

      // Should process normally via DI streams, not auto-approve
      expect(result).toEqual({ approved: true });
    });
  });

  describe('storeFeedback()', () => {
    let projectRoot;

    beforeEach(async () => {
      projectRoot = path.join(os.tmpdir(), `feedback-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
      await fs.mkdir(projectRoot, { recursive: true });
    });

    afterEach(async () => {
      await fs.rm(projectRoot, { recursive: true, force: true });
    });

    test('writes feedback to _gate-feedback.md', async () => {
      await storeFeedback(projectRoot, 'L3', 'Add more tests');

      const feedbackPath = path.join(projectRoot, '_gate-feedback.md');
      const content = await fs.readFile(feedbackPath, 'utf-8');

      expect(content).toContain('# Gate Feedback');
      expect(content).toContain('## Layer: L3');
      expect(content).toContain('Add more tests');
      expect(content).toContain('_Stored at:');
    });

    test('preserves feedback text verbatim', async () => {
      const feedbackText = '**CRITICAL**: Missing validation\n- Add regex';
      await storeFeedback(projectRoot, 'L7', feedbackText);

      const stored = await readFeedback(projectRoot, 'L7');
      expect(stored).toBe(feedbackText);
    });

    test('multiple calls overwrite previous feedback', async () => {
      await storeFeedback(projectRoot, 'L3', 'First feedback');
      await storeFeedback(projectRoot, 'L3', 'Second feedback');

      const stored = await readFeedback(projectRoot, 'L3');
      expect(stored).toBe('Second feedback');
    });
  });

  describe('readFeedback()', () => {
    let projectRoot;

    beforeEach(async () => {
      projectRoot = path.join(os.tmpdir(), `feedback-read-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
      await fs.mkdir(projectRoot, { recursive: true });
    });

    afterEach(async () => {
      await fs.rm(projectRoot, { recursive: true, force: true });
    });

    test('returns stored feedback text for matching layer', async () => {
      await storeFeedback(projectRoot, 'L3', 'Focus on testing');

      const feedback = await readFeedback(projectRoot, 'L3');
      expect(feedback).toBe('Focus on testing');
    });

    test('returns null for missing feedback file', async () => {
      const feedback = await readFeedback(projectRoot, 'L3');
      expect(feedback).toBeNull();
    });

    test('returns null for non-matching layer', async () => {
      await storeFeedback(projectRoot, 'L3', 'L3 feedback');

      const feedback = await readFeedback(projectRoot, 'L7');
      expect(feedback).toBeNull();
    });
  });

  describe('clearFeedback()', () => {
    let projectRoot;

    beforeEach(async () => {
      projectRoot = path.join(os.tmpdir(), `feedback-clear-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
      await fs.mkdir(projectRoot, { recursive: true });
    });

    afterEach(async () => {
      await fs.rm(projectRoot, { recursive: true, force: true });
    });

    test('deletes feedback file for matching layer', async () => {
      await storeFeedback(projectRoot, 'L3', 'Some feedback');
      await clearFeedback(projectRoot, 'L3');

      const feedback = await readFeedback(projectRoot, 'L3');
      expect(feedback).toBeNull();
    });

    test('does not delete feedback for non-matching layer', async () => {
      await storeFeedback(projectRoot, 'L3', 'L3 feedback');
      await clearFeedback(projectRoot, 'L7');

      const feedback = await readFeedback(projectRoot, 'L3');
      expect(feedback).toBe('L3 feedback');
    });

    test('does not throw when no feedback file exists', async () => {
      await expect(clearFeedback(projectRoot, 'L3')).resolves.toBeUndefined();
    });
  });
});
