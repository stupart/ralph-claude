//! Writer for _status.md files

use super::types::*;

/// Render a ProjectStatus to markdown string
pub fn render_status(status: &ProjectStatus) -> String {
    let mut out = String::new();

    // Header
    out.push_str("# Project Status\n\n");

    // Meta section
    out.push_str("## Meta\n");
    out.push_str(&format!("- **Project:** {}\n", status.project_name));
    out.push_str(&format!("- **Started:** {}\n", status.started.format("%Y-%m-%dT%H:%M:%SZ")));
    out.push_str(&format!("- **Last Updated:** {}\n", status.last_updated.format("%Y-%m-%dT%H:%M:%SZ")));
    out.push('\n');

    // Current Position
    out.push_str("## Current Position\n");
    out.push_str(&format!("- **Layer:** {} ({})\n", status.current_layer as u8, status.current_layer.name()));
    out.push_str(&format!("- **Chunk:** {}\n", status.current_chunk.as_deref().unwrap_or("N/A")));
    out.push_str(&format!("- **Item:** {}\n", status.current_item.as_deref().unwrap_or("N/A")));
    out.push_str(&format!("- **Iteration:** {} of 3\n", status.iteration));
    out.push('\n');

    // Layer Progress
    out.push_str("## Layer Progress\n");
    for lp in &status.layer_progress {
        let check = if lp.complete { "x" } else { " " };
        out.push_str(&format!("- [{}] Layer {}: {}\n", check, lp.layer as u8, lp.layer.name()));

        // Show chunk details for layers 5-7
        if let Some(chunks) = &lp.chunks {
            for chunk in chunks {
                let chunk_check = match chunk.status {
                    ChunkStatus::Passed => "x",
                    ChunkStatus::InProgress | ChunkStatus::Failed => " ",
                    ChunkStatus::Todo => " ",
                };
                let icon = match chunk.status {
                    ChunkStatus::Passed => " ✓",
                    ChunkStatus::Failed => " ✗",
                    _ => "",
                };
                let status_text = match chunk.status {
                    ChunkStatus::Passed => "passed review",
                    ChunkStatus::Failed => format!("failed, iteration {}", chunk.iteration).leak(),
                    ChunkStatus::InProgress => "in progress",
                    ChunkStatus::Todo => "todo",
                };
                out.push_str(&format!("  - [{}] {}{} ({})\n", chunk_check, chunk.id, icon, status_text));

                // Show items if in progress
                if chunk.status == ChunkStatus::InProgress {
                    for item in &chunk.items {
                        let item_check = match item.status {
                            ItemStatus::Done => "x",
                            _ => " ",
                        };
                        let current = if item.is_current { " ← current" } else { "" };
                        out.push_str(&format!("    - [{}] {}{}\n", item_check, item.spec_file, current));
                    }
                }
            }
        }
    }
    out.push('\n');

    // Current Context
    out.push_str("## Current Context\n");
    out.push_str(&status.context);
    out.push_str("\n\n");

    // Next Action
    out.push_str("## Next Action\n");
    out.push_str(&status.next_action);
    out.push_str("\n\n");

    // Blockers
    out.push_str("## Blockers\n");
    if status.blockers.is_empty() {
        out.push_str("None\n");
    } else {
        for blocker in &status.blockers {
            out.push_str(&format!("- {}\n", blocker));
        }
    }
    out.push('\n');

    // Recent History
    out.push_str("## Recent History\n");
    for entry in status.history.iter().rev().take(10) {
        out.push_str(&format!("- {}: {}\n", entry.timestamp.format("%Y-%m-%dT%H:%M:%SZ"), entry.action));
    }

    out
}

/// Write status to file
pub fn write_status(status: &ProjectStatus, path: &std::path::Path) -> std::io::Result<()> {
    std::fs::write(path, render_status(status))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_render_new_status() {
        let status = ProjectStatus::new("TestProject".to_string());
        let rendered = render_status(&status);

        assert!(rendered.contains("# Project Status"));
        assert!(rendered.contains("**Project:** TestProject"));
        assert!(rendered.contains("Layer 1: Input"));
    }
}
