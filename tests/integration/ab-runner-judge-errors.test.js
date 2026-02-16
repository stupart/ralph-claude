'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const { ABRunner } = require('../../lib/ab-runner');

describe('ABRunner judge error logging', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ab-judge-err-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test('logJudgeError produces record with type judge_error', async () => {
    const runner = new ABRunner(tmpDir, { variant: 'test', resultsDir: tmpDir });
    await runner.logJudgeError('L3', 'Judge timed out');
    const content = fs.readFileSync(path.join(tmpDir, 'evolution.jsonl'), 'utf8');
    const record = JSON.parse(content.trim());
    expect(record.type).toBe('judge_error');
    expect(record.layerId).toBe('L3');
    expect(record.variant).toBe('test');
    expect(record.error).toBe('Judge timed out');
    expect(record.timestamp).toBeDefined();
  });

  test('without sessionId, record omits sessionId and brainDumpFile', async () => {
    const runner = new ABRunner(tmpDir, { variant: 'test', resultsDir: tmpDir });
    await runner.logJudgeError('L3', 'error');
    const content = fs.readFileSync(path.join(tmpDir, 'evolution.jsonl'), 'utf8');
    const record = JSON.parse(content.trim());
    expect(record).not.toHaveProperty('sessionId');
    expect(record).not.toHaveProperty('brainDumpFile');
  });

  test('with sessionId, record includes sessionId', async () => {
    const runner = new ABRunner(tmpDir, { variant: 'test', resultsDir: tmpDir, sessionId: 'evo-123' });
    await runner.logJudgeError('L3', 'error');
    const content = fs.readFileSync(path.join(tmpDir, 'evolution.jsonl'), 'utf8');
    const record = JSON.parse(content.trim());
    expect(record.sessionId).toBe('evo-123');
  });

  test('multiple judge errors produce separate records', async () => {
    const runner = new ABRunner(tmpDir, { variant: 'test', resultsDir: tmpDir });
    await runner.logJudgeError('L3', 'error 1');
    await runner.logJudgeError('L5', 'error 2');
    await runner.logJudgeError('L8', 'error 3');
    const lines = fs.readFileSync(path.join(tmpDir, 'evolution.jsonl'), 'utf8').trim().split('\n');
    expect(lines).toHaveLength(3);
    expect(JSON.parse(lines[0]).layerId).toBe('L3');
    expect(JSON.parse(lines[1]).layerId).toBe('L5');
    expect(JSON.parse(lines[2]).layerId).toBe('L8');
  });

  test('error message with special characters is properly JSON-escaped', async () => {
    const runner = new ABRunner(tmpDir, { variant: 'test', resultsDir: tmpDir });
    await runner.logJudgeError('L3', 'Error with "quotes" and\nnewlines');
    const content = fs.readFileSync(path.join(tmpDir, 'evolution.jsonl'), 'utf8');
    const record = JSON.parse(content.trim());
    expect(record.error).toBe('Error with "quotes" and\nnewlines');
  });
});
