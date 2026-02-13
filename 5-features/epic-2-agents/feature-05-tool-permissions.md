# Feature: Tool Permission Enforcement

## Overview
Implement the mechanism to enforce different tool permissions per agent role. The Planner can only Read/Write/Glob/Grep, the Builder has full tool access, and the Judge cannot Write or Edit. This prevents agents from taking inappropriate actions for their role.

## User Value
Tool permission enforcement is a critical safety mechanism that prevents agents from overstepping their roles. Users can trust that the Judge won't secretly "fix" code it's reviewing, and that the Planner won't start implementing before plans are approved.

## Requirements
1. Define tool permission sets for each agent role as configuration
2. Planner permissions: Read, Write, Glob, Grep (can create specs, cannot run code)
3. Builder permissions: Read, Write, Edit, Bash, Glob, Grep (full implementation toolset)
4. Judge permissions: Read, Glob, Grep, Bash (read-only + test running), /chrome (UX testing)
5. Enforcement must happen before tool execution, not after
6. Attempted use of forbidden tool must produce clear error message
7. Error message must explain why tool is forbidden for this role
8. Permission configuration must be easily auditable
9. Permission violations must be logged for debugging
10. Consider "soft" permissions that warn but allow (for testing/development)

## Technical Approach
1. Create permission configuration file defining allowed tools per role
2. Implement permission check wrapper around tool execution
3. Integrate permission check into agent spawning process
4. Create clear error messages for permission violations
5. Add logging for permission checks (both allowed and denied)
6. Consider environment variable or flag for permission bypass during development

## Acceptance Criteria
- [ ] Permission configuration exists defining tools for each agent role
- [ ] Planner cannot use Bash or Edit tools
- [ ] Builder has access to all tools
- [ ] Judge cannot use Write or Edit tools
- [ ] Forbidden tool usage produces clear error before execution
- [ ] Permission violations are logged
- [ ] Permission configuration is easily readable and auditable

## Planned Tasks
1. Design permission configuration schema
2. Implement permission check function
3. Integrate permission checks into tool execution path
4. Create error messages and logging for violations
5. Add development bypass mechanism for testing
6. Test permission enforcement for each agent role

## Edge Cases
- **Tool aliases**: Some tools might have aliases - ensure all names are covered
- **MCP tools**: /chrome is an MCP tool - ensure MCP tools are included in permission system
- **New tools added**: When new tools are added to Claude, default should be deny
- **Permission bypass**: Development bypass must be clearly marked and not accidentally enabled in production
- **Chained tool calls**: Agent tries to circumvent by using one tool to invoke another

## Dependencies
- Epic 2 Features 01-03 (Agent prompts) - need to know what tools each agent should have
- Epic 3 (Ralph) - Ralph will enforce permissions when spawning agents
