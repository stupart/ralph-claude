//! Review document parser
//!
//! Parses _review.md files to extract review results.

use std::path::Path;
use std::fs;
use super::{ReviewVerdict, ChunkReview, SpecReview};

/// Parse a chunk review from _review.md
pub fn parse_chunk_review(chunk_id: &str, project_path: &Path) -> Option<ChunkReview> {
    let review_path = project_path
        .join("5-chunks")
        .join(chunk_id)
        .join("_review.md");

    let content = fs::read_to_string(&review_path).ok()?;

    // Extract chunk name from first heading
    let chunk_name = content.lines()
        .find(|l| l.starts_with("# Review:"))
        .map(|l| l.trim_start_matches("# Review:").trim().to_string())
        .unwrap_or_else(|| chunk_id.to_string());

    // Extract iteration
    let iteration = content.lines()
        .find(|l| l.contains("Iteration:"))
        .and_then(|l| {
            l.chars()
                .find(|c| c.is_ascii_digit())
                .and_then(|c| c.to_digit(10))
                .map(|n| n as u8)
        })
        .unwrap_or(1);

    // Extract verdict
    let verdict = if content.contains("## Verdict: PASS") || content.contains("**PASS**") {
        ReviewVerdict::Pass
    } else {
        ReviewVerdict::Fail
    };

    let mut review = ChunkReview::new(chunk_id.to_string(), chunk_name, iteration);
    review.verdict = verdict;

    // Parse spec reviews (basic extraction)
    let mut in_spec_review = false;
    let mut current_spec: Option<String> = None;
    let mut current_status = ReviewVerdict::Pass;
    let mut current_notes = String::new();

    for line in content.lines() {
        if line.starts_with("### spec-") {
            // Save previous spec review if any
            if let Some(spec_file) = current_spec.take() {
                review.add_spec_review(SpecReview {
                    spec_file,
                    status: current_status,
                    notes: current_notes.clone(),
                    issues: vec![],
                });
            }

            current_spec = Some(line.trim_start_matches("### ").to_string());
            current_status = ReviewVerdict::Pass;
            current_notes.clear();
            in_spec_review = true;
        } else if in_spec_review {
            if line.starts_with("**Status:**") {
                if line.contains("FAIL") {
                    current_status = ReviewVerdict::Fail;
                }
            } else if line.starts_with("**Notes:**") {
                current_notes = line.trim_start_matches("**Notes:**").trim().to_string();
            } else if line.starts_with("## ") {
                // End of spec reviews section
                if let Some(spec_file) = current_spec.take() {
                    review.add_spec_review(SpecReview {
                        spec_file,
                        status: current_status,
                        notes: current_notes.clone(),
                        issues: vec![],
                    });
                }
                in_spec_review = false;
            }
        }
    }

    // Save last spec review
    if let Some(spec_file) = current_spec {
        review.add_spec_review(SpecReview {
            spec_file,
            status: current_status,
            notes: current_notes,
            issues: vec![],
        });
    }

    // Parse what worked well
    let mut in_what_worked = false;
    for line in content.lines() {
        if line.contains("What Worked Well") || line.contains("What Works Well") {
            in_what_worked = true;
        } else if in_what_worked {
            if line.starts_with("- ") {
                review.what_worked.push(line.trim_start_matches("- ").to_string());
            } else if line.starts_with("## ") || line.starts_with("### ") {
                in_what_worked = false;
            }
        }
    }

    // Parse recommendations
    let mut in_recommendations = false;
    for line in content.lines() {
        if line.contains("## Recommendations") {
            in_recommendations = true;
        } else if in_recommendations {
            if line.starts_with("- ") {
                review.recommendations.push(line.trim_start_matches("- ").to_string());
            } else if line.starts_with("## ") {
                in_recommendations = false;
            }
        }
    }

    Some(review)
}

/// Extract iteration count from review content
pub fn extract_iteration_count(content: &str) -> Option<u8> {
    content.lines()
        .find(|l| l.contains("Iteration:"))
        .and_then(|l| {
            l.chars()
                .find(|c| c.is_ascii_digit())
                .and_then(|c| c.to_digit(10))
                .map(|n| n as u8)
        })
}

/// Check if review indicates need for escalation (3 failed iterations)
pub fn should_escalate(chunk_id: &str, project_path: &Path) -> bool {
    let review_path = project_path
        .join("5-chunks")
        .join(chunk_id)
        .join("_review.md");

    if let Ok(content) = fs::read_to_string(&review_path) {
        // Check for FAIL verdict
        let is_failing = content.contains("## Verdict: FAIL") ||
            (content.contains("FAIL") && !content.contains("## Verdict: PASS"));

        // Check iteration count
        let iteration = extract_iteration_count(&content).unwrap_or(1);

        is_failing && iteration >= 3
    } else {
        false
    }
}

/// Check if review has major issues
pub fn has_major_issues(chunk_id: &str, project_path: &Path) -> bool {
    let review_path = project_path
        .join("5-chunks")
        .join(chunk_id)
        .join("_review.md");

    if let Ok(content) = fs::read_to_string(&review_path) {
        content.contains("**Severity:** MAJOR") || content.contains("(MAJOR)")
    } else {
        false
    }
}

/// Get all chunks that need rework based on final review
pub fn get_chunks_needing_rework(project_path: &Path) -> Vec<String> {
    let final_review_path = project_path.join("6-integration/final-review.md");

    if let Ok(content) = fs::read_to_string(&final_review_path) {
        let mut chunks = vec![];

        // Look for patterns like "(fix in chunk-XX)" or "chunk-XX"
        for line in content.lines() {
            if line.contains("fix in") || line.contains("chunk-") {
                // Extract chunk IDs
                let words: Vec<&str> = line.split_whitespace().collect();
                for word in words {
                    if word.starts_with("chunk-") || word.contains("chunk-") {
                        let chunk = word.trim_matches(|c: char| !c.is_alphanumeric() && c != '-');
                        if chunk.starts_with("chunk-") {
                            chunks.push(chunk.to_string());
                        }
                    }
                }
            }
        }

        chunks.dedup();
        chunks
    } else {
        vec![]
    }
}
