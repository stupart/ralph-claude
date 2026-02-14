const { summarizeL3, summarizeL7, safeReadFile } = require('../lib/gate-summarizer');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');

describe('gate-summarizer', () => {
  let fixtureRoot;

  beforeEach(async () => {
    fixtureRoot = path.join(os.tmpdir(), `gate-summarizer-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    await fs.mkdir(fixtureRoot, { recursive: true });

    // Create L3 synthesis fixtures
    const synthPath = path.join(fixtureRoot, '3-synthesis');
    await fs.mkdir(synthPath, { recursive: true });

    await fs.writeFile(
      path.join(synthPath, 'jtbd.md'),
      `## JTBD 1: Verified Pipeline Correctness
## JTBD 2: Test Infrastructure
## JTBD 3: Human Gate UX
## JTBD 4: Self-Improvement Bootstrap`
    );

    await fs.writeFile(
      path.join(synthPath, 'journeys.md'),
      `## Journey 1: Developer Onboarding
## Journey 2: Self-Improvement
## Journey 3: CI Integration`
    );

    await fs.writeFile(
      path.join(synthPath, 'architecture.md'),
      `### Component 1: StateManager
### Component 2: Validator
### Component 3: Router
### Component 4: AgentSpawner
### Component 5: EventLogger
### Component 6: StallDetector
### Component 7: Notifier
### Component 8: Webhook
### Component 9: PluginManager
### Component 10: VerdictParser
### Decision 1: Use filesystem state
### Decision 2: Opus-only for agents
### Decision 3: Iteration learning via handoff`
    );

    // Create L7 plan fixtures
    await createL7Fixtures();
  });

  async function createL7Fixtures() {
    // Create epics
    const epicsPath = path.join(fixtureRoot, '4-epics');
    await fs.mkdir(epicsPath, { recursive: true });

    await fs.writeFile(
      path.join(epicsPath, 'epic-01.md'),
      `# Epic 1\n## Jobs Addressed\n- JTBD 1\n- JTBD 3`
    );
    await fs.writeFile(
      path.join(epicsPath, 'epic-02.md'),
      `# Epic 2\n## Jobs Addressed\n- JTBD 2`
    );
    await fs.writeFile(
      path.join(epicsPath, 'epic-03.md'),
      `# Epic 3\n## JTBD\n- JTBD 3\n- JTBD 4`
    );
    // Non-matching file that should be ignored
    await fs.writeFile(
      path.join(epicsPath, '_index.md'),
      '# Epic Registry'
    );

    // Create features
    const featuresPath = path.join(fixtureRoot, '5-features');
    for (let i = 1; i <= 3; i++) {
      const epicDir = path.join(featuresPath, `e${i}`);
      await fs.mkdir(epicDir, { recursive: true });

      for (let j = 1; j <= 3; j++) {
        await fs.writeFile(
          path.join(epicDir, `feature-0${j}.md`),
          `# Feature ${i}.${j}`
        );
      }
    }

    // Create tasks
    const tasksDir = path.join(fixtureRoot, '6-tasks');
    await fs.mkdir(path.join(tasksDir, 'e1', 'f1'), { recursive: true });
    await fs.writeFile(path.join(tasksDir, 'e1', 'f1', 'task-01.md'), '# Task');
    await fs.writeFile(path.join(tasksDir, 'e1', 'f1', 'task-02.md'), '# Task');

    // Create subtasks
    const subtasksDir = path.join(fixtureRoot, '7-subtasks');
    await fs.mkdir(path.join(subtasksDir, 'e1', 'f1'), { recursive: true });
    await fs.writeFile(path.join(subtasksDir, 'e1', 'f1', 'subtask-01.md'), '# Subtask');
  }

  afterEach(async () => {
    await fs.rm(fixtureRoot, { recursive: true, force: true });
  });

  describe('safeReadFile()', () => {
    test('returns content for existing files', async () => {
      const content = await safeReadFile(path.join(fixtureRoot, '3-synthesis', 'jtbd.md'));
      expect(content).toContain('## JTBD 1');
    });

    test('returns null for missing files without throwing', async () => {
      const content = await safeReadFile(path.join(fixtureRoot, 'nonexistent.md'));
      expect(content).toBeNull();
    });

    test('throws for non-ENOENT errors', async () => {
      // Pass a directory path instead of file to trigger a different error
      await expect(safeReadFile(fixtureRoot)).rejects.toThrow();
    });
  });

  describe('summarizeL3()', () => {
    test('returns correct counts for complete synthesis', async () => {
      const result = await summarizeL3(fixtureRoot);

      expect(result).toEqual({
        jtbdCount: 4,
        journeys: ['Developer Onboarding', 'Self-Improvement', 'CI Integration'],
        componentCount: 10,
        decisionCount: 3
      });
    });

    test('handles missing journeys.md gracefully', async () => {
      await fs.unlink(path.join(fixtureRoot, '3-synthesis', 'journeys.md'));

      const result = await summarizeL3(fixtureRoot);

      expect(result.journeys).toEqual([]);
      expect(result.jtbdCount).toBe(4);
    });

    test('handles missing architecture.md gracefully', async () => {
      await fs.unlink(path.join(fixtureRoot, '3-synthesis', 'architecture.md'));

      const result = await summarizeL3(fixtureRoot);

      expect(result.componentCount).toBe(0);
      expect(result.decisionCount).toBe(0);
    });

    test('handles empty jtbd.md file', async () => {
      await fs.writeFile(path.join(fixtureRoot, '3-synthesis', 'jtbd.md'), '');

      const result = await summarizeL3(fixtureRoot);

      expect(result.jtbdCount).toBe(0);
    });

    test('matches heading variations', async () => {
      await fs.writeFile(
        path.join(fixtureRoot, '3-synthesis', 'jtbd.md'),
        `## JTBD 1: With colon
## JTBD 2 - With dash
## JTBD 3 (With parens)`
      );

      const result = await summarizeL3(fixtureRoot);

      expect(result.jtbdCount).toBe(3);
    });

    test('handles missing 3-synthesis directory', async () => {
      await fs.rm(path.join(fixtureRoot, '3-synthesis'), { recursive: true, force: true });

      const result = await summarizeL3(fixtureRoot);

      expect(result).toEqual({
        jtbdCount: 0,
        journeys: [],
        componentCount: 0,
        decisionCount: 0
      });
    });

    test('trims whitespace from journey names', async () => {
      await fs.writeFile(
        path.join(fixtureRoot, '3-synthesis', 'journeys.md'),
        `## Journey 1:   Padded Name   `
      );

      const result = await summarizeL3(fixtureRoot);

      expect(result.journeys).toEqual(['Padded Name']);
    });
  });

  describe('summarizeL7()', () => {
    test('returns correct counts for complete plan', async () => {
      const result = await summarizeL7(fixtureRoot);

      expect(result).toEqual({
        epics: 3,
        features: 9,
        tasks: 2,
        subtasks: 1,
        jtbdCoverage: [1, 2, 3, 4]
      });
    });

    test('handles empty features directory', async () => {
      await fs.rm(path.join(fixtureRoot, '5-features'), { recursive: true, force: true });

      const result = await summarizeL7(fixtureRoot);

      expect(result.features).toBe(0);
    });

    test('handles missing epics directory', async () => {
      await fs.rm(path.join(fixtureRoot, '4-epics'), { recursive: true, force: true });

      const result = await summarizeL7(fixtureRoot);

      expect(result.epics).toBe(0);
      expect(result.jtbdCoverage).toEqual([]);
      expect(result.features).toBe(9);
    });

    test('ignores non-matching files like _index.md', async () => {
      const result = await summarizeL7(fixtureRoot);

      // _index.md should not be counted
      expect(result.epics).toBe(3);
    });

    test('handles missing tasks and subtasks directories', async () => {
      await fs.rm(path.join(fixtureRoot, '6-tasks'), { recursive: true, force: true });
      await fs.rm(path.join(fixtureRoot, '7-subtasks'), { recursive: true, force: true });

      const result = await summarizeL7(fixtureRoot);

      expect(result.tasks).toBe(0);
      expect(result.subtasks).toBe(0);
    });

    test('JTBD coverage returns sorted deduplicated array', async () => {
      // Epic 1 has JTBD 1, 3; Epic 2 has JTBD 2; Epic 3 has JTBD 3, 4
      // 3 appears in both Epic 1 and Epic 3 - should be deduplicated
      const result = await summarizeL7(fixtureRoot);

      expect(result.jtbdCoverage).toEqual([1, 2, 3, 4]);
    });

    test('handles epic files with both Jobs Addressed and JTBD sections', async () => {
      // Epic 3 uses "## JTBD" instead of "## Jobs Addressed"
      const result = await summarizeL7(fixtureRoot);

      // Should still find JTBD references in both formats
      expect(result.jtbdCoverage).toContain(4);
    });

    test('handles all directories missing', async () => {
      const emptyRoot = path.join(os.tmpdir(), `empty-test-${Date.now()}`);
      await fs.mkdir(emptyRoot, { recursive: true });

      try {
        const result = await summarizeL7(emptyRoot);

        expect(result).toEqual({
          epics: 0,
          features: 0,
          tasks: 0,
          subtasks: 0,
          jtbdCoverage: []
        });
      } finally {
        await fs.rm(emptyRoot, { recursive: true, force: true });
      }
    });
  });
});
