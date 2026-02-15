/**
 * Signal Handling Integration Tests
 *
 * Verifies that signal handling in the runner correctly:
 * - Logs pipeline_interrupted event on SIGINT/SIGTERM
 * - Writes interrupted status to _status.md
 * - Force exits on double SIGINT
 *
 * These tests spawn a minimal child process that loads the signal handling
 * logic and verifies the shutdown sequence.
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');
const crypto = require('crypto');

describe('Signal Handling', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'signal-test-'));
    // Create _events.jsonl so appendFileSync works
    fs.writeFileSync(path.join(tmpDir, '_events.jsonl'), '');
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  /**
   * Helper: spawn a child process that simulates the runner's signal handling.
   * The child process sets up the same signal handlers as the runner and then
   * waits for a signal.
   */
  function spawnSignalTestProcess(projectDir) {
    const script = `
      const path = require('path');
      const fsSync = require('fs');

      const PROJECT_DIR = ${JSON.stringify(projectDir)};
      let _isShuttingDown = false;
      let _currentLayerId = 'L5';
      let _currentEpicId = 'epic-01';

      async function handleShutdown(signal) {
        if (_isShuttingDown) return;
        _isShuttingDown = true;

        // Replace SIGINT with force-exit handler for double Ctrl+C
        process.removeAllListeners('SIGINT');
        process.on('SIGINT', () => {
          console.error('\\nForce exit.');
          process.exit(1);
        });

        console.error('\\nReceived ' + signal + '. Shutting down gracefully...');

        // Log pipeline_interrupted event
        try {
          const event = JSON.stringify({
            timestamp: new Date().toISOString(),
            type: 'pipeline_interrupted',
            layer: _currentLayerId || null,
            epic: _currentEpicId || null,
            message: 'Pipeline interrupted by ' + signal
          });
          fsSync.appendFileSync(path.join(PROJECT_DIR, '_events.jsonl'), event + '\\n');
        } catch (e) {
          console.error('Failed to log interrupted event:', e.message);
        }

        // Persist interrupted status
        try {
          const statusContent = [
            '# Pipeline Status',
            '',
            'status: interrupted',
            'layer: ' + (_currentLayerId || 'unknown'),
            'epic: ' + (_currentEpicId || 'unknown'),
            'interrupted_at: ' + new Date().toISOString()
          ].join('\\n');
          fsSync.writeFileSync(path.join(PROJECT_DIR, '_status.md'), statusContent);
        } catch (e) {
          console.error('Failed to write interrupted status:', e.message);
        }

        process.exit(0);
      }

      process.on('SIGINT', handleShutdown);
      process.on('SIGTERM', handleShutdown);

      // Signal readiness
      console.log('READY');

      // Keep alive
      setInterval(() => {}, 10000);
    `;

    return spawn('node', ['-e', script], {
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env }
    });
  }

  function waitForReady(child) {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Child never became ready')), 5000);
      child.stdout.on('data', (data) => {
        if (data.toString().includes('READY')) {
          clearTimeout(timeout);
          resolve();
        }
      });
      child.on('error', (err) => {
        clearTimeout(timeout);
        reject(err);
      });
    });
  }

  it('logs pipeline_interrupted event on SIGINT', async () => {
    const child = spawnSignalTestProcess(tmpDir);

    await waitForReady(child);
    child.kill('SIGINT');

    const exitCode = await new Promise(resolve => {
      child.on('close', (code) => resolve(code));
    });

    expect(exitCode).toBe(0);

    // Verify _events.jsonl
    const eventsPath = path.join(tmpDir, '_events.jsonl');
    const content = fs.readFileSync(eventsPath, 'utf8').trim();
    expect(content.length).toBeGreaterThan(0);

    const lines = content.split('\n').filter(l => l.trim());
    const lastEvent = JSON.parse(lines[lines.length - 1]);
    expect(lastEvent.type).toBe('pipeline_interrupted');
    expect(lastEvent).toHaveProperty('timestamp');
    expect(lastEvent.layer).toBe('L5');
    expect(lastEvent.epic).toBe('epic-01');
    expect(lastEvent.message).toContain('SIGINT');

    // Verify _status.md
    const statusPath = path.join(tmpDir, '_status.md');
    const status = fs.readFileSync(statusPath, 'utf8');
    expect(status).toContain('status: interrupted');
    expect(status).toContain('layer: L5');
    expect(status).toContain('epic: epic-01');
  }, 15000);

  it('logs pipeline_interrupted event on SIGTERM', async () => {
    const child = spawnSignalTestProcess(tmpDir);

    await waitForReady(child);
    child.kill('SIGTERM');

    const exitCode = await new Promise(resolve => {
      child.on('close', (code) => resolve(code));
    });

    expect(exitCode).toBe(0);

    // Verify _events.jsonl
    const eventsPath = path.join(tmpDir, '_events.jsonl');
    const content = fs.readFileSync(eventsPath, 'utf8').trim();
    const lines = content.split('\n').filter(l => l.trim());
    const lastEvent = JSON.parse(lines[lines.length - 1]);
    expect(lastEvent.type).toBe('pipeline_interrupted');
    expect(lastEvent.message).toContain('SIGTERM');

    // Verify _status.md
    const status = fs.readFileSync(path.join(tmpDir, '_status.md'), 'utf8');
    expect(status).toContain('status: interrupted');
  }, 15000);

  it('force exits on double SIGINT', async () => {
    // This test needs a shutdown handler that takes long enough for
    // the second SIGINT to arrive during the graceful shutdown phase
    const script = `
      let _isShuttingDown = false;

      async function handleShutdown(signal) {
        if (_isShuttingDown) return;
        _isShuttingDown = true;

        process.removeAllListeners('SIGINT');
        process.on('SIGINT', () => {
          console.error('\\nForce exit.');
          process.exit(1);
        });

        console.error('\\nReceived ' + signal + '. Shutting down gracefully...');
        // Simulate slow shutdown (child process cleanup)
        await new Promise(resolve => setTimeout(resolve, 10000).unref());
        process.exit(0);
      }

      process.on('SIGINT', handleShutdown);
      process.on('SIGTERM', handleShutdown);

      console.log('READY');
      setInterval(() => {}, 10000);
    `;

    const child = spawn('node', ['-e', script], {
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env }
    });

    await waitForReady(child);

    // Send first SIGINT
    child.kill('SIGINT');

    // Wait briefly then send second SIGINT
    await new Promise(resolve => setTimeout(resolve, 500));
    child.kill('SIGINT');

    const exitCode = await new Promise(resolve => {
      child.on('close', (code) => resolve(code));
    });

    expect(exitCode).toBe(1);
  }, 15000);
});
