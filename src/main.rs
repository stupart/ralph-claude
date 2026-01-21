use chrono::Local;
use clap::Parser;
use colored::*;
use serde::{Deserialize, Serialize};
use std::fs;
use std::io::{self, Write};
use std::path::Path;
use std::process::{Command, ExitStatus};

#[derive(Parser, Debug)]
#[command(name = "ralph")]
#[command(about = "Run Claude Code in autonomous loops until PRD is complete")]
struct Args {
    /// Project name (creates folder if used with --init)
    #[arg()]
    project_name: Option<String>,

    /// Path to the prompt file (default: .claude/commands/ralph.md)
    #[arg(short, long, default_value = ".claude/commands/ralph.md")]
    prompt: String,

    /// Path to PRD file (default: PRD.json)
    #[arg(long, default_value = "PRD.json")]
    prd: String,

    /// Maximum iterations (0 = unlimited)
    #[arg(short, long, default_value = "0")]
    max_iterations: u32,

    /// Delay between iterations in seconds
    #[arg(short, long, default_value = "2")]
    delay: u64,

    /// Initialize a new project with ralph templates
    #[arg(long)]
    init: bool,

    /// Run in dry-run mode (don't execute claude)
    #[arg(long)]
    dry_run: bool,

    /// Skip all permission prompts (passes --dangerously-skip-permissions to claude)
    #[arg(long)]
    yolo: bool,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
struct Feature {
    id: String,
    title: String,
    description: String,
    status: FeatureStatus,
    acceptance_criteria: Vec<String>,
}

#[derive(Serialize, Deserialize, Debug, Clone, PartialEq)]
#[serde(rename_all = "lowercase")]
enum FeatureStatus {
    Pending,
    InProgress,
    Failing,
    Passing,
}

#[derive(Serialize, Deserialize, Debug)]
struct Prd {
    project: String,
    features: Vec<Feature>,
}

fn main() {
    let args = Args::parse();

    if args.init {
        init_project(args.project_name.as_deref());
        return;
    }

    // Check if PRD is empty - if so, run interview first
    if needs_interview(&args.prd) {
        println!("{}", "PRD is empty. Starting interview...".cyan().bold());
        run_interview(args.yolo);
        println!("\n{}", "Interview complete. Starting build loop...".green().bold());
    }

    run_loop(&args);
}

fn needs_interview(prd_path: &str) -> bool {
    match fs::read_to_string(prd_path) {
        Ok(content) => {
            match serde_json::from_str::<Prd>(&content) {
                Ok(prd) => prd.features.is_empty(),
                Err(_) => true, // Can't parse, probably needs setup
            }
        }
        Err(_) => true, // No PRD file, needs setup
    }
}

fn run_interview(skip_permissions: bool) {
    let interview_prompt = match fs::read_to_string(".claude/commands/interview.md") {
        Ok(p) => p,
        Err(_) => {
            eprintln!("{}", "Error: .claude/commands/interview.md not found".red());
            eprintln!("Run {} first", "ralph --init".cyan());
            std::process::exit(1);
        }
    };

    let status = run_claude(&interview_prompt, skip_permissions);

    if let Err(e) = status {
        eprintln!("{} {}", "Interview failed:".red(), e);
        std::process::exit(1);
    }
}

fn init_project(project_name: Option<&str>) {
    // If project name provided, create and cd into that folder
    let project_dir = if let Some(name) = project_name {
        let path = Path::new(name);
        if path.exists() {
            eprintln!("{} '{}' already exists", "Error:".red(), name);
            std::process::exit(1);
        }
        fs::create_dir_all(name).expect("Failed to create project directory");
        std::env::set_current_dir(name).expect("Failed to cd into project directory");
        println!("{} {}/", "Created".green(), name);
        name.to_string()
    } else {
        std::env::current_dir()
            .unwrap()
            .file_name()
            .unwrap()
            .to_string_lossy()
            .to_string()
    };

    println!("{}", "Initializing ralph project...".cyan().bold());

    // Initialize git if not already a repo
    if !Path::new(".git").exists() {
        Command::new("git").arg("init").status().ok();
        println!("  {} git repository", "init".green());
    }

    // Create directories
    fs::create_dir_all(".claude/commands").expect("Failed to create .claude/commands");

    // Create template files
    let templates = get_templates();

    for (path, content) in templates {
        if Path::new(path).exists() {
            println!("  {} {} (already exists)", "skip".yellow(), path);
        } else {
            fs::write(path, content).expect(&format!("Failed to write {}", path));
            println!("  {} {}", "create".green(), path);
        }
    }

    println!("\n{}", "Done! Run:".green().bold());
    if project_name.is_some() {
        println!("  cd {} && ralph --yolo", project_dir);
    } else {
        println!("  ralph --yolo");
    }
    println!("\n{}", "This will:".dimmed());
    println!("  1. Interview you about what to build");
    println!("  2. Generate the PRD with features");
    println!("  3. Execute the build loop until complete");
}

fn get_templates() -> Vec<(&'static str, &'static str)> {
    vec![
        ("CLAUDE.md", include_str!("../templates/CLAUDE.md")),
        ("PRD.json", include_str!("../templates/PRD.json")),
        ("progress.md", include_str!("../templates/progress.md")),
        ("guardrails.md", include_str!("../templates/guardrails.md")),
        (".claude/settings.json", include_str!("../templates/settings.json")),
        (".claude/commands/interview.md", include_str!("../templates/commands/interview.md")),
        (".claude/commands/plan.md", include_str!("../templates/commands/plan.md")),
        (".claude/commands/build.md", include_str!("../templates/commands/build.md")),
        (".claude/commands/ralph.md", include_str!("../templates/commands/ralph.md")),
    ]
}

fn run_loop(args: &Args) {
    println!("{}", "Starting ralph loop...".cyan().bold());

    let mut iteration = 0u32;

    loop {
        iteration += 1;

        // Check max iterations
        if args.max_iterations > 0 && iteration > args.max_iterations {
            println!("\n{}", format!("Reached max iterations ({})", args.max_iterations).yellow());
            break;
        }

        // Check if PRD is complete
        match check_prd_complete(&args.prd) {
            Ok(true) => {
                println!("\n{}", "All features passing! PRD complete.".green().bold());
                break;
            }
            Ok(false) => {}
            Err(e) => {
                println!("{} {}", "Warning: Could not read PRD:".yellow(), e);
            }
        }

        // Print iteration header
        let timestamp = Local::now().format("%H:%M:%S");
        println!(
            "\n{} {} {}",
            format!("[{}]", timestamp).dimmed(),
            "Iteration".cyan(),
            iteration.to_string().cyan().bold()
        );

        // Read prompt
        let prompt = match fs::read_to_string(&args.prompt) {
            Ok(p) => p,
            Err(e) => {
                eprintln!("{} {}: {}", "Error reading prompt".red(), args.prompt, e);
                eprintln!("Run {} to create template files", "ralph --init".cyan());
                std::process::exit(1);
            }
        };

        if args.dry_run {
            println!("{}", "Dry run - would execute claude with prompt:".yellow());
            println!("{}", prompt.dimmed());
            std::thread::sleep(std::time::Duration::from_secs(args.delay));
            continue;
        }

        // Log to progress.md
        log_progress(&format!("Starting iteration {}", iteration));

        // Run claude
        let status = run_claude(&prompt, args.yolo);

        match status {
            Ok(s) if s.success() => {
                log_progress(&format!("Iteration {} completed successfully", iteration));
            }
            Ok(s) => {
                log_progress(&format!("Iteration {} exited with status: {}", iteration, s));
            }
            Err(e) => {
                eprintln!("{} {}", "Error running claude:".red(), e);
                log_progress(&format!("Iteration {} failed: {}", iteration, e));
            }
        }

        // Delay between iterations
        if args.delay > 0 {
            std::thread::sleep(std::time::Duration::from_secs(args.delay));
        }
    }

    println!("\n{}", "Ralph loop finished.".cyan().bold());
}

fn check_prd_complete(prd_path: &str) -> Result<bool, String> {
    let content = fs::read_to_string(prd_path).map_err(|e| e.to_string())?;
    let prd: Prd = serde_json::from_str(&content).map_err(|e| e.to_string())?;

    let all_passing = prd.features.iter().all(|f| f.status == FeatureStatus::Passing);

    // Print status summary
    let passing = prd.features.iter().filter(|f| f.status == FeatureStatus::Passing).count();
    let total = prd.features.len();
    println!(
        "  {} {}/{}",
        "PRD status:".dimmed(),
        passing.to_string().green(),
        total
    );

    Ok(all_passing)
}

fn run_claude(prompt: &str, skip_permissions: bool) -> io::Result<ExitStatus> {
    let mut cmd = Command::new("claude");

    // Pass prompt as positional argument (interactive mode)
    cmd.arg(prompt);

    if skip_permissions {
        cmd.arg("--dangerously-skip-permissions");
    }

    // Inherit stdio so user can see Claude working
    cmd.stdin(std::process::Stdio::inherit())
        .stdout(std::process::Stdio::inherit())
        .stderr(std::process::Stdio::inherit());

    cmd.status()
}

fn log_progress(message: &str) {
    let timestamp = Local::now().format("%Y-%m-%d %H:%M:%S");
    let log_entry = format!("\n## [{}]\n{}\n", timestamp, message);

    if let Ok(mut file) = fs::OpenOptions::new()
        .create(true)
        .append(true)
        .open("progress.md")
    {
        let _ = file.write_all(log_entry.as_bytes());
    }
}
