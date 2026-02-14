/**
 * Layer Cake Validator
 *
 * Validates agent outputs including minimum count enforcement,
 * template compliance, and completeness checks.
 */

const fs = require('fs').promises;
const path = require('path');

/**
 * Minimum counts from LAYER_CAKE hierarchy
 */
const MINIMUMS = {
  // Standard (Small tier)
  small: {
    epics: 3,
    features: 3, // per epic
    tasks: 3,    // per feature
    subtasks: 2  // per task
  },
  // Micro tier
  micro: {
    epics: 1,
    features: 2,
    tasks: 2,
    subtasks: 1
  },
  // Medium tier
  medium: {
    epics: 4,
    features: 4,
    tasks: 4,
    subtasks: 2
  },
  // Large tier
  large: {
    epics: 5,
    features: 5,
    tasks: 5,
    subtasks: 3
  }
};

/**
 * Required sections for different artifact types
 */
const REQUIRED_SECTIONS = {
  epic: ['description', 'scope', 'dependencies'],
  feature: ['overview', 'requirements', 'acceptance criteria', 'planned tasks'],
  task: ['description', 'files', 'verification'],
  subtask: ['action', 'files', 'verification']
};

/**
 * Validation result structure
 */
class ValidationResult {
  constructor() {
    this.passed = true;
    this.errors = [];   // Blocking issues
    this.warnings = []; // Non-blocking issues
    this.counts = {};   // Item counts
  }

  addError(message, location = null) {
    this.passed = false;
    this.errors.push({ message, location });
  }

  addWarning(message, location = null) {
    this.warnings.push({ message, location });
  }

  setCount(type, count, minimum) {
    this.counts[type] = { count, minimum, met: count >= minimum };
    if (!this.counts[type].met) {
      this.addError(`${type} count (${count}) below minimum (${minimum})`);
    }
  }
}

class Validator {
  constructor(projectRoot, tier = 'small') {
    this.projectRoot = projectRoot;
    this.tier = tier;
    this.minimums = MINIMUMS[tier] || MINIMUMS.small;
  }

  /**
   * Validate a specific layer's outputs
   * @param {string} layerId - Layer to validate (e.g., 'L4')
   * @returns {ValidationResult}
   */
  async validateLayer(layerId) {
    const result = new ValidationResult();

    switch (layerId) {
      case 'L3':
        await this.validateSynthesis(result);
        break;
      case 'L4':
        await this.validateEpics(result);
        break;
      case 'L5':
        await this.validateFeatures(result);
        break;
      case 'L6':
        await this.validateTasks(result);
        break;
      case 'L7':
        await this.validateSubtasks(result);
        break;
      default:
        result.addWarning(`No validation rules for layer ${layerId}`);
    }

    return result;
  }

  /**
   * Validate L3 Synthesis outputs
   */
  async validateSynthesis(result) {
    const synthPath = path.join(this.projectRoot, '3-synthesis');

    const requiredFiles = [
      { name: 'jtbd.md', type: 'JTBD', minItems: 3 },
      { name: 'journeys.md', type: 'journeys', minItems: 2 },
      { name: 'architecture.md', type: 'decisions', minItems: 1 }
    ];

    for (const file of requiredFiles) {
      const filePath = path.join(synthPath, file.name);
      try {
        const content = await fs.readFile(filePath, 'utf8');
        const itemCount = this.countMarkdownItems(content, file.type);
        result.setCount(file.type, itemCount, file.minItems);
      } catch (err) {
        if (err.code === 'ENOENT') {
          result.addError(`Missing required file: ${file.name}`, synthPath);
        } else {
          result.addError(`Error reading ${file.name}: ${err.message}`, filePath);
        }
      }
    }
  }

  /**
   * Validate L4 Epic outputs
   * Supports both formats:
   *   - Single epics.md file with ## Epic N headers
   *   - Individual epic-{n}.md files (template v2 format)
   */
  async validateEpics(result) {
    const epicsPath = path.join(this.projectRoot, '4-epics');

    try {
      // Try single epics.md first (legacy format)
      const epicsFile = path.join(epicsPath, 'epics.md');
      try {
        const content = await fs.readFile(epicsFile, 'utf8');
        const epicCount = this.countMarkdownItems(content, 'epic');
        result.setCount('epics', epicCount, this.minimums.epics);

        const epics = this.extractItems(content, 'epic');
        for (const epic of epics) {
          this.validateSections(epic, 'epic', result);
        }
        return;
      } catch (singleFileErr) {
        if (singleFileErr.code !== 'ENOENT') throw singleFileErr;
      }

      // Try individual epic-{n}.md files (v2 template format)
      const epicFiles = await this.getFiles(epicsPath, 'epic-*.md');
      if (epicFiles.length === 0) {
        result.addError('No epic files found (expected epics.md or epic-*.md files)', epicsPath);
        return;
      }

      result.setCount('epics', epicFiles.length, this.minimums.epics);

      for (const epicFile of epicFiles) {
        const filePath = path.join(epicsPath, epicFile);
        try {
          const content = await fs.readFile(filePath, 'utf8');
          this.validateSections(content, 'epic', result);
        } catch (err) {
          result.addError(`Error reading epic file ${epicFile}: ${err.message}`, filePath);
        }
      }
    } catch (err) {
      result.addError(`Error validating epics: ${err.message}`, epicsPath);
    }
  }

