'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const { ABRunner } = require('../../lib/ab-runner');

describe('ABRunner duration tracking', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ab-duration-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test('durationMs is a non-negative integer in logged record', async () => {
    const runner = new ABRunner(tmpDir, { variant: 'test', resultsDir: tmpDir });
    await runner.logResult({ layerId: 'L3', variant: 'test', actualWinner: 'test', durationMs: 150 });
    const content = fs.readFileSync(path.join(tmpDir, 'evolution.jsonl'), 'utf8');
    const record = JSON.parse(content.trim());
    expect(record.durationMs).toBe(150);
    expect(typeof record.durationMs).toBe('number');
    expect(record.durationMs).toBeGreaterThanOrEqual(0);
  });

  test('durationMs of 0 is valid', async () => {
    const runner = new ABRunner(tmpDir, { variant: 'test', resultsDir: tmpDir });
    await runner.logResult({ layerId: 'L3', variant: 'test', actualWinner: 'test', durationMs: 0 });
    const content = fs.readFileSync(path.join(tmpDir, 'evolution.jsonl'), 'utf8');
    const record = JSON.parse(content.trim());
    expect(record.durationMs).toBe(0);
  });

  test('each layer gets independent durationMs', async () => {
    const runner = new ABRunner(tmpDir, { variant: 'test', resultsDir: tmpDir });
    await runner.logResult({ layerId: 'L3', variant: 'test', actualWinner: 'test', durationMs: 100 });
    await runner.logResult({ layerId: 'L5', variant: 'test', actualWinner: 'base', durationMs: 200 });
    const lines = fs.readFileSync(path.join(tmpDir, 'evolution.jsonl'), 'utf8').trim().split('\n');
    expect(JSON.parse(lines[0]).durationMs).toBe(100);
    expect(JSON.parse(lines[1]).durationMs).toBe(200);
  });
});
