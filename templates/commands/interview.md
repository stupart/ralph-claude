Interview me about what I want to build using AskUserQuestionTool.

## Start with the basics:
1. What are we building? (app, CLI, API, library, etc.)
2. What tech stack? (React, Expo, Next.js, Rust, Python, etc.)
3. What's the core functionality?

## Then go deeper:
- Technical implementation details
- UI & UX decisions (if applicable)
- Edge cases and error handling
- Performance considerations
- Security concerns
- Tradeoffs and constraints
- How to verify each feature works

Make sure the questions are NOT obvious. Be very in-depth. Ask about things I might not have considered.

Continue interviewing until you have enough detail. Ask 20-50 questions if needed.

## When complete:

### 1. Update PRD.json
- Set "project" to a descriptive name
- F000: Project Setup (scaffold with chosen stack)
- F001+: Features we discussed
- Each feature needs: description, acceptance criteria, verification method

### 2. Save any important notes to `docs/`
Only create docs if there's something worth capturing - architecture decisions, tricky implementation notes, etc. Don't create empty boilerplate. Knowledge grows as the project grows.

The Ralph loop will execute features in order, starting with project setup.