  /**
   * Validate L5 Feature outputs
   * Also cross-validates that feature epic count matches L4 epic count (BUG-001 fix)
   */
  async validateFeatures(result) {
    const featuresPath = path.join(this.projectRoot, '5-features');

    try {
      // Cross-validate: feature epic folders must match L4 epic count
      const epicCount = await this.getEpicCountFromL4();
      const epicDirs = await this.getDirectories(featuresPath);

      if (epicCount > 0 && epicDirs.length < epicCount) {
        result.addError(
          `Feature folders (${epicDirs.length}) don't match L4 epic count (${epicCount}). Missing epics in 5-features/`,
          featuresPath
        );
      }

      let totalFeatures = 0;

      for (const epicDir of epicDirs) {
        const epicPath = path.join(featuresPath, epicDir);
        const featureFiles = await this.getFiles(epicPath, 'feature-*.md');
        const featureCount = featureFiles.length;
        totalFeatures += featureCount;

        if (featureCount < this.minimums.features) {
          result.addError(
            `Epic "${epicDir}" has ${featureCount} features, minimum is ${this.minimums.features}`,
            epicPath
          );
        }

        // Validate each feature file
        for (const featureFile of featureFiles) {
          await this.validateFeatureFile(path.join(epicPath, featureFile), result);
        }
      }

      result.counts.features = { count: totalFeatures, minimum: this.minimums.features * epicDirs.length };
    } catch (err) {
      result.addError(`Error validating features: ${err.message}`, featuresPath);
    }
  }

  /**
   * Get epic count from L4 for cross-layer validation (BUG-001 fix)
   * Supports both epics.md (legacy) and epic-*.md files (v2)
   */
  async getEpicCountFromL4() {
    try {
      // Try single epics.md first
      const epicsFile = path.join(this.projectRoot, '4-epics', 'epics.md');
      try {
        const content = await fs.readFile(epicsFile, 'utf8');
        return this.countMarkdownItems(content, 'epic');
      } catch (e) {
        if (e.code !== 'ENOENT') throw e;
      }
      // Fall back to counting individual epic-*.md files
      const epicFiles = await this.getFiles(path.join(this.projectRoot, '4-epics'), 'epic-*.md');
      return epicFiles.length;
    } catch {
      return 0;
    }
  }

  /**
   * Validate a single feature file
   */
  async validateFeatureFile(filePath, result) {
    try {
      const content = await fs.readFile(filePath, 'utf8');
      const missingKeys = [];

      for (const section of REQUIRED_SECTIONS.feature) {
        if (!this.hasSection(content, section)) {
          missingKeys.push(section);
        }
      }

      if (missingKeys.length > 0) {
        result.addError(
          `Missing required sections: ${missingKeys.join(', ')}`,
          filePath
        );
      }

      // Check for acceptance criteria
      const acCount = (content.match(/- \[ \]/g) || []).length;
      if (acCount === 0) {
        result.addWarning('No acceptance criteria checkboxes found', filePath);
      }
    } catch (err) {
      result.addError(`Error reading feature file: ${err.message}`, filePath);
    }
  }

  /**
   * Validate L6 Task outputs
   * Cross-validates that task epic/feature folders match L5 structure (BUG-001 fix)
   */
  async validateTasks(result) {
    const tasksPath = path.join(this.projectRoot, '6-tasks');
    const featuresPath = path.join(this.projectRoot, '5-features');

    try {
      // Cross-validate: task epic folders should match L5 feature epic folders
      const expectedEpicDirs = await this.getDirectories(featuresPath);
      const epicDirs = await this.getDirectories(tasksPath);

      if (expectedEpicDirs.length > 0 && epicDirs.length < expectedEpicDirs.length) {
        result.addError(
          `Task folders (${epicDirs.length} epics) don't match L5 epic count (${expectedEpicDirs.length}). Missing epics in 6-tasks/`,
          tasksPath
        );
      }

      let totalTasks = 0;

      for (const epicDir of epicDirs) {
        const epicPath = path.join(tasksPath, epicDir);
        const featureDirs = await this.getDirectories(epicPath);

        // Cross-validate feature count per epic
        const expectedFeatures = await this.getFiles(
          path.join(featuresPath, epicDir), 'feature-*.md'
        );
        if (expectedFeatures.length > 0 && featureDirs.length < expectedFeatures.length) {
          result.addError(
            `Epic "${epicDir}" has ${featureDirs.length} feature task folders but L5 has ${expectedFeatures.length} features`,
            epicPath
          );
        }

        for (const featureDir of featureDirs) {
          const featurePath = path.join(epicPath, featureDir);
          const tasksFile = path.join(featurePath, '_tasks.md');

          try {
            const content = await fs.readFile(tasksFile, 'utf8');
            const taskCount = this.countMarkdownItems(content, 'task');
            totalTasks += taskCount;

            if (taskCount < this.minimums.tasks) {
              result.addError(
                `Feature "${featureDir}" has ${taskCount} tasks, minimum is ${this.minimums.tasks}`,
                tasksFile
              );
            }
          } catch (err) {
            if (err.code === 'ENOENT') {
              result.addError(`Missing _tasks.md for ${featureDir}`, featurePath);
            }
          }
        }
      }

      result.counts.tasks = { count: totalTasks };
    } catch (err) {
      result.addError(`Error validating tasks: ${err.message}`, tasksPath);
    }
  }

