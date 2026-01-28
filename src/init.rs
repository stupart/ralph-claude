//! Project initialization for V3 methodology
//!
//! Creates the folder structure and initial files for a Ralph V3 project.

use std::fs;
use std::io::{self, Write};
use std::path::Path;
use std::process::Command;
use chrono::Local;
use colored::*;

use crate::status::{ProjectStatus, save_status};

/// Initialize a new V3 project
pub fn init_project(project_path: &Path, project_name: &str) -> io::Result<()> {
    println!("{}", "Initializing Ralph V3 project...".cyan().bold());

    // Initialize git if not already a repo
    if !project_path.join(".git").exists() {
        Command::new("git")
            .arg("init")
            .current_dir(project_path)
            .status()
            .ok();
        println!("  {} git repository", "init".green());
    }

    // Create V3 folder structure
    create_folder_structure(project_path)?;

    // Create CLAUDE.md with V3 instructions
    create_claude_md(project_path)?;

    // Create initial _status.md
    let status = ProjectStatus::new(project_name.to_string());
    save_status(project_path, &status)
        .map_err(|e| io::Error::new(io::ErrorKind::Other, format!("{:?}", e)))?;
    println!("  {} _status.md", "create".green());

    // Prompt for brain dump
    prompt_brain_dump(project_path)?;

    println!("\n{}", "V3 project initialized!".green().bold());
    println!("{}", "Run 'ralph' to start the build loop.".dimmed());

    Ok(())
}

/// Create the V3 folder structure
fn create_folder_structure(project_path: &Path) -> io::Result<()> {
    let folders = [
        "1-input",
        "1-input/research",
        "1-input/designs",
        "2-decomposition",
        "3-synthesis",
        "4-outline",
        "5-chunks",
        "6-integration",
        "7-analysis",
    ];

    for folder in &folders {
        let path = project_path.join(folder);
        if !path.exists() {
            fs::create_dir_all(&path)?;
            println!("  {} {}/", "create".green(), folder);
        }
    }

    // Create .gitkeep files to preserve empty folders
    for folder in &folders {
        let gitkeep = project_path.join(folder).join(".gitkeep");
        if !gitkeep.exists() {
            fs::write(&gitkeep, "")?;
        }
    }

    Ok(())
}

/// Create CLAUDE.md with V3 instructions
fn create_claude_md(project_path: &Path) -> io::Result<()> {
    let claude_md_path = project_path.join("CLAUDE.md");

    if claude_md_path.exists() {
        println!("  {} CLAUDE.md (already exists)", "skip".yellow());
        return Ok(());
    }

    let content = r#"# Ralph V3 Project

This project uses the Ralph V3 layered methodology for autonomous code generation.

## How It Works

Ralph operates in 10 layers:

1. **Input** - Gather brain dumps, research, designs
2. **Decomposition** - Extract quotes, patterns, affinities
3. **Synthesis** - Create JTBD, journeys, architecture
4. **Outline** - Create implementation plan with chunks
5. **Chunk Planning** - Write detailed specs per chunk
6. **Implementation** - Build what's specified
7. **Chunk Review** - GAN critic reviews each chunk
8. **Integration** - Test all chunks together
9. **Final Review** - Full system review
10. **Analysis** - Write retrospective

## Key Files

- `_status.md` - Current state (layer, chunk, item, blockers)
- `1-input/` - Raw brain dumps and research
- `2-decomposition/` - Extracted quotes and patterns
- `3-synthesis/` - JTBD, journeys, architecture
- `4-outline/` - Implementation plan
- `5-chunks/` - Chunk folders with specs
- `6-integration/` - Integration test results
- `7-analysis/` - Retrospective

## Rules

1. Always check `_status.md` for current state
2. Complete current layer before advancing
3. Update `_status.md` after each action
4. Commit after each implementation item
5. Be thorough - quality over speed
6. When in review mode, be critical not charitable

## Commands

- `ralph` - Run the build loop
- `ralph --status` - Show current status
- `ralph --layer N` - Jump to specific layer
"#;

    fs::write(&claude_md_path, content)?;
    println!("  {} CLAUDE.md", "create".green());

    Ok(())
}

