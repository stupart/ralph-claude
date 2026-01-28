//! Ralph V3 - Layered Methodology for Autonomous Code Generation
//!
//! A CLI tool that orchestrates Claude Code through a 10-layer methodology:
//! Input → Decomposition → Synthesis → Outline → ChunkPlanning →
//! Implementation → ChunkReview → Integration → FinalReview → Analysis

use chrono::Local;
use clap::{Parser, Subcommand};
use colored::*;
use std::fs;
use std::io;
use std::path::{Path, PathBuf};
use std::process::{Command, ExitStatus};

use ralph::{
    init_project, is_v3_initialized, has_input_material,
    load_status, save_status, ProjectStatus, Layer,
    get_next_action, NextAction, ReviewType,
    generate_prompt,
};

#[derive(Parser, Debug)]
#[command(name = "ralph")]
#[command(about = "Autonomous code generation using the V3 layered methodology")]
#[command(version)]
struct Args {
    #[command(subcommand)]
    command: Option<Commands>,

    /// Project directory (defaults to current directory)
    #[arg(short, long)]
    project: Option<PathBuf>,

    /// Maximum iterations (0 = unlimited)
    #[arg(short, long, default_value = "0")]
    max_iterations: u32,

    /// Delay between iterations in seconds
    #[arg(short, long, default_value = "2")]
    delay: u64,

    /// Run in dry-run mode (don't execute claude)
    #[arg(long)]
    dry_run: bool,

    /// Print status and exit
    #[arg(long)]
    status: bool,
}

#[derive(Subcommand, Debug)]
enum Commands {
    /// Initialize a new V3 project
    Init {
        /// Project name
        name: String,
    },
    /// Show current project status
    Status,
    /// Run the build loop (default)
    Run,
    /// Add a new brain dump
    BrainDump,
    /// Jump to a specific layer (for debugging)
    Layer {
        /// Layer number (1-10)
        layer: u8,
    },
}

fn main() {
    let args = Args::parse();

    // Determine project path
    let project_path = args.project.clone().unwrap_or_else(|| PathBuf::from("."));

    // Handle --status flag
    if args.status {
        show_status(&project_path);
        return;
    }

    // Handle subcommands
    match args.command {
        Some(Commands::Init { name }) => {
            let path = PathBuf::from(&name);
            if !path.exists() {
                fs::create_dir_all(&path).expect("Failed to create project directory");
            }
            if let Err(e) = init_project(&path, &name) {
                eprintln!("{} {}", "Error initializing project:".red(), e);
                std::process::exit(1);
            }
        }
        Some(Commands::Status) => {
            show_status(&project_path);
        }
        Some(Commands::BrainDump) => {
            add_brain_dump(&project_path);
        }
        Some(Commands::Layer { layer }) => {
            set_layer(&project_path, layer);
        }
        Some(Commands::Run) | None => {
            run_v3_loop(&args, &project_path);
        }
    }
}

/// Show current project status
fn show_status(project_path: &Path) {
    if !is_v3_initialized(project_path) {
        println!("{}", "Not a Ralph V3 project.".yellow());
        println!("Run 'ralph init <project-name>' to create one.");
        return;
    }

    match load_status(project_path) {
        Ok(status) => {
            print_status(&status, project_path);
        }
        Err(e) => {
            eprintln!("{} {}", "Error loading status:".red(), e);
        }
    }
}

/// Pretty-print project status
fn print_status(status: &ProjectStatus, project_path: &Path) {
    println!("\n{}", "═".repeat(50).cyan());
    println!("{}", format!(" {} ", status.project_name).cyan().bold());
    println!("{}", "═".repeat(50).cyan());

    println!(
        "\n{}: {} ({})",
        "Layer".bold(),
        format!("{}", status.current_layer as u8).cyan().bold(),
        status.current_layer.name().cyan()
    );

    if let Some(chunk) = &status.current_chunk {
        println!("{}: {}", "Chunk".bold(), chunk.yellow());
    }
    if let Some(item) = &status.current_item {
        println!("{}: {}", "Item".bold(), item.yellow());
    }

    println!("{}: {} of 3", "Iteration".bold(), status.iteration);

    if !status.blockers.is_empty() {
        println!("\n{}", "Blockers:".red().bold());
        for blocker in &status.blockers {
            println!("  {} {}", "•".red(), blocker);
        }
    }

    // Show layer progress
    println!("\n{}", "Progress:".bold());
    for lp in &status.layer_progress {
        let check = if lp.complete { "✓".green() } else { "○".dimmed() };
        println!("  {} L{}: {}", check, lp.layer as u8, lp.layer.name());
    }

    // Show next action
    let next = get_next_action(status, project_path);
    println!("\n{}: {}", "Next".bold(), format_next_action(&next));

    println!();
}