  /**
   * Validate L7 Subtask outputs
   */
  async validateSubtasks(result) {
    const subtasksPath = path.join(this.projectRoot, '7-subtasks');

    try {
      const epicDirs = await this.getDirectories(subtasksPath);
      let totalSubtasks = 0;

      for (const epicDir of epicDirs) {
        const epicPath = path.join(subtasksPath, epicDir);
        const featureDirs = await this.getDirectories(epicPath);

        for (const featureDir of featureDirs) {
          const featurePath = path.join(epicPath, featureDir);
          const taskFiles = await this.getFiles(featurePath, 'task-*.md');

          for (const taskFile of taskFiles) {
            const taskPath = path.join(featurePath, taskFile);
            const content = await fs.readFile(taskPath, 'utf8');
            const subtaskCount = this.countMarkdownItems(content, 'subtask');
            totalSubtasks += subtaskCount;

            if (subtaskCount < this.minimums.subtasks) {
              result.addError(
                `Task "${taskFile}" has ${subtaskCount} subtasks, minimum is ${this.minimums.subtasks}`,
                taskPath
              );
            }
          }
        }
      }

      result.counts.subtasks = { count: totalSubtasks };
    } catch (err) {
      result.addError(`Error validating subtasks: ${err.message}`, subtasksPath);
    }
  }

  /**
   * Count items in markdown content.
   * Normalizes CRLF to LF before matching to handle Windows line endings.
   */
  countMarkdownItems(content, type) {
    if (!content || !content.trim()) return 0;
    // Normalize CRLF -> LF for consistent line-start matching
    content = content.replace(/\r\n/g, '\n');
    let pattern;
    switch (type) {
      case 'JTBD':
      case 'job':
        pattern = /^##\s+(Job|JTBD)\s+\d+/gmi;
        break;
      case 'journeys':
      case 'journey':
        pattern = /^##\s+Journey\s+\d+/gmi;
        break;
      case 'decisions':
      case 'decision':
        pattern = /^#{2,3}\s+(Decision|ADR)\s+\d+/gmi;
        break;
      case 'epic':
        pattern = /^##\s+Epic\s+\d+/gmi;
        break;
      case 'task':
        pattern = /^##\s+Task\s+\d+/gmi;
        break;
      case 'subtask':
        pattern = /^##\s+Subtask\s+\d+/gmi;
        break;
      default:
        pattern = new RegExp(`^##\\s+${type}\\s+\\d+`, 'gmi');
    }

    const matches = content.match(pattern);
    return matches ? matches.length : 0;
  }

  /**
   * Extract items from markdown.
   * Normalizes CRLF to LF before splitting.
   */
  extractItems(content, type) {
    if (!content || !content.trim()) return [];
    // Normalize CRLF -> LF
    content = content.replace(/\r\n/g, '\n');
    // Split by ## headers and return item contents
    const sections = content.split(/^##\s+/gm).filter(s => s.trim());
    return sections.filter(s => s.toLowerCase().startsWith(type.toLowerCase()));
  }

  /**
   * Validate required sections exist
   */
  validateSections(content, type, result) {
    const required = REQUIRED_SECTIONS[type] || [];
    for (const section of required) {
      if (!this.hasSection(content, section)) {
        result.addError(`Missing required "${section}" section`, type);
      }
    }
  }

  /**
   * Check if content has a section
   */
  hasSection(content, sectionName) {
    if (!content || !content.trim()) return false;
    // Normalize CRLF -> LF
    content = content.replace(/\r\n/g, '\n');
    // Escape regex special characters in section name to prevent injection
    const escaped = sectionName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = new RegExp(`^#{1,4}\\s*${escaped}`, 'gmi');
    return pattern.test(content);
  }

  /**
   * Get directories in a path
   */
  async getDirectories(dirPath) {
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      return entries
        .filter(e => e.isDirectory() && !e.name.startsWith('.'))
        .map(e => e.name);
    } catch {
      return [];
    }
  }

  /**
   * Get files matching a pattern
   */
  async getFiles(dirPath, pattern) {
    try {
      const entries = await fs.readdir(dirPath);
      const regex = new RegExp(pattern.replace('*', '.*'));
      return entries.filter(e => regex.test(e));
    } catch {
      return [];
    }
  }
}

module.exports = { Validator, ValidationResult, MINIMUMS, REQUIRED_SECTIONS };
