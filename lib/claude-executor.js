/**
 * ClaudeExecutor - Spawns claude -p subprocesses for Layer Cake agent execution
 *
 * Manages subprocess lifecycle: spawning, I/O capture, process registry,
 * cleanup on parent exit, AbortSignal support, and token usage extraction.
 */

const { spawn, execSync } = require('child_process');
const { createError } = require('./errors');

const MAX_BUFFER = 10 * 1024 * 1024; // 10MB

const _activeProcesses = new Set();
let _cleanupRegistered = false;

function _registerCleanup() {
  if (_cleanupRegistered) return;
  _cleanupRegistered = true;

  const cleanup = () => {
    for (const child of _activeProcesses) {
      try { child.kill('SIGTERM'); } catch (e) { /* already dead */ }
    }
    setTimeout(() => {
      for (const child of _activeProcesses) {
        try { child.kill('SIGKILL'); } catch (e) { /* already dead */ }
      }
    }, 5000).unref();
  };

  process.on('SIGTERM', cleanup);
  process.on('SIGINT', cleanup);
}

class ClaudeExecutor {
  constructor() {
    this._binaryPath = null;
  }

  _checkBinary() {
    try {
      this._binaryPath = execSync('which claude', { encoding: 'utf8' }).trim();
      return true;
    } catch (e) {
      throw createError('ERR_EXECUTOR_BINARY_NOT_FOUND', {
        message: 'Claude CLI not found in PATH. Install it from https://docs.anthropic.com/claude-code'
      });
    }
  }

  /**
   * Translate tool permissions into --allowedTools CLI flags.
   * @param {Object} toolPermissions - { allowed: string[], forbidden: string[], limited?: object }
   * @returns {string[]} CLI flag arguments (e.g., ['--allowedTools', 'Read,Write,Glob'])
   */
  getToolFlags(toolPermissions) {
    if (!toolPermissions || !toolPermissions.allowed || toolPermissions.allowed.length === 0) {
      return [];
    }
    const tools = [...toolPermissions.allowed];
    if (toolPermissions.limited) {
      for (const tool of Object.keys(toolPermissions.limited)) {
        if (!tools.includes(tool)) {
          tools.push(tool);
        }
      }
    }
    return ['--allowedTools', tools.join(',')];
  }

  /**
   * Parse token usage from stderr output.
   * Tries multiple regex patterns, uses last occurrence, never throws.
   * @param {string} stderr - Stderr output from claude -p
   * @returns {{ inputTokens: number, outputTokens: number }}
   */
  _parseTokenUsage(stderr) {
    if (!stderr) {
      console.warn('ClaudeExecutor: No stderr output for token extraction');
      return { inputTokens: 0, outputTokens: 0 };
    }

    const inputPatterns = [
      /inputTokens:\s*([\d,]+)/gi,
      /input_tokens:\s*([\d,]+)/gi,
      /Input tokens:\s*([\d,]+)/gi,
    ];
    const outputPatterns = [
      /outputTokens:\s*([\d,]+)/gi,
      /output_tokens:\s*([\d,]+)/gi,
      /Output tokens:\s*([\d,]+)/gi,
    ];

    const extractLast = (text, patterns) => {
      let lastMatch = null;
      for (const pattern of patterns) {
        let match;
        while ((match = pattern.exec(text)) !== null) {
          lastMatch = match[1];
        }
      }
      return lastMatch ? parseInt(lastMatch.replace(/,/g, ''), 10) : 0;
    };

    const inputTokens = extractLast(stderr, inputPatterns);
    const outputTokens = extractLast(stderr, outputPatterns);

    if (inputTokens === 0 && outputTokens === 0) {
      console.warn('ClaudeExecutor: Token usage not found in stderr');
    }

    return { inputTokens, outputTokens };
  }

