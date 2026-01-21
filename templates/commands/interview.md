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

## When complete, create documentation:

### 1. Create a `docs/` folder with:
- `docs/ARCHITECTURE.md` - High-level system design, data flow, key decisions
- `docs/TECH_STACK.md` - Chosen technologies and why
- `docs/FEATURES.md` - Detailed feature specs from our discussion
- Any other relevant docs based on what we discussed

### 2. Update PRD.json with:
1. Set "project" to a descriptive name
2. Add features in this order:
   - **F000: Project Setup** - First feature should ALWAYS be scaffolding the project with the chosen stack (e.g., "Initialize React app with Vite", "Create Expo project", "Set up Rust workspace")
   - F001, F002, etc. - The actual features we discussed
3. Each feature needs:
   - Clear description
   - Specific acceptance criteria
   - How to verify it works

### 3. Update CLAUDE.md with:
- Project-specific guidelines
- Any coding standards we discussed
- Testing requirements
- Deployment notes if applicable

The Ralph loop will execute these features in order, starting with project setup.
