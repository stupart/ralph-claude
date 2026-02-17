/**
 * Terminal Lifecycle Manager
 *
 * Manages alternate screen buffer, raw mode, cursor visibility, signal handling,
 * and idempotent cleanup. All TUI modules write through this module's write()
 * function and read terminal dimensions through getSize().
 */

// Module-level state
let cleanedUp = false;
const resizeCallbacks = [];
let originalIsRaw = null;
let sigintHandler, sigtermHandler, exceptionHandler, sigwinchHandler;

function getSize() {
  return {
    cols: Math.max(process.stdout.columns || 80, 1),
    rows: Math.max(process.stdout.rows || 24, 1)
  };
}

function onResize(callback) {
  resizeCallbacks.push(callback);
}

function write(buffer) {
  process.stdout.write(buffer);
}

function init() {
  if (!process.stdout.isTTY) {
    throw new Error('TUI requires a terminal \u2014 stdout is not a TTY');
  }
  cleanedUp = false;
  try {
    process.stdout.write('\x1b[?1049h'); // Enter alternate screen buffer
    process.stdout.write('\x1b[?25l');   // Hide cursor
    originalIsRaw = process.stdin.isRaw;
    if (typeof process.stdin.setRawMode === 'function') {
      process.stdin.setRawMode(true);
    }
    process.stdin.resume();

    // Signal handlers
    sigintHandler = () => { cleanup(); process.exit(0); };
    sigtermHandler = () => { cleanup(); process.exit(0); };
    exceptionHandler = (err) => { cleanup(); process.stderr.write(err.stack + '\n'); process.exit(1); };

    process.on('SIGINT', sigintHandler);
    process.on('SIGTERM', sigtermHandler);
    process.on('uncaughtException', exceptionHandler);

    // Resize handler
    sigwinchHandler = () => {
      const { cols, rows } = getSize();
      if (cols > 0 && rows > 0) {
        for (const cb of resizeCallbacks) {
          cb({ cols, rows });
        }
      }
    };
    process.on('SIGWINCH', sigwinchHandler);
  } catch (err) {
    cleanup();
    throw err;
  }
}

function cleanup() {
  if (cleanedUp) return;
  cleanedUp = true;
  process.stdout.write('\x1b[?25h');   // Show cursor
  process.stdout.write('\x1b[?1049l'); // Exit alternate screen buffer
  if (typeof process.stdin.setRawMode === 'function') {
    process.stdin.setRawMode(originalIsRaw || false);
  }
  process.stdin.pause();
  if (sigintHandler) process.removeListener('SIGINT', sigintHandler);
  if (sigtermHandler) process.removeListener('SIGTERM', sigtermHandler);
  if (exceptionHandler) process.removeListener('uncaughtException', exceptionHandler);
  if (sigwinchHandler) process.removeListener('SIGWINCH', sigwinchHandler);
}

module.exports = { init, cleanup, getSize, onResize, write };
