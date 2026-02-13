# V3 Implementation Plan

How to build this into Ralph.

---

## Overview

Ralph V3 needs to:
1. Initialize project with layer structure
2. Navigate layers based on _status.md
3. Generate appropriate prompts per layer
4. Handle session handoff/restart
5. Switch to GAN reviewer at checkpoints
6. Manage commits and git integration

---

## Current Ralph Architecture

Ralph currently:
- Reads PROJECT.md (or PRD.json in old version)
- Generates a plan
- Implements features
- Commits along the way

V3 changes:
- Replace single PROJECT.md with layer folder structure
- Add _status.md state tracking
- Add layer-specific prompt templates
- Add GAN reviewer mode
- Add structured handoff system

---

## Implementation Chunks

### Chunk 1: Project Initialization

**Goal:** `ralph init` creates V3 folder structure

**Changes:**
- New `init_v3_project()` function
- Creates folder structure:
  ```
  /1-input/
  /2-decomposition/
  /3-synthesis/
  /4-outline/
  /5-chunks/
  /6-integration/
  /7-analysis/
  _status.md
  ```
- Initializes _status.md at Layer 1

**Files:**
- `src/project/init.rs` - new or modify
- `src/project/structure.rs` - folder structure constants

---

### Chunk 2: Status Management

**Goal:** Read/write/update _status.md reliably

**Changes:**
- Parse _status.md into structured data
- Update specific fields atomically
- Validate status against folder structure
- Handle corrupted/missing status

**Files:**
- `src/status/mod.rs` - new module
- `src/status/parser.rs` - parse _status.md
- `src/status/writer.rs` - update _status.md
- `src/status/types.rs` - status data structures

**Data Structures:**
```rust
struct ProjectStatus {
    project_name: String,
    started: DateTime,
    last_updated: DateTime,
    current_layer: u8,
    current_chunk: Option<String>,
    current_item: Option<String>,
    iteration: u8,
    layer_progress: Vec<LayerProgress>,
    context: String,
    next_action: String,
    blockers: Vec<String>,
    history: Vec<HistoryEntry>,
}

struct LayerProgress {
    layer: u8,
    name: String,
    complete: bool,
    chunks: Option<Vec<ChunkProgress>>,
}

struct ChunkProgress {
    id: String,
    status: ChunkStatus, // todo, in_progress, passed, failed
    items: Vec<ItemProgress>,
}
```

---

### Chunk 3: Layer Navigation

**Goal:** Determine what to do based on current layer

**Changes:**
- Layer state machine
- Entry/exit criteria checking
- Advancement logic
- Failure/rollback logic

**Files:**
- `src/layers/mod.rs` - layer orchestration
- `src/layers/criteria.rs` - done criteria per layer
- `src/layers/transitions.rs` - state machine

**Logic:**
```rust
fn get_next_action(status: &ProjectStatus) -> Action {
    match status.current_layer {
        1 => layer1_action(status),
        2 => layer2_action(status),
        // ...
        6 => implementation_action(status),
        7 => review_action(status),
        // ...
    }
}

fn check_layer_complete(layer: u8, project_path: &Path) -> bool {
    // Check done criteria for layer
}

fn advance_layer(status: &mut ProjectStatus) {
    // Move to next layer, update status
}

fn rollback_to_layer(status: &mut ProjectStatus, target: u8, reason: &str) {
    // Handle failure, return to earlier layer
}
```

---

### Chunk 4: Prompt Templates

**Goal:** Generate layer-specific prompts for Claude

**Changes:**
- Template system for each layer
- Context loading based on layer
- Handoff prompt generation

**Files:**
- `src/prompts/mod.rs` - prompt orchestration
- `src/prompts/templates/` - per-layer templates
  - `layer1_input.md`
  - `layer2_decomposition.md`
  - `layer3_synthesis.md`
  - `layer4_outline.md`
  - `layer5_planning.md`
  - `layer6_implementation.md`
  - `layer7_review.md`
  - `layer8_integration.md`
  - `layer9_final.md`
  - `layer10_analysis.md`
- `src/prompts/context.rs` - context loading logic
- `src/prompts/handoff.rs` - session start prompt

**Template Variables:**
```
{project_name}
{status_md}
{current_layer}
{current_chunk}
{current_spec}
{chunk_index}
{review_results}
{relevant_files}
{layer_rules}
```

