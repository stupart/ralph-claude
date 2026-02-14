/**
 * Artifact Generators for MockExecutor
 *
 * Per-layer artifact generator functions that produce realistic
 * planner markdown, builder source files, and judge verdict text.
 */

const { LAYER_FOLDERS } = require('../../lib/state-machine');
const fs = require('fs').promises;
const path = require('path');

/**
 * Apply timing delay with AbortSignal support.
 * Supports preWrite mode where artifacts are written before the delay.
 *
 * @param {string} layerId
 * @param {Object} executor - MockExecutor instance
 * @param {Object} options - Execute options (may contain signal)
 * @param {Function} generatorFn - Async function that generates artifacts
 * @returns {Promise<Object>} Generator result
 */
async function applyTimingDelay(layerId, executor, options, generatorFn) {
  const timingConfig = executor?.timingOverrides?.[layerId];
  const delayMs = timingConfig?.delayMs;
  const preWrite = timingConfig?.preWrite;

  if (!delayMs || delayMs === 0) {
    return await generatorFn();
  }

  if (preWrite) {
    // Write artifacts first, then delay
    const result = await generatorFn();

    return new Promise((resolve) => {
      const timer = setTimeout(() => resolve(result), delayMs);

      if (options.signal) {
        options.signal.addEventListener('abort', () => {
          clearTimeout(timer);
          // Resolve with result anyway since we already wrote files
          resolve(result);
        }, { once: true });
      }
    });
  } else {
    // Original behavior: delay first, then generate
    return new Promise((resolve, reject) => {
      const timer = setTimeout(async () => {
        try {
          const result = await generatorFn();
          resolve(result);
        } catch (err) {
          reject(err);
        }
      }, delayMs);

      if (options.signal) {
        options.signal.addEventListener('abort', () => {
          clearTimeout(timer);
          reject(new DOMException('Aborted', 'AbortError'));
        }, { once: true });
      }
    });
  }
}

/**
 * Generate planner artifacts for L1-L7 and L12.
 * Writes layer-appropriate markdown files to the correct LAYER_FOLDERS directory.
 */
async function generatePlannerArtifact(layerId, spawnConfig, options, executor) {
  return await applyTimingDelay(layerId, executor, options, async () => {
    const files = [];
    const folder = LAYER_FOLDERS[layerId];
    if (!folder) {
      return {
        output: `# Mock Output for ${layerId}\n\nNo folder for this layer.`,
        files,
        tokenUsage: { inputTokens: 100, outputTokens: 50 }
      };
    }

    const outputDir = path.join(spawnConfig.workingDir, folder);
    await fs.mkdir(outputDir, { recursive: true });

    switch (layerId) {
      case 'L1':
        await fs.writeFile(path.join(outputDir, 'sources.md'), '# Sources\n\n## Description\nMock sources for integration testing.');
        await fs.writeFile(path.join(outputDir, 'brain-dump.md'), '# Brain Dump\n\n## Description\nMock brain dump for integration testing.\n\n## Goals\n- Test pipeline flow\n- Validate layer transitions');
        files.push('sources.md', 'brain-dump.md');
        break;

      case 'L2':
        await fs.writeFile(path.join(outputDir, 'quotes.md'), '# Quotes\n\n## Quote 1\nMock quote from input.');
        await fs.writeFile(path.join(outputDir, 'patterns.md'), '# Patterns\n\n## Pattern 1\nMock pattern.');
        await fs.writeFile(path.join(outputDir, 'affinities.md'), '# Affinities\n\n## Affinity 1\nMock affinity group.');
        files.push('quotes.md', 'patterns.md', 'affinities.md');
        break;

      case 'L3':
        await fs.writeFile(path.join(outputDir, 'jtbd.md'), '# JTBD\n\n## JTBD 1\nMock job to be done.\n\n## JTBD 2\nSecond mock job.\n\n## JTBD 3\nThird mock job.');
        await fs.writeFile(path.join(outputDir, 'journeys.md'), '# Journeys\n\n## Journey 1\nMock user journey.\n\n## Journey 2\nSecond mock journey.');
        await fs.writeFile(path.join(outputDir, 'architecture.md'), '# Architecture\n\n## Overview\nMock architecture overview.\n\n## Decision 1\nMock architecture decision.');
        files.push('jtbd.md', 'journeys.md', 'architecture.md');
        break;

      case 'L4':
        await fs.writeFile(path.join(outputDir, '_index.md'), '# Epics Index\n\n## Overview\nMock epics index with 3 epics.');
        for (let i = 1; i <= 3; i++) {
          const epicFile = `epic-0${i}.md`;
          await fs.writeFile(path.join(outputDir, epicFile),
            `# Epic ${i}\n\n## Description\nMock epic ${i} description.\n\n## Scope\nMock scope for epic ${i}.\n\n## Dependencies\nNone.`
          );
          files.push(epicFile);
        }
        files.push('_index.md');
        break;

      case 'L5': {
        // Create feature files per epic
        for (let e = 1; e <= 3; e++) {
          const epicDir = path.join(outputDir, `e${e}-mock-epic`);
          await fs.mkdir(epicDir, { recursive: true });
          await fs.writeFile(path.join(epicDir, '_index.md'), `# Features for Epic ${e}\n\n## Overview\nMock features.`);
          for (let f = 1; f <= 3; f++) {
            const featureFile = `feature-0${f}.md`;
            await fs.writeFile(path.join(epicDir, featureFile),
              `# Feature ${f}\n\n## Overview\nMock feature.\n\n## Requirements\n- Requirement 1\n\n## Acceptance Criteria\n- [ ] Criterion 1\n\n## Planned Tasks\n- Task 1`
            );
            files.push(`e${e}-mock-epic/${featureFile}`);
          }
        }
        break;
      }

      case 'L6': {
        // Create task files per epic/feature
        for (let e = 1; e <= 3; e++) {
          for (let f = 1; f <= 3; f++) {
            const featureDir = path.join(outputDir, `e${e}-mock-epic`, `f${f}-mock-feature`);
            await fs.mkdir(featureDir, { recursive: true });
            await fs.writeFile(path.join(featureDir, '_tasks.md'),
              `# Tasks for Feature ${f}\n\n## Task 1\nMock task 1.\n\n## Task 2\nMock task 2.\n\n## Task 3\nMock task 3.`
            );
            files.push(`e${e}-mock-epic/f${f}-mock-feature/_tasks.md`);
          }
        }
        break;
      }

      case 'L7': {
        // Create subtask files per epic/feature/task
        for (let e = 1; e <= 3; e++) {
          for (let f = 1; f <= 3; f++) {
            const featureDir = path.join(outputDir, `e${e}-mock-epic`, `f${f}-mock-feature`);
            await fs.mkdir(featureDir, { recursive: true });
            for (let t = 1; t <= 3; t++) {
              await fs.writeFile(path.join(featureDir, `task-${t}.md`),
                `# Subtasks for Task ${t}\n\n## Subtask 1\nMock subtask.\n\n### Action\nMock action.\n\n### Files\n- mock-file.js\n\n### Verification\n- [ ] Check passes\n\n## Subtask 2\nSecond mock subtask.\n\n### Action\nMock action 2.\n\n### Files\n- mock-file-2.js\n\n### Verification\n- [ ] Check passes`
              );
              files.push(`e${e}-mock-epic/f${f}-mock-feature/task-${t}.md`);
            }
          }
        }
        break;
      }

      case 'L12':
        await fs.writeFile(path.join(outputDir, 'retrospective.md'),
          '# Retrospective\n\n## What Worked\n- Mock success item.\n\n## What Didn\'t\n- Mock improvement area.\n\n## Lessons Learned\n- Mock lesson.'
        );
        files.push('retrospective.md');
        break;
    }

    return {
      output: `# Mock Output for ${layerId}\n\nGenerated planner artifacts.`,
      files,
      tokenUsage: { inputTokens: 100, outputTokens: 50 }
    };
  });
}

