//! Completion criteria for each layer
//!
//! These functions check the filesystem to determine if a layer is complete.

use std::path::Path;
use std::fs;

/// Review result types
#[derive(Debug, Clone, PartialEq)]
pub enum ReviewResult {
    Pass,
    FailMinor,
    FailMajor,
    Escalate,
}

/// Check if Layer 1 (Input) has sufficient content
pub fn is_input_complete(project_path: &Path) -> bool {
    let input_path = project_path.join("1-input");
    if !input_path.exists() {
        return false;
    }

    // Check for at least one brain dump markdown file (not .gitkeep)
    let has_brain_dump = fs::read_dir(&input_path)
        .map(|entries| {
            entries.filter_map(|e| e.ok())
                .any(|e| {
                    let name = e.file_name().to_string_lossy().to_string();
                    name.ends_with(".md") && name != ".gitkeep" && !name.starts_with(".")
                })
        })
        .unwrap_or(false);

    // Also check research folder for content
    let research_path = input_path.join("research");
    let has_research = if research_path.exists() {
        fs::read_dir(&research_path)
            .map(|entries| {
                entries.filter_map(|e| e.ok())
                    .any(|e| {
                        let name = e.file_name().to_string_lossy().to_string();
                        name.ends_with(".md") && name != ".gitkeep"
                    })
            })
            .unwrap_or(false)
    } else {
        false
    };

    has_brain_dump || has_research
}

/// Check if Layer 2 (Decomposition) is complete
pub fn is_decomposition_complete(project_path: &Path) -> bool {
    let decomp_path = project_path.join("2-decomposition");
    if !decomp_path.exists() {
        return false;
    }

    // Require at least quotes.md and patterns.md
    let has_quotes = decomp_path.join("quotes.md").exists();
    let has_patterns = decomp_path.join("patterns.md").exists();

    has_quotes && has_patterns
}

/// Check if Layer 3 (Synthesis) is complete
pub fn is_synthesis_complete(project_path: &Path) -> bool {
    let synth_path = project_path.join("3-synthesis");
    if !synth_path.exists() {
        return false;
    }

    // Require JTBD and architecture
    let has_jtbd = synth_path.join("jtbd.md").exists();
    let has_arch = synth_path.join("architecture.md").exists();

    has_jtbd && has_arch
}

/// Check if Layer 4 (Outline) is complete
pub fn is_outline_complete(project_path: &Path) -> bool {
    let outline_path = project_path.join("4-outline");
    let plan_file = outline_path.join("implementation-plan.md");

    if !plan_file.exists() {
        return false;
    }

    // Check that the plan has at least one chunk defined
    if let Ok(content) = fs::read_to_string(&plan_file) {
        content.contains("### Chunk")
    } else {
        false
    }
}

/// Get the next chunk that needs planning (no _index.md yet)
pub fn get_next_unplanned_chunk(project_path: &Path) -> Option<String> {
    let chunks_path = project_path.join("5-chunks");
    if !chunks_path.exists() {
        return None;
    }

    // Read outline to get chunk order
    let outline_path = project_path.join("4-outline/implementation-plan.md");
    let chunks = get_chunks_from_outline(&outline_path);

    for chunk in chunks {
        let chunk_path = chunks_path.join(&chunk);
        let index_path = chunk_path.join("_index.md");

        // Chunk folder might not exist yet, or _index.md might not exist
        if !index_path.exists() {
            return Some(chunk);
        }
    }

    None
}

/// Check if there are chunks that need implementation
pub fn has_chunks_to_implement(project_path: &Path) -> bool {
    get_next_chunk_to_implement(project_path).is_some()
}

/// Get the next chunk that needs implementation
pub fn get_next_chunk_to_implement(project_path: &Path) -> Option<String> {
    let chunks_path = project_path.join("5-chunks");
    if !chunks_path.exists() {
        return None;
    }

    // Find chunks with _index.md but no passing _review.md
    if let Ok(entries) = fs::read_dir(&chunks_path) {
        for entry in entries.filter_map(|e| e.ok()) {
            if entry.path().is_dir() {
                let chunk_id = entry.file_name().to_string_lossy().to_string();
                let index_path = entry.path().join("_index.md");
                let review_path = entry.path().join("_review.md");

                // Has planning, needs implementation or review
                if index_path.exists() {
                    if !review_path.exists() {
                        return Some(chunk_id);
                    }

                    // Check if review passed
                    if let Ok(content) = fs::read_to_string(&review_path) {
                        if !content.contains("## Verdict: PASS") && !content.contains("**PASS**") {
                            return Some(chunk_id);
                        }
                    }
                }
            }
        }
    }

    None
}

/// Check if a chunk is fully implemented
pub fn is_chunk_implemented(chunk_id: &str, project_path: &Path) -> bool {
    let chunk_path = project_path.join("5-chunks").join(chunk_id);
    let index_path = chunk_path.join("_index.md");

    if !index_path.exists() {
        return false;
    }

    // Parse _index.md to find all specs
    if let Ok(content) = fs::read_to_string(&index_path) {
        // Check for any "Status: todo" or "Status: in-progress"
        let has_incomplete = content.lines().any(|line| {
            let lower = line.to_lowercase();
            lower.contains("status:") && (lower.contains("todo") || lower.contains("in-progress"))
        });

        !has_incomplete
    } else {
        false
    }
}

