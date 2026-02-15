const fs = require('fs');
const path = require('path');

const RUNNER_PATH = path.resolve(__dirname, '../bin/run-layer-cake-on-self.js');
const RALPH_PATH = path.resolve(__dirname, '../lib/ralph.js');

function stripComments(source) {
  return source
    .replace(/\/\/.*$/gm, '')  // line comments
    .replace(/\/\*[\s\S]*?\*\//g, '');  // block comments
}

describe('Runner Health Check', () => {
  describe('Runner API Verification', () => {
    test('runner script exists', () => {
      expect(fs.existsSync(RUNNER_PATH)).toBe(true);
    });

    test('runner calls runProject()', () => {
      const source = fs.readFileSync(RUNNER_PATH, 'utf-8');
      const callsRunProject = /runProject\s*\(/.test(source) || /\.runProject/.test(source);
      expect(callsRunProject).toBe(true);
    });

    test('runProject is an exported method of Ralph', () => {
      const { Ralph } = require(RALPH_PATH);
      expect(typeof Ralph.prototype.runProject).toBe('function');
    });
  });

  describe('Anti-Pattern Detection', () => {
    test('runner does not call runLayerCycle in executable code', () => {
      const source = fs.readFileSync(RUNNER_PATH, 'utf-8');
      const codeOnly = stripComments(source);
      const hasRunLayerCycle = /runLayerCycle\s*\(/.test(codeOnly);
      expect(hasRunLayerCycle).toBe(false);
    });

    test('runLayerCycle in comments does not trigger false positive', () => {
      const source = fs.readFileSync(RUNNER_PATH, 'utf-8');
      const codeOnly = stripComments(source);
      expect(/runLayerCycle/.test(codeOnly)).toBe(false);
    });

    test('no for/while loop containing runLayerCycle', () => {
      const source = fs.readFileSync(RUNNER_PATH, 'utf-8');
      const codeOnly = stripComments(source);
      expect(/for\s*\([^)]*\)\s*\{[^}]*runLayerCycle/s.test(codeOnly)).toBe(false);
      expect(/while\s*\([^)]*\)\s*\{[^}]*runLayerCycle/s.test(codeOnly)).toBe(false);
    });

    test('no array iteration with runLayerCycle', () => {
      const source = fs.readFileSync(RUNNER_PATH, 'utf-8');
      const codeOnly = stripComments(source);
      expect(/\.(forEach|map)\s*\([^)]*runLayerCycle/.test(codeOnly)).toBe(false);
    });
  });

  describe('Configuration Verification', () => {
    test('runner does not set maxTurns or max-turns', () => {
      const source = fs.readFileSync(RUNNER_PATH, 'utf-8');
      const codeOnly = stripComments(source);
      // maxTurns in the runner is only in parseArgs as an option and default to 0 (no limit)
      // The check is that the default is 0 (disabled)
      const defaultMatch = codeOnly.match(/maxTurns\s*:\s*(\d+)/);
      if (defaultMatch) {
        expect(parseInt(defaultMatch[1], 10)).toBe(0);
      }
    });

    test('agent-spawner does not set maxTurns', () => {
      const spawnerPath = path.resolve(__dirname, '../lib/agent-spawner.js');
      if (fs.existsSync(spawnerPath)) {
        const source = fs.readFileSync(spawnerPath, 'utf-8');
        const codeOnly = stripComments(source);
        const hasMaxTurns = /max.?turns/i.test(codeOnly);
        expect(hasMaxTurns).toBe(false);
      }
    });

    test('L8 has no timeout or timeout is 0', () => {
      const { Ralph } = require(RALPH_PATH);
      const ralph = new Ralph('/tmp/test', { verbose: false, eventLog: false });
      const l8Timeout = ralph.options?.layerTimeouts?.L8;
      expect(l8Timeout === 0 || l8Timeout === undefined || l8Timeout === null).toBe(true);
    });

    test('runner does not override L8 timeout to positive value', () => {
      const source = fs.readFileSync(RUNNER_PATH, 'utf-8');
      const l8TimeoutMatch = source.match(/L8\s*:\s*(\d+)/);
      if (l8TimeoutMatch) {
        expect(parseInt(l8TimeoutMatch[1], 10)).toBe(0);
      }
    });
  });
});