/**
 * Generate builder artifacts for L8.
 * L8 maps to null in LAYER_FOLDERS - writes mock code to lib/ directory.
 */
async function generateBuilderArtifact(layerId, spawnConfig, options, executor) {
  return await applyTimingDelay(layerId, executor, options, async () => {
    const mockFile = path.join(spawnConfig.workingDir, 'lib', 'mock-module.js');
    await fs.mkdir(path.dirname(mockFile), { recursive: true });
    await fs.writeFile(mockFile, '// Mock generated code\nmodule.exports = { mock: true };');

    return {
      output: '// Mock Implementation\nfunction mockFunction() {\n  return "mock";\n}\n\nmodule.exports = { mockFunction };',
      files: ['lib/mock-module.js'],
      tokenUsage: { inputTokens: 100, outputTokens: 50 }
    };
  });
}

/**
 * Generate judge artifacts for L9-L11.
 * Judges are read-only - no filesystem writes.
 * Supports verdict overrides from MockExecutor configuration.
 */
async function generateJudgeArtifact(layerId, spawnConfig, options, executor) {
  return await applyTimingDelay(layerId, executor, options, async () => {
    const override = executor?.verdictOverrides?.[layerId];
    let verdictConfig = { verdict: 'PASS' };

    if (override) {
      if (typeof override === 'function') {
        const iteration = executor.iterationCounts[layerId] || 1;
        verdictConfig = override(iteration);
      } else {
        verdictConfig = override;
      }
    }

    let output = '';
    if (verdictConfig.verdict === 'ITERATE') {
      output = '## Verdict: ITERATE\n\n## Issues Found\n\n';
      const issues = verdictConfig.issues || [{ title: 'Generic Issue', description: 'No details provided' }];
      issues.forEach(issue => {
        const severity = issue.severity || verdictConfig.severity || 'MINOR';
        output += `- [${severity}] ${issue.title}: ${issue.description || 'No description'}\n`;
      });
    } else {
      output = '## Verdict: PASS\n\nAll requirements met.\n\n## Analysis\nMock review completed successfully.';
    }

    return {
      output,
      files: [],
      tokenUsage: { inputTokens: 100, outputTokens: 50 }
    };
  });
}

module.exports = {
  generatePlannerArtifact,
  generateBuilderArtifact,
  generateJudgeArtifact,
  applyTimingDelay
};