/// Prompt user for brain dump
fn prompt_brain_dump(project_path: &Path) -> io::Result<()> {
    println!("\n{}", "Brain dump?".cyan().bold());
    print!("{}", "Do you have context to add? (y/n): ".dimmed());
    io::stdout().flush()?;

    let mut answer = String::new();
    if io::stdin().read_line(&mut answer).is_err() {
        println!("  {} brain dump", "skip".yellow());
        return Ok(());
    }

    let answer = answer.trim().to_lowercase();
    if answer != "y" && answer != "yes" {
        println!("  {} brain dump", "skip".yellow());
        return Ok(());
    }

    // Create temp file with template
    let temp_path = std::env::temp_dir().join("ralph-brain-dump.md");
    let template = r#"# Brain Dump

<!-- Write your thoughts, requirements, ideas below -->
<!-- Save and close when done. Delete everything to skip. -->

## What are we building?


## Key requirements


## Constraints


## Prior art / inspiration


"#;
    fs::write(&temp_path, template)?;

    // Get editor
    let editor = std::env::var("EDITOR")
        .or_else(|_| std::env::var("VISUAL"))
        .unwrap_or_else(|_| {
            if Command::new("code").arg("--version").output().is_ok() {
                "code --wait".to_string()
            } else if Command::new("nano").arg("--version").output().is_ok() {
                "nano".to_string()
            } else {
                "vim".to_string()
            }
        });

    println!("{}", format!("Opening editor ({})...", editor.split_whitespace().next().unwrap_or("editor")).dimmed());

    let parts: Vec<&str> = editor.split_whitespace().collect();
    let (cmd, args) = parts.split_first().unwrap_or((&"vim", &[]));

    let status = Command::new(cmd)
        .args(args.iter())
        .arg(&temp_path)
        .stdin(std::process::Stdio::inherit())
        .stdout(std::process::Stdio::inherit())
        .stderr(std::process::Stdio::inherit())
        .status();

    if status.is_err() || !status.as_ref().map(|s| s.success()).unwrap_or(false) {
        println!("  {} brain dump (editor failed)", "skip".yellow());
        let _ = fs::remove_file(&temp_path);
        return Ok(());
    }

    // Read content
    let content = fs::read_to_string(&temp_path).unwrap_or_default();
    let _ = fs::remove_file(&temp_path);

    // Strip template comments
    let content: String = content
        .lines()
        .filter(|line| !line.trim().starts_with("<!--"))
        .collect::<Vec<_>>()
        .join("\n");
    let content = content.trim();

    if content.is_empty() || content == "# Brain Dump" {
        println!("  {} brain dump (empty)", "skip".yellow());
        return Ok(());
    }

    // Save to 1-input
    let input_path = project_path.join("1-input");
    fs::create_dir_all(&input_path)?;

    let next_num = get_next_brain_dump_number(&input_path);
    let date = Local::now().format("%Y-%m-%d");
    let filename = format!("brain-dump-{:03}.md", next_num);
    let filepath = input_path.join(&filename);

    let file_content = format!(
        "# Brain Dump #{:03}\n\nCaptured: {}\n\n---\n\n{}\n",
        next_num, date, content
    );
    fs::write(&filepath, &file_content)?;
    println!("  {} 1-input/{}", "create".green(), filename);

    Ok(())
}

/// Get next brain dump number
fn get_next_brain_dump_number(input_path: &Path) -> u32 {
    let mut max_num: u32 = 0;

    if let Ok(entries) = fs::read_dir(input_path) {
        for entry in entries.flatten() {
            let name = entry.file_name().to_string_lossy().to_string();
            if name.starts_with("brain-dump-") && name.ends_with(".md") {
                if let Some(num_str) = name.get(11..14) {
                    if let Ok(num) = num_str.parse::<u32>() {
                        max_num = max_num.max(num);
                    }
                }
            }
        }
    }

    max_num + 1
}

/// Check if project is initialized (V3 style)
pub fn is_v3_initialized(project_path: &Path) -> bool {
    project_path.join("_status.md").exists()
}

/// Check if there's input material to work with
pub fn has_input_material(project_path: &Path) -> bool {
    let input_path = project_path.join("1-input");

    if let Ok(entries) = fs::read_dir(&input_path) {
        for entry in entries.flatten() {
            let name = entry.file_name().to_string_lossy().to_string();
            if name.ends_with(".md") && name != ".gitkeep" {
                return true;
            }
        }
    }

    false
}