  /**
   * Execute a claude -p subprocess.
   * @param {Object} spawnConfig - { prompt, model, toolPermissions, workingDir }
   * @param {Object} [options] - { signal: AbortSignal }
   * @returns {Promise<{ output: string, files: string[], tokenUsage: { inputTokens: number, outputTokens: number }, exitCode: number, error: string|null }>}
   */
  async execute(spawnConfig, options = {}) {
    this._checkBinary();

    // AbortSignal: reject immediately if already aborted
    if (options.signal?.aborted) {
      const err = new Error('Aborted');
      err.name = 'AbortError';
      return Promise.reject(err);
    }

    const args = ['-p', '--model', spawnConfig.model || 'claude-opus-4-6', '--output-format', 'text'];

    if (spawnConfig.toolPermissions) {
      args.push(...this.getToolFlags(spawnConfig.toolPermissions));
    }

    _registerCleanup();

    return new Promise((resolve, reject) => {
      const child = spawn('claude', args, {
        stdio: ['pipe', 'pipe', 'pipe'],
        cwd: spawnConfig.workingDir || process.cwd()
      });

      _activeProcesses.add(child);

      let stdout = '';
      let stderr = '';
      let stdoutTruncated = false;

      child.stdout.on('data', (data) => {
        if (stdout.length < MAX_BUFFER) {
          stdout += data.toString();
        } else if (!stdoutTruncated) {
          stdoutTruncated = true;
          console.warn('ClaudeExecutor: stdout exceeded 10MB, truncating');
        }
      });

      child.stderr.on('data', (data) => { stderr += data.toString(); });

      child.stdin.write(spawnConfig.prompt);
      child.stdin.end();

      // AbortSignal handling
      let abortHandler;
      if (options.signal) {
        abortHandler = () => {
          try { child.kill('SIGTERM'); } catch (e) {}
        };
        options.signal.addEventListener('abort', abortHandler, { once: true });
      }

      child.on('close', (exitCode) => {
        _activeProcesses.delete(child);

        // Clean up abort listener
        if (abortHandler && options.signal) {
          options.signal.removeEventListener('abort', abortHandler);
        }

        // If signal was aborted during execution, reject
        if (options.signal?.aborted) {
          const err = new Error('Aborted');
          err.name = 'AbortError';
          reject(err);
          return;
        }

        let tokenUsage = { inputTokens: 0, outputTokens: 0 };
        try {
          tokenUsage = this._parseTokenUsage(stderr);
        } catch (e) {
          console.warn('ClaudeExecutor: Token parse error (non-fatal):', e.message);
        }

        resolve({
          output: stdout,
          files: [],
          tokenUsage,
          exitCode: exitCode || 0,
          error: exitCode !== 0 ? stderr : null
        });
      });

      child.on('error', (err) => {
        _activeProcesses.delete(child);

        // Clean up abort listener
        if (abortHandler && options.signal) {
          options.signal.removeEventListener('abort', abortHandler);
        }

        resolve({
          output: '',
          files: [],
          tokenUsage: { inputTokens: 0, outputTokens: 0 },
          exitCode: 1,
          error: err.message
        });
      });
    });
  }

  async shutdown() {
    if (_activeProcesses.size === 0) return;

    const processes = [..._activeProcesses];
    const exitPromises = processes.map(child => {
      return new Promise(resolve => {
        // If already exited, resolve immediately
        if (child.exitCode !== null || child.killed) {
          resolve();
          return;
        }

        child.once('close', () => resolve());
        child.once('error', () => resolve());

        // Send SIGTERM
        try {
          child.kill('SIGTERM');
        } catch (e) {
          // ESRCH: process already exited
          resolve();
          return;
        }

        // Escalate to SIGKILL after 5 seconds
        setTimeout(() => {
          try { child.kill('SIGKILL'); } catch (e) { /* already dead */ }
        }, 5000).unref();
      });
    });

    await Promise.allSettled(exitPromises);
  }
}

module.exports = { ClaudeExecutor };
