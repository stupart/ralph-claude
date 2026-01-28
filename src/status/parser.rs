//! Parser for _status.md files

use super::types::*;
use chrono::{DateTime, Utc};
use regex::Regex;

/// Parse a _status.md file into a ProjectStatus struct
pub fn parse_status(content: &str) -> Result<ProjectStatus, StatusError> {
    let mut status = ProjectStatus::new("Unknown".to_string());

    // Parse project name
    if let Some(name) = extract_field(content, "Project") {
        status.project_name = name;
    }

    // Parse dates
    if let Some(started) = extract_field(content, "Started") {
        if let Ok(dt) = started.parse::<DateTime<Utc>>() {
            status.started = dt;
        }
    }

    if let Some(updated) = extract_field(content, "Last Updated") {
        if let Ok(dt) = updated.parse::<DateTime<Utc>>() {
            status.last_updated = dt;
        }
    }

    // Parse current position
    if let Some(layer_str) = extract_field(content, "Layer") {
        // Extract number from "6 (Implementation)" format
        if let Some(num) = layer_str.chars().next().and_then(|c| c.to_digit(10)) {
            if let Some(layer) = Layer::from_number(num as u8) {
                status.current_layer = layer;
            }
        }
    }

    if let Some(chunk) = extract_field(content, "Chunk") {
        if chunk != "N/A" && !chunk.is_empty() {
            status.current_chunk = Some(chunk);
        }
    }

    if let Some(item) = extract_field(content, "Item") {
        if item != "N/A" && !item.is_empty() {
            status.current_item = Some(item);
        }
    }

    if let Some(iter_str) = extract_field(content, "Iteration") {
        // Extract number from "1 of 3" format
        if let Some(num) = iter_str.chars().next().and_then(|c| c.to_digit(10)) {
            status.iteration = num as u8;
        }
    }

    // Parse context and next action
    if let Some(ctx) = extract_section(content, "Current Context") {
        status.context = ctx;
    }

    if let Some(next) = extract_section(content, "Next Action") {
        status.next_action = next;
    }

    // Parse blockers
    if let Some(blockers_section) = extract_section(content, "Blockers") {
        if blockers_section.trim() != "None" {
            status.blockers = blockers_section
                .lines()
                .filter(|l| l.starts_with("- "))
                .map(|l| l.trim_start_matches("- ").to_string())
                .collect();
        }
    }

    // Parse layer progress from checkboxes
    status.layer_progress = parse_layer_progress(content);

    // Parse history
    status.history = parse_history(content);

    Ok(status)
}

/// Extract a simple "**Field:** value" field
fn extract_field(content: &str, field: &str) -> Option<String> {
    let pattern = format!(r"\*\*{}:\*\*\s*(.+)", regex::escape(field));
    let re = Regex::new(&pattern).ok()?;
    re.captures(content)
        .and_then(|c| c.get(1))
        .map(|m| m.as_str().trim().to_string())
}

/// Extract content after a ## Section heading
fn extract_section(content: &str, section: &str) -> Option<String> {
    let pattern = format!(r"## {}\s*\n([\s\S]*?)(?:\n##|\z)", regex::escape(section));
    let re = Regex::new(&pattern).ok()?;
    re.captures(content)
        .and_then(|c| c.get(1))
        .map(|m| m.as_str().trim().to_string())
}

/// Parse the layer progress checkboxes
fn parse_layer_progress(content: &str) -> Vec<LayerProgress> {
    let mut progress = vec![];

    // Match lines like "- [x] Layer 1: Input" or "- [ ] Layer 2: Decomposition"
    let layer_re = Regex::new(r"- \[([ x])\] Layer (\d+): (\w+)").unwrap();

    for cap in layer_re.captures_iter(content) {
        let complete = &cap[1] == "x";
        let num: u8 = cap[2].parse().unwrap_or(0);

        if let Some(layer) = Layer::from_number(num) {
            progress.push(LayerProgress {
                layer,
                complete,
                chunks: if num >= 5 && num <= 7 {
                    Some(parse_chunk_progress(content, num))
                } else {
                    None
                },
            });
        }
    }

    // If no progress found, initialize empty
    if progress.is_empty() {
        for i in 1..=10 {
            if let Some(layer) = Layer::from_number(i) {
                progress.push(LayerProgress {
                    layer,
                    complete: false,
                    chunks: if i >= 5 && i <= 7 { Some(vec![]) } else { None },
                });
            }
        }
    }

    progress
}

/// Parse chunk progress within layers 5-7
fn parse_chunk_progress(content: &str, _layer: u8) -> Vec<ChunkProgress> {
    let mut chunks = vec![];

    // Match lines like "  - [x] chunk-01-auth ✓ (passed review)"
    let chunk_re = Regex::new(r"  - \[([ x])\] (chunk-\d+-\S+)(?:\s+[✓✗])?\s*\(([^)]+)\)").unwrap();

    for cap in chunk_re.captures_iter(content) {
        let _complete = &cap[1] == "x";
        let chunk_id = cap[2].to_string();
        let status_str = &cap[3];

        let status = if status_str.contains("passed") {
            ChunkStatus::Passed
        } else if status_str.contains("failed") {
            ChunkStatus::Failed
        } else if status_str.contains("progress") {
            ChunkStatus::InProgress
        } else {
            ChunkStatus::Todo
        };

        chunks.push(ChunkProgress {
            id: chunk_id.clone(),
            name: chunk_id,
            status,
            items: vec![],
            iteration: 1,
        });
    }

    chunks
}

/// Parse history entries
fn parse_history(content: &str) -> Vec<HistoryEntry> {
    let mut history = vec![];

    // Match lines like "- 2024-01-27T14:30:00Z: Action description"
    let history_re = Regex::new(r"- (\d{4}-\d{2}-\d{2}T[\d:]+Z): (.+)").unwrap();

    for cap in history_re.captures_iter(content) {
        if let Ok(timestamp) = cap[1].parse::<DateTime<Utc>>() {
            history.push(HistoryEntry {
                timestamp,
                action: cap[2].to_string(),
            });
        }
    }

    history
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_basic_status() {
        let content = r#"
# Project Status

## Meta
- **Project:** TestProject
- **Started:** 2024-01-27T10:00:00Z
- **Last Updated:** 2024-01-27T14:30:00Z

## Current Position
- **Layer:** 6 (Implementation)
- **Chunk:** chunk-02-onboarding
- **Item:** spec-thought-exp.md
- **Iteration:** 1 of 3
"#;

        let status = parse_status(content).unwrap();
        assert_eq!(status.project_name, "TestProject");
        assert_eq!(status.current_layer, Layer::Implementation);
        assert_eq!(status.current_chunk, Some("chunk-02-onboarding".to_string()));
        assert_eq!(status.current_item, Some("spec-thought-exp.md".to_string()));
        assert_eq!(status.iteration, 1);
    }
}
