'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const { ABRunner } = require('../../lib/ab-runner');

describe('ABRunner session and brainDump fields', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ab-session-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test('without sessionId/brainDumpFile, record omits both fields', async () => {
    const runner = new ABRunner(tmpDir, { variant: 'test', resultsDir: tmpDir });
    await runner.logResult({ layerId: 'L3', variant: 'test', actualWinner: 'test' });
    const content = fs.readFileSync(path.join(tmpDir, 'evolution.jsonl'), 'utf8');
    const record = JSON.parse(content.trim());
    expect(record).not.toHaveProperty('sessionId');
    expect(record).not.toHaveProperty('brainDumpFile');
  });

  test('with both fields, record includes both', async () => {
    const runner = new ABRunner(tmpDir, { variant: 'test', resultsDir: tmpDir, sessionId: 'evo-123', brainDumpFile: 'test.md' });
    await runner.logResult({ layerId: 'L3', variant: 'test', actualWinner: 'test' });
    const content = fs.readFileSync(path.join(tmpDir, 'evolution.jsonl'), 'utf8');
    const record = JSON.parse(content.trim());
    expect(record.sessionId).toBe('evo-123');
    expect(record.brainDumpFile).toBe('test.md');
  });

  test('with sessionId only, brainDumpFile is omitted', async () => {
    const runner = new ABRunner(tmpDir, { variant: 'test', resultsDir: tmpDir, sessionId: 'evo-123' });
    await runner.logResult({ layerId: 'L3', variant: 'test', actualWinner: 'test' });
    const content = fs.readFileSync(path.join(tmpDir, 'evolution.jsonl'), 'utf8');
    const record = JSON.parse(content.trim());
    expect(record.sessionId).toBe('evo-123');
    expect(record).not.toHaveProperty('brainDumpFile');
  });

  test('empty string sessionId is included', async () => {
    const runner = new ABRunner(tmpDir, { variant: 'test', resultsDir: tmpDir, sessionId: '' });
    await runner.logResult({ layerId: 'L3', variant: 'test', actualWinner: 'test' });
    const content = fs.readFileSync(path.join(tmpDir, 'evolution.jsonl'), 'utf8');
    const record = JSON.parse(content.trim());
    expect(record.sessionId).toBe('');
  });

  test('multiple logResult calls produce same sessionId', async () => {
    const runner = new ABRunner(tmpDir, { variant: 'test', resultsDir: tmpDir, sessionId: 'evo-123', brainDumpFile: 'test.md' });
    await runner.logResult({ layerId: 'L3', variant: 'test', actualWinner: 'test' });
    await runner.logResult({ layerId: 'L5', variant: 'test', actualWinner: 'base' });
    const lines = fs.readFileSync(path.join(tmpDir, 'evolution.jsonl'), 'utf8').trim().split('\n');
    expect(lines).toHaveLength(2);
    for (const line of lines) {
      const record = JSON.parse(line);
      expect(record.sessionId).toBe('evo-123');
      expect(record.brainDumpFile).toBe('test.md');
    }
  });
});
