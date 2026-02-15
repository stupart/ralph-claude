/**
 * Resume Detection Tests
 *
 * Unit tests for detectInterruptedState() function that checks
 * _events.jsonl and _status.md for interrupted pipeline state.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { detectInterruptedState } = require('../../bin/run-layer-cake-on-self');

describe('Resume Detection', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'resume-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('detects pipeline_interrupted from _events.jsonl', () => {
    const event = JSON.stringify({
      timestamp: new Date().toISOString(),
      type: 'pipeline_interrupted',
      layer: 'L7',
      epic: 'epic-01',
      message: 'Pipeline interrupted by SIGINT'
    });
    fs.writeFileSync(path.join(tmpDir, '_events.jsonl'), event + '\n');

    const result = detectInterruptedState(tmpDir);
    expect(result).not.toBeNull();
    expect(result.interrupted).toBe(true);
    expect(result.layer).toBe('L7');
    expect(result.epic).toBe('epic-01');
    expect(result.source).toBe('events');
  });

  it('detects interrupted status from _status.md', () => {
    fs.writeFileSync(path.join(tmpDir, '_status.md'),
      '# Pipeline Status\n\nstatus: interrupted\nlayer: L5\nepic: epic-02\n');

    const result = detectInterruptedState(tmpDir);
    expect(result).not.toBeNull();
    expect(result.interrupted).toBe(true);
    expect(result.layer).toBe('L5');
    expect(result.epic).toBe('epic-02');
    expect(result.source).toBe('status');
  });

  it('returns null for fresh project (no _events.jsonl)', () => {
    const result = detectInterruptedState(tmpDir);
    expect(result).toBeNull();
  });

  it('handles corrupted _events.jsonl (falls back to _status.md)', () => {
    fs.writeFileSync(path.join(tmpDir, '_events.jsonl'), 'not valid json\n');
    fs.writeFileSync(path.join(tmpDir, '_status.md'),
      '# Pipeline Status\n\nstatus: interrupted\nlayer: L3\n');

    const result = detectInterruptedState(tmpDir);
    expect(result).not.toBeNull();
    expect(result.layer).toBe('L3');
    expect(result.source).toBe('status');
  });

  it('returns null when last event is not pipeline_interrupted', () => {
    const events = [
      JSON.stringify({ type: 'pipeline_interrupted', layer: 'L5' }),
      JSON.stringify({ type: 'pipeline_resumed', layer: 'L5' }),
      JSON.stringify({ type: 'layer_start', layer: 'L5' })
    ].join('\n');
    fs.writeFileSync(path.join(tmpDir, '_events.jsonl'), events + '\n');

    const result = detectInterruptedState(tmpDir);
    expect(result).toBeNull();
  });

  it('prefers events source over status source', () => {
    const event = JSON.stringify({
      timestamp: new Date().toISOString(),
      type: 'pipeline_interrupted',
      layer: 'L8',
      epic: 'epic-01',
      message: 'Pipeline interrupted by SIGTERM'
    });
    fs.writeFileSync(path.join(tmpDir, '_events.jsonl'), event + '\n');
    fs.writeFileSync(path.join(tmpDir, '_status.md'),
      '# Pipeline Status\n\nstatus: interrupted\nlayer: L5\nepic: epic-02\n');

    const result = detectInterruptedState(tmpDir);
    expect(result.source).toBe('events');
    expect(result.layer).toBe('L8');
  });

  it('handles empty _events.jsonl', () => {
    fs.writeFileSync(path.join(tmpDir, '_events.jsonl'), '');

    const result = detectInterruptedState(tmpDir);
    expect(result).toBeNull();
  });

  it('handles _events.jsonl with only whitespace', () => {
    fs.writeFileSync(path.join(tmpDir, '_events.jsonl'), '\n\n  \n');

    const result = detectInterruptedState(tmpDir);
    expect(result).toBeNull();
  });

  it('returns null when _status.md exists but has no interrupted status', () => {
    fs.writeFileSync(path.join(tmpDir, '_status.md'),
      '# Pipeline Status\n\nstatus: running\nlayer: L4\n');

    const result = detectInterruptedState(tmpDir);
    expect(result).toBeNull();
  });

  it('handles missing layer/epic in events gracefully', () => {
    const event = JSON.stringify({
      timestamp: new Date().toISOString(),
      type: 'pipeline_interrupted',
      message: 'Pipeline interrupted by SIGINT'
    });
    fs.writeFileSync(path.join(tmpDir, '_events.jsonl'), event + '\n');

    const result = detectInterruptedState(tmpDir);
    expect(result).not.toBeNull();
    expect(result.interrupted).toBe(true);
    expect(result.layer).toBeNull();
    expect(result.epic).toBeNull();
  });
});
