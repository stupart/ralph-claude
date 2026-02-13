# Tool Permission Enforcement

This document defines which tools each agent type can use in the Layer Cake methodology.

## Permission Matrix

| Tool | Planner | Builder | Judge | Rationale |
|------|---------|---------|-------|-----------|
| **Read** | YES | YES | YES | All agents need to read files |
| **Write** | YES | YES | NO | Judge doesn't create artifacts |
| **Edit** | NO | YES | NO | Only Builder modifies existing code |
| **Bash** | NO | YES | LIMITED | Builder runs commands; Judge runs tests only |
| **Glob** | YES | YES | YES | All agents need to find files |
| **Grep** | YES | YES | YES | All agents need to search |
| **/chrome** | NO | NO | YES | Only Judge does UX testing |
| **NotebookEdit** | NO | YES | NO | Only Builder modifies notebooks |

## Permission Definitions

### Planner Permissions

```json
{
  "agent": "planner",
  "allowed": ["Read", "Write", "Glob", "Grep"],
  "forbidden": ["Edit", "Bash", "NotebookEdit", "/chrome"],
  "rationale": {
    "Write": "Creates new planning documents",
    "no_Edit": "Planner creates, doesn't modify existing code",
    "no_Bash": "No command execution during planning"
  }
}
```

### Builder Permissions

```json
{
  "agent": "builder",
  "allowed": ["Read", "Write", "Edit", "Bash", "Glob", "Grep", "NotebookEdit"],
  "forbidden": ["/chrome"],
  "rationale": {
    "Edit": "Modifies existing code",
    "Bash": "Runs tests and commands",
    "no_chrome": "UX testing is Judge's responsibility"
  }
}
```

### Judge Permissions

```json
{
  "agent": "judge",
  "allowed": ["Read", "Glob", "Grep", "/chrome"],
  "limited": {
    "Bash": "tests_only"
  },
  "forbidden": ["Write", "Edit", "NotebookEdit"],
  "rationale": {
    "no_Write": "Judge reviews, doesn't create",
    "no_Edit": "Judge identifies issues, doesn't fix them",
    "Bash_limited": "Can run tests to verify, cannot execute arbitrary commands",
    "/chrome": "UX testing is core to build reviews"
  }
}
```

## Bash Limitations for Judge

When Judge uses Bash, only these patterns are allowed:

```
ALLOWED:
- npm test
- npm run test
- pytest
- go test
- cargo test
- jest
- vitest
- make test

FORBIDDEN:
- npm install
- rm, mv, cp (file modifications)
- git commit, git push (repository changes)
- Any command that modifies state
```

## Enforcement Points

### 1. Prompt-Level Enforcement

Include explicit tool permissions in agent prompts:

```markdown
## Allowed Tools
- Read, Write, Glob, Grep

## Forbidden Tools
Do NOT use these tools:
- Edit (you create new files, not modify existing)
- Bash (no command execution during planning)
```

### 2. Runtime Validation

The orchestrator (Ralph) should validate tool usage:

```javascript
function validateToolUsage(agent, tool, args) {
  const permissions = TOOL_PERMISSIONS[agent];

  if (permissions.forbidden.includes(tool)) {
    return {
      allowed: false,
      error: `${agent} cannot use ${tool}: ${permissions.rationale['no_' + tool]}`
    };
  }

  if (permissions.limited[tool]) {
    return validateLimitedUsage(tool, args, permissions.limited[tool]);
  }

  return { allowed: true };
}
```

### 3. Audit Logging

Log all tool usage for review:

```javascript
function logToolUsage(agent, tool, args, result) {
  console.log({
    timestamp: new Date().toISOString(),
    agent,
    tool,
    allowed: result.allowed,
    args: sanitizeArgs(args),
    error: result.error
  });
}
```

## Error Messages

When a forbidden tool is attempted:

### For Planner Using Edit
```
ERROR: Planner cannot use Edit tool.

The Planner creates new planning documents using Write.
To modify existing files, the work must be handed off to Builder.

If you need to update a plan, use Write to create a new version.
```

### For Planner Using Bash
```
ERROR: Planner cannot use Bash tool.

The Planner operates in plan_mode without command execution.
If tests need to be run, this happens during the Build phase.

Continue planning without Bash access.
```

### For Judge Using Write
```
ERROR: Judge cannot use Write tool.

The Judge reviews and identifies issues but does not create or modify artifacts.
Document issues in your review output, which will be written by Ralph.

Issues found should be returned to Planner or Builder to fix.
```

### For Judge Using Edit
```
ERROR: Judge cannot use Edit tool.

The Judge identifies issues but does not fix them.
Document the issue with:
- Location (file:line)
- Description of problem
- Recommended fix

The Builder will implement the fix.
```

## Development Bypass

For testing and development, permissions can be bypassed:

```javascript
const DEV_MODE = process.env.LAYER_CAKE_DEV === 'true';

function checkPermission(agent, tool) {
  if (DEV_MODE) {
    console.warn(`[DEV] Bypassing permission check: ${agent} using ${tool}`);
    return { allowed: true, bypassed: true };
  }
  return validateToolUsage(agent, tool);
}
```

**Warning:** Development bypass should never be used in production runs.

## Permission Rationale

### Why Planner Can't Edit

1. **Separation of concerns** - Planning and implementation are distinct
2. **Clean artifacts** - Plans should be new documents, not patches
3. **Auditability** - Easy to see what was planned vs modified
4. **Preventing scope creep** - Planner can't "just fix this one thing"

### Why Judge Can't Write/Edit

1. **Adversarial integrity** - Judge can't approve their own fixes
2. **Clear feedback loop** - Issues go to the right agent
3. **Accountability** - Builder owns implementation quality
4. **Review quality** - Judge focuses on finding, not fixing

### Why Builder Has Full Access

1. **Implementation needs** - Building requires all tools
2. **Efficiency** - Builder shouldn't be blocked by permissions
3. **Responsibility** - Builder is accountable for code quality
4. **Testing** - Builder must verify their own work

### Why Judge Has /chrome

1. **UX verification** - Build reviews require seeing the UI
2. **Evidence gathering** - Screenshots/observations document issues
3. **Acceptance testing** - Criteria often involve user experience
4. **No modification risk** - Browser automation is read-only for code
