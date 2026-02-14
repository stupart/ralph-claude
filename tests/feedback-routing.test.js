const { storeFeedback, readFeedback, clearFeedback, promptGate } = require('../lib/gate-prompt');
const { AgentSpawner } = require('../lib/agent-spawner');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');

describe('feedback-routing integration', () => {
  let projectRoot;
  let spawner;

  beforeEach(async () => {
    projectRoot = path.join(os.tmpdir(), `feedback-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    await fs.mkdir(projectRoot, { recursive: true });

    // Create basic Layer Cake structure
    await fs.mkdir(path.join(projectRoot, '3-synthesis'), { recursive: true });
    await fs.mkdir(path.join(projectRoot, '4-epics'), { recursive: true });
    await fs.mkdir(path.join(projectRoot, '5-features'), { recursive: true });
    await fs.mkdir(path.join(projectRoot, '7-subtasks'), { recursive: true });

    // Create templates directory with a basic planner template
    const templatesDir = path.join(projectRoot, 'templates', 'agents');
    await fs.mkdir(templatesDir, { recursive: true });
    await fs.writeFile(
      path.join(templatesDir, 'planner-base.md'),
      '# Planner Agent\n\n{{LAYER_INSTRUCTIONS}}\n\n{{CONTEXT}}'
    );

    spawner = new AgentSpawner(projectRoot);
  });

  afterEach(async () => {
    await fs.rm(projectRoot, { recursive: true, force: true });
  });

  describe('feedback round-trip', () => {
    test('stores, injects, and clears feedback through lifecycle', async () => {
      const layerId = 'L3';
      const feedbackText = 'Focus more on testing edge cases';

      // Step 1: Store feedback
      await storeFeedback(projectRoot, layerId, feedbackText);

      // Verify file was created
      const feedbackPath = path.join(projectRoot, '_gate-feedback.md');
      const exists = await fs.access(feedbackPath).then(() => true).catch(() => false);
      expect(exists).toBe(true);

      // Step 2: Read feedback back
      const stored = await readFeedback(projectRoot, layerId);
      expect(stored).toBe(feedbackText);

      // Step 3: Create spawn config and verify injection
      const spawnConfig = await spawner.createSpawnConfig(layerId, { layer: layerId });
      expect(spawnConfig.prompt).toContain('## Human Feedback');
      expect(spawnConfig.prompt).toContain(feedbackText);

      // Step 4: Clear feedback (simulating successful re-execution)
      await clearFeedback(projectRoot, layerId);

      // Verify feedback cleared
      const clearedFeedback = await readFeedback(projectRoot, layerId);
      expect(clearedFeedback).toBeNull();

      // Step 5: Create new spawn config and verify no feedback section
      const spawnConfig2 = await spawner.createSpawnConfig(layerId, { layer: layerId });
      expect(spawnConfig2.prompt).not.toContain('## Human Feedback');
      expect(spawnConfig2.prompt).not.toContain(feedbackText);
    });

    test('feedback text preserved verbatim with special characters', async () => {
      const layerId = 'L3';
      const feedbackText = `**CRITICAL**: Missing validation
- Add regex: /^##\\s+Task\\s+\\d+/
- Test with "edge cases"
- Handle \`null\` returns`;

      await storeFeedback(projectRoot, layerId, feedbackText);
      const stored = await readFeedback(projectRoot, layerId);

      // Exact match - no escaping or modification
      expect(stored).toBe(feedbackText);

      const spawnConfig = await spawner.createSpawnConfig(layerId, { layer: layerId });
      expect(spawnConfig.prompt).toContain(feedbackText);
    });
  });

  describe('auto-approve', () => {
    test('autoApprove option bypasses prompt', async () => {
      const summary = { jtbdCount: 3, journeys: [], componentCount: 5, decisionCount: 2 };

      const decision = await promptGate(summary, 'L3', { autoApprove: true });

      expect(decision).toEqual({ approved: true });
    });

    test('stale feedback cleared after clearFeedback call', async () => {
      const layerId = 'L3';

      // Store feedback from previous run
      await storeFeedback(projectRoot, layerId, 'Old feedback from previous run');

      // Clear it (simulating what Ralph does on approval)
      await clearFeedback(projectRoot, layerId);
      const feedback = await readFeedback(projectRoot, layerId);
      expect(feedback).toBeNull();
    });
  });

  describe('stale feedback prevention', () => {
    test('L3 feedback does not leak into L7 gate', async () => {
      // Store L3 feedback
      await storeFeedback(projectRoot, 'L3', 'L3-specific feedback');

      // Verify L3 sees its feedback
      const l3Feedback = await readFeedback(projectRoot, 'L3');
      expect(l3Feedback).toBe('L3-specific feedback');

      // Verify L7 does NOT see L3 feedback
      const l7Feedback = await readFeedback(projectRoot, 'L7');
      expect(l7Feedback).toBeNull();
    });

    test('feedback cleared after success does not re-appear', async () => {
      const layerId = 'L3';

      // First rejection cycle
      await storeFeedback(projectRoot, layerId, 'First feedback');

      // Simulate successful re-execution
      await clearFeedback(projectRoot, layerId);

      // Second execution (no rejection) - spawn config should not have feedback
      const spawnConfig = await spawner.createSpawnConfig(layerId, { layer: layerId });
      expect(spawnConfig.prompt).not.toContain('## Human Feedback');

      // Store new feedback
      await storeFeedback(projectRoot, layerId, 'Second feedback');

      // Verify only second feedback present
      const feedback = await readFeedback(projectRoot, layerId);
      expect(feedback).toBe('Second feedback');
    });

    test('L3 feedback not injected into L7 spawn config', async () => {
      await storeFeedback(projectRoot, 'L3', 'L3-specific feedback');

      // Create L7 spawn config - should not contain L3 feedback
      // L7 is a planner layer, so we can use the same template
      const templatesDir = path.join(projectRoot, 'templates', 'agents');
      await fs.writeFile(
        path.join(templatesDir, 'planner-L7.md'),
        '# Planner L7\n\n{{LAYER_INSTRUCTIONS}}'
      );

      const spawnConfig = await spawner.createSpawnConfig('L7', { layer: 'L7' });
      expect(spawnConfig.prompt).not.toContain('L3-specific feedback');
    });
  });

  describe('non-TTY detection', () => {
    test('non-TTY stdin auto-approves with stderr warning', async () => {
      // Mock stderr to capture warnings
      const stderrWrites = [];
      const originalStderrWrite = process.stderr.write;
      process.stderr.write = function(chunk) {
        stderrWrites.push(chunk.toString());
        return true;
      };

      try {
        // Mock non-TTY stdin
        const originalIsTTY = process.stdin.isTTY;
        delete process.stdin.isTTY;

        const summary = {
          jtbdCount: 4,
          journeys: ['Test Journey'],
          componentCount: 10,
          decisionCount: 3
        };

        const decision = await promptGate(summary, 'L3');

        expect(decision).toEqual({ approved: true });

        const warnings = stderrWrites.join('');
        expect(warnings).toContain('[WARN]');
        expect(warnings).toContain('Non-TTY stdin detected');
        expect(warnings).toContain('L3 gate');
        expect(warnings).toContain('auto-approving');

        // Restore
        if (originalIsTTY !== undefined) {
          process.stdin.isTTY = originalIsTTY;
        }
      } finally {
        process.stderr.write = originalStderrWrite;
      }
    });

    test('DI streams work normally without TTY', async () => {
      const { Readable, Writable } = require('stream');

      // Create mock streams without TTY
      const input = new Readable({ read() {} });
      const output = new Writable({
        write(chunk, encoding, callback) {
          callback();
        }
      });

      // Simulate user typing "approve"
      setImmediate(() => {
        input.push('approve\n');
        input.push(null);
      });

      const summary = { jtbdCount: 3, journeys: [], componentCount: 5, decisionCount: 2 };
      const decision = await promptGate(summary, 'L3', { input, output });

      // Should process normally via DI streams, not auto-approve
      expect(decision).toEqual({ approved: true });
    });
  });
});
