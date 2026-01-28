# V3 Methodology Brain Dump

Raw thinking from the Porpus A/B test debrief. Unorganized, to be synthesized.

---

## Problems with Current Ralph

- **Scope problem**: Doesn't do enough features, stops too early
- **Depth problem**: Features are shallow, not thorough
- **Verification gap**: Code compiles but UX isn't "felt" - no taste
- **Context loss**: Separate AI chats lose conversation context
- **Plan → Implement is too fast**: Jumps straight to code without enough thinking

## Key Insights

- "GAN system where another AI reviews everything" - adversarial review
- One massive .md vs many files? → **ToC + per-feature docs**
- Folder structure can BE the control flow / loop mechanism
- More layers of generation = more code, more thought, more thoroughness
- Each layer is a forcing function for quality

## The Layer Cake Approach

Instead of: `plan → implement`

It should be: gradual increase in complexity/specificity

1. Raw input (brain dumps, audio, research, designs)
2. Decomposition (quotes, organize, affinitize)
3. Synthesis (JTBD, journeys, specs, architecture, current state)
4. Implementation outline (high level)
5. Sub-outlines (per chunk, becomes folder index)
6. Detailed docs (per sub-item, in that folder)
7. Implementation loop (build, test, iterate until good)
8. GAN review (critic AI reviews UX/testing/design)
9. Integration testing (cross-feature)
10. Final analysis (retrospective)

## Failure Handling

- Failure at any layer pushes back down
- Re-analyze, re-plan, re-implement at that layer AND all layers below
- Max iterations (3?) to prevent infinite loops
- "Whatever layer it gets stopped at, it pushes back down to reanalyze and rebuild"

## Things to Figure Out

- [ ] Re-plans scoped properly - go down ALL levels
- [ ] Cut + restart Claude loop - how does context handoff work?
- [ ] Task prompt format - what context gets sent at start of each thing?
- [ ] What levels push to GitHub?
- [ ] What triggers what levels of review?
- [ ] Visibility into the system - how do we see what's happening?

## Folder Structure as State Machine

```
/project
├── _status.md              # Current layer, iteration count
├── /1-input/
├── /2-decomposition/
├── /3-synthesis/
├── /4-outline/
├── /5-chunks/
│   ├── /feature-a/
│   │   ├── _index.md       # Sub-outline
│   │   ├── item-1.md       # Detailed spec
│   │   └── _review.md      # GAN results
│   └── /feature-b/
├── /6-integration/
└── /7-analysis/
```

## Loop Mechanics

1. Ralph reads `_status.md` to know where it is
2. Looks at current layer's folder
3. Finds incomplete items
4. Works on them, commits as it goes
5. When folder complete → GAN review
6. Pass → advance, move to next
7. Fail → iterate (max 3x) or bubble up

## PRD vs Feature

- "What if there are things we want to do that aren't clear features?"
- Maybe use "PRD" as the unit instead of "feature"
- PRD can be a feature, a refactor, a bug fix, an exploration

## Context Handoff Between Sessions

Need a "task prompt" format that includes:
- Where we are in the layer stack
- What's been done
- What's in progress
- Relevant files/context
- What to do next

This gets sent at the START of each new Claude session.

## Commit Strategy

- Commit at what levels?
- Probably: after each implementation item, after each review pass
- Git history should tell the story of the build

## Review Triggers

Different levels of review:
- Item-level: did this one spec get implemented correctly?
- Chunk-level: does this feature work end-to-end?
- Integration-level: do features work together?
- Final: is the whole thing good?

## The "Keep Going" Problem

Current Ralph stops too early. Solutions:
- Filesystem state drives continuation (are there `todo` items?)
- Explicit iteration counts
- GAN reviewer keeps pushing back
- Clear "done" criteria at each level