/// Format next action for display
fn format_next_action(action: &NextAction) -> String {
    match action {
        NextAction::Work(work) => {
            let mut s = format!("{}", work.description.cyan());
            if let Some(chunk) = &work.chunk {
                s.push_str(&format!(" [{}]", chunk.yellow()));
            }
            if let Some(item) = &work.item {
                s.push_str(&format!(" → {}", item.yellow()));
            }
            s
        }
        NextAction::Advance => "Ready to advance to next layer".green().to_string(),
        NextAction::Review(rt) => {
            match rt {
                ReviewType::Chunk(name) => format!("{} {}", "Review chunk:".magenta(), name),
                ReviewType::Integration => "Integration review".magenta().to_string(),
                ReviewType::Final => "Final review".magenta().to_string(),
            }
        }
        NextAction::Rollback { target, reason } => {
            format!("{} L{}: {}", "Rollback to".red(), *target as u8, reason)
        }
        NextAction::Complete => "Project complete! 🎉".green().to_string(),
        NextAction::Blocked(msg) => format!("{} {}", "Blocked:".red(), msg),
    }
}

/// Add a new brain dump
fn add_brain_dump(project_path: &Path) {
    if !is_v3_initialized(project_path) {
        println!("{}", "Not a Ralph V3 project.".yellow());
        return;
    }

    let input_path = project_path.join("1-input");
    fs::create_dir_all(&input_path).expect("Failed to create input directory");

    // Create temp file
    let temp_path = std::env::temp_dir().join("ralph-brain-dump.md");
    let template = "# Brain Dump\n\n<!-- Write your thoughts below. Save and close when done. -->\n\n";
    fs::write(&temp_path, template).expect("Failed to create temp file");

    // Open editor
    let editor = std::env::var("EDITOR").unwrap_or_else(|_| "vim".to_string());
    let status = Command::new(&editor)
        .arg(&temp_path)
        .stdin(std::process::Stdio::inherit())
        .stdout(std::process::Stdio::inherit())
        .stderr(std::process::Stdio::inherit())
        .status();

    if status.is_err() {
        let _ = fs::remove_file(&temp_path);
        return;
    }

    // Read and save
    let content = fs::read_to_string(&temp_path).unwrap_or_default();
    let _ = fs::remove_file(&temp_path);

    let content = content
        .lines()
        .filter(|l| !l.trim().starts_with("<!--"))
        .collect::<Vec<_>>()
        .join("\n");

    if content.trim().is_empty() {
        println!("{}", "Empty brain dump, skipping.".yellow());
        return;
    }

    // Get next number
    let mut max = 0u32;
    if let Ok(entries) = fs::read_dir(&input_path) {
        for e in entries.flatten() {
            let name = e.file_name().to_string_lossy().to_string();
            if name.starts_with("brain-dump-") && name.ends_with(".md") {
                if let Ok(n) = name[11..14].parse::<u32>() {
                    max = max.max(n);
                }
            }
        }
    }

    let num = max + 1;
    let date = Local::now().format("%Y-%m-%d");
    let filename = format!("brain-dump-{:03}.md", num);
    let filepath = input_path.join(&filename);

    let file_content = format!(
        "# Brain Dump #{:03}\n\nCaptured: {}\n\n---\n\n{}\n",
        num, date, content.trim()
    );

    fs::write(&filepath, &file_content).expect("Failed to write brain dump");
    println!("{} 1-input/{}", "Created".green(), filename);
}

/// Set layer manually (for debugging)
fn set_layer(project_path: &Path, layer_num: u8) {
    if !is_v3_initialized(project_path) {
        println!("{}", "Not a Ralph V3 project.".yellow());
        return;
    }

    let layer = match layer_num {
        1 => Layer::Input,
        2 => Layer::Decomposition,
        3 => Layer::Synthesis,
        4 => Layer::Outline,
        5 => Layer::ChunkPlanning,
        6 => Layer::Implementation,
        7 => Layer::ChunkReview,
        8 => Layer::Integration,
        9 => Layer::FinalReview,
        10 => Layer::Analysis,
        _ => {
            eprintln!("{}", "Invalid layer number (1-10)".red());
            return;
        }
    };

    match load_status(project_path) {
        Ok(mut status) => {
            status.current_layer = layer;
            status.add_history(&format!("Manual: Set layer to {}", layer_num));
            if let Err(e) = save_status(project_path, &status) {
                eprintln!("{} {}", "Error saving status:".red(), e);
            } else {
                println!("{} Layer {} ({})", "Set".green(), layer_num, layer.name());
            }
        }
        Err(e) => {
            eprintln!("{} {}", "Error loading status:".red(), e);
        }
    }
}