/// Get the next item to implement in a chunk
pub fn get_next_item_to_implement(chunk_id: &str, project_path: &Path) -> Option<String> {
    let chunk_path = project_path.join("5-chunks").join(chunk_id);
    let index_path = chunk_path.join("_index.md");

    if let Ok(content) = fs::read_to_string(&index_path) {
        // Find lines with "Status: todo" or "Status: in-progress" and extract spec filename
        for line in content.lines() {
            let lower = line.to_lowercase();
            if lower.contains("status:") && (lower.contains("todo") || lower.contains("in-progress")) {
                // Try to extract spec filename from previous lines or current line
                if let Some(spec) = extract_spec_from_line(line) {
                    return Some(spec);
                }
            }
        }

        // Alternative: look for spec-*.md files not marked as done
        if let Ok(entries) = fs::read_dir(&chunk_path) {
            for entry in entries.filter_map(|e| e.ok()) {
                let name = entry.file_name().to_string_lossy().to_string();
                if name.starts_with("spec-") && name.ends_with(".md") {
                    // Check if this spec is marked as done in index
                    if !content.contains(&format!("[x] {}", name)) {
                        return Some(name);
                    }
                }
            }
        }
    }

    None
}

/// Extract spec filename from a line like "**Spec:** spec-login.md"
fn extract_spec_from_line(line: &str) -> Option<String> {
    if let Some(start) = line.find("spec-") {
        let rest = &line[start..];
        if let Some(end) = rest.find(".md") {
            return Some(rest[..end + 3].to_string());
        }
    }
    None
}

/// Get review result for a chunk
pub fn get_review_result(chunk_id: &str, project_path: &Path) -> Option<ReviewResult> {
    let review_path = project_path.join("5-chunks").join(chunk_id).join("_review.md");

    if let Ok(content) = fs::read_to_string(&review_path) {
        if content.contains("**PASS**") || content.contains("## Verdict: PASS") {
            return Some(ReviewResult::Pass);
        }

        // Check iteration count for escalation
        if let Some(iteration) = extract_iteration(&content) {
            if iteration >= 3 {
                return Some(ReviewResult::Escalate);
            }
        }

        // Check for MAJOR vs MINOR issues
        if content.contains("MAJOR") {
            return Some(ReviewResult::FailMajor);
        }

        if content.contains("FAIL") || content.contains("MINOR") {
            return Some(ReviewResult::FailMinor);
        }
    }

    None
}

/// Extract iteration number from review content
fn extract_iteration(content: &str) -> Option<u8> {
    // Look for "Iteration: N of 3" pattern
    for line in content.lines() {
        if line.contains("Iteration:") {
            if let Some(num) = line.chars().find(|c| c.is_ascii_digit()) {
                return num.to_digit(10).map(|n| n as u8);
            }
        }
    }
    None
}

/// Check if Layer 8 (Integration) is complete
pub fn is_integration_complete(project_path: &Path) -> bool {
    let int_path = project_path.join("6-integration");
    let results_path = int_path.join("test-results.md");

    if let Ok(content) = fs::read_to_string(&results_path) {
        // Check for passing status
        content.contains("All tests passing") || content.contains("PASS")
    } else {
        false
    }
}

/// Get final review result
pub fn get_final_review_result(project_path: &Path) -> Option<ReviewResult> {
    let review_path = project_path.join("6-integration/final-review.md");

    if let Ok(content) = fs::read_to_string(&review_path) {
        if content.contains("**PASS**") {
            return Some(ReviewResult::Pass);
        }
        if content.contains("MAJOR") {
            return Some(ReviewResult::FailMajor);
        }
        if content.contains("FAIL") {
            return Some(ReviewResult::FailMinor);
        }
    }

    None
}

/// Check if Layer 10 (Analysis) is complete
pub fn is_analysis_complete(project_path: &Path) -> bool {
    let retro_path = project_path.join("7-analysis/retrospective.md");
    retro_path.exists()
}

/// Parse chunks from outline file
fn get_chunks_from_outline(outline_path: &Path) -> Vec<String> {
    let mut chunks = vec![];

    if let Ok(content) = fs::read_to_string(outline_path) {
        // Look for "### Chunk N: Name" patterns
        for line in content.lines() {
            if line.starts_with("### Chunk") {
                // Extract chunk identifier - assume format "### Chunk 1: [Name]"
                let parts: Vec<&str> = line.split(':').collect();
                if parts.len() >= 2 {
                    let name = parts[1].trim()
                        .to_lowercase()
                        .replace(' ', "-")
                        .replace(|c: char| !c.is_alphanumeric() && c != '-', "");

                    // Extract chunk number
                    if let Some(num_str) = parts[0].split_whitespace().last() {
                        if let Ok(num) = num_str.parse::<u32>() {
                            chunks.push(format!("chunk-{:02}-{}", num, name));
                        }
                    }
                }
            }
        }
    }

    chunks
}
