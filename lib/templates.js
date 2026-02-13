/**
 * Project Template System
 *
 * Provides project scaffolding from templates. Each template defines:
 * - Folder structure (Layer Cake directories)
 * - Starter files (CLAUDE.md, brain-dump.md, _status.md)
 * - Template variables (DATE, PROJECT_NAME, etc.)
 *
 * Templates live in templates/project-templates/<name>/ and include:
 * - template.json: manifest with folders, files, and variables
 * - Source files referenced by template.json
 */

const fs = require('fs').promises;
const path = require('path');

/**
 * Default templates directory
 */
const TEMPLATES_DIR = path.join(__dirname, '..', 'templates', 'project-templates');

/**
 * List available project templates.
 * @param {string} [templatesDir] - Override templates directory
 * @returns {Promise<Array<{name: string, description: string}>>}
 */
async function listTemplates(templatesDir = TEMPLATES_DIR) {
  const templates = [];

  try {
    const entries = await fs.readdir(templatesDir, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isDirectory() || entry.name.startsWith('.')) continue;

      const manifestPath = path.join(templatesDir, entry.name, 'template.json');
      try {
        const content = await fs.readFile(manifestPath, 'utf8');
        const manifest = JSON.parse(content);
        templates.push({
          name: manifest.name || entry.name,
          description: manifest.description || '',
          tier: manifest.tier || 'small'
        });
      } catch {
        // Skip directories without valid template.json
      }
    }
  } catch {
    // Templates directory doesn't exist
  }

  return templates;
}

/**
 * Load a template manifest by name.
 * @param {string} templateName - Name of the template (e.g., 'web-app')
 * @param {string} [templatesDir] - Override templates directory
 * @returns {Promise<Object>} The parsed template.json manifest
 * @throws {Error} If template not found or manifest is invalid
 */
async function loadTemplate(templateName, templatesDir = TEMPLATES_DIR) {
  const templateDir = path.join(templatesDir, templateName);
  const manifestPath = path.join(templateDir, 'template.json');

  try {
    await fs.access(templateDir);
  } catch {
    throw new Error(`Template "${templateName}" not found at ${templateDir}`);
  }

  try {
    const content = await fs.readFile(manifestPath, 'utf8');
    const manifest = JSON.parse(content);

    // Validate required fields
    if (!manifest.name) {
      throw new Error('Template manifest missing "name" field');
    }
    if (!manifest.folders || !Array.isArray(manifest.folders)) {
      throw new Error('Template manifest missing "folders" array');
    }
    if (!manifest.files || typeof manifest.files !== 'object') {
      throw new Error('Template manifest missing "files" object');
    }

    manifest._templateDir = templateDir;
    return manifest;
  } catch (err) {
    if (err.code === 'ENOENT') {
      throw new Error(`Template "${templateName}" missing template.json`);
    }
    if (err instanceof SyntaxError) {
      throw new Error(`Template "${templateName}" has invalid template.json: ${err.message}`);
    }
    throw err;
  }
}

/**
 * Resolve template variables in content.
 * Supported auto-variables:
 * - {{DATE}} -> current ISO date string
 * - {{PROJECT_NAME}} -> provided project name
 *
 * @param {string} content - File content with {{VARIABLE}} placeholders
 * @param {Object} variables - Variable values to substitute
 * @returns {string} Content with variables resolved
 */
function resolveVariables(content, variables = {}) {
  let resolved = content;

  for (const [key, value] of Object.entries(variables)) {
    const placeholder = `{{${key}}}`;
    resolved = resolved.split(placeholder).join(value);
  }

  return resolved;
}

/**
 * Build variable values from manifest variable definitions.
 * Auto-variables are resolved immediately. Prompt variables use provided overrides.
 *
 * @param {Object} variableDefs - Variable definitions from template.json
 * @param {Object} overrides - User-provided variable values
 * @returns {Object} Resolved variable map
 */
function buildVariables(variableDefs = {}, overrides = {}) {
  const resolved = {};

  for (const [key, def] of Object.entries(variableDefs)) {
    if (overrides[key] !== undefined) {
      resolved[key] = overrides[key];
    } else if (typeof def === 'string' && def.startsWith('auto:')) {
      const autoType = def.slice(5);
      switch (autoType) {
        case 'iso-date':
          resolved[key] = new Date().toISOString();
          break;
        case 'date':
          resolved[key] = new Date().toISOString().slice(0, 10);
          break;
        default:
          resolved[key] = '';
      }
    } else {
      // Prompt variables default to empty string if not overridden
      resolved[key] = '';
    }
  }

  return resolved;
}

/**
 * Initialize a new project from a template.
 * Creates folder structure, copies and processes template files.
 *
 * @param {string} templateName - Name of the template (e.g., 'web-app')
 * @param {string} targetDir - Absolute path to create the project in
 * @param {Object} [options] - Configuration options
 * @param {Object} [options.variables] - Variable overrides (e.g., { PROJECT_NAME: 'My App' })
 * @param {string} [options.templatesDir] - Override templates directory
 * @returns {Promise<Object>} Result with created folders and files
 */
async function initProject(templateName, targetDir, options = {}) {
  const templatesDir = options.templatesDir || TEMPLATES_DIR;
  const manifest = await loadTemplate(templateName, templatesDir);
  const templateDir = manifest._templateDir;

  // Build variable values
  const variables = buildVariables(manifest.variables || {}, options.variables || {});

  const result = {
    template: manifest.name,
    targetDir,
    folders: [],
    files: [],
    variables
  };

  // Create target directory
  await fs.mkdir(targetDir, { recursive: true });

  // Create folder structure
  for (const folder of manifest.folders) {
    const folderPath = path.join(targetDir, folder);
    await fs.mkdir(folderPath, { recursive: true });
    result.folders.push(folder);
  }

  // Copy and process template files
  for (const [destRelPath, srcFileName] of Object.entries(manifest.files)) {
    const srcPath = path.join(templateDir, srcFileName);
    const destPath = path.join(targetDir, destRelPath);

    // Ensure destination directory exists
    const destDir = path.dirname(destPath);
    await fs.mkdir(destDir, { recursive: true });

    try {
      let content = await fs.readFile(srcPath, 'utf8');
      content = resolveVariables(content, variables);
      await fs.writeFile(destPath, content, 'utf8');
      result.files.push(destRelPath);
    } catch (err) {
      if (err.code === 'ENOENT') {
        throw new Error(`Template file "${srcFileName}" not found at ${srcPath}`);
      }
      throw err;
    }
  }

  return result;
}

module.exports = {
  listTemplates,
  loadTemplate,
  resolveVariables,
  buildVariables,
  initProject,
  TEMPLATES_DIR
};
