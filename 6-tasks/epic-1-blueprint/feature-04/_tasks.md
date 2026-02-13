# Tasks: Layer Detail Modal Enhancement

## Task 1: Redesign Modal Layout

**What it accomplishes:** Restructures the modal HTML/CSS to support a fixed header (layer ID, name, actor badge) and scrollable body, ensuring long content is accessible while key information stays visible.

**Time estimate:** ~20 minutes

**Files to create/modify:**
- `/Users/tylerstupart/ralph-claude/v3-system-blueprint.html` (modify modal HTML structure and CSS)

**Dependencies:** None

**Verification:** Modal has sticky header that stays visible while content scrolls; modal body scrolls independently; header shows layer ID, name, and color-coded actor badge.

---

## Task 2: Create Section Renderer Functions

**What it accomplishes:** Creates modular functions for rendering each modal section type: renderDescriptionSection(), renderActorSection(), renderOutputsSection(), renderCheckSection(), renderToolsSection(), renderFlowSection().

**Time estimate:** ~25 minutes

**Files to create/modify:**
- `/Users/tylerstupart/ralph-claude/v3-system-blueprint.html` (add section renderer functions)

**Dependencies:** Task 1 (need modal structure)

**Verification:** Each section renderer function exists and returns valid HTML; sections display correctly when called with LAYER_CAKE layer data.

---

## Task 3: Add Prompt Template Formatting

**What it accomplishes:** Implements display of the full prompt template in a styled code block with monospace font, preserved line breaks, and optional syntax highlighting for markdown/template syntax.

**Time estimate:** ~20 minutes

**Files to create/modify:**
- `/Users/tylerstupart/ralph-claude/v3-system-blueprint.html` (add renderPromptSection function and CSS)

**Dependencies:** Task 1 (need modal structure)

**Verification:** Prompt section displays full prompt text; text is monospace with preserved formatting; long prompts scroll within their section.

---

## Task 4: Implement Flow Routing Visualization

**What it accomplishes:** Creates visual display of all routing paths (onPass, onFail) with color coding: green for pass, yellow for minor, red for major, purple for escalate. Shows target layer IDs clearly.

**Time estimate:** ~20 minutes

**Files to create/modify:**
- `/Users/tylerstupart/ralph-claude/v3-system-blueprint.html` (add renderFlowSection function with color coding)

**Dependencies:** Task 2 (section renderer pattern)

**Verification:** Flow section shows all routing options; onPass is green; cascade options (minor/major/escalate) show with correct colors and target layers.

---

## Task 5: Add Keyboard and Focus Management

**What it accomplishes:** Implements Escape key to close modal, backdrop click to close, proper focus trapping while modal is open, and focus return to triggering element on close.

**Time estimate:** ~15 minutes

**Files to create/modify:**
- `/Users/tylerstupart/ralph-claude/v3-system-blueprint.html` (add keyboard event handlers and focus management)

**Dependencies:** Task 1 (need modal structure)

**Verification:** Escape key closes modal; clicking backdrop closes modal; Tab key cycles through modal elements only; focus returns to clicked cell after close.

---

## Task 6: Polish and Test All 12 Layer Modals

**What it accomplishes:** Reviews and tests openLayerModal() for all 12 layers (L1-L12), ensuring each displays all required sections correctly, handles null fields gracefully, and shows human gate badges on L3 and L7.

**Time estimate:** ~20 minutes

**Files to create/modify:**
- `/Users/tylerstupart/ralph-claude/v3-system-blueprint.html` (fix any issues found during testing)

**Dependencies:** Tasks 1-5 (all modal features must be complete)

**Verification:** Each of L1-L12 opens correctly; all sections populate; null fields show "N/A"; L3 and L7 show human gate indicator; no JavaScript errors in console.
