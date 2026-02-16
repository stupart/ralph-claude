const fs = require('fs');
const path = require('path');

const REQUIRED_SECTIONS = [
  /^## What this project is/m,
  /^## The problem/m,
  /^## What to fix/m,
  /^## What NOT to do/m
];

function validateBrainDump(filePath) {
  const errors = [];
  let content;

  try {
    content = fs.readFileSync(filePath, 'utf8');
  } catch (err) {
    return { valid: false, errors: [`Cannot read file: ${err.message}`] };
  }

  if (content.trim().length === 0) {
    errors.push('File is empty');
    return { valid: false, errors };
  }

  for (const regex of REQUIRED_SECTIONS) {
    if (!regex.test(content)) {
      errors.push(`Missing required section: ${regex.source}`);
    }
  }

  const libRefs = content.match(/lib\/[\w-]+\.js/g) || [];
  if (libRefs.length === 0) {
    errors.push('No lib/ module references found');
  }

  const whatNotToDo = content.split(/^## What NOT to do/m)[1] || '';
  const items = whatNotToDo.match(/^\d+\.|^-|^\*/gm) || [];
  if (items.length < 3) {
    errors.push(`"What NOT to do" has fewer than 3 items (found ${items.length})`);
  }

  return { valid: errors.length === 0, errors };
}

// Standalone execution
if (require.main === module) {
  const dir = path.join(__dirname, '..', '..', '_evolution', 'brain-dumps');
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.md'));
  let allValid = true;
  for (const file of files) {
    const result = validateBrainDump(path.join(dir, file));
    if (result.valid) {
      console.log(`PASS: ${file}`);
    } else {
      console.log(`FAIL: ${file}`);
      result.errors.forEach(e => console.log(`  - ${e}`));
      allValid = false;
    }
  }
  process.exit(allValid ? 0 : 1);
}

module.exports = { validateBrainDump };
