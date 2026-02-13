# Subtasks: Add Prompt Template Formatting

**Parent Feature:** Layer Detail Modal Enhancement
**Parent Epic:** Blueprint Integrity

---

## Subtask 1: Create Prompt Section Renderer with Code Block

**Action:** Implement renderPromptSection(layer) that displays the full prompt template in a styled code block with monospace font and preserved whitespace.

**Files:**
- MODIFY: `/Users/tylerstupart/ralph-claude/v3-system-blueprint.html` - Add renderPromptSection() function

**Code Pattern/API:** function renderPromptSection(layer) { return `<div class="section"><h3>Prompt Template</h3><pre class="prompt-code">${escapeHtml(layer.prompt)}</pre></div>`; }

**Verification:** Prompt displays in monospace font; line breaks and indentation are preserved; HTML characters are escaped

---

## Subtask 2: Add Prompt Code Block Styling and Scroll

**Action:** Add CSS for .prompt-code with monospace font, dark background, padding, max-height with scroll, and optional syntax highlighting for markdown tokens.

**Files:**
- MODIFY: `/Users/tylerstupart/ralph-claude/v3-system-blueprint.html` - Add prompt code block CSS

**Code Pattern/API:** .prompt-code { font-family: monospace; background: #1e1e1e; color: #d4d4d4; max-height: 300px; overflow-y: auto; white-space: pre-wrap; }

**Verification:** Prompt section has dark code block styling; long prompts scroll within fixed height; text is readable

---

## Completion Checklist
- [ ] Subtask 1 complete
- [ ] Subtask 2 complete
- [ ] Task verification criteria met