---

### Chunk 5: GAN Reviewer Mode

**Goal:** Switch to adversarial reviewer at checkpoints

**Changes:**
- Reviewer persona prompt
- Review trigger detection
- _review.md generation
- Pass/fail logic and routing

**Files:**
- `src/reviewer/mod.rs` - reviewer orchestration
- `src/reviewer/persona.rs` - reviewer prompt
- `src/reviewer/output.rs` - _review.md generation
- `src/reviewer/verdict.rs` - pass/fail logic

**Flow:**
```rust
fn run_review(chunk_path: &Path, iteration: u8) -> ReviewResult {
    // 1. Load chunk specs
    // 2. Switch to reviewer persona
    // 3. Run Claude with reviewer prompt
    // 4. Parse output into ReviewResult
    // 5. Write _review.md
    // 6. Return verdict
}

enum ReviewResult {
    Pass,
    FailMinor(Vec<Issue>),
    FailMajor(Vec<Issue>),
    Escalate(String), // After 3 iterations
}
```

---

### Chunk 6: Session Handoff

**Goal:** Seamless context transfer between sessions

**Changes:**
- Detect session end (context limit approaching)
- Generate checkpoint commit
- Create handoff summary
- Resume from checkpoint

**Files:**
- `src/session/mod.rs` - session management
- `src/session/checkpoint.rs` - checkpoint logic
- `src/session/resume.rs` - resume logic
- `src/session/handoff.rs` - handoff prompt

**Commands:**
```
ralph resume [project_path]  # Resume from _status.md
ralph checkpoint             # Force checkpoint now
ralph status                 # Show current _status.md
```

---

### Chunk 7: Git Integration

**Goal:** Meaningful commits at right points

**Changes:**
- Commit after each implementation item
- Commit message format with metadata
- Checkpoint commits on session end
- Branch management (optional)

**Files:**
- `src/git/mod.rs` - git operations
- `src/git/commit.rs` - commit with format
- `src/git/checkpoint.rs` - WIP commits

**Commit Format:**
```
[L{layer}] {description}

Layer: {layer} ({layer_name})
Chunk: {chunk_id}
Spec: {spec_file}
Status: {complete|wip}

{details}
```

---

### Chunk 8: CLI Updates

**Goal:** New commands for V3 workflow

**Changes:**
- `ralph init` - initialize V3 project
- `ralph status` - show _status.md summary
- `ralph resume` - resume from checkpoint
- `ralph review` - force review mode
- `ralph rollback <layer>` - manual rollback

**Files:**
- `src/cli/mod.rs` - CLI definitions
- `src/cli/commands/` - command implementations

---

## Migration Path

For existing projects:
1. `ralph migrate` command
2. Converts PROJECT.md to Layer 3 artifacts
3. Creates folder structure
4. Initializes _status.md at Layer 4

---

## Testing Plan

### Unit Tests
- Status parsing/writing
- Layer transition logic
- Prompt generation
- Review verdict parsing

### Integration Tests
- Full layer 1-10 flow on small project
- Session checkpoint and resume
- Review failure and iteration
- Escalation after 3 failures

### Manual Testing
- Run on real project (like Porpus)
- Verify commits are meaningful
- Verify handoff works
- Verify GAN catches real issues

---

## Rollout Plan

1. **Phase 1:** Core infrastructure (Chunks 1-3)
   - Folder structure
   - Status management
   - Layer navigation

2. **Phase 2:** Prompt system (Chunk 4)
   - Templates
   - Context loading

3. **Phase 3:** Review system (Chunk 5)
   - GAN reviewer
   - Pass/fail routing

4. **Phase 4:** Session management (Chunk 6)
   - Checkpoint
   - Resume

5. **Phase 5:** Polish (Chunks 7-8)
   - Git integration
   - CLI updates

---

## Open Questions

1. **How much context per session?**
   - Load full layer artifacts?
   - Or summarize older layers?

2. **Multiple Claude instances?**
   - One for building, one for reviewing?
   - Or same instance switches modes?

3. **Parallel chunks?**
   - Can work on independent chunks simultaneously?
   - Adds complexity but increases throughput

4. **Human in the loop?**
   - When does human need to approve?
   - After Layer 4 outline?
   - On review failures?

5. **Cost management?**
   - Reviews add API calls
   - Worth it for quality?
   - Can optimize later
