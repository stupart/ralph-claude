//! Review prompt templates
//!
//! Generates prompts for the GAN reviewer to evaluate implementations.

use std::path::Path;
use std::fs;

/// Generate chunk review prompt
pub fn get_chunk_review_prompt(chunk_id: &str, project_path: &Path) -> String {
    let chunk_path = project_path.join("5-chunks").join(chunk_id);

    // Load chunk index
    let index_content = fs::read_to_string(chunk_path.join("_index.md"))
        .unwrap_or_else(|_| "No _index.md found".to_string());

    // Load all spec files
    let mut specs_content = String::new();
    if let Ok(entries) = fs::read_dir(&chunk_path) {
        for entry in entries.filter_map(|e| e.ok()) {
            let name = entry.file_name().to_string_lossy().to_string();
            if name.starts_with("spec-") && name.ends_with(".md") {
                if let Ok(content) = fs::read_to_string(entry.path()) {
                    specs_content.push_str(&format!("\n### {}\n\n{}\n", name, content));
                }
            }
        }
    }

    // Load previous review if exists
    let previous_review = fs::read_to_string(chunk_path.join("_review.md"))
        .map(|c| format!("\n## Previous Review\n\n{}\n", c))
        .unwrap_or_default();

    format!(r#"# GAN Review Mode: Chunk Review

## Your Role

You are now the CRITIC, not the builder. Your job is to find problems, not excuse them.

**Mindset:** Be skeptical. Be thorough. Assume bugs exist until proven otherwise.

## Chunk to Review

**Chunk ID:** {chunk_id}

### Chunk Index

{index_content}

### Specs

{specs_content}
{previous_review}

## Review Process

1. **For each spec:**
   - Read the acceptance criteria carefully
   - Test EVERY criterion via /chrome
   - Try edge cases the builder might have missed
   - Check error handling
   - Note any issues found

2. **Testing Checklist:**
   - [ ] Each acceptance criterion tested
   - [ ] Happy path works completely
   - [ ] Error cases handled gracefully
   - [ ] Edge cases work
   - [ ] UX feels good (not just functional)

3. **Write the review:**
   Create `_review.md` in the chunk folder with this format:

```markdown
# Review: [Chunk Name]

**Reviewer:** GAN Critic
**Date:** YYYY-MM-DD
**Iteration:** N of 3

## Verdict: PASS | FAIL

## Spec Reviews

### spec-item-1.md
**Status:** PASS | FAIL
**Notes:** What you observed

### spec-item-2.md
**Status:** FAIL
**Issues:**
- Issue description (MINOR/MAJOR)

## Overall Issues
(Only if verdict is FAIL)

### Issue 1: [Title]
**Severity:** MINOR | MAJOR
**Description:** What's wrong
**Recommendation:** How to fix

## What Worked Well
- Positive observation 1
- Positive observation 2

## Recommendations
- Improvement suggestion 1
```

## Severity Guidelines

- **MINOR:** Has workaround, can be fixed quickly, doesn't break core functionality
- **MAJOR:** Core functionality broken, security issue, data loss risk, terrible UX

## Rules

1. Test via /chrome - actually click through and verify
2. Be critical, not charitable - if something feels off, flag it
3. Don't mark PASS just because it "mostly works"
4. If 3 review iterations fail, verdict becomes ESCALATE
5. Your review determines if we proceed or rollback

## Output

After testing, write `_review.md` to `5-chunks/{chunk_id}/_review.md`
"#,
        chunk_id = chunk_id,
        index_content = index_content,
        specs_content = specs_content,
        previous_review = previous_review,
    )
}

