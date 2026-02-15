const fs = require('fs');
const path = require('path');
const os = require('os');
const { VerdictParser } = require('../../lib/verdict-parser');

describe('Unparseable Verdict Logging', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'verdict-log-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('logs unparseable verdict to _unparseable_verdicts.jsonl', () => {
    const parser = new VerdictParser(tmpDir);
    parser.parse('This output has no verdict pattern at all.', { layer: 'L9', epic: 'epic-01' });

    const logPath = path.join(tmpDir, '_unparseable_verdicts.jsonl');
    expect(fs.existsSync(logPath)).toBe(true);

    const entry = JSON.parse(fs.readFileSync(logPath, 'utf8').trim());
    expect(entry).toHaveProperty('timestamp');
    expect(entry.layer).toBe('L9');
    expect(entry.epic).toBe('epic-01');
    expect(entry.rawOutput).toContain('This output has no verdict pattern');
  });

  it('does not log when projectDir is not set', () => {
    const parser = new VerdictParser(); // zero-arg
    const result = parser.parse('No verdict here.');

    expect(result).toHaveProperty('verdict');
    // No file should exist anywhere (no projectDir to write to)
  });

  it('still returns valid ReviewResult regardless of logging', () => {
    const parser = new VerdictParser(tmpDir);
    const result = parser.parse('No verdict pattern found.', { layer: 'L9' });

    expect(result).toHaveProperty('verdict');
    expect(result).toHaveProperty('issues');
    expect(result).toHaveProperty('rawOutput');
  });

  it('entry format has required fields (timestamp, layer, epic, rawOutput)', () => {
    const parser = new VerdictParser(tmpDir);
    parser.parse('Unparseable output', { layer: 'L10', epic: 'epic-02' });

    const logPath = path.join(tmpDir, '_unparseable_verdicts.jsonl');
    const entry = JSON.parse(fs.readFileSync(logPath, 'utf8').trim());

    expect(entry.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/); // ISO 8601
    expect(entry).toHaveProperty('layer');
    expect(entry).toHaveProperty('epic');
    expect(entry).toHaveProperty('rawOutput');
  });

  it('silently ignores write errors (fire-and-forget)', () => {
    const parser = new VerdictParser('/nonexistent/path/that/does/not/exist');
    // Should not throw — fire-and-forget
    const result = parser.parse('No verdict here.', { layer: 'L9' });
    expect(result).toHaveProperty('verdict');
    expect(result).toHaveProperty('issues');
  });

  it('truncates rawOutput to 2000 characters', () => {
    const parser = new VerdictParser(tmpDir);
    const longOutput = 'x'.repeat(5000);
    parser.parse(longOutput, { layer: 'L9' });

    const logPath = path.join(tmpDir, '_unparseable_verdicts.jsonl');
    const entry = JSON.parse(fs.readFileSync(logPath, 'utf8').trim());
    expect(entry.rawOutput.length).toBe(2000);
  });

  it('appends multiple entries (JSONL format)', () => {
    const parser = new VerdictParser(tmpDir);
    parser.parse('First unparseable output', { layer: 'L9', epic: 'epic-01' });
    parser.parse('Second unparseable output', { layer: 'L10', epic: 'epic-02' });

    const logPath = path.join(tmpDir, '_unparseable_verdicts.jsonl');
    const lines = fs.readFileSync(logPath, 'utf8').trim().split('\n');
    expect(lines.length).toBe(2);

    const entry1 = JSON.parse(lines[0]);
    const entry2 = JSON.parse(lines[1]);
    expect(entry1.layer).toBe('L9');
    expect(entry2.layer).toBe('L10');
  });

  it('does not log when verdict IS parseable', () => {
    const parser = new VerdictParser(tmpDir);
    parser.parse('## Verdict: PASS\n\nAll good.', { layer: 'L9' });

    const logPath = path.join(tmpDir, '_unparseable_verdicts.jsonl');
    expect(fs.existsSync(logPath)).toBe(false);
  });
});
