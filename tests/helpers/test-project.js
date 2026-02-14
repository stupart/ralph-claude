/**
 * Test Project Scaffolding
 *
 * Creates isolated temporary project directories with the expected
 * Layer Cake folder structure for integration testing.
 */

const fs = require('fs').promises;
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { LAYER_FOLDERS } = require('../../lib/state-machine');

/**
 * Create an isolated test project with Layer Cake folder structure.
 *
 * @param {Object} [options]
 * @param {string} [options.initialLayer='L1'] - Starting layer
 * @param {boolean} [options.withGatesApproved=false] - Pre-approve L3/L7 gates
 * @returns {Promise<{ projectRoot: string, cleanup: Function }>}
 */
async function createTestProject(options = {}) {
  const initialLayer = options.initialLayer || 'L1';
  const withGatesApproved = options.withGatesApproved || false;

  const projectRoot = path.join(os.tmpdir(), 'ralph-test-' + crypto.randomUUID());

  // Create root directory
  await fs.mkdir(projectRoot, { recursive: true });

  // Create all LAYER_FOLDERS subdirectories
  for (const [layerId, folder] of Object.entries(LAYER_FOLDERS)) {
    if (folder) { // Skip null folders (L8, L9, L10, L11)
      await fs.mkdir(path.join(projectRoot, folder), { recursive: true });
    }
  }

  // Write minimal valid brain-dump.md
  const brainDumpContent = `# Test Brain Dump

## Description
This is a test brain dump for integration testing.

## Goals
- Verify pipeline flow
- Test layer transitions
- Validate artifact generation
`;

  await fs.writeFile(
    path.join(projectRoot, '1-input', 'brain-dump.md'),
    brainDumpContent
  );

  // Write _status.md matching StateManager format
  const gateL3 = withGatesApproved ? 'approved' : 'pending';
  const gateL7 = withGatesApproved ? 'approved' : 'pending';

  const statusContent = `# Project Status

## Meta
- **Project:** Test Project
- **Started:** ${new Date().toISOString()}
- **Last Updated:** ${new Date().toISOString()}

## Current Position
- **Layer:** ${initialLayer}
- **Layer Name:** Input
- **Phase:** understand
- **Agent:** planner
- **Epic:** None
- **Feature:** None
- **Task:** None
- **Iteration:** 1

## Layer Progress
- [ ] L1: Input
- [ ] L2: Decompose
- [ ] L3: Synthesize
- [ ] L4: Epic Definition
- [ ] L5: Feature Planning
- [ ] L6: Task Specification
- [ ] L7: Subtask Definition
- [ ] L8: Build
- [ ] L9: Feature Review
- [ ] L10: Epic Review
- [ ] L11: Final Review
- [ ] L12: Analysis

## Gates
- **L3 (Synthesis):** ${gateL3}
- **L7 (Plan Approval):** ${gateL7}

## Recent History
`;

  await fs.writeFile(
    path.join(projectRoot, '_status.md'),
    statusContent
  );

  // Write _events.jsonl (empty)
  await fs.writeFile(
    path.join(projectRoot, '_events.jsonl'),
    ''
  );

  // Symlink templates directory from the real project so AgentSpawner can find prompts
  const realProjectRoot = path.resolve(__dirname, '..', '..');
  const templatesSource = path.join(realProjectRoot, 'templates');
  const templatesTarget = path.join(projectRoot, 'templates');
  try {
    await fs.symlink(templatesSource, templatesTarget, 'dir');
  } catch {
    // Symlink may fail on some systems; copy instead is not needed for tests
    // as templates are only needed for full integration tests
  }

  const cleanup = async () => {
    await fs.rm(projectRoot, { recursive: true, force: true });
  };

  return { projectRoot, cleanup };
}

module.exports = { createTestProject };
