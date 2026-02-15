const fs = require('fs');
const path = require('path');
const readline = require('readline');

/**
 * @typedef {Object} GenerationRecord
 * @property {number} generation
 * @property {string} dir
 * @property {{ planned: number, built: number, deferred: number }} epics
 * @property {Object} executionMetrics
 * @property {Array} reviewFindings
 * @property {boolean} incomplete
 * @property {number} malformedLineCount
 */

/**
 * @typedef {Object} GenerationHistory
 * @property {GenerationRecord[]} generations
 * @property {Array} issueLedger
 * @property {Object} deferralCounts
 */

class GenerationTracker {
  constructor(projectRoot) {
    this.projectRoot = projectRoot;
  }

  discoverGenerations() {
    const entries = fs.readdirSync(this.projectRoot, { withFileTypes: true });
    const generations = [];
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const match = entry.name.match(/^_layer-cake-v(\d+)$/);
      if (!match) continue;
      const num = parseInt(match[1], 10);
      const dir = path.join(this.projectRoot, entry.name);
      const hasEpics = fs.existsSync(path.join(dir, '4-epics'));
      const hasEvents = fs.existsSync(path.join(dir, '_events.jsonl'));
      const hasAnalysis = fs.existsSync(path.join(dir, '8-analysis'));
      generations.push({
        generation: num,
        dir,
        hasEpics,
        hasEvents,
        hasAnalysis,
        incomplete: !hasEpics && !hasEvents
      });
    }
    return generations.sort((a, b) => a.generation - b.generation);
  }

  extractEpics(generationDir) {
    const epicsDir = path.join(generationDir, '4-epics');
    if (!fs.existsSync(epicsDir)) return [];

    const files = fs.readdirSync(epicsDir).filter(f => /^epic-.*\.md$/.test(f));
    if (files.length > 0) {
      return files.map(file => {
        const content = fs.readFileSync(path.join(epicsDir, file), 'utf-8');
        const nameMatch = content.match(/^#\s+(.+)$/m);
        const id = file.replace(/\.md$/, '');
        return { id, name: nameMatch ? nameMatch[1].trim() : id, status: 'Planned' };
      });
    }

    return this._parseLegacyEpics(epicsDir);
  }

  _parseLegacyEpics(epicsDir) {
    const epicsFile = path.join(epicsDir, 'epics.md');
    if (!fs.existsSync(epicsFile)) return [];
    const content = fs.readFileSync(epicsFile, 'utf-8');
    const lines = content.split('\n');
    const epics = [];
    let headerPassed = false;
    for (const line of lines) {
      if (line.match(/^\|[-\s|]+\|\s*$/)) { headerPassed = true; continue; }
      if (!headerPassed) continue;
      const match = line.match(/^\|\s*(.+?)\s*\|\s*(.+?)\s*\|/);
      if (match) {
        epics.push({ id: match[1].trim(), name: match[2].trim(), status: 'Planned' });
      }
    }
    return epics;
  }

  async parseEvents(eventsFilePath) {
    if (!fs.existsSync(eventsFilePath)) {
      return { available: false, builtEpics: [], reviewFindings: [], executionTiming: {}, timeoutCount: 0, malformedLineCount: 0 };
    }
    return new Promise((resolve) => {
      const builtEpics = new Set();
      const reviewFindings = [];
      const executionTiming = {};
      let timeoutCount = 0;
      let malformedLineCount = 0;

      const rl = readline.createInterface({
        input: fs.createReadStream(eventsFilePath),
        crlfDelay: Infinity
      });

      rl.on('line', (line) => {
        let event;
        try { event = JSON.parse(line); } catch { malformedLineCount++; return; }

        if (event.type === 'layer_end' && event.layer === 'L8') {
          if (event.epic) builtEpics.add(event.epic);
        }
        if (event.type === 'verdict' && ['L9', 'L10', 'L11'].includes(event.layer)) {
          const issues = (event.meta && event.meta.issues) || [];
          for (const issue of issues) {
            reviewFindings.push({ title: issue.title, description: issue.description, severity: issue.severity, layer: event.layer });
          }
        }
        if (event.type === 'layer_start') {
          const key = `${event.layer}:${event.epic || 'all'}`;
          executionTiming[key] = { start: event.timestamp };
        }
        if (event.type === 'layer_end') {
          const key = `${event.layer}:${event.epic || 'all'}`;
          if (executionTiming[key]) {
            executionTiming[key].end = event.timestamp;
            executionTiming[key].duration = Date.parse(event.timestamp) - Date.parse(executionTiming[key].start);
          }
        }
        if (event.type === 'error' && event.message && /timeout|timed.out|SIGTERM/i.test(event.message)) {
          timeoutCount++;
        }
      });

      rl.on('close', () => {
        resolve({ available: true, builtEpics: [...builtEpics], reviewFindings, executionTiming, timeoutCount, malformedLineCount });
      });
    });
  }

  _normalizeIssueTitle(title) {
    return title.toLowerCase().trim().replace(/[^\w\s]/g, '');
  }

  _titlesMatch(a, b) {
    const normA = this._normalizeIssueTitle(a);
    const normB = this._normalizeIssueTitle(b);
    return normA === normB || normA.includes(normB) || normB.includes(normA);
  }

  buildIssueLedger(generationRecords) {
    const ledger = [];
    for (const record of generationRecords) {
      for (const finding of record.reviewFindings) {
        const existing = ledger.find(entry => this._titlesMatch(entry.title, finding.title));
        if (existing) {
          if (!existing.generations.includes(record.generation)) {
            existing.generations.push(record.generation);
            existing.recurrenceCount = existing.generations.length;
            existing.lastSeen = record.generation;
          }
        } else {
          ledger.push({
            title: finding.title,
            severity: finding.severity,
            generations: [record.generation],
            recurrenceCount: 1,
            firstSeen: record.generation,
            lastSeen: record.generation
          });
        }
      }
    }
    return ledger.sort((a, b) => b.recurrenceCount - a.recurrenceCount);
  }

  _computeDeferralCounts(generationRecords) {
    const epicTracker = {};

    for (const record of generationRecords) {
      const plannedNames = record.epicList.map(e => e.name);
      const builtNames = record.builtEpics || [];
      for (const name of plannedNames) {
        // Find existing entry via fuzzy matching
        const existingKey = Object.keys(epicTracker).find(k => this._titlesMatch(epicTracker[k].name, name));
        const key = existingKey || this._normalizeIssueTitle(name);
        if (!epicTracker[key]) epicTracker[key] = { name, total: 0, statuses: [] };
        const wasBuilt = builtNames.some(b => this._titlesMatch(b, name));
        epicTracker[key].statuses.push(wasBuilt ? 'built' : 'deferred');
        if (!wasBuilt) epicTracker[key].total++;
      }
    }

    const result = {};
    for (const [norm, tracker] of Object.entries(epicTracker)) {
      let consecutive = 0;
      for (let i = tracker.statuses.length - 1; i >= 0; i--) {
        if (tracker.statuses[i] === 'deferred') consecutive++;
        else break;
      }
      result[tracker.name] = { total: tracker.total, consecutive };
    }
    return result;
  }

  async analyze() {
    const discovered = this.discoverGenerations();
    const records = [];

    for (const gen of discovered) {
      const epicList = this.extractEpics(gen.dir);
      const eventsPath = path.join(gen.dir, '_events.jsonl');
      const eventData = await this.parseEvents(eventsPath);

      const planned = epicList.length;
      const builtEpics = eventData.builtEpics || [];
      const built = builtEpics.length;

      let executionTime = null;
      if (eventData.executionTiming) {
        const durations = Object.values(eventData.executionTiming)
          .filter(t => t.duration !== undefined)
          .map(t => t.duration);
        if (durations.length > 0) {
          executionTime = durations.reduce((sum, d) => sum + d, 0);
        }
      }

      records.push({
        generation: gen.generation,
        dir: gen.dir,
        epics: { planned, built, deferred: planned - built },
        epicList,
        builtEpics,
        executionTime,
        timeoutCount: eventData.timeoutCount,
        reviewFindings: eventData.reviewFindings,
        incomplete: gen.incomplete,
        malformedLineCount: eventData.malformedLineCount
      });
    }

    const issueLedger = this.buildIssueLedger(records);
    const deferralCounts = this._computeDeferralCounts(records);

    return { generations: records, issueLedger, deferralCounts };
  }
}

module.exports = { GenerationTracker };
