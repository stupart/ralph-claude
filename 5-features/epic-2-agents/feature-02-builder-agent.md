# Feature: Builder Agent Prompt and Context Package

## Overview
Create the complete Builder agent configuration including its system prompt, context loading rules, tool permissions, and implementation guidelines. The Builder handles only L8 (Build), focusing on precise implementation of subtask specifications without improvisation or scope creep.

## User Value
A well-configured Builder agent implements code exactly as specified, producing consistent, reviewable work. Users get implementations that match their approved plans, making reviews predictable and reducing the "I thought it would do something else" surprise factor.

## Requirements
1. System prompt must establish Builder identity, cognitive mode (accept_edits), and core responsibilities
2. Prompt must emphasize following specifications exactly - no improvisation or "improvements"
3. Context loading must include only: current task spec, referenced code files, relevant tests
4. Tool permissions must include: Read, Write, Edit, Bash, Glob, Grep (full toolset)
5. Prompt must instruct Builder to work through subtasks sequentially, checking each off
6. Prompt must require running tests after each subtask and before committing
7. Commit message format must follow Layer Cake convention: `[L8] {task_name}`
8. Builder must stop and report if tests fail rather than continuing
9. Builder must not modify files outside the scope specified in subtask
10. Prompt must handle iteration requests from Judge with specific fixes

## Technical Approach
1. Create Builder system prompt template focused on precise implementation
2. Define context loading function that pulls task spec and referenced files only
3. Include explicit "do not" instructions to prevent scope creep
4. Add test execution protocol in prompt
5. Store prompt in templates/agents/builder.md
6. Test with sample task specs to verify behavior

## Acceptance Criteria
- [ ] Builder system prompt exists and establishes implementation-focused identity
- [ ] Prompt explicitly forbids improvisation beyond spec
- [ ] Context loading pulls only task spec and referenced files
- [ ] Tool permissions include full toolset (Read, Write, Edit, Bash, Glob, Grep)
- [ ] Prompt includes test execution instructions
- [ ] Commit message format is specified
- [ ] Builder stops on test failure rather than continuing

## Planned Tasks
1. Design Builder system prompt template structure
2. Create context loading rules for task-level focus
3. Add test execution and commit protocol
4. Add iteration response handling for Judge feedback
5. Test Builder prompt with sample task specs
6. Document tool permission rationale

## Edge Cases
- **No tests exist**: Task spec may not have tests - Builder should note this but proceed
- **Tests fail on existing code**: Pre-existing test failures shouldn't block new work - only new failures
- **Files outside scope**: Subtask references file not in spec - Builder must refuse or ask for clarification
- **Ambiguous spec**: Subtask is vague - Builder should ask for clarification rather than guess
- **Large file edits**: Edit spans many lines - ensure Builder uses Edit tool correctly vs rewriting entire file

## Dependencies
- Epic 2 Feature 01 (Planner Agent) - Builder consumes Planner's output
- Epic 1 Feature 01 (LAYER_CAKE Data Audit) - need L8 layer spec for prompt