/// Main V3 build loop
fn run_v3_loop(args: &Args, project_path: &Path) {
    // Initialize if needed
    if !is_v3_initialized(project_path) {
        let name = project_path
            .file_name()
            .map(|n| n.to_string_lossy().to_string())
            .unwrap_or_else(|| "project".to_string());

        if let Err(e) = init_project(project_path, &name) {
            eprintln!("{} {}", "Error initializing:".red(), e);
            std::process::exit(1);
        }
    }

    // Check for input material
    if !has_input_material(project_path) {
        println!("\n{}", "No input material found.".yellow());
        println!("Add brain dumps to 1-input/ or run 'ralph brain-dump'");
        return;
    }

    // Load status
    let mut status = match load_status(project_path) {
        Ok(s) => s,
        Err(e) => {
            eprintln!("{} {}", "Error loading status:".red(), e);
            std::process::exit(1);
        }
    };

    println!("\n{}", "═".repeat(50).cyan());
    println!("{}", " Ralph V3 Build Loop ".cyan().bold());
    println!("{}", "═".repeat(50).cyan());

    print_status(&status, project_path);

    let mut iteration = 0u32;

    loop {
        iteration += 1;

        if args.max_iterations > 0 && iteration > args.max_iterations {
            println!("\n{}", format!("Reached max iterations ({})", args.max_iterations).yellow());
            break;
        }

        // Determine next action
        let next_action = get_next_action(&status, project_path);

        // Check for completion
        if matches!(next_action, NextAction::Complete) {
            println!("\n{}", "Project complete! 🎉".green().bold());
            break;
        }

        // Check for blockers
        if let NextAction::Blocked(msg) = &next_action {
            println!("\n{} {}", "Blocked:".red().bold(), msg);
            println!("Resolve blockers and run again.");
            break;
        }

        let timestamp = Local::now().format("%H:%M:%S");
        println!(
            "\n{} {} {} - L{}: {}",
            format!("[{}]", timestamp).dimmed(),
            "Iteration".cyan(),
            iteration.to_string().cyan().bold(),
            status.current_layer as u8,
            status.current_layer.name()
        );
        println!("{}: {}", "Action".bold(), format_next_action(&next_action));

        // Generate prompt for Claude
        let prompt = generate_prompt(&status, project_path);

        if args.dry_run {
            println!("\n{}", "Dry run - would send prompt:".yellow());
            println!("{}", "─".repeat(40).dimmed());
            // Show first 500 chars of prompt
            let preview: String = prompt.chars().take(500).collect();
            println!("{}", preview.dimmed());
            if prompt.len() > 500 {
                println!("{}", "...".dimmed());
            }
            println!("{}", "─".repeat(40).dimmed());
            std::thread::sleep(std::time::Duration::from_secs(args.delay));
            continue;
        }

        // Run Claude
        status.add_history(&format!("Starting iteration {} - L{}", iteration, status.current_layer as u8));
        let _ = save_status(project_path, &status);

        let result = run_claude(&prompt);

        // Remember the layer before Claude ran
        let layer_before = status.current_layer;

        match result {
            Ok(exit_status) if exit_status.success() => {
                // Reload status (Claude may have updated it)
                status = load_status(project_path).unwrap_or(status);
                status.add_history(&format!("Iteration {} completed", iteration));
                let _ = save_status(project_path, &status);
            }
            Ok(exit_status) => {
                status.add_history(&format!("Iteration {} exited with: {}", iteration, exit_status));
                let _ = save_status(project_path, &status);
            }
            Err(e) => {
                eprintln!("{} {}", "Error running Claude:".red(), e);
                status.add_history(&format!("Iteration {} failed: {}", iteration, e));
                let _ = save_status(project_path, &status);
            }
        }

        // Only handle transitions if Claude didn't already change the layer
        // This prevents double-advancing when Claude updates status itself
        if status.current_layer == layer_before {
            handle_transitions(&mut status, &next_action, project_path);
        } else {
            // Claude advanced the layer - validate the advancement
            let validated = validate_layer_advancement(layer_before, status.current_layer, project_path);
            if validated {
                println!("{} L{}: {} (by Claude)", "→ Advanced to".green(),
                    status.current_layer as u8, status.current_layer.name());
            } else {
                // Claude skipped ahead without creating required artifacts
                // Roll back to the correct layer
                let correct_layer = find_first_incomplete_layer(project_path, layer_before);
                if correct_layer != status.current_layer {
                    println!("{} Claude skipped to L{}, but L{} is incomplete",
                        "⚠ Correcting:".yellow(),
                        status.current_layer as u8,
                        correct_layer as u8);
                    status.current_layer = correct_layer;
                    let _ = save_status(project_path, &status);
                }
            }
        }

        if args.delay > 0 {
            std::thread::sleep(std::time::Duration::from_secs(args.delay));
        }
    }

    println!("\n{}", "Ralph V3 loop finished.".cyan().bold());
}

