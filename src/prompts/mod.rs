//! Prompt generation for each layer
//!
//! Generates Claude prompts based on current layer and context.

mod templates;

use crate::status::{Layer, ProjectStatus};
use std::path::Path;
use std::fs;

/// Generate the full prompt for Claude based on current state
pub fn generate_prompt(status: &ProjectStatus, project_path: &Path) -> String {
    let mut prompt = String::new();

    // Header
    prompt.push_str(&format!("# Ralph V3 - Layer {}: {}\n\n",
        status.current_layer as u8,
        status.current_layer.name()
    ));

    // Project context
    prompt.push_str(&format!("**Project:** {}\n", status.project_name));
    prompt.push_str(&format!("**Current Layer:** {} ({})\n",
        status.current_layer as u8,
        status.current_layer.name()
    ));

    if let Some(chunk) = &status.current_chunk {
        prompt.push_str(&format!("**Current Chunk:** {}\n", chunk));
    }
    if let Some(item) = &status.current_item {
        prompt.push_str(&format!("**Current Item:** {}\n", item));
    }
    prompt.push_str(&format!("**Iteration:** {} of 3\n\n", status.iteration));

    // Layer-specific instructions
    prompt.push_str("---\n\n");
    prompt.push_str(&get_layer_instructions(status.current_layer));
    prompt.push_str("\n\n---\n\n");

    // Context from relevant files
    prompt.push_str("## Relevant Context\n\n");
    prompt.push_str(&load_layer_context(status, project_path));

    // Rules and reminders
    prompt.push_str("\n\n---\n\n");
    prompt.push_str(&get_layer_rules(status.current_layer));

    prompt
}

/// Get instructions specific to a layer
fn get_layer_instructions(layer: Layer) -> String {
    match layer {
        Layer::Input => templates::INPUT_INSTRUCTIONS.to_string(),
        Layer::Decomposition => templates::DECOMPOSITION_INSTRUCTIONS.to_string(),
        Layer::Synthesis => templates::SYNTHESIS_INSTRUCTIONS.to_string(),
        Layer::Outline => templates::OUTLINE_INSTRUCTIONS.to_string(),
        Layer::ChunkPlanning => templates::CHUNK_PLANNING_INSTRUCTIONS.to_string(),
        Layer::Implementation => templates::IMPLEMENTATION_INSTRUCTIONS.to_string(),
        Layer::ChunkReview => templates::CHUNK_REVIEW_INSTRUCTIONS.to_string(),
        Layer::Integration => templates::INTEGRATION_INSTRUCTIONS.to_string(),
        Layer::FinalReview => templates::FINAL_REVIEW_INSTRUCTIONS.to_string(),
        Layer::Analysis => templates::ANALYSIS_INSTRUCTIONS.to_string(),
    }
}

