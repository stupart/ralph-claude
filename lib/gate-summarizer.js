const fs = require('fs').promises;
const path = require('path');

/**
 * Safe file reader that handles missing files gracefully.
 * @param {string} filePath - Absolute path to file
 * @returns {Promise<string|null>} File content or null if missing
 */
async function safeReadFile(filePath) {
  try {
    return await fs.readFile(filePath, 'utf-8');
  } catch (e) {
    if (e.code === 'ENOENT') return null;
    throw e;
  }
}

/**
 * Summarize L3 synthesis artifacts.
 * @param {string} projectRoot - Absolute path to project root
 * @returns {Promise<{jtbdCount: number, journeys: string[], componentCount: number, decisionCount: number}>}
 */
async function summarizeL3(projectRoot) {
  const jtbdPath = path.join(projectRoot, '3-synthesis', 'jtbd.md');
  const journeysPath = path.join(projectRoot, '3-synthesis', 'journeys.md');
  const archPath = path.join(projectRoot, '3-synthesis', 'architecture.md');

  const jtbdContent = await safeReadFile(jtbdPath);
  const journeysContent = await safeReadFile(journeysPath);
  const archContent = await safeReadFile(archPath);

  let jtbdCount = 0;
  if (jtbdContent) {
    const matches = jtbdContent.match(/^##\s+JTBD\s+\d+/gim);
    jtbdCount = matches ? matches.length : 0;
  }

  const journeys = [];
  if (journeysContent) {
    const regex = /^##\s+Journey\s+\d+:\s*(.+)$/gim;
    for (const match of journeysContent.matchAll(regex)) {
      journeys.push(match[1].trim());
    }
  }

  let componentCount = 0;
  let decisionCount = 0;
  if (archContent) {
    const components = archContent.match(/^###\s+Component\s+\d+:/gim);
    componentCount = components ? components.length : 0;

    const decisions = archContent.match(/^###\s+Decision\s+\d+:/gim);
    decisionCount = decisions ? decisions.length : 0;
  }

  return {
    jtbdCount,
    journeys,
    componentCount,
    decisionCount
  };
}

/**
 * Summarize L7 plan artifacts.
 * @param {string} projectRoot - Absolute path to project root
 * @returns {Promise<{epics: number, features: number, tasks: number, subtasks: number, jtbdCoverage: number[]}>}
 */
async function summarizeL7(projectRoot) {
  const epicsDir = path.join(projectRoot, '4-epics');
  const featuresDir = path.join(projectRoot, '5-features');
  const tasksDir = path.join(projectRoot, '6-tasks');
  const subtasksDir = path.join(projectRoot, '7-subtasks');

  let epics = 0;
  try {
    const entries = await fs.readdir(epicsDir);
    epics = entries.filter(e => /^epic-\d+.*\.md$/.test(e)).length;
  } catch (e) {
    if (e.code !== 'ENOENT') throw e;
  }

  let features = 0;
  try {
    const entries = await fs.readdir(featuresDir, { recursive: true });
    features = entries.filter(e => /feature-\d+.*\.md$/.test(e)).length;
  } catch (e) {
    if (e.code !== 'ENOENT') throw e;
  }

  let tasks = 0;
  try {
    const entries = await fs.readdir(tasksDir, { recursive: true });
    tasks = entries.filter(e => /task-\d+.*\.md$/.test(e)).length;
  } catch (e) {
    if (e.code !== 'ENOENT') throw e;
  }

  let subtasks = 0;
  try {
    const entries = await fs.readdir(subtasksDir, { recursive: true });
    subtasks = entries.filter(e => /subtask-\d+.*\.md$/.test(e)).length;
  } catch (e) {
    if (e.code !== 'ENOENT') throw e;
  }

  // Extract JTBD coverage from epic files
  const jtbdSet = new Set();
  try {
    const entries = await fs.readdir(epicsDir);
    const epicFiles = entries.filter(e => /^epic-\d+.*\.md$/.test(e));

    for (const epicFile of epicFiles) {
      const content = await safeReadFile(path.join(epicsDir, epicFile));
      if (!content) continue;

      // Find Jobs Addressed or JTBD section
      const sectionMatch = content.match(/^##\s+(?:Jobs Addressed|JTBD)[\s\S]*?(?=^##\s+|$(?![\s\S]))/im);
      if (!sectionMatch) continue;

      const section = sectionMatch[0];
      const regex = /JTBD\s+(\d+)/gi;
      let match;
      while ((match = regex.exec(section)) !== null) {
        jtbdSet.add(parseInt(match[1], 10));
      }
    }
  } catch (e) {
    if (e.code !== 'ENOENT') throw e;
  }

  const jtbdCoverage = [...jtbdSet].sort((a, b) => a - b);

  return {
    epics,
    features,
    tasks,
    subtasks,
    jtbdCoverage
  };
}

module.exports = { safeReadFile, summarizeL3, summarizeL7 };
