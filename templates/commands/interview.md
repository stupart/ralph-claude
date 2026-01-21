## Pre-Interview: Brain Dump Analysis

First, check if any brain dump files exist in `docs/` (pattern: `brain-dump-*.md`). If they do:

1. Read it thoroughly
2. Use the Task tool with subagent_type=Explore to deeply analyze any links, references, or technical concepts mentioned
3. Apply chain-of-density summarization to extract:
   - Core requirements and goals
   - Implicit constraints and preferences
   - Technical decisions already made
   - Anti-patterns or things to avoid
   - Questions or ambiguities to clarify
4. Keep these insights in mind - they inform your interview questions

If there's an existing codebase (files beyond ralph templates), also analyze:
- Project structure and tech stack
- Existing patterns and conventions
- What's already built vs what needs to be added

---

## Interview

Now interview me about what I want to build using AskUserQuestionTool.

### Start with the basics:
1. What are we building? (app, CLI, API, library, etc.)
2. What tech stack? (React, Expo, Next.js, Rust, Python, etc.)
3. What's the core functionality?

Skip questions already answered in the brain dump.

### Then go deeper:
- Technical implementation details
- UI & UX decisions (if applicable)
- Edge cases and error handling
- Performance considerations
- Security concerns
- Tradeoffs and constraints
- How to verify each feature works

Make sure the questions are NOT obvious. Be very in-depth. Ask about things I might not have considered.

Continue interviewing until you have enough detail. Ask 20-50 questions if needed.

---

## When complete, update PRD.json with this exact structure:

```json
{
  "project": "Project Name",
  "features": [
    {
      "id": "F000",
      "name": "Project Setup",
      "description": "Scaffold the project with chosen stack",
      "status": "pending",
      "acceptance_criteria": ["criterion 1", "criterion 2"]
    },
    {
      "id": "F001",
      "name": "Feature Name",
      "description": "What this feature does",
      "status": "pending",
      "acceptance_criteria": ["criterion 1", "criterion 2"]
    }
  ]
}
```

**Important**: Use exactly these field names: `id`, `name`, `description`, `status`, `acceptance_criteria`

F000 should ALWAYS be project setup/scaffolding. Features F001+ are the actual functionality.

## Optionally save notes to `docs/`
Only if there's something worth capturing. Knowledge grows as the project grows.

The Ralph loop will execute features in order, starting with F000.