/// Handle layer transitions after Claude runs
fn handle_transitions(status: &mut ProjectStatus, action: &NextAction, project_path: &Path) {
    match action {
        NextAction::Advance => {
            // Get next layer
            if let Some(next) = status.current_layer.next() {
                status.mark_layer_complete(status.current_layer);
                status.current_layer = next;
                status.current_chunk = None;
                status.current_item = None;
                status.add_history(&format!("Advanced to L{}: {}", next as u8, next.name()));
                let _ = save_status(project_path, status);
                println!("{} L{}: {}", "→ Advanced to".green(), next as u8, next.name());
            }
        }
        NextAction::Rollback { target, reason } => {
            status.current_layer = *target;
            status.iteration += 1;
            status.add_history(&format!("Rolled back to L{}: {}", *target as u8, reason));
            let _ = save_status(project_path, status);
            println!("{} L{}: {}", "← Rolled back to".yellow(), *target as u8, reason);

            if status.iteration > 3 {
                status.blockers.push(format!("Too many iterations at L{}", *target as u8));
                let _ = save_status(project_path, status);
            }
        }
        NextAction::Review(review_type) => {
            match review_type {
                ReviewType::Chunk(chunk) => {
                    status.current_layer = Layer::ChunkReview;
                    status.current_chunk = Some(chunk.clone());
                }
                ReviewType::Integration => {
                    status.current_layer = Layer::Integration;
                }
                ReviewType::Final => {
                    status.current_layer = Layer::FinalReview;
                }
            }
            let _ = save_status(project_path, status);
        }
        NextAction::Work(work) => {
            status.current_chunk = work.chunk.clone();
            status.current_item = work.item.clone();
            let _ = save_status(project_path, status);
        }
        _ => {}
    }
}

/// Validate that all layers between from and to are actually complete
fn validate_layer_advancement(from: Layer, to: Layer, project_path: &Path) -> bool {
    use ralph::layers::criteria;

    let from_num = from as u8;
    let to_num = to as u8;

    // Check each layer from `from` up to (but not including) `to`
    for layer_num in from_num..to_num {
        let complete = match layer_num {
            1 => criteria::is_input_complete(project_path),
            2 => criteria::is_decomposition_complete(project_path),
            3 => criteria::is_synthesis_complete(project_path),
            4 => criteria::is_outline_complete(project_path),
            // Layers 5-10 have more complex criteria, trust Claude for now
            _ => true,
        };

        if !complete {
            return false;
        }
    }

    true
}

/// Find the first layer that is not complete, starting from a given layer
fn find_first_incomplete_layer(project_path: &Path, start_from: Layer) -> Layer {
    use ralph::layers::criteria;

    let start_num = start_from as u8;

    for layer_num in start_num..=10 {
        let complete = match layer_num {
            1 => criteria::is_input_complete(project_path),
            2 => criteria::is_decomposition_complete(project_path),
            3 => criteria::is_synthesis_complete(project_path),
            4 => criteria::is_outline_complete(project_path),
            5 => criteria::get_next_unplanned_chunk(project_path).is_none()
                && criteria::has_chunks_to_implement(project_path),
            8 => criteria::is_integration_complete(project_path),
            10 => criteria::is_analysis_complete(project_path),
            // For implementation and review layers, check if there's work to do
            6 | 7 | 9 => false, // These need more complex checks
            _ => false,
        };

        if !complete {
            return Layer::from_number(layer_num).unwrap_or(start_from);
        }
    }

    Layer::Analysis
}

/// Run Claude with the given prompt
fn run_claude(prompt: &str) -> io::Result<ExitStatus> {
    let mut cmd = Command::new("claude");

    cmd.arg(prompt);
    cmd.arg("--dangerously-skip-permissions");

    cmd.stdin(std::process::Stdio::inherit())
        .stdout(std::process::Stdio::inherit())
        .stderr(std::process::Stdio::inherit());

    cmd.status()
}