/// Generate integration review prompt
pub fn get_integration_review_prompt(project_path: &Path) -> String {
    // Load all chunk reviews
    let chunks_path = project_path.join("5-chunks");
    let mut chunk_summaries = String::new();

    if let Ok(entries) = fs::read_dir(&chunks_path) {
        for entry in entries.filter_map(|e| e.ok()) {
            if entry.path().is_dir() {
                let chunk_id = entry.file_name().to_string_lossy().to_string();
                let review_path = entry.path().join("_review.md");

                if let Ok(content) = fs::read_to_string(&review_path) {
                    // Extract just the verdict and key notes
                    let verdict_line = content.lines()
                        .find(|l| l.contains("Verdict:"))
                        .unwrap_or("Verdict: Unknown");

                    chunk_summaries.push_str(&format!("### {}\n{}\n\n", chunk_id, verdict_line));
                }
            }
        }
    }

    format!(r#"# GAN Review Mode: Integration Testing

## Your Role

Verify that all chunks work together as a cohesive system.

## Chunks Reviewed

{chunk_summaries}

## Integration Testing Process

1. **Define Test Scenarios:**
   - End-to-end user flows that cross multiple chunks
   - Edge cases that involve multiple features
   - State management across features

2. **Run Integration Tests:**
   For each scenario via /chrome:
   - Test the complete flow
   - Check data persists correctly
   - Verify state updates properly
   - Check error handling across boundaries

3. **Cross-Feature Tests:**
   - Test Feature A while Feature B is active
   - Check for conflicts or race conditions
   - Verify shared state behaves correctly

4. **Performance Check:**
   - Page load times acceptable?
   - No visible lag in interactions?
   - Memory usage reasonable?

## Output Format

Create `6-integration/test-results.md`:

```markdown
# Integration Test Results

**Date:** YYYY-MM-DD

## Test Scenarios

### Scenario 1: [Name]
**Flow:** Step 1 → Step 2 → Step 3
**Result:** PASS | FAIL
**Notes:** Observations

### Scenario 2: [Name]
...

## Cross-Feature Tests

### [Feature A] + [Feature B]
**Result:** PASS | FAIL
**Notes:** How they interact

## Performance

### Page Load
**Result:** Acceptable | Slow
**Notes:** Observations

### Interaction Responsiveness
**Result:** Acceptable | Laggy
**Notes:** Observations

## Overall Verdict

All tests passing: YES | NO
```

## Rules

1. Test REAL scenarios via /chrome
2. Don't assume - verify everything
3. If integration fails, identify which chunk(s) need rework
"#,
        chunk_summaries = chunk_summaries,
    )
}

/// Generate final review prompt
pub fn get_final_review_prompt(project_path: &Path) -> String {
    // Load integration test results
    let integration_results = fs::read_to_string(project_path.join("6-integration/test-results.md"))
        .unwrap_or_else(|_| "No integration results found".to_string());

    // Load synthesis docs for context
    let jtbd = fs::read_to_string(project_path.join("3-synthesis/jtbd.md"))
        .unwrap_or_else(|_| "No JTBD found".to_string());

    format!(r#"# GAN Review Mode: Final Review

## Your Role

You are the final quality gate. Would YOU ship this?

## Context

### Jobs to Be Done
{jtbd}

### Integration Results
{integration_results}

## Final Review Process

1. **Complete UX Walkthrough:**
   Via /chrome, use the app as a real user would:
   - Complete all major user journeys
   - Try to break things
   - Check edge cases
   - Verify error messages are helpful

2. **Design Consistency Check:**
   - Visual consistency across features
   - Interaction patterns consistent
   - Terminology consistent
   - No orphaned or dead-end states

3. **Error Handling Review:**
   - All errors caught gracefully
   - Error messages are user-friendly
   - Recovery paths exist
   - No data loss scenarios

4. **Final Checklist:**
   - [ ] All features accessible and working
   - [ ] UX is consistent across features
   - [ ] Error messages are helpful
   - [ ] No broken states or dead ends
   - [ ] Performance is acceptable
   - [ ] Would you ship this?

## Output Format

Create `6-integration/final-review.md`:

```markdown
# Final Review

**Reviewer:** GAN Critic
**Date:** YYYY-MM-DD

## Verdict: PASS | FAIL

## UX Walkthrough

### Feature 1: [Name]
**Status:** PASS | FAIL
**Notes:** Observations

### Feature 2: [Name]
...

## Design Consistency
**Status:** PASS | FAIL
**Notes:** Observations

## Error Handling
**Status:** PASS | FAIL
**Notes:** Observations

## Overall Assessment

### What Works Well
- Positive observation 1
- Positive observation 2

### Issues (if FAIL)
- Issue 1 (fix in chunk-XX)
- Issue 2 (fix in chunk-YY)

### Recommendation
Ship / Fix and re-review / Major rework needed
```

## Rules

1. This is the FINAL check before shipping
2. Be honest - don't pass a mediocre product
3. If FAIL, clearly identify which chunks need fixes
4. Your recommendation determines project completion
"#,
        jtbd = jtbd,
        integration_results = integration_results,
    )
}
