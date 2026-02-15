const fs = require('fs');
const path = require('path');
const os = require('os');
const { GenerationTracker } = require('../lib/generation-tracker');

function createGenDir(root, num, { epics = false, events = false, analysis = false } = {}) {
  const dir = path.join(root, `_layer-cake-v${num}`);
  fs.mkdirSync(dir, { recursive: true });
  if (epics) fs.mkdirSync(path.join(dir, '4-epics'), { recursive: true });
  if (events) fs.writeFileSync(path.join(dir, '_events.jsonl'), '');
  if (analysis) fs.mkdirSync(path.join(dir, '8-analysis'), { recursive: true });
  return dir;
}

describe('Generation Tracker', () => {
  let tmpDir;
  beforeEach(() => { tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gen-tracker-')); });
  afterEach(() => { fs.rmSync(tmpDir, { recursive: true, force: true }); });

  describe('Constructor', () => {
    test('stores projectRoot', () => {
      const tracker = new GenerationTracker('/some/path');
      expect(tracker.projectRoot).toBe('/some/path');
    });
  });

  describe('Directory Discovery', () => {
    test('discovers generations in ascending order', () => {
      createGenDir(tmpDir, 4, { epics: true });
      createGenDir(tmpDir, 2, { epics: true, events: true });
      createGenDir(tmpDir, 3, { epics: true });

      const tracker = new GenerationTracker(tmpDir);
      const gens = tracker.discoverGenerations();

      expect(gens).toHaveLength(3);
      expect(gens[0].generation).toBe(2);
      expect(gens[1].generation).toBe(3);
      expect(gens[2].generation).toBe(4);
    });

    test('excludes non-numeric suffixes', () => {
      createGenDir(tmpDir, 2, { epics: true });
      fs.mkdirSync(path.join(tmpDir, '_layer-cake-vtest'), { recursive: true });
      fs.mkdirSync(path.join(tmpDir, '_layer-cake-v'), { recursive: true });
      fs.mkdirSync(path.join(tmpDir, 'not-a-gen'), { recursive: true });

      const tracker = new GenerationTracker(tmpDir);
      const gens = tracker.discoverGenerations();

      expect(gens).toHaveLength(1);
      expect(gens[0].generation).toBe(2);
    });

    test('flags empty generation as incomplete', () => {
      createGenDir(tmpDir, 99);

      const tracker = new GenerationTracker(tmpDir);
      const gens = tracker.discoverGenerations();

      expect(gens).toHaveLength(1);
      expect(gens[0].incomplete).toBe(true);
      expect(gens[0].hasEpics).toBe(false);
      expect(gens[0].hasEvents).toBe(false);
    });

    test('detects presence of epics, events, and analysis', () => {
      createGenDir(tmpDir, 3, { epics: true, events: true, analysis: true });

      const tracker = new GenerationTracker(tmpDir);
      const gens = tracker.discoverGenerations();

      expect(gens[0].hasEpics).toBe(true);
      expect(gens[0].hasEvents).toBe(true);
      expect(gens[0].hasAnalysis).toBe(true);
      expect(gens[0].incomplete).toBe(false);
    });

    test('returns empty array when no generation dirs exist', () => {
      const tracker = new GenerationTracker(tmpDir);
      expect(tracker.discoverGenerations()).toEqual([]);
    });
  });

  describe('Epic Extraction', () => {
    test('parses v2+ epic-*.md files', () => {
      const genDir = createGenDir(tmpDir, 3, { epics: true });
      fs.writeFileSync(path.join(genDir, '4-epics/epic-a.md'), '# Self-Improvement Bootstrap\n\n## ID\nEpic A');
      fs.writeFileSync(path.join(genDir, '4-epics/epic-b.md'), '# Pipeline Integrity\n\n## ID\nEpic B');

      const tracker = new GenerationTracker(tmpDir);
      const epics = tracker.extractEpics(genDir);

      expect(epics).toHaveLength(2);
      expect(epics).toEqual(expect.arrayContaining([
        expect.objectContaining({ id: 'epic-a', name: 'Self-Improvement Bootstrap', status: 'Planned' }),
        expect.objectContaining({ id: 'epic-b', name: 'Pipeline Integrity', status: 'Planned' })
      ]));
    });

    test('parses legacy epics.md table', () => {
      const genDir = createGenDir(tmpDir, 2, { epics: true });
      fs.writeFileSync(path.join(genDir, '4-epics/epics.md'),
        '| ID | Name |\n|---|---|\n| E1 | Pipeline Integrity |\n| E2 | Human Gate UX |\n');

      const tracker = new GenerationTracker(tmpDir);
      const epics = tracker.extractEpics(genDir);

      expect(epics).toHaveLength(2);
      expect(epics[0]).toEqual({ id: 'E1', name: 'Pipeline Integrity', status: 'Planned' });
      expect(epics[1]).toEqual({ id: 'E2', name: 'Human Gate UX', status: 'Planned' });
    });

    test('returns empty array for missing 4-epics/ directory', () => {
      const genDir = createGenDir(tmpDir, 5);

      const tracker = new GenerationTracker(tmpDir);
      expect(tracker.extractEpics(genDir)).toEqual([]);
    });

    test('prefers v2+ format over legacy when both present', () => {
      const genDir = createGenDir(tmpDir, 3, { epics: true });
      fs.writeFileSync(path.join(genDir, '4-epics/epic-a.md'), '# V2 Epic\n');
      fs.writeFileSync(path.join(genDir, '4-epics/epics.md'), '| ID | Name |\n|---|---|\n| E1 | Legacy |\n');

      const tracker = new GenerationTracker(tmpDir);
      const epics = tracker.extractEpics(genDir);

      expect(epics).toHaveLength(1);
      expect(epics[0].name).toBe('V2 Epic');
    });

    test('uses filename as name when heading missing', () => {
      const genDir = createGenDir(tmpDir, 3, { epics: true });
      fs.writeFileSync(path.join(genDir, '4-epics/epic-x.md'), 'No heading here\n');

      const tracker = new GenerationTracker(tmpDir);
      const epics = tracker.extractEpics(genDir);

      expect(epics[0].name).toBe('epic-x');
    });

    test('separator rows in legacy format are skipped', () => {
      const genDir = createGenDir(tmpDir, 2, { epics: true });
      fs.writeFileSync(path.join(genDir, '4-epics/epics.md'),
        '| ID | Name |\n|----|----|  \n| E1 | First |\n');

      const tracker = new GenerationTracker(tmpDir);
      const epics = tracker.extractEpics(genDir);

      expect(epics).toHaveLength(1);
      expect(epics[0].id).toBe('E1');
    });
  });

  describe('JSONL Parsing', () => {
    test('extracts built epics from L8 layer_end', async () => {
      const genDir = createGenDir(tmpDir, 3);
      const eventsPath = path.join(genDir, '_events.jsonl');
      fs.writeFileSync(eventsPath, [
        JSON.stringify({ type: 'layer_end', layer: 'L8', epic: 'Pipeline Integrity', timestamp: '2025-01-01T01:00:00.000Z' }),
        JSON.stringify({ type: 'layer_end', layer: 'L8', epic: 'Human Gate UX', timestamp: '2025-01-01T02:00:00.000Z' })
      ].join('\n'));

      const tracker = new GenerationTracker(tmpDir);
      const result = await tracker.parseEvents(eventsPath);

      expect(result.available).toBe(true);
      expect(result.builtEpics).toEqual(expect.arrayContaining(['Pipeline Integrity', 'Human Gate UX']));
    });

    test('extracts review findings from verdict events', async () => {
      const genDir = createGenDir(tmpDir, 3);
      const eventsPath = path.join(genDir, '_events.jsonl');
      fs.writeFileSync(eventsPath, JSON.stringify({
        type: 'verdict', layer: 'L9',
        meta: { issues: [{ title: 'stale registry', description: 'out of date', severity: 'MINOR' }] }
      }));

      const tracker = new GenerationTracker(tmpDir);
      const result = await tracker.parseEvents(eventsPath);

      expect(result.reviewFindings).toHaveLength(1);
      expect(result.reviewFindings[0]).toEqual(expect.objectContaining({ title: 'stale registry', severity: 'MINOR', layer: 'L9' }));
    });

    test('computes execution timing from layer_start/layer_end pairs', async () => {
      const genDir = createGenDir(tmpDir, 3);
      const eventsPath = path.join(genDir, '_events.jsonl');
      fs.writeFileSync(eventsPath, [
        JSON.stringify({ type: 'layer_start', layer: 'L8', epic: 'E1', timestamp: '2025-01-01T00:00:00.000Z' }),
        JSON.stringify({ type: 'layer_end', layer: 'L8', epic: 'E1', timestamp: '2025-01-01T00:30:00.000Z' })
      ].join('\n'));

      const tracker = new GenerationTracker(tmpDir);
      const result = await tracker.parseEvents(eventsPath);

      expect(result.executionTiming['L8:E1'].duration).toBe(1800000);
    });

    test('counts timeout errors', async () => {
      const genDir = createGenDir(tmpDir, 3);
      const eventsPath = path.join(genDir, '_events.jsonl');
      fs.writeFileSync(eventsPath, [
        JSON.stringify({ type: 'error', message: 'Process timed out after 120s' }),
        JSON.stringify({ type: 'error', message: 'SIGTERM received' }),
        JSON.stringify({ type: 'error', message: 'Some other error' })
      ].join('\n'));

      const tracker = new GenerationTracker(tmpDir);
      const result = await tracker.parseEvents(eventsPath);

      expect(result.timeoutCount).toBe(2);
    });

    test('skips malformed lines and counts them', async () => {
      const genDir = createGenDir(tmpDir, 3);
      const eventsPath = path.join(genDir, '_events.jsonl');
      fs.writeFileSync(eventsPath, [
        '{ bad json',
        JSON.stringify({ type: 'layer_end', layer: 'L8', epic: 'E1', timestamp: '2025-01-01T01:00:00.000Z' }),
        'also bad',
        ''
      ].join('\n'));

      const tracker = new GenerationTracker(tmpDir);
      const result = await tracker.parseEvents(eventsPath);

      expect(result.malformedLineCount).toBe(2);
      expect(result.builtEpics).toContain('E1');
    });

    test('returns fallback for missing file', async () => {
      const tracker = new GenerationTracker(tmpDir);
      const result = await tracker.parseEvents(path.join(tmpDir, 'nonexistent.jsonl'));

      expect(result.available).toBe(false);
      expect(result.builtEpics).toEqual([]);
      expect(result.malformedLineCount).toBe(0);
    });
  });

  describe('Issue Title Normalization', () => {
    test('lowercases and removes punctuation', () => {
      const tracker = new GenerationTracker(tmpDir);
      expect(tracker._normalizeIssueTitle('Stale Epic Registry!')).toBe('stale epic registry');
    });

    test('exact match after normalization', () => {
      const tracker = new GenerationTracker(tmpDir);
      expect(tracker._titlesMatch('stale epic registry', 'Stale Epic Registry')).toBe(true);
    });

    test('substring containment match', () => {
      const tracker = new GenerationTracker(tmpDir);
      expect(tracker._titlesMatch('stale epic registry', 'stale epic registry status')).toBe(true);
    });

    test('unrelated titles do not match', () => {
      const tracker = new GenerationTracker(tmpDir);
      expect(tracker._titlesMatch('stale epic registry', 'missing gitignore')).toBe(false);
    });
  });

  describe('Issue Ledger', () => {
    test('groups recurring issues with correct count', () => {
      const tracker = new GenerationTracker(tmpDir);
      const records = [
        { generation: 3, reviewFindings: [{ title: 'stale registry', severity: 'MINOR' }] },
        { generation: 4, reviewFindings: [{ title: 'stale registry', severity: 'MINOR' }] }
      ];

      const ledger = tracker.buildIssueLedger(records);

      expect(ledger).toHaveLength(1);
      expect(ledger[0].recurrenceCount).toBe(2);
      expect(ledger[0].generations).toEqual([3, 4]);
    });

    test('case-insensitive matching groups issues', () => {
      const tracker = new GenerationTracker(tmpDir);
      const records = [
        { generation: 3, reviewFindings: [{ title: 'Stale Registry', severity: 'MINOR' }] },
        { generation: 4, reviewFindings: [{ title: 'stale registry', severity: 'MINOR' }] }
      ];

      const ledger = tracker.buildIssueLedger(records);

      expect(ledger).toHaveLength(1);
      expect(ledger[0].recurrenceCount).toBe(2);
    });

    test('non-recurring issues have count 1', () => {
      const tracker = new GenerationTracker(tmpDir);
      const records = [
        { generation: 3, reviewFindings: [{ title: 'unique issue', severity: 'MAJOR' }] }
      ];

      const ledger = tracker.buildIssueLedger(records);

      expect(ledger).toHaveLength(1);
      expect(ledger[0].recurrenceCount).toBe(1);
      expect(ledger[0].firstSeen).toBe(3);
      expect(ledger[0].lastSeen).toBe(3);
    });

    test('sorts by recurrence count descending', () => {
      const tracker = new GenerationTracker(tmpDir);
      const records = [
        { generation: 2, reviewFindings: [
          { title: 'rare issue', severity: 'MINOR' },
          { title: 'common issue', severity: 'MAJOR' }
        ]},
        { generation: 3, reviewFindings: [{ title: 'common issue', severity: 'MAJOR' }] },
        { generation: 4, reviewFindings: [{ title: 'common issue', severity: 'MAJOR' }] }
      ];

      const ledger = tracker.buildIssueLedger(records);

      expect(ledger[0].title).toBe('common issue');
      expect(ledger[0].recurrenceCount).toBe(3);
      expect(ledger[1].title).toBe('rare issue');
      expect(ledger[1].recurrenceCount).toBe(1);
    });

    test('handles empty review findings', () => {
      const tracker = new GenerationTracker(tmpDir);
      const records = [
        { generation: 3, reviewFindings: [] }
      ];

      const ledger = tracker.buildIssueLedger(records);
      expect(ledger).toEqual([]);
    });
  });

  describe('Deferral Counts', () => {
    test('epic deferred in all generations', () => {
      const tracker = new GenerationTracker(tmpDir);
      const records = [
        { generation: 2, epicList: [{ name: 'Self-Improvement' }], builtEpics: [] },
        { generation: 3, epicList: [{ name: 'Self-Improvement' }], builtEpics: [] },
        { generation: 4, epicList: [{ name: 'Self-Improvement' }], builtEpics: [] }
      ];

      const counts = tracker._computeDeferralCounts(records);

      expect(counts['Self-Improvement'].total).toBe(3);
      expect(counts['Self-Improvement'].consecutive).toBe(3);
    });

    test('consecutive resets when epic is built', () => {
      const tracker = new GenerationTracker(tmpDir);
      const records = [
        { generation: 2, epicList: [{ name: 'Self-Improvement' }], builtEpics: [] },
        { generation: 3, epicList: [{ name: 'Self-Improvement' }], builtEpics: ['Self-Improvement'] },
        { generation: 4, epicList: [{ name: 'Self-Improvement' }], builtEpics: [] }
      ];

      const counts = tracker._computeDeferralCounts(records);

      expect(counts['Self-Improvement'].total).toBe(2);
      expect(counts['Self-Improvement'].consecutive).toBe(1);
    });

    test('epic built in all generations has zero deferrals', () => {
      const tracker = new GenerationTracker(tmpDir);
      const records = [
        { generation: 2, epicList: [{ name: 'Pipeline' }], builtEpics: ['Pipeline'] },
        { generation: 3, epicList: [{ name: 'Pipeline' }], builtEpics: ['Pipeline'] }
      ];

      const counts = tracker._computeDeferralCounts(records);

      expect(counts['Pipeline'].total).toBe(0);
      expect(counts['Pipeline'].consecutive).toBe(0);
    });

    test('fuzzy matching groups similar epic names', () => {
      const tracker = new GenerationTracker(tmpDir);
      const records = [
        { generation: 2, epicList: [{ name: 'Self-Improvement' }], builtEpics: [] },
        { generation: 3, epicList: [{ name: 'Self-Improvement Bootstrap' }], builtEpics: [] }
      ];

      const counts = tracker._computeDeferralCounts(records);

      const keys = Object.keys(counts);
      expect(keys).toHaveLength(1);
      expect(Object.values(counts)[0].total).toBe(2);
      expect(Object.values(counts)[0].consecutive).toBe(2);
    });
  });

  describe('Integration: analyze()', () => {
    test('returns complete GenerationHistory shape', async () => {
      createGenDir(tmpDir, 2, { epics: true, events: true });
      createGenDir(tmpDir, 3, { epics: true, events: true });

      // Write epic files
      fs.writeFileSync(path.join(tmpDir, '_layer-cake-v2/4-epics/epic-a.md'), '# Pipeline Integrity\n');
      fs.writeFileSync(path.join(tmpDir, '_layer-cake-v2/4-epics/epic-b.md'), '# Self-Improvement\n');
      fs.writeFileSync(path.join(tmpDir, '_layer-cake-v3/4-epics/epic-a.md'), '# Pipeline Integrity\n');
      fs.writeFileSync(path.join(tmpDir, '_layer-cake-v3/4-epics/epic-b.md'), '# Self-Improvement\n');

      // Write events for v2 - Pipeline built, Self-Improvement not
      fs.writeFileSync(path.join(tmpDir, '_layer-cake-v2/_events.jsonl'),
        JSON.stringify({ type: 'layer_end', layer: 'L8', epic: 'Pipeline Integrity', timestamp: '2025-01-01T01:00:00.000Z' })
      );
      // v3 - same pattern
      fs.writeFileSync(path.join(tmpDir, '_layer-cake-v3/_events.jsonl'),
        JSON.stringify({ type: 'layer_end', layer: 'L8', epic: 'Pipeline Integrity', timestamp: '2025-02-01T01:00:00.000Z' })
      );

      const tracker = new GenerationTracker(tmpDir);
      const result = await tracker.analyze();

      expect(result).toHaveProperty('generations');
      expect(result).toHaveProperty('issueLedger');
      expect(result).toHaveProperty('deferralCounts');
      expect(result.generations).toHaveLength(2);

      // v2: 2 planned, 1 built
      expect(result.generations[0].epics.planned).toBe(2);
      expect(result.generations[0].epics.built).toBe(1);
      expect(result.generations[0].epics.deferred).toBe(1);

      // Deferral counts
      expect(result.deferralCounts['Self-Improvement'].total).toBe(2);
      expect(result.deferralCounts['Self-Improvement'].consecutive).toBe(2);
    });

    test('handles mixed completeness: gen with events + gen without', async () => {
      createGenDir(tmpDir, 2, { epics: true, events: true });
      createGenDir(tmpDir, 3, { epics: true }); // no events

      fs.writeFileSync(path.join(tmpDir, '_layer-cake-v2/4-epics/epic-a.md'), '# Test Epic\n');
      fs.writeFileSync(path.join(tmpDir, '_layer-cake-v3/4-epics/epic-a.md'), '# Test Epic\n');

      const tracker = new GenerationTracker(tmpDir);
      const result = await tracker.analyze();

      expect(result.generations).toHaveLength(2);
      expect(result.generations[0].epics.planned).toBe(1);
      expect(result.generations[1].epics.planned).toBe(1);
    });

    test('JSON serializable (no circular references)', async () => {
      createGenDir(tmpDir, 2, { epics: true, events: true });
      fs.writeFileSync(path.join(tmpDir, '_layer-cake-v2/4-epics/epic-a.md'), '# Test\n');

      const tracker = new GenerationTracker(tmpDir);
      const result = await tracker.analyze();

      expect(() => JSON.stringify(result)).not.toThrow();
    });

    test('empty project returns empty history', async () => {
      const tracker = new GenerationTracker(tmpDir);
      const result = await tracker.analyze();

      expect(result.generations).toEqual([]);
      expect(result.issueLedger).toEqual([]);
      expect(result.deferralCounts).toEqual({});
    });
  });
});