/// Load relevant context files for current layer
fn load_layer_context(status: &ProjectStatus, project_path: &Path) -> String {
    let mut context = String::new();

    match status.current_layer {
        Layer::Input => {
            // Show existing brain dumps
            let input_path = project_path.join("1-input");
            if let Ok(files) = list_md_files(&input_path) {
                if !files.is_empty() {
                    context.push_str("### Existing Input Files\n");
                    for f in files {
                        context.push_str(&format!("- {}\n", f));
                    }
                }
            }
        }

        Layer::Decomposition => {
            // Show input files content
            context.push_str("### Input to Decompose\n\n");
            let input_path = project_path.join("1-input");
            context.push_str(&load_folder_contents(&input_path, 3000));
        }

        Layer::Synthesis => {
            // Show decomposition results
            context.push_str("### Decomposition Results\n\n");
            let decomp_path = project_path.join("2-decomposition");
            context.push_str(&load_folder_contents(&decomp_path, 4000));
        }

        Layer::Outline => {
            // Show synthesis artifacts
            context.push_str("### Synthesis Artifacts\n\n");
            let synth_path = project_path.join("3-synthesis");
            context.push_str(&load_folder_contents(&synth_path, 4000));
        }

        Layer::ChunkPlanning => {
            // Show outline and current chunk
            context.push_str("### Implementation Plan\n\n");
            let outline_path = project_path.join("4-outline/implementation-plan.md");
            if let Ok(content) = fs::read_to_string(&outline_path) {
                context.push_str(&content);
                context.push_str("\n\n");
            }

            if let Some(chunk) = &status.current_chunk {
                context.push_str(&format!("### Planning Chunk: {}\n\n", chunk));
                // Load existing specs if any
                let chunk_path = project_path.join("5-chunks").join(chunk);
                if chunk_path.exists() {
                    context.push_str(&load_folder_contents(&chunk_path, 2000));
                }
            }
        }

        Layer::Implementation => {
            // Show current chunk index and spec
            if let Some(chunk) = &status.current_chunk {
                let chunk_path = project_path.join("5-chunks").join(chunk);

                // Load _index.md
                let index_path = chunk_path.join("_index.md");
                if let Ok(content) = fs::read_to_string(&index_path) {
                    context.push_str("### Chunk Index\n\n");
                    context.push_str(&content);
                    context.push_str("\n\n");
                }

                // Load current spec
                if let Some(item) = &status.current_item {
                    let spec_path = chunk_path.join(item);
                    if let Ok(content) = fs::read_to_string(&spec_path) {
                        context.push_str(&format!("### Current Spec: {}\n\n", item));
                        context.push_str(&content);
                    }
                }
            }
        }

        Layer::ChunkReview => {
            // Show chunk implementation for review
            if let Some(chunk) = &status.current_chunk {
                let chunk_path = project_path.join("5-chunks").join(chunk);

                context.push_str(&format!("### Reviewing Chunk: {}\n\n", chunk));

                // Load all specs
                context.push_str("#### Specs\n\n");
                context.push_str(&load_folder_contents(&chunk_path, 5000));

                // Load previous review if exists
                let review_path = chunk_path.join("_review.md");
                if let Ok(content) = fs::read_to_string(&review_path) {
                    context.push_str("\n#### Previous Review\n\n");
                    context.push_str(&content);
                }
            }
        }

        Layer::Integration => {
            // Show all chunk reviews
            context.push_str("### Chunk Reviews\n\n");
            let chunks_path = project_path.join("5-chunks");
            if let Ok(entries) = fs::read_dir(&chunks_path) {
                for entry in entries.filter_map(|e| e.ok()) {
                    if entry.path().is_dir() {
                        let review_path = entry.path().join("_review.md");
                        if let Ok(content) = fs::read_to_string(&review_path) {
                            let name = entry.file_name().to_string_lossy().to_string();
                            context.push_str(&format!("#### {}\n\n{}\n\n", name, content));
                        }
                    }
                }
            }
        }

        Layer::FinalReview => {
            // Show integration results
            context.push_str("### Integration Test Results\n\n");
            let results_path = project_path.join("6-integration/test-results.md");
            if let Ok(content) = fs::read_to_string(&results_path) {
                context.push_str(&content);
            }
        }

        Layer::Analysis => {
            // Show everything for retrospective
            context.push_str("### Project Summary\n\n");
            context.push_str(&format!("Started: {}\n", status.started.format("%Y-%m-%d")));
            context.push_str(&format!("Completed: {}\n\n", status.last_updated.format("%Y-%m-%d")));

            context.push_str("### History\n\n");
            for entry in &status.history {
                context.push_str(&format!("- {}: {}\n",
                    entry.timestamp.format("%Y-%m-%d %H:%M"),
                    entry.action
                ));
            }
        }
    }

    context
}

/// Get rules/reminders for a layer
fn get_layer_rules(layer: Layer) -> String {
    let common = r#"## Rules

1. **Update _status.md** after completing work
2. **Commit code** after each implementation item
3. **Don't skip layers** - follow the process
4. **Be thorough** - quality over speed
"#;

    let specific = match layer {
        Layer::Input => "5. Capture everything - raw is fine\n6. Don't analyze yet - just gather",
        Layer::Decomposition => "5. Extract exact quotes\n6. Don't synthesize yet - just organize",
        Layer::Synthesis => "5. Be specific about JTBD\n6. Architecture should be concrete",
        Layer::Outline => "5. Order chunks by dependency\n6. Each chunk should be independent",
        Layer::ChunkPlanning => "5. Specs must have acceptance criteria\n6. Include edge cases",
        Layer::Implementation => "5. Follow the spec exactly\n6. Commit after each item",
        Layer::ChunkReview => "5. Test via Playwright MCP or curl/tests if unavailable\n6. Be critical, not charitable",
        Layer::Integration => "5. Test cross-feature interactions\n6. Check error handling",
        Layer::FinalReview => "5. Full UX walkthrough\n6. Check consistency",
        Layer::Analysis => "5. Be honest about what didn't work\n6. Extract actionable learnings",
    };

    format!("{}\n{}", common, specific)
}

/// List markdown files in a directory
fn list_md_files(path: &Path) -> Result<Vec<String>, std::io::Error> {
    let mut files = vec![];

    if path.exists() {
        for entry in fs::read_dir(path)? {
            let entry = entry?;
            let name = entry.file_name().to_string_lossy().to_string();
            if name.ends_with(".md") {
                files.push(name);
            }
        }
    }

    Ok(files)
}

/// Load contents of all markdown files in a folder (with size limit)
fn load_folder_contents(path: &Path, max_chars: usize) -> String {
    let mut content = String::new();
    let mut total_size = 0;

    if let Ok(entries) = fs::read_dir(path) {
        for entry in entries.filter_map(|e| e.ok()) {
            let file_path = entry.path();
            if file_path.extension().map(|e| e == "md").unwrap_or(false) {
                if let Ok(file_content) = fs::read_to_string(&file_path) {
                    let name = entry.file_name().to_string_lossy().to_string();
                    let addition = format!("#### {}\n\n{}\n\n", name, file_content);

                    if total_size + addition.len() > max_chars {
                        content.push_str(&format!("\n... (truncated, {} more files)\n",
                            fs::read_dir(path).map(|e| e.count()).unwrap_or(0)));
                        break;
                    }

                    total_size += addition.len();
                    content.push_str(&addition);
                }
            }
        }
    }

    content
}
